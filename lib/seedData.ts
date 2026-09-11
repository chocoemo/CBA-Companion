import { PrismaClient } from "@prisma/client";

// A Jimmy-Johnson-style curve, generalized to a 30-team / 12-round draft
// (360 total picks) instead of the NFL's 7-round setup. Same decay shape as
// the NFL chart, rescaled. This is the SEED only — Phase 2's pick-value
// chart will let it drift based on logged trades.
function buildSeedCurve(totalPicks: number) {
  const rows: { overallSlot: number; value: number }[] = [];
  for (let slot = 1; slot <= totalPicks; slot++) {
    const value = 3000 * Math.exp(-0.028 * (slot - 1));
    rows.push({ overallSlot: slot, value: Math.round(value * 10) / 10 });
  }
  return rows;
}

// Idempotent — safe to call more than once (e.g. re-triggered by mistake).
export async function runSeed(prisma: PrismaClient) {
  const team = await prisma.team.upsert({
    where: { id: 1 },
    update: {
      colorPrimary: "#B66A3C",
      colorSecondary: "#4A2E3A",
      colorTertiary: "#F2E6D2",
      colorAccent: "#804F55",
      isDefaultControlling: true,
    },
    create: {
      id: 1,
      name: "Calgary",
      nickname: "Calgary",
      abbr: "CAL",
      colorPrimary: "#B66A3C",
      colorSecondary: "#4A2E3A",
      colorTertiary: "#F2E6D2",
      colorAccent: "#804F55",
      isDefaultControlling: true,
    },
  });

  const existingCurveRows = await prisma.pickValueCurve.count({ where: { derivedFrom: "seed" } });
  let curveRowsWritten = 0;
  if (existingCurveRows === 0) {
    const curve = buildSeedCurve(30 * 12);
    await prisma.pickValueCurve.createMany({
      data: curve.map((r) => ({ ...r, derivedFrom: "seed" })),
    });
    curveRowsWritten = curve.length;
  }

  return { teamId: team.id, curveRowsWritten, curveAlreadyPresent: existingCurveRows > 0 };
}
