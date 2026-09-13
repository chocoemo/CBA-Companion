import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLgData } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";
import type { LeagueTier } from "@prisma/client";

// POST /api/sync/lgdata
// Confirmed live shape (from the published API docs, not guessed):
// { leagues: [{league_id, name, abbr, level, state, parent_league_id, primary_league}],
//   subleagues: [...], divisions: [...],
//   teams: [{team_id, name, nickname, abbr, league_id, sub_league_id, division_id, parent_team_id, level}],
//   standings: [{team_id, g, w, l, t, pos, pct, gb, streak, magic_number}] }
//
// `primary_league` is /lgdata's own "is this a top-level S+ league" flag —
// this is the authoritative CBA-vs-international signal (previously
// guessed/manually classified in Settings). Also the source of REAL team
// abbreviations, replacing the earlier first-3-letters-of-nickname guess
// that /teams sync had to fall back to (that endpoint doesn't carry one).
function guessTier(name: string): LeagueTier | null {
  const n = name.toLowerCase();
  if (n.includes("premier")) return "PREMIER";
  if (n.includes("silver")) return "SILVER";
  if (n.includes("bronze")) return "BRONZE";
  return null;
}

export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const log = await prisma.syncLog.create({ data: { endpoint: "/lgdata", status: "pending" } });

  try {
    const payload = await getLgData();
    const leagues: any[] = payload?.leagues ?? [];
    const teams: any[] = payload?.teams ?? [];
    const standings: any[] = payload?.standings ?? [];

    let leaguesUpserted = 0;
    for (const lg of leagues) {
      const id = Number(lg.league_id);
      if (!id) continue;
      const primaryLeague = !!lg.primary_league;
      await prisma.league.upsert({
        where: { id },
        update: {
          name: lg.name,
          abbr: lg.abbr ?? null,
          level: lg.level ?? null,
          parentLeagueId: lg.parent_league_id || null,
          primaryLeague,
          isCbaAffiliated: primaryLeague,
          tier: guessTier(lg.name ?? ""),
          raw: lg,
        },
        create: {
          id,
          name: lg.name,
          abbr: lg.abbr ?? null,
          level: lg.level ?? null,
          parentLeagueId: lg.parent_league_id || null,
          primaryLeague,
          isCbaAffiliated: primaryLeague,
          tier: guessTier(lg.name ?? ""),
          raw: lg,
        },
      });
      leaguesUpserted++;
    }

    let teamsUpserted = 0;
    for (const t of teams) {
      const id = Number(t.team_id);
      if (!id) continue;
      await prisma.team.upsert({
        where: { id },
        update: {
          name: t.name,
          nickname: t.nickname,
          abbr: t.abbr ?? undefined, // don't blank out a good value with a missing one
          leagueId: t.league_id || null,
          divisionId: t.division_id || null,
          parentTeamId: Number(t.parent_team_id ?? 0) > 0 ? Number(t.parent_team_id) : null,
        },
        create: {
          id,
          name: t.name,
          nickname: t.nickname,
          abbr: t.abbr ?? t.nickname?.slice(0, 3).toUpperCase() ?? "???",
          leagueId: t.league_id || null,
          divisionId: t.division_id || null,
          parentTeamId: Number(t.parent_team_id ?? 0) > 0 ? Number(t.parent_team_id) : null,
        },
      });
      teamsUpserted++;
    }

    let standingsUpserted = 0;
    const asOf = new Date();
    for (const s of standings) {
      const teamId = Number(s.team_id);
      if (!teamId) continue;
      await prisma.standingsSnapshot.create({
        data: {
          teamId,
          asOf,
          wins: Number(s.w ?? 0),
          losses: Number(s.l ?? 0),
          ties: Number(s.t ?? 0),
          gb: s.gb !== undefined && s.gb !== null ? Number(s.gb) : null,
          streak: s.streak ?? null,
          raw: s,
        },
      });
      standingsUpserted++;
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "ok", finishedAt: new Date(), message: `${leaguesUpserted} leagues, ${teamsUpserted} teams, ${standingsUpserted} standings rows` },
    });

    return NextResponse.json({ ok: true, leaguesUpserted, teamsUpserted, standingsUpserted });
  } catch (err: any) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) },
    });
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
