import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeams, getPlayers, requestRatings, POSITION_IDS, ROLE_IDS, BATS_THROWS, MINOR_LEVEL_FROM_OOTP } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";
import type { MinorLevel } from "@prisma/client";

// POST /api/sync/run-all
// One call that does everything FAST (teams + players), then kicks off both
// ratings dumps (scout + OSA) and hands back their logIds so the caller
// (the GitHub Actions schedule) can poll them separately — ratings take a
// couple minutes and a serverless function can't just sit and wait that long.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const results: Record<string, unknown> = {};

  // Teams
  try {
    const teamRows = await getTeams();
    for (const row of teamRows) {
      await prisma.team.upsert({
        where: { id: Number(row["ID"]) },
        update: { name: row["Name"], nickname: row["Nickname"] },
        create: {
          id: Number(row["ID"]),
          name: row["Name"],
          nickname: row["Nickname"],
          abbr: row["Nickname"]?.slice(0, 3).toUpperCase() ?? "???",
        },
      });
    }
    results.teams = { ok: true, count: teamRows.length };
  } catch (err: any) {
    results.teams = { ok: false, error: String(err?.message ?? err) };
  }

  // Players
  try {
    const playerRows = await getPlayers({ retiredOnly0: true });
    let count = 0;
    for (const row of playerRows) {
      const teamId = Number(row["Team ID"] ?? 0);
      const level = MINOR_LEVEL_FROM_OOTP[Number(row["Level"] ?? 0)] as MinorLevel | undefined;
      const data = {
        firstName: row["First Name"],
        lastName: row["Last Name"],
        teamId: teamId > 0 ? teamId : null,
        level: level ?? null,
        pos: POSITION_IDS[Number(row["Pos"])] ?? row["Pos"],
        role: ROLE_IDS[Number(row["Role"])] ?? null,
        age: row["Age"] ? Number(row["Age"]) : null,
        bats: BATS_THROWS[Number(row["bats"])] ?? null,
        throws: BATS_THROWS[Number(row["throws"])] ?? null,
        retired: row["Retired"] === "1",
        rawImport: row,
      };
      await prisma.player.upsert({
        where: { id: Number(row["ID"]) },
        update: data,
        create: { id: Number(row["ID"]), ...data },
      });
      count++;
    }
    results.players = { ok: true, count };
  } catch (err: any) {
    results.players = { ok: false, error: String(err?.message ?? err) };
  }

  // Kick off both ratings dumps — polling happens in a follow-up call.
  for (const source of ["scout", "osa"] as const) {
    const endpoint = source === "osa" ? "/ratings:osa" : "/ratings:scout";
    const log = await prisma.syncLog.create({ data: { endpoint, status: "pending" } });
    try {
      const mycsvUrl = await requestRatings(source === "osa");
      await prisma.syncLog.update({ where: { id: log.id }, data: { message: mycsvUrl } });
      results[`ratings_${source}`] = { ok: true, logId: log.id };
    } catch (err: any) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) },
      });
      results[`ratings_${source}`] = { ok: false, error: String(err?.message ?? err) };
    }
  }

  return NextResponse.json({ ok: true, results });
}
