import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/teams — lightweight list for dropdowns (team switcher, League>Players filter).
// Filters to CBA-affiliated leagues only (via /lgdata's primary_league flag,
// synced onto League.isCbaAffiliated) — the earlier `parentTeamId: null`
// filter was wrong, since an independent international team has no parent
// either and was slipping through right alongside the real CBA orgs.
export async function GET() {
  const cbaLeagues = await prisma.league.findMany({ where: { isCbaAffiliated: true }, select: { id: true } });
  const cbaLeagueIds = cbaLeagues.map((l) => l.id);

  const teams = await prisma.team.findMany({
    where: {
      parentTeamId: null,
      ...(cbaLeagueIds.length > 0 ? { leagueId: { in: cbaLeagueIds } } : {}),
    },
    select: { id: true, name: true, nickname: true, abbr: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(teams);
}
