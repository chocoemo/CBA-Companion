import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_HITTER_WEIGHTS, DEFAULT_PITCHER_WEIGHTS, DEFAULT_PITCHER_BONUSES } from "@/lib/fitScore";

export const dynamic = "force-dynamic";

// GET /api/settings — returns the singleton settings row, creating it with
// sensible (Choco-Dashboard-confirmed) defaults on first read.
export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        fitWeights: { hitter: DEFAULT_HITTER_WEIGHTS, pitcher: DEFAULT_PITCHER_WEIGHTS },
        pitcherBonuses: DEFAULT_PITCHER_BONUSES,
      },
    });
  }
  return NextResponse.json(settings);
}

// POST /api/settings — partial update; send only the fields you're changing.
export async function POST(req: Request) {
  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: body,
    create: {
      id: 1,
      fitWeights: body.fitWeights ?? { hitter: DEFAULT_HITTER_WEIGHTS, pitcher: DEFAULT_PITCHER_WEIGHTS },
      pitcherBonuses: body.pitcherBonuses ?? DEFAULT_PITCHER_BONUSES,
      rosterMinC: body.rosterMinC, rosterMaxC: body.rosterMaxC,
      rosterMinIF: body.rosterMinIF, rosterMaxIF: body.rosterMaxIF,
      rosterMinOF: body.rosterMinOF, rosterMaxOF: body.rosterMaxOF,
      rosterMinP: body.rosterMinP, rosterMaxP: body.rosterMaxP,
    },
  });
  return NextResponse.json(settings);
}
