import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollRatings } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";
import { buildToolsObject, num } from "@/lib/ratingsFieldMap";
import type { RatingSource } from "@prisma/client";

// POST /api/sync/ratings/poll  { logId }
// Polls the mycsv URL stored by /ratings/start. Call every 15-30s until it
// reports "ready" (or "error"/"pending" per the two-step protocol).
//
// Column mapping is now hard-coded from a real export (see
// lib/ratingsFieldMap.ts) — Overall is "Ovr", Potential is "Pot", and every
// named tool (Cntct, Pow, Eye, Stf, Ctrl, etc.) is mapped explicitly rather
// than guessed. The full raw row is still kept in `raw` regardless.
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

  const idKey = Object.keys(result.rows[0] ?? {}).find((k) => /^id$/i.test(k));
  if (!idKey) {
    return NextResponse.json(
      { ok: false, error: "Could not find an ID column in the ratings dump." },
      { status: 500 }
    );
  }

  let count = 0;
  let skippedNoPlayer = 0;
  const capturedAt = new Date();
  for (const row of result.rows) {
    const playerId = Number(row[idKey]);
    if (!playerId) continue;

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) { skippedNoPlayer++; continue; } // sync /players first so ratings always join to a known player

    await prisma.ratingSnapshot.create({
      data: {
        playerId,
        source,
        capturedAt,
        overall: num(row["Ovr"]),
        potential: num(row["Pot"]),
        tools: buildToolsObject(row),
        raw: row,
      },
    });
    count++;
  }

  await prisma.syncLog.update({
    where: { id: logId },
    data: { status: "ok", finishedAt: new Date(), message: `${count} rating snapshots stored (${skippedNoPlayer} skipped, no matching player)` },
  });

  return NextResponse.json({ ok: true, status: "ready", count, skippedNoPlayer });
}
