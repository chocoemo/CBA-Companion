import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js caches GET route handlers at build time by default unless told
// otherwise — without this, the response gets frozen as whatever the
// database looked like during the Vercel build (empty, since syncs hadn't
// run yet), and never re-queries the database on real requests afterward.
export const dynamic = "force-dynamic";

// GET /api/players?pool=draft|fa|international|all (default: all)
// - draft: players in the most recent /draftpool snapshot (the live draft
//   class). Rough for now until draft-eligibility flagging is refined.
// - fa: no current team (free agents).
// - international: player's League is confirmed NOT CBA-affiliated (see
//   the League table / Settings — leagues default to unconfirmed until you
//   classify them, so this only includes ones explicitly marked foreign).
// - all: everyone, no pool filter (used by tabs that want the whole DB).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pool = searchParams.get("pool") ?? "all";

  let draftPoolIds: number[] | null = null;
  let foreignLeagueIds: number[] | null = null;

  if (pool === "draft") {
    const latestSnapshot = await prisma.draftPoolSnapshot.findFirst({ orderBy: { asOf: "desc" } });
    draftPoolIds = (latestSnapshot?.remainingPlayerIds as number[] | undefined) ?? [];
  } else if (pool === "international") {
    const foreignLeagues = await prisma.league.findMany({ where: { isCbaAffiliated: false } });
    foreignLeagueIds = foreignLeagues.map((l) => l.id);
  }

  const players = await prisma.player.findMany({
    where: {
      retired: false,
      ...(pool === "fa" ? { teamId: null } : {}),
      ...(foreignLeagueIds ? { leagueId: { in: foreignLeagueIds } } : {}),
      ...(draftPoolIds ? { id: { in: draftPoolIds } } : {}),
    },
    include: {
      team: { select: { id: true, name: true, nickname: true, abbr: true } },
      ratings: {
        orderBy: { capturedAt: "desc" },
        take: 10, // enough to find the latest of each source without a second query
      },
    },
    orderBy: { lastName: "asc" },
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

  return NextResponse.json(shaped);
}
