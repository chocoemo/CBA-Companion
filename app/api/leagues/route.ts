import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/leagues — every league seen from /lgdata syncs, for the Settings
// page to classify as CBA-affiliated or not.
export async function GET() {
  const leagues = await prisma.league.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(leagues);
}

// PATCH /api/leagues  { id, isCbaAffiliated }
export async function PATCH(req: Request) {
  const { id, isCbaAffiliated } = await req.json();
  const league = await prisma.league.update({
    where: { id: Number(id) },
    data: { isCbaAffiliated: Boolean(isCbaAffiliated) },
  });
  return NextResponse.json(league);
}
