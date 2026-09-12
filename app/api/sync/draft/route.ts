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
    results.pool = { ok: true, remaining: remainingIds.length };
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
      const overallSlot = Number(row["Overall"]);
      const teamId = Number(row["Team ID"]);
      if (!playerId || !round || !teamId) continue;

      // Ensure the Pick row exists — original owner isn't known from
      // draftv2 alone (that comes from the pre-draft pick order / trade
      // history), so if it's not already in the DB, seed it with
      // currentOwner = the team that actually picked (best info at draft time).
      const pickRecord = await prisma.pick.upsert({
        where: { draftYear_round_originalTeamId: { draftYear, round, originalTeamId: teamId } },
        update: overallSlot ? { overallSlot } : {},
        create: { draftYear, round, overallSlot, originalTeamId: teamId, currentOwnerTeamId: teamId },
      });

      const existing = await prisma.draftResult.findUnique({ where: { pickId: pickRecord.id } });
      if (existing) {
        if (existing.playerId !== playerId) {
          await prisma.draftResult.update({ where: { pickId: pickRecord.id }, data: { playerId } });
          updated++;
        }
      } else {
        await prisma.draftResult.create({
          data: { pickId: pickRecord.id, playerId, teamId, year: draftYear, round, overallSlot: overallSlot || 0 },
        });
        created++;
      }

      // College: 0/empty means a high schooler — persisted on Player since
      // it's a fixed attribute of the player, not just this pick.
      const collegeRaw = (row["College"] ?? "").trim();
      const college = collegeRaw && collegeRaw !== "0" ? collegeRaw : null;
      const existingPlayer = await prisma.player.findUnique({ where: { id: playerId } });
      if (existingPlayer && existingPlayer.college !== college) {
        await prisma.player.update({ where: { id: playerId }, data: { college } });
        collegeUpdates++;
      }
    }

    results.picks = { ok: true, created, updated, collegeUpdates, totalSeen: rows.length };
  } catch (err: any) {
    results.picks = { ok: false, error: String(err?.message ?? err) };
  }

  return NextResponse.json({ ok: true, results });
}
