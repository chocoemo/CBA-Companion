// OOTP's scouting screens shade grades on a gradient centered around 50
// (league average on the 20-80 scale) — green for above-average, red for
// below, with the extremes (80+ and sub-30) called out more strongly so
// elite/bust-level grades jump out at a glance. This is a close approximation
// of that convention; nudge the thresholds/hexes here if you want it to
// match your game's exact palette more precisely once you can compare.
export function getRatingColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "#999";
  if (value >= 80) return "#7d3c98"; // elite / plus-plus-plus — stands out from the green band
  if (value >= 70) return "#1a7a3c"; // plus
  if (value >= 60) return "#5cb85c"; // above average
  if (value >= 45) return "#4A2E3A"; // average — falls back to the team's own text color
  if (value >= 35) return "#e08a2b"; // below average
  return "#c0392b"; // well below average
}

export function getRatingBg(value: number | null | undefined): string {
  if (value === null || value === undefined) return "transparent";
  if (value >= 80) return "#f1e6f7";
  if (value >= 70) return "#e3f4e8";
  if (value >= 60) return "#eef8ee";
  if (value >= 45) return "transparent";
  if (value >= 35) return "#fdf0e0";
  return "#fbe4e1";
}
