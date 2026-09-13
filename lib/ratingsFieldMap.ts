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
  avoidK: { current: "Ks", potential: "PotKs" }, // hitter's strikeout-avoidance rating
  speed: { current: "Speed" },
  steal: { current: "Steal" },
  stuff: { current: "Stf", potential: "PotStf" },
  control: { current: "Ctrl", potential: "PotCtrl" },
  movement: { current: "Mov", potential: "PotMov" },
  stamina: { current: "Stm" },
  pbabip: { current: "PBABIP", potential: "PotPBABIP" }, // pitcher's BABIP-against tendency
  hrRate: { current: "HRA", potential: "PotHRA" }, // home-run-rate-against tendency
  holdRunners: { current: "Hold" }, // no potential field exists for this in the API's export
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
  screwball: { current: "Scr", potential: "PotScr" },
};// Defensive suitability at each position, 20-80 scale — this is exactly
// what drives the positional-fit / "premium position 60+" recommendation
// logic (see lib/positionFit.ts).
export const POSITION_RATING_KEYS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "P"] as const;

// Fielding sub-tools (range/error/arm/double-play). NONE of these have a
// separate potential field in the API's export — only the per-position
// overall suitability above (C/1B/2B/... + Pot-prefixed) projects a
// ceiling. These are current-ability-only, which is exactly what's useful
// for spotting dev-lab defensive-growth candidates: a player with strong
// arm/range but a lower overall grade at a position is a good bet.
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
  turnDoublePlay: "TDP",
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
  out.velocityPot = row["PotVel"] ?? null;
  out.armSlot = row["ArmSlot"] ?? null;
  out.bats = row["Bats"] ?? null;
  out.throws = row["Throws"] ?? null;

  // Groundball/flyball type bucket, needed for the fit-score bonus (see
  // lib/fitScore.ts). The raw "GB" field is a numeric groundball tendency,
  // not the 5-bucket category itself — these thresholds are an approximation
  // (not confirmed against a real bucket boundary), matching Choco's
  // Dashboard bucket NAMES ("EX GB"/"GB"/"NEU"/"FB"/"EX FB") as closely as
  // guessable. Worth revisiting once real boundary cases are checked.
  const gbNum = num(row["GB"]);
  if (gbNum !== null) {
    if (gbNum >= 65) out.gbfbType = "EX GB";
    else if (gbNum >= 55) out.gbfbType = "GB";
    else if (gbNum >= 45) out.gbfbType = "NEU";
    else if (gbNum >= 35) out.gbfbType = "FB";
    else out.gbfbType = "EX FB";
  } else {
    out.gbfbType = null;
  }

  return out;
}
