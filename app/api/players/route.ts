import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js caches GET route handlers at build time by default unless told
// otherwise — without this, the response gets frozen as whatever the
// database looked like during the Vercel build (empty, since syncs hadn't
// run yet), and never re-queries the database on real requests afterward.
export const dynamic = "force-dynamic";

// GET /api/players?pool=draft|fa|international|all&teamId=105 (default: all)
// - draft: players in the most recent /draftpool snapshot (the live draft
//   class). Rough for now until draft-eligibility flagging is refined.
// - fa: no current team (free agents).
// - international: player's League is confirmed NOT CBA-affiliated (see
//   the League table / Settings — leagues default to unconfirmed until you
//   classify them, so this only includes ones explicitly marked foreign).
// - all: everyone, no pool filter — REQUIRES teamId (see MAX_UNFILTERED
//   below for why: 9000+ players with ratings joined blew the serverless
//   timeout and came back as an HTML error page instead of JSON).
const MAX_UNFILTERED = 500;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pool = searchParams.get("pool") ?? "all";
  const teamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : null;

  let draftPoolIds: number[] | null = null;
  let foreignLeagueIds: number[] | null = null;

  if (pool === "draft") {
    const latestSnapshot = await prisma.draftPoolSnapshot.findFirst({ orderBy: { asOf: "desc" } });
    draftPoolIds = (latestSnapshot?.remainingPlayerIds as number[] | undefined) ?? [];
  } else if (pool === "international") {
    const foreignLeagues = await prisma.league.findMany({ where: { isCbaAffiliated: false } });
    foreignLeagueIds = foreignLeagues.map((l) => l.id);
  }

  // "all" with no team filter is the dangerous case — the whole player
  // database with ratings joined is too big for one request. Require a
  // team, or cap it hard and tell the caller why the list is truncated.
  const isUnboundedAll = pool === "all" && !teamId;

  const players = await prisma.player.findMany({
    where: {
      retired: false,
      ...(pool === "fa" ? { teamId: null } : {}),
      ...(foreignLeagueIds ? { leagueId: { in: foreignLeagueIds } } : {}),
      ...(draftPoolIds ? { id: { in: draftPoolIds } } : {}),
      ...(teamId ? { teamId } : {}),
    },
    include: {
      team: { select: { id: true, name: true, nickname: true, abbr: true } },
      ratings: {
        orderBy: { capturedAt: "desc" },
        take: 2, // one SCOUT + one OSA is all we need — take:10 was needlessly heavy at this row count
      },
    },
    orderBy: { lastName: "asc" },
    take: isUnboundedAll ? MAX_UNFILTERED : undefined,
  });

  const shaped = players.map((p) => {
    const scout = p.ratings.find((r) => r.source === "SCOUT");
    const osa = p.ratings.find((r) => r.source === "OSA");
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      team: p.team ? { id: p.team.id, abbr: p.team.abbr } : null,
      level: p.level,
      pos: p.pos,
      role: p.role,
      age: p.age,
      bats: p.bats,
      throws: p.throws,
      leagueId: p.leagueId,
      scout: scout ? { overall: scout.overall, potential: scout.potential, tools: scout.tools, capturedAt: scout.capturedAt } : null,
      osa: osa ? { overall: osa.overall, potential: osa.potential, tools: osa.tools, capturedAt: osa.capturedAt } : null,
    };
  });

  return NextResponse.json({
    players: shaped,
    truncated: isUnboundedAll && players.length === MAX_UNFILTERED,
  });
}
