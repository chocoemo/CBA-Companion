import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/players/search?q=name (min 2 chars)
// Lightweight — name/team/pos/level only, capped at 20 results. Used by
// the site-wide search bar (jumps to /players/[id]) and can back an
// in-table name filter too.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const players = await prisma.player.findMany({
    where: {
      retired: false,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { team: { select: { abbr: true } } },
    orderBy: { lastName: "asc" },
    take: 20,
  });

  return NextResponse.json(
    players.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      team: p.team?.abbr ?? "FA",
      pos: p.pos,
      level: p.level,
    }))
  );
}
