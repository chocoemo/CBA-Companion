// Hard-mapped from a real /ratings export (confirmed live, not guessed).
// Source uses OOTP's internal scouting-report column abbreviations.

export function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Headline tools shown as chips on the player card / used for filtering.
// Current-value key, then its potential-value key (where one exists).
export const TOOL_FIELD_MAP: Record<string, { current: string; potential?: string }> = {
  contact: { current: "Cntct", potential: "PotCntct" },
  power: { current: "Pow", potential: "PotPow" },
  eye: { current: "Eye", potential: "PotEye" },
  babip: { current: "BABIP", potential: "PotBABIP" },
  gap: { current: "Gap", potential: "PotGap" },
  speed: { current: "Speed" },
  steal: { current: "Steal" },
  stuff: { current: "Stf", potential: "PotStf" },
  control: { current: "Ctrl", potential: "PotCtrl" },
  movement: { current: "Mov", potential: "PotMov" },
  stamina: { current: "Stm" },
  holdRunners: { current: "Hold" },
};

// Individual pitch grades (starters/relievers only carry non-zero values
// for pitches they actually throw).
export const PITCH_FIELD_MAP: Record<string, { current: string; potential?: string }> = {
  fastball: { current: "Fst", potential: "PotFst" },
  slider: { current: "Sld", potential: "PotSld" },
  curve: { current: "Crv", potential: "PotCrv" },
  changeup: { current: "Chg", potential: "PotChg" },
  sinker: { current: "Snk", potential: "PotSnk" },
  cutter: { current: "Cutt", potential: "PotCutt" },
  splitter: { current: "Splt", potential: "PotSplt" },
  forkball: { current: "Frk", potential: "PotFrk" },
  knuckleball: { current: "Knbl", potential: "PotKnbl" },
  knuckleCurve: { current: "Kncrv", potential: "PotKncrv" },
  circleChange: { current: "CirChg", potential: "PotCirChg" },
};

// Defensive suitability at each position, 20-80 scale — this is exactly
// what drives the positional-fit / "premium position 60+" recommendation
// logic (see lib/positionFit.ts).
export const POSITION_RATING_KEYS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "P"] as const;

// Fielding sub-tools (range/error/arm), split infield vs outfield vs catcher.
export const FIELDING_FIELD_MAP: Record<string, string> = {
  infieldArm: "IFA",
  infieldError: "IFE",
  infieldRange: "IFR",
  outfieldArm: "OFA",
  outfieldError: "OFE",
  outfieldRange: "OFR",
  catcherArm: "CArm",
  catcherBlock: "CBlk",
  catcherFraming: "CFrm",
};

// Makeup / personality — useful for the "at least/at most/is/is not" filter
// system on non-tool attributes.
export const MAKEUP_FIELD_MAP: Record<string, string> = {
  intelligence: "Int",
  loyalty: "Loy",
  greed: "Greed",
  workEthic: "WrkEthic",
  injuryProne: "Prone",
  leadership: "Lead",
  adaptability: "Acc",
};

export function buildToolsObject(row: Record<string, string>): Record<string, number | string | null> {
  const out: Record<string, number | string | null> = {};

  for (const [label, keys] of Object.entries(TOOL_FIELD_MAP)) {
    out[label] = num(row[keys.current]);
    if (keys.potential) out[`${label}Pot`] = num(row[keys.potential]);
  }
  for (const [label, keys] of Object.entries(PITCH_FIELD_MAP)) {
    const cur = num(row[keys.current]);
    if (cur && cur > 0) {
      out[label] = cur;
      if (keys.potential) out[`${label}Pot`] = num(row[keys.potential]);
    }
  }
  for (const [label, key] of Object.entries(FIELDING_FIELD_MAP)) {
    out[label] = num(row[key]);
  }
  for (const [label, key] of Object.entries(MAKEUP_FIELD_MAP)) {
    out[label] = row[key] ?? null;
  }
  // Raw defensive suitability per position — used by the position-fit engine.
  const positions: Record<string, number | null> = {};
  const positionsPot: Record<string, number | null> = {};
  for (const pos of POSITION_RATING_KEYS) {
    positions[pos] = num(row[pos]);
    positionsPot[pos] = num(row[`Pot${pos}`]);
  }
  out.positionRatings = positions as any;
  out.positionRatingsPot = positionsPot as any;

  out.velocity = row["Vel"] ?? null; // e.g. "96-98", kept as a string range
  out.armSlot = row["ArmSlot"] ?? null;
  out.bats = row["Bats"] ?? null;
  out.throws = row["Throws"] ?? null;

  return out;
}
