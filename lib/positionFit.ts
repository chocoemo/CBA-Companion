// Implements your stated positional philosophy:
// - Premium tiers, highest priority first: [C, CF, SS] > [RF, 3B] > [2B, LF] > [1B] > [DH]
// - If a player grades 60+ (current, not potential) at ANY position in a
//   higher-priority tier than their listed spot, that's flagged as their
//   recommended position — maximizing premium-position value.
// - If nobody clears 60 at a premium spot, fall back to wherever their
//   POTENTIAL grade is highest (development-lab regarded as a lever that
//   can still raise defense there later).
//
// Note: DH isn't a defensive position with its own rating in the S+ export
// (no "DH" column), so it's only ever the true fallback-of-last-resort when
// every real position potential is 0/null.

const TIERS: string[][] = [
  ["C", "CF", "SS"],
  ["RF", "3B"],
  ["2B", "LF"],
  ["1B"],
];

const PREMIUM_THRESHOLD = 60;

export type PositionFitResult = {
  recommendedPos: string;
  reason: string;
};

export function recommendPosition(
  currentRatings: Record<string, number | null>,
  potentialRatings?: Record<string, number | null> | null
): PositionFitResult | null {
  // 1) Any premium position at 60+ current ability? Take the highest tier.
  for (const tier of TIERS) {
    const qualifying = tier
      .map((pos) => ({ pos, val: currentRatings[pos] }))
      .filter((r) => (r.val ?? 0) >= PREMIUM_THRESHOLD)
      .sort((a, b) => (b.val ?? 0) - (a.val ?? 0));
    if (qualifying.length > 0) {
      return { recommendedPos: qualifying[0].pos, reason: `${qualifying[0].val} current at a premium spot` };
    }
  }

  // 2) Otherwise, fall back to highest POTENTIAL among real positions
  //    (development lab can still grow the glove there).
  const potSource = potentialRatings ?? currentRatings;
  const allPositions = Object.entries(potSource).filter(([pos]) => pos !== "P");
  const best = allPositions
    .filter(([, v]) => v !== null && v !== undefined)
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0];

  if (best && (best[1] as number) > 0) {
    return { recommendedPos: best[0], reason: `${best[1]} potential, no premium 60+ today` };
  }

  return { recommendedPos: "DH", reason: "no meaningful defensive potential anywhere" };
}
