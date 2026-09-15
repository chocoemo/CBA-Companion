import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDraftPool, getDraftV2, getDate } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/draft?year=YYYY
// Unlike /ratings, /draftpool and /draftv2 have NO documented rate limit —
// this is meant to be called often (every 30-60s) while the draft is live,
// driven by the draft-watch GitHub Actions workflow, not the 4x/day one.
//
// Confirmed live: /draftv2 is CSV with columns ID (player id), Round,
// "Pick In Round", Supp, Overall, "Player Name", Team, "Team ID", Position,
// Age, College (0/empty = high schooler), "Auto Pick", "Time (UTC)" — no
// more guessing here, this is hard-mapped.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(req.url);
  let draftYear = searchParams.get("year") ? Number(searchParams.get("year")) : null;
  if (!draftYear) {
    const date = await getDate(); // "YYYY-MM-DD"
    draftYear = Number(date.slice(0, 4));
  }

  const results: Record<string, unknown> = { draftYear };

  // --- Remaining pool ---
  try {
    const poolRows = await getDraftPool();
    const remainingIds = poolRows
      .map((r) => Number(r["ID"]))
      .filter((n) => Number.isFinite(n));

    await prisma.draftPoolSnapshot.create({
      data: { draftYear, remainingCount: remainingIds.length, remainingPlayerIds: remainingIds },
    });

    // College is only known to be a confirmed column on /draftv2 — trying
    // the same key here defensively in case /draftpool mirrors it (Big
    // Board mostly shows undrafted pool players, who otherwise never get
    // this set at all since they never appear in /draftv2 until picked).
    let poolCollegeUpdates = 0;
    const collegeKey = poolRows[0] && "College" in poolRows[0] ? "College" : null;
    if (collegeKey) {
      for (const row of poolRows) {
        const playerId = Number(row["ID"]);
        if (!playerId) continue;
        const flag = row[collegeKey];
        const isCollege = flag === "1" ? true : flag === "0" ? false : null;
        if (isCollege === null) continue;
        const existingPlayer = await prisma.player.findUnique({ where: { id: playerId } });
        if (existingPlayer && existingPlayer.isCollege !== isCollege) {
          await prisma.player.update({ where: { id: playerId }, data: { isCollege } });
          poolCollegeUpdates++;
        }
      }
    }

    results.pool = {
      ok: true,
      remaining: remainingIds.length,
      collegeColumnFound: !!collegeKey,
      poolCollegeUpdates,
      sampleColumns: poolRows[0] ? Object.keys(poolRows[0]) : [],
    };
  } catch (err: any) {
    results.pool = { ok: false, error: String(err?.message ?? err) };
  }

  // --- Picks made so far ---
  try {
    const rows = await getDraftV2();
    let created = 0;
    let updated = 0;
    let collegeUpdates = 0;

    for (const row of rows) {
      const playerId = Number(row["ID"]);
      const round = Number(row["Round"]);
      const pickInRound = Number(row["Pick In Round"]);
      const overallSlot = Number(row["Overall"]);
      const teamId = Number(row["Team ID"]);
      if (!playerId || !round || !teamId || !overallSlot) continue;

      // Keyed by (draftYear, overallSlot) — the actual unique identifier of
      // a pick. Round+team is NOT unique: a team can have several picks in
      // one round (comp/supplemental picks), which is exactly what caused
      // the earlier bug where extra same-team-same-round picks overwrote
      // each other instead of being tracked separately.
      const pickRecord = await prisma.pick.upsert({
        where: { draftYear_overallSlot: { draftYear, overallSlot } },
        update: { round, pickInRound, originalTeamId: teamId, currentOwnerTeamId: teamId },
        create: { draftYear, round, pickInRound, overallSlot, originalTeamId: teamId, currentOwnerTeamId: teamId },
      });

      const existing = await prisma.draftResult.findUnique({ where: { pickId: pickRecord.id } });
      if (existing) {
        if (existing.playerId !== playerId || existing.round !== round || existing.pickInRound !== pickInRound) {
          await prisma.draftResult.update({
            where: { pickId: pickRecord.id },
            data: { playerId, teamId, round, pickInRound, overallSlot },
          });
          updated++;
        }
      } else {
        await prisma.draftResult.create({
          data: { pickId: pickRecord.id, playerId, teamId, year: draftYear, round, pickInRound, overallSlot },
        });
        created++;
      }

      // College is a plain 1/0 flag, NOT a school name — the API doesn't
      // give us an actual college name anywhere, so "HS" vs "College" is
      // the most specific this can ever be from this data source.
      const collegeFlag = row["College"];
      const isCollege = collegeFlag === "1" ? true : collegeFlag === "0" ? false : null;
      const existingPlayer = await prisma.player.findUnique({ where: { id: playerId } });
      if (existingPlayer && existingPlayer.isCollege !== isCollege) {
        await prisma.player.update({ where: { id: playerId }, data: { isCollege } });
        collegeUpdates++;
      }
    }

    results.picks = { ok: true, created, updated, collegeUpdates, totalSeen: rows.length, sampleRows: rows.slice(0, 5) };
  } catch (err: any) {
    results.picks = { ok: false, error: String(err?.message ?? err) };
  }

  return NextResponse.json({ ok: true, results });
}
