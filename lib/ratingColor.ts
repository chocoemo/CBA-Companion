// Matches OOTP's own in-game scouting-screen color scale exactly (as
// specified by the user, not approximated): 20-25 red, 30-35 orange,
// 40-45 yellow, 50-55 green, 60-65 teal, 70-80 blue. 85+ (ratings always
// move in 5s) gets a distinct "truly elite" color that doesn't resemble
// any of the above — a rich purple, similar to a top Perfect-Team-style
// card tier — since the earlier gold read as washed-out/similar to the
// 40-45 yellow band at a glance.
export function getRatingColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "#888";
  if (value >= 85) return "#8E24C9"; // elite purple — visually distinct from every other tier
  if (value >= 70) return "#3B82C4"; // blue (covers 70/75/80)
  if (value >= 60) return "#2FA79B"; // teal
  if (value >= 50) return "#4CAF50"; // green
  if (value >= 40) return "#D8B23A"; // yellow
  if (value >= 30) return "#E07B2E"; // orange
  return "#D1453B"; // red
}

export function getRatingBg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "transparent";
  if (value >= 85) return "#f3e3fa";
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
