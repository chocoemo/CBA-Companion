import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSyncSecret } from "@/lib/auth";

// GET /api/sync/ratings/debug
// Read-only inspection of the most recent ratings sync: how many snapshots
// exist, how many have a real overall/potential value, and the raw payload
// of a couple of sample rows — so we can see the ACTUAL column names S+
// sent back instead of guessing. Delete this route once ratings are mapped
// properly; it's diagnostic-only.
export async function GET(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const totalSnapshots = await prisma.ratingSnapshot.count();
  const withOverall = await prisma.ratingSnapshot.count({ where: { NOT: { overall: null } } });
  const totalPlayers = await prisma.player.count();

  const sample = await prisma.ratingSnapshot.findMany({
    take: 3,
    orderBy: { capturedAt: "desc" },
    include: { player: { select: { firstName: true, lastName: true } } },
  });

  const recentLogs = await prisma.syncLog.findMany({
    where: { endpoint: { in: ["/ratings:scout", "/ratings:osa"] } },
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    totalPlayers,
    totalSnapshots,
    snapshotsWithOverallValue: withOverall,
    sample: sample.map((s) => ({
      player: `${s.player.firstName} ${s.player.lastName}`,
      source: s.source,
      overall: s.overall,
      potential: s.potential,
      rawKeys: s.raw ? Object.keys(s.raw as object) : [],
      raw: s.raw,
    })),
    recentSyncLogs: recentLogs,
  });
}
