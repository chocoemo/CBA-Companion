import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/players
// Returns every non-retired player with their MOST RECENT scout snapshot
// and most recent OSA snapshot side by side, so the frontend can default to
// scout and flip to OSA without a second round trip.
export async function GET() {
  const players = await prisma.player.findMany({
    where: { retired: false },
    include: {
      team: { select: { id: true, name: true, nickname: true, abbr: true } },
      ratings: {
        orderBy: { capturedAt: "desc" },
        take: 10, // enough to find the latest of each source without a second query
      },
    },
    orderBy: { lastName: "asc" },
  });

  const shaped = players.map((p) => {
    const scout = p.ratings.find((r) => r.source === "SCOUT");
    const osa = p.ratings.find((r) => r.source === "OSA");
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      team: p.team ? { id: p.team.id, abbr: p.team.abbr } : null,
      level: p.level,
      pos: p.pos,
      role: p.role,
      age: p.age,
      bats: p.bats,
      throws: p.throws,
      scout: scout ? { overall: scout.overall, potential: scout.potential, tools: scout.tools, capturedAt: scout.capturedAt } : null,
      osa: osa ? { overall: osa.overall, potential: osa.potential, tools: osa.tools, capturedAt: osa.capturedAt } : null,
    };
  });

  return NextResponse.json(shaped);
}
