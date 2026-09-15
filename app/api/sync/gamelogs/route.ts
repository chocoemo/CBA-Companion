import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameHistory, getAtBats } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

export const maxDuration = 60; // give the /atbats bulk insert room to run on a big in-season CSV

function bool(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}
function numOrNull(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// POST /api/sync/gamelogs
// Runs on the same 4x/day schedule as the rest of the routine sync — see
// sync.yml. /gamehistory is a cheap local cache (StatsPlus already keeps
// history). /atbats is the one that actually matters to keep calling
// forever: it's current-season-only at the source and this table is the
// permanent record once a season passes.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const results: Record<string, unknown> = {};

  // --- Game boxes ---
  try {
    const rows = await getGameHistory();
    const data = rows
      .filter((r) => r["game_id"])
      .map((r) => ({
        gameId: r["game_id"],
        leagueId: numOrNull(r["league_id"]),
        awayTeamId: Number(r["away_team"]),
        homeTeamId: Number(r["home_team"]),
        attendance: numOrNull(r["attendance"]),
        date: r["date"],
        time: r["time"] || null,
        gameType: Number(r["game_type"] ?? 0),
        played: r["played"] === "1",
        dh: numOrNull(r["dh"]),
        innings: numOrNull(r["innings"]),
        runsAway: numOrNull(r["runs0"]),
        runsHome: numOrNull(r["runs1"]),
        hitsAway: numOrNull(r["hits0"]),
        hitsHome: numOrNull(r["hits1"]),
        errorsAway: numOrNull(r["errors0"]),
        errorsHome: numOrNull(r["errors1"]),
        winningPitcherId: numOrNull(r["winning_pitcher"]),
        losingPitcherId: numOrNull(r["losing_pitcher"]),
        savePitcherId: numOrNull(r["save_pitcher"]),
        starterAwayId: numOrNull(r["starter0"]),
        starterHomeId: numOrNull(r["starter1"]),
        cup: r["cup"] === "1",
        raw: r,
      }));

    const inserted = await prisma.gameBox.createMany({ data, skipDuplicates: true });
    results.gameBoxes = { ok: true, seen: data.length, newlyInserted: inserted.count };
  } catch (err: any) {
    results.gameBoxes = { ok: false, error: String(err?.message ?? err) };
  }

  // --- Plate appearances (whole league, no filters — see design note) ---
  try {
    const rows = await getAtBats();

    // /atbats returns the ENTIRE current season every call. Pushing all of
    // it at the database every sync (even with skipDuplicates absorbing
    // the writes) meant re-transmitting the full season 4x/day, which is
    // what burned through the free tier's network-transfer quota. Games
    // already stored are filtered out here, client-side, so only genuinely
    // new games get sent.
    const storedGames = await prisma.plateAppearance.findMany({
      select: { gameId: true },
      distinct: ["gameId"],
    });
    const storedGameIds = new Set(storedGames.map((g) => g.gameId));

    const data = rows
      .filter((r) => r["game_id"] && r["player_id"])
      .filter((r) => !storedGameIds.has(r["game_id"]))
      .map((r) => ({
        gameId: r["game_id"],
        playerId: Number(r["player_id"]),
        pitcherId: Number(r["pitcher_id"]),
        teamId: Number(r["team_id"]),
        leagueId: numOrNull(r["league_id"]),
        date: r["date"],
        time: r["time"] || null,
        gameType: Number(r["game_type"] ?? 0),
        homeTeam: numOrNull(r["home_team"]),
        inning: Number(r["inning"] ?? 0),
        outs: Number(r["outs"] ?? 0),
        spot: numOrNull(r["spot"]),
        balls: numOrNull(r["balls"]),
        strikes: numOrNull(r["strikes"]),
        result: Number(r["result"] ?? 0),
        sac: bool(r["sac"]),
        pinch: bool(r["pinch"]),
        base1: bool(r["base1"]),
        base2: bool(r["base2"]),
        base3: bool(r["base3"]),
        close: bool(r["close"]),
        runDiff: numOrNull(r["run_diff"]),
        rbi: numOrNull(r["rbi"]),
        r: numOrNull(r["r"]),
        sb: numOrNull(r["sb"]),
        cs: numOrNull(r["cs"]),
        hitLoc: r["hit_loc"] || null,
        hitXy: r["hit_xy"] || null,
        exitVelo: numOrNull(r["exit_velo"]),
        launchAngle: numOrNull(r["launch_angle"]),
        sprintSpeed: numOrNull(r["sprint_speed"]),
      }));

    const inserted = await prisma.plateAppearance.createMany({ data, skipDuplicates: true });
    results.plateAppearances = {
      ok: true,
      newRowsSent: data.length,
      newlyInserted: inserted.count,
      gamesAlreadyStored: storedGameIds.size,
      totalRowsFromApi: rows.length,
    };
  } catch (err: any) {
    results.plateAppearances = { ok: false, error: String(err?.message ?? err) };
  }

  return NextResponse.json({ ok: true, results });
}
