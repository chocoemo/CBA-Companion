import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayers, POSITION_IDS, ROLE_IDS, BATS_THROWS, MINOR_LEVEL_FROM_OOTP } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";
import type { MinorLevel } from "@prisma/client";

// POST /api/sync/players — pulls /players?retired=0 and upserts on Player ID.
// This is the join key for every other import (ratings, contracts, CSVs).
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const log = await prisma.syncLog.create({
    data: { endpoint: "/players", status: "pending" },
  });

  try {
    const rows = await getPlayers({ retiredOnly0: true });
    let count = 0;

    for (const row of rows) {
      const teamId = Number(row["Team ID"] ?? 0);
      const orgId = Number(row["Organization ID"] ?? 0);
      const level = MINOR_LEVEL_FROM_OOTP[Number(row["Level"] ?? 0)] as MinorLevel | undefined;

      await prisma.player.upsert({
        where: { id: Number(row["ID"]) },
        update: {
          firstName: row["First Name"],
          lastName: row["Last Name"],
          teamId: teamId > 0 ? teamId : null,
          organizationId: orgId > 0 ? orgId : null,
          level: level ?? null,
          pos: POSITION_IDS[Number(row["Pos"])] ?? row["Pos"],
          role: ROLE_IDS[Number(row["Role"])] ?? null,
          age: row["Age"] ? Number(row["Age"]) : null,
          bats: BATS_THROWS[Number(row["bats"])] ?? null,
          throws: BATS_THROWS[Number(row["throws"])] ?? null,
          retired: row["Retired"] === "1",
          draftYear: row["draft_year"] ? Number(row["draft_year"]) : null,
          draftRound: row["draft_round"] ? Number(row["draft_round"]) : null,
          draftOverallPick: row["draft_overall_pick"] ? Number(row["draft_overall_pick"]) : null,
          mlbServiceYears: row["mlb_service_years"] ? Number(row["mlb_service_years"]) : null,
          mlbServiceDays: row["mlb_service_days"] ? Number(row["mlb_service_days"]) : null,
          isActive: row["is_active"] === "1",
          rawImport: row,
        },
        create: {
          id: Number(row["ID"]),
          firstName: row["First Name"],
          lastName: row["Last Name"],
          teamId: teamId > 0 ? teamId : null,
          organizationId: orgId > 0 ? orgId : null,
          level: level ?? null,
          pos: POSITION_IDS[Number(row["Pos"])] ?? row["Pos"],
          role: ROLE_IDS[Number(row["Role"])] ?? null,
          age: row["Age"] ? Number(row["Age"]) : null,
          bats: BATS_THROWS[Number(row["bats"])] ?? null,
          throws: BATS_THROWS[Number(row["throws"])] ?? null,
          retired: row["Retired"] === "1",
          draftYear: row["draft_year"] ? Number(row["draft_year"]) : null,
          draftRound: row["draft_round"] ? Number(row["draft_round"]) : null,
          draftOverallPick: row["draft_overall_pick"] ? Number(row["draft_overall_pick"]) : null,
          mlbServiceYears: row["mlb_service_years"] ? Number(row["mlb_service_years"]) : null,
          mlbServiceDays: row["mlb_service_days"] ? Number(row["mlb_service_days"]) : null,
          isActive: row["is_active"] === "1",
          rawImport: row,
        },
      });
      count++;
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "ok", finishedAt: new Date(), message: `${count} players upserted` },
    });

    return NextResponse.json({ ok: true, count });
  } catch (err: any) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) },
    });
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
