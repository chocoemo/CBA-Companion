import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/draft-results?year=YYYY&teamId=105
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
  const teamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined;

  const results = await prisma.draftResult.findMany({
    where: { ...(year ? { year } : {}), ...(teamId ? { teamId } : {}) },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, pos: true, age: true } },
      team: { select: { id: true, abbr: true, name: true, nickname: true } },
    },
    orderBy: [{ overallSlot: "asc" }],
  });

  return NextResponse.json(
    results.map((r) => ({
      id: r.id,
      round: r.round,
      pickInRound: r.pickInRound,
      overallSlot: r.overallSlot,
      intendedLevel: r.intendedLevel,
      team: { id: r.team.id, name: `${r.team.name} ${r.team.nickname}` },
      player: { id: r.player.id, name: `${r.player.firstName} ${r.player.lastName}`, pos: r.player.pos, age: r.player.age },
    }))
  );
}

// PATCH /api/draft-results  { id, intendedLevel }
export async function PATCH(req: Request) {
  const { id, intendedLevel } = await req.json();
  const result = await prisma.draftResult.update({
    where: { id: Number(id) },
    data: { intendedLevel: intendedLevel || null },
  });
  return NextResponse.json(result);
}
