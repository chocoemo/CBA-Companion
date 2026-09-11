// The "fit score" is a single weighted composite of tool grades — same idea
// as Choco's Dashboard weighting sliders. Settings.fitWeights overrides
// these defaults; any tool with weight 0 (or missing from the override) is
// excluded from the composite for that player type.
export const DEFAULT_HITTER_WEIGHTS: Record<string, number> = {
  contact: 1, power: 1, eye: 0.75, babip: 0.5, speed: 0.5, gap: 0.5,
};

export const DEFAULT_PITCHER_WEIGHTS: Record<string, number> = {
  stuff: 1, control: 1, movement: 0.75, stamina: 0.5,
};

const PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

// Returns a 20-80-ish composite, or null if no relevant tools are present.
export function computeFitScore(
  pos: string | null,
  tools: Record<string, any> | null | undefined,
  weightsOverride?: Record<string, number> | null
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
  return Math.round((weightedSum / weightTotal) * 10) / 10;
}
