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
// than guessed. The raw row copy was REMOVED to halve storage — everything
// needed is mapped into `tools`.
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
  let skippedUnchanged = 0;
  const capturedAt = new Date();

  // Load every player and their latest snapshot hash for this source in
  // two queries instead of two per player — the old per-row findUnique
  // loop was ~19k round trips per sync, which is what blew through the
  // network-transfer quota as much as the row count blew through storage.
  const players = await prisma.player.findMany({ select: { id: true, height: true } });
  const playerById = new Map(players.map((p) => [p.id, p]));

  const latestHashes = new Map<number, string | null>();
  const existing = await prisma.ratingSnapshot.findMany({
    where: { source },
    orderBy: { capturedAt: "desc" },
    select: { playerId: true, toolsHash: true, capturedAt: true },
  });
  for (const snap of existing) {
    if (!latestHashes.has(snap.playerId)) latestHashes.set(snap.playerId, snap.toolsHash);
  }

  const toCreate: any[] = [];
  const heightUpdates: { id: number; height: number }[] = [];

  for (const row of result.rows) {
    const playerId = Number(row[idKey]);
    if (!playerId) continue;

    const player = playerById.get(playerId);
    if (!player) { skippedNoPlayer++; continue; } // sync /players first so ratings always join to a known player

    const tools = buildToolsObject(row);
    if (typeof tools.height === "number" && player.height !== tools.height) {
      heightUpdates.push({ id: playerId, height: tools.height as number });
    }

    const overall = num(row["Ovr"]);
    const potential = num(row["Pot"]);
    const toolsHash = hashTools(overall, potential, tools);

    // Ratings change rarely — writing an identical row 4x/day for every
    // player is what filled the database. Only record actual changes.
    if (latestHashes.get(playerId) === toolsHash) { skippedUnchanged++; continue; }

    toCreate.push({ playerId, source, capturedAt, overall, potential, tools, toolsHash });
    count++;
  }

  if (toCreate.length > 0) {
    await prisma.ratingSnapshot.createMany({ data: toCreate });
  }
  for (const h of heightUpdates) {
    await prisma.player.update({ where: { id: h.id }, data: { height: h.height } });
  }

  await prisma.syncLog.update({
    where: { id: logId },
    data: { status: "ok", finishedAt: new Date(), message: `${count} changed snapshots stored (${skippedUnchanged} unchanged, ${skippedNoPlayer} no matching player)` },
  });

  return NextResponse.json({ ok: true, status: "ready", count, skippedUnchanged, skippedNoPlayer });
}

// Cheap, stable fingerprint of a player's ratings. Not cryptographic —
// it just has to reliably differ when any value differs.
function hashTools(overall: number | null, potential: number | null, tools: Record<string, any>): string {
  const payload = JSON.stringify([overall, potential, tools]);
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (h * 31 + payload.charCodeAt(i)) | 0;
  }
  return String(h);
}
