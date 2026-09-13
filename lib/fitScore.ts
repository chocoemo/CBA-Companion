// Confirmed live from Choco's Dashboard source (fitOf() + WDEF), not a
// guess: fit = weighted AVERAGE of tool grades (sum(weight*value)/sum(weight)),
// which is why it lands on the same 20-80-ish scale as the underlying
// tools — then pitchers get a bonus based on GB/FB-type bucket, plus a
// flat bonus if they're an SP.
export const DEFAULT_HITTER_WEIGHTS: Record<string, number> = {
  power: 30, speed: 20, avoidK: 19, babip: 13, eye: 15, gap: 3,
};

export const DEFAULT_PITCHER_WEIGHTS: Record<string, number> = {
  stuff: 34, control: 24, movement: 16, hrRate: 16, pbabip: 10,
};

export const DEFAULT_PITCHER_BONUSES: Record<string, number> = {
  "EX GB": 7, "GB": 4, "NEU": 1, "FB": -5, "EX FB": -9, SP: 2,
};

const PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

export function computeFitScore(
  pos: string | null,
  tools: Record<string, any> | null | undefined,
  weightsOverride?: Record<string, number> | null,
  bonusesOverride?: Record<string, number> | null
): number | null {
  if (!tools) return null;
  const isPitcher = pos ? PITCHER_POS.has(pos) : false;
  const defaults = isPitcher ? DEFAULT_PITCHER_WEIGHTS : DEFAULT_HITTER_WEIGHTS;
  const weights = weightsOverride && Object.keys(weightsOverride).length > 0 ? weightsOverride : defaults;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const [tool, weight] of Object.entries(weights)) {
    if (!weight) continue;
    const val = tools[tool];
    if (typeof val !== "number") continue;
    weightedSum += val * weight;
    weightTotal += weight;
  }
  if (weightTotal === 0) return null;
  let fit = weightedSum / weightTotal;

  if (isPitcher) {
    const bonuses = bonusesOverride && Object.keys(bonusesOverride).length > 0 ? bonusesOverride : DEFAULT_PITCHER_BONUSES;
    if (tools.gbfbType && typeof bonuses[tools.gbfbType] === "number") {
      fit += bonuses[tools.gbfbType];
    }
    if (pos === "SP" && typeof bonuses.SP === "number") {
      fit += bonuses.SP;
    }
  }

  return Math.round(fit * 10) / 10;
}
