import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollRatings } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";
import type { RatingSource } from "@prisma/client";

// POST /api/sync/ratings/poll  { logId }
// Polls the mycsv URL stored by /ratings/start. Call every 15-30s until it
// reports "ready" (or "error"/"pending" per the two-step protocol).
//
// NOTE on column mapping: the API docs explicitly warn the ratings column
// set/order can change and shouldn't be hardcoded. Until we've seen a real
// dump from your league, every column is preserved in `raw`, and this route
// makes a best-effort guess at which columns are the player id / overall /
// potential so the player card has something to show immediately. Once you
// send a sample export, I'll tighten this to pull every named tool
// (contact/power/eye/babip/stuff/control/etc.) into the `tools` field
// explicitly instead of relying on the guess below.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { logId } = await req.json();
  const log = await prisma.syncLog.findUniqueOrThrow({ where: { id: logId } });
  if (!log.message) {
    return NextResponse.json({ ok: false, error: "No poll URL stored for this log entry" }, { status: 400 });
  }

  const source: RatingSource = log.endpoint.endsWith("osa") ? "OSA" : "SCOUT";
  const result = await pollRatings(log.message);

  if (result.status === "pending") {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (result.status === "error") {
    await prisma.syncLog.update({
      where: { id: logId },
      data: { status: "error", finishedAt: new Date(), message: result.message },
    });
    return NextResponse.json({ ok: false, status: "error", error: result.message }, { status: 500 });
  }

  const idKey = Object.keys(result.rows[0] ?? {}).find((k) => /^(id|player id|player_id)$/i.test(k));
  if (!idKey) {
    return NextResponse.json(
      { ok: false, error: "Could not find a player id column in the ratings dump — send a sample so I can map it." },
      { status: 500 }
    );
  }
  const overallKey = Object.keys(result.rows[0] ?? {}).find((k) => /overall/i.test(k));
  const potentialKey = Object.keys(result.rows[0] ?? {}).find((k) => /potential/i.test(k));

  let count = 0;
  const capturedAt = new Date();
  for (const row of result.rows) {
    const playerId = Number(row[idKey]);
    if (!playerId) continue;

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) continue; // sync /players first so ratings always join to a known player

    await prisma.ratingSnapshot.create({
      data: {
        playerId,
        source,
        capturedAt,
        overall: overallKey ? Number(row[overallKey]) || null : null,
        potential: potentialKey ? Number(row[potentialKey]) || null : null,
        tools: row,
        raw: row,
      },
    });
    count++;
  }

  await prisma.syncLog.update({
    where: { id: logId },
    data: { status: "ok", finishedAt: new Date(), message: `${count} rating snapshots stored` },
  });

  return NextResponse.json({ ok: true, status: "ready", count });
}
