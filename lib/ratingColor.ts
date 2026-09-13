// Matches OOTP's own in-game scouting-screen color scale exactly (as
// specified by the user, not approximated): 20-25 red, 30-35 orange,
// 40-45 yellow, 50-55 green, 60-65 teal, 70+ blue. 80+ gets a distinct
// "elite" treatment (gold) so a truly special grade still stands out even
// within the blue band.
export function getRatingColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "#888";
  if (value >= 80) return "#C9A227"; // elite gold — stands out from ordinary 70+ blue
  if (value >= 70) return "#3B82C4"; // blue
  if (value >= 60) return "#2FA79B"; // teal
  if (value >= 50) return "#4CAF50"; // green
  if (value >= 40) return "#D8B23A"; // yellow
  if (value >= 30) return "#E07B2E"; // orange
  return "#D1453B"; // red
}

export function getRatingBg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "transparent";
  if (value >= 80) return "#fbf3dd";
  if (value >= 70) return "#e6f0f8";
  if (value >= 60) return "#e3f5f3";
  if (value >= 50) return "#eaf6ea";
  if (value >= 40) return "#faf5e3";
  if (value >= 30) return "#fbeadf";
  return "#fbe4e2";
}

// Bar width as a percentage, mapped over the 20-80 scale. OOTP's bars show
// a little fill even at the bottom of the scale (20) rather than starting
// flush at 0%, and anything 80+ fills the bar completely rather than
// running off the end — a 95 looks the same width as an 80, the number is
// what tells them apart.
export function getBarWidthPct(value: number | null | undefined): number {
  if (value === null || value === undefined || value <= 0) return 0;
  const clamped = Math.min(80, Math.max(20, value));
  return 10 + ((clamped - 20) / (80 - 20)) * 90;
}
