import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/sync/playerstats/debug
// Read-only. Shows a couple of stored rows' raw payload so the guessed
// column mapping in /api/sync/playerstats can be confirmed/fixed against
// real StatsPlus field names instead of trusting the guess blindly.
export async function GET() {
  const battingSample = await prisma.playerSeasonBatting.findMany({ take: 2, orderBy: { id: "desc" } });
  const pitchingSample = await prisma.playerSeasonPitching.findMany({ take: 2, orderBy: { id: "desc" } });

  return NextResponse.json({
    battingCount: await prisma.playerSeasonBatting.count(),
    pitchingCount: await prisma.playerSeasonPitching.count(),
    battingSample: battingSample.map((r) => ({ mapped: { ...r, raw: undefined }, rawKeys: r.raw ? Object.keys(r.raw as object) : [], raw: r.raw })),
    pitchingSample: pitchingSample.map((r) => ({ mapped: { ...r, raw: undefined }, rawKeys: r.raw ? Object.keys(r.raw as object) : [], raw: r.raw })),
  });
}
