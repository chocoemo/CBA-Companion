import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDraftPool, getDraftV2, getDate } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// The CBA drafts all 30 teams in one combined draft, one pick per round per
// team (constitution 2.8.1) — used to compute an overall pick number from
// round + pick-in-round when draftv2 doesn't hand one back directly.
const DRAFT_TEAM_COUNT = 30;

// POST /api/sync/draft?year=YYYY
// Unlike /ratings, /draftpool and /draftv2 have NO documented rate limit —
// this is meant to be called often (every 30-60s) while the draft is live,
// driven by the draft-watch GitHub Actions workflow, not the 4x/day one.
//
// KNOWN GAP: the exact JSON shape of /draftv2 isn't published in the API
// docs beyond "current draft status (players picked so far)". This route
// stores the full raw payload every time and makes a best-effort guess at
// field names for round/pick/team/player. Once you run this live, send me
// a sample response and I'll hard-map it precisely.
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
    const draftStatus = await getDraftV2();
    const picks = extractPicks(draftStatus);
    let created = 0;
    let updated = 0;

    for (const pick of picks) {
      if (!pick.round || !pick.teamId || !pick.playerId) continue;
      const pickInRound = pick.pickInRound ?? pick.overallSlot ?? null;
      const overallSlot =
        pick.overallSlot ?? (pickInRound ? (pick.round - 1) * DRAFT_TEAM_COUNT + pickInRound : null);

      // Ensure the Pick row exists — original owner isn't known from draftv2
      // alone (that comes from the pre-draft pick order / trade history), so
      // if it's not already in the DB, seed it with currentOwner = the team
      // that actually picked (best info available at draft time).
      const pickRecord = await prisma.pick.upsert({
        where: { draftYear_round_originalTeamId: { draftYear, round: pick.round, originalTeamId: pick.teamId } },
        update: overallSlot ? { overallSlot } : {},
        create: {
          draftYear,
          round: pick.round,
          overallSlot,
          originalTeamId: pick.teamId,
          currentOwnerTeamId: pick.teamId,
        },
      });

      const existing = await prisma.draftResult.findUnique({ where: { pickId: pickRecord.id } });
      if (existing) {
        if (existing.playerId !== pick.playerId) {
          await prisma.draftResult.update({
            where: { pickId: pickRecord.id },
            data: { playerId: pick.playerId },
          });
          updated++;
        }
      } else {
        await prisma.draftResult.create({
          data: {
            pickId: pickRecord.id,
            playerId: pick.playerId,
            teamId: pick.teamId,
            year: draftYear,
            round: pick.round,
            overallSlot: overallSlot ?? 0,
          },
        });
        created++;
      }
    }

    results.picks = { ok: true, created, updated, totalSeen: picks.length, raw: draftStatus };
  } catch (err: any) {
    results.picks = { ok: false, error: String(err?.message ?? err) };
  }

  return NextResponse.json({ ok: true, results });
}

type ExtractedPick = {
  round: number | null;
  pickInRound: number | null;
  overallSlot: number | null;
  teamId: number | null;
  playerId: number | null;
};

// Defensive parsing: draftv2's exact shape isn't in the published docs, so
// this tries several plausible key names rather than assuming one.
function extractPicks(payload: any): ExtractedPick[] {
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.picks)
    ? payload.picks
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return list.map((row) => ({
    round: numOrNull(row.round ?? row.Round ?? row.round_num),
    pickInRound: numOrNull(row.pick ?? row.Pick ?? row.pick_num ?? row.pick_in_round),
    overallSlot: numOrNull(row.overall_pick ?? row.overallPick ?? row.overall ?? row.pick_overall),
    teamId: numOrNull(row.team_id ?? row.teamId ?? row.Team ?? row.TeamID),
    playerId: numOrNull(row.player_id ?? row.playerId ?? row.Player ?? row.PlayerID ?? row.id),
  }));
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== undefined && v !== "" ? n : null;
}
