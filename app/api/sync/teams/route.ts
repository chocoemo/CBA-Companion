import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeams } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/teams — pulls /teams and upserts the Team table.
// Cheap and uncapped by rate limits, safe to call whenever.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const log = await prisma.syncLog.create({
    data: { endpoint: "/teams", status: "pending" },
  });

  try {
    const rows = await getTeams();
    let count = 0;
    for (const row of rows) {
      await prisma.team.upsert({
        where: { id: Number(row["ID"]) },
        update: {
          name: row["Name"],
          nickname: row["Nickname"],
          parentTeamId: Number(row["Parent Team ID"] ?? 0) > 0 ? Number(row["Parent Team ID"]) : null,
        },
        create: {
          id: Number(row["ID"]),
          name: row["Name"],
          nickname: row["Nickname"],
          abbr: row["Nickname"]?.slice(0, 3).toUpperCase() ?? "???",
          parentTeamId: Number(row["Parent Team ID"] ?? 0) > 0 ? Number(row["Parent Team ID"]) : null,
        },
      });
      count++;
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "ok", finishedAt: new Date(), message: `${count} teams upserted` },
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
