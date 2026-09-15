import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/players/[id]/stats?year=YYYY (defaults to most recent on file)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const playerId = Number(params.id);
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  const batting = await prisma.playerSeasonBatting.findFirst({
    where: { playerId, ...(year ? { year } : {}) },
    orderBy: { year: "desc" },
  });
  const pitching = await prisma.playerSeasonPitching.findFirst({
    where: { playerId, ...(year ? { year } : {}) },
    orderBy: { year: "desc" },
  });

  return NextResponse.json({ batting, pitching });
}
