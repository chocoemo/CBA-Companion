import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/draft-results?year=YYYY
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  const results = await prisma.draftResult.findMany({
    where: year ? { year } : {},
    include: {
      player: { select: { id: true, firstName: true, lastName: true, pos: true, age: true } },
      team: { select: { id: true, abbr: true, name: true } },
    },
    orderBy: [{ round: "asc" }, { overallSlot: "asc" }],
  });

  return NextResponse.json(
    results.map((r) => ({
      id: r.id,
      round: r.round,
      overallSlot: r.overallSlot,
      intendedLevel: r.intendedLevel,
      team: r.team,
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
