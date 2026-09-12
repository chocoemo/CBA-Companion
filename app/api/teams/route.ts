import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/teams — lightweight list for dropdowns (team switcher, League>Players filter).
export async function GET() {
  const teams = await prisma.team.findMany({
    where: { parentTeamId: null }, // top-level CBA orgs only, not minor-league affiliates
    select: { id: true, name: true, nickname: true, abbr: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(teams);
}
