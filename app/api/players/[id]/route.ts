import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/players/[id] — returns the same shape PlayerCard.tsx expects,
// for tables/pages that don't already have full ratings loaded (e.g. Draft
// Recap, which only carries basic pick info) but still want the popout
// card on click rather than jumping straight to the full profile page.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, abbr: true } },
      ratings: { orderBy: { capturedAt: "desc" }, take: 2 },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scout = player.ratings.find((r) => r.source === "SCOUT");
  const osa = player.ratings.find((r) => r.source === "OSA");

  return NextResponse.json({
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    lastName: player.lastName,
    team: player.team ? { id: player.team.id, abbr: player.team.abbr } : null,
    level: player.level,
    pos: player.pos,
    role: player.role,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    isCollege: player.isCollege,
    scout: scout ? { overall: scout.overall, potential: scout.potential, tools: scout.tools, capturedAt: scout.capturedAt } : null,
    osa: osa ? { overall: osa.overall, potential: osa.potential, tools: osa.tools, capturedAt: osa.capturedAt } : null,
  });
}
