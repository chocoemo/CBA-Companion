import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerBatStats, getPlayerPitchStats, getDate } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/playerstats?year=YYYY
// KNOWN GAP: exact column names for /playerbatstatsv2 and /playerpitchstatsv2
// aren't confirmed from a real sample yet — this tries several plausible
// key variants per field (OOTP-style snake_case, several common
// abbreviations) and keeps the full raw row regardless, so nothing is lost
// even where the mapped columns come back null. Send a real sample and
// I'll hard-map it precisely, same as every other endpoint here started.
function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}
function n(v: string | undefined): number | null {
  if (v === undefined) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(req.url);
  let year = searchParams.get("year") ? Number(searchParams.get("year")) : null;
  if (!year) {
    const date = await getDate();
    year = Number(date.slice(0, 4));
  }

  const results: Record<string, unknown> = { year };

  try {
    const rows = await getPlayerBatStats(year);
    const data = rows
      .filter((r) => pick(r, "player_id", "id"))
      .map((r) => ({
        playerId: Number(pick(r, "player_id", "id")),
        year: year!,
        teamId: n(pick(r, "team_id")),
        leagueId: n(pick(r, "league_id")),
        g: n(pick(r, "g", "games")),
        gs: n(pick(r, "gs", "games_started")),
        h: n(pick(r, "h", "hits")),
        doubles: n(pick(r, "2b", "doubles")),
        triples: n(pick(r, "3b", "triples")),
        hr: n(pick(r, "hr", "home_runs")),
        r: n(pick(r, "r", "runs")),
        rbi: n(pick(r, "rbi")),
        sb: n(pick(r, "sb", "stolen_bases")),
        cs: n(pick(r, "cs", "caught_stealing")),
        bb: n(pick(r, "bb", "walks")),
        k: n(pick(r, "k", "so", "strikeouts")),
        avg: n(pick(r, "avg", "ba")),
        obp: n(pick(r, "obp")),
        slg: n(pick(r, "slg")),
        ops: n(pick(r, "ops")),
        opsPlus: n(pick(r, "ops_plus", "opsplus", "ops+")),
        wrcPlus: n(pick(r, "wrc_plus", "wrcplus", "wrc+")),
        wpa: n(pick(r, "wpa")),
        war: n(pick(r, "war", "b_war", "bwar")),
        raw: r,
      }));

    for (const row of data) {
      await prisma.playerSeasonBatting.upsert({
        where: { playerId_year: { playerId: row.playerId, year: row.year } },
        update: row,
        create: row,
      });
    }
    results.batting = { ok: true, count: data.length };
  } catch (err: any) {
    results.batting = { ok: false, error: String(err?.message ?? err) };
  }

  try {
    const rows = await getPlayerPitchStats(year);
    const data = rows
      .filter((r) => pick(r, "player_id", "id"))
      .map((r) => ({
        playerId: Number(pick(r, "player_id", "id")),
        year: year!,
        teamId: n(pick(r, "team_id")),
        leagueId: n(pick(r, "league_id")),
        g: n(pick(r, "g", "games")),
        gs: n(pick(r, "gs", "games_started")),
        qs: n(pick(r, "qs", "quality_starts")),
        w: n(pick(r, "w", "wins")),
        l: n(pick(r, "l", "losses")),
        sv: n(pick(r, "sv", "saves")),
        bs: n(pick(r, "bs", "blown_saves")),
        r: n(pick(r, "r", "runs")),
        er: n(pick(r, "er", "earned_runs")),
        era: n(pick(r, "era")),
        whip: n(pick(r, "whip")),
        ip: n(pick(r, "ip", "innings_pitched")),
        bb: n(pick(r, "bb", "walks")),
        k: n(pick(r, "k", "so", "strikeouts")),
        eraPlus: n(pick(r, "era_plus", "eraplus", "era+")),
        fipMinus: n(pick(r, "fip_minus", "fipminus", "fip-")),
        wpa: n(pick(r, "wpa")),
        war: n(pick(r, "war", "p_war", "pwar")),
        raw: r,
      }));

    for (const row of data) {
      await prisma.playerSeasonPitching.upsert({
        where: { playerId_year: { playerId: row.playerId, year: row.year } },
        update: row,
        create: row,
      });
    }
    results.pitching = { ok: true, count: data.length };
  } catch (err: any) {
    results.pitching = { ok: false, error: String(err?.message ?? err) };
  }

  return NextResponse.json({ ok: true, results });
}
