import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSyncSecret } from "@/lib/auth";

export const maxDuration = 60;

// POST /api/admin/cleanup?mode=report|prune-ratings|truncate-ratings
//
// Storage relief. The original ratings sync wrote a row per player per
// source on every run, so a free-tier database fills up in days. The sync
// itself is fixed (it now only writes real changes), but existing bloat
// still needs clearing.
//
//   report           — counts only, changes nothing. Start here.
//   prune-ratings    — keeps only the most recent snapshot per
//                      (player, source); deletes the rest. Preserves
//                      "current ratings" everywhere in the app, loses
//                      historical rating-change tracking.
//   truncate-ratings — empties the ratings table entirely. Fastest way to
//                      reclaim space (TRUNCATE doesn't generate the WAL
//                      churn a big DELETE does, which matters when you're
//                      at the storage cap). Re-run the ratings sync
//                      afterward to repopulate current values.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "report";

  if (mode === "report") {
    const [ratings, plateAppearances, gameBoxes, draftPools, standings, batting, pitching] = await Promise.all([
      prisma.ratingSnapshot.count(),
      prisma.plateAppearance.count(),
      prisma.gameBox.count(),
      prisma.draftPoolSnapshot.count(),
      prisma.standingsSnapshot.count(),
      prisma.playerSeasonBatting.count(),
      prisma.playerSeasonPitching.count(),
    ]);
    return NextResponse.json({
      ok: true,
      mode,
      rowCounts: { ratings, plateAppearances, gameBoxes, draftPools, standings, batting, pitching },
      note: "ratingSnapshot is almost always the culprit — it's the table that grew per-player-per-sync.",
    });
  }

  if (mode === "truncate-ratings") {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "RatingSnapshot"`);
    return NextResponse.json({ ok: true, mode, note: "Ratings cleared. Re-run the ratings sync to repopulate current values." });
  }

  if (mode === "prune-ratings") {
    // Keep the newest row per (playerId, source); delete everything older.
    const deleted = await prisma.$executeRawUnsafe(`
      DELETE FROM "RatingSnapshot" r
      USING (
        SELECT "playerId", "source", MAX("capturedAt") AS newest
        FROM "RatingSnapshot"
        GROUP BY "playerId", "source"
      ) keep
      WHERE r."playerId" = keep."playerId"
        AND r."source" = keep."source"
        AND r."capturedAt" < keep.newest
    `);
    return NextResponse.json({ ok: true, mode, deletedRows: deleted });
  }

  return NextResponse.json({ ok: false, error: `Unknown mode "${mode}"` }, { status: 400 });
}
