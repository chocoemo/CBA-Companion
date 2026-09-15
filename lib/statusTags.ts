export type StatusTag = { label: string; bg: string; fg: string };

// Injury proneness ("Prone" raw field) — OOTP's own categories. Only the
// two extremes get a tag per the user's spec; Durable/Normal render plain.
export function computeInjuryTag(prone: string | null | undefined): StatusTag | null {
  if (!prone) return null;
  const p = prone.toLowerCase();
  if (p.includes("wrecked") || p.includes("very fragile")) {
    return { label: "Wrecked", bg: "#fbe4e2", fg: "#a3241c" };
  }
  if (p.includes("fragile")) {
    return { label: "Fragile", bg: "#fde8d2", fg: "#a35a1c" };
  }
  return null;
}

const PREMIUM_POSITIONS = ["C", "SS", "CF"];
const PREMIUM_THRESHOLD = 55; // deliberately lower than positionFit.ts's 60 — this tag is just "go check the fielding tab"

// Flags anyone (hitter OR pitcher) with 55+ current-or-potential at a
// premium spot, so a pitcher with a real SS glove hiding in the data
// doesn't get missed just because nobody thought to check.
export function computePremiumFieldingTag(
  positionRatings: Record<string, number | null> | null | undefined,
  positionRatingsPot: Record<string, number | null> | null | undefined
): StatusTag | null {
  if (!positionRatings && !positionRatingsPot) return null;
  for (const pos of PREMIUM_POSITIONS) {
    const cur = positionRatings?.[pos] ?? 0;
    const pot = positionRatingsPot?.[pos] ?? 0;
    if (Math.max(cur, pot) >= PREMIUM_THRESHOLD) {
      return { label: `Premium D (${pos})`, bg: "#e3f0fb", fg: "#1a5a9c" };
    }
  }
  return null;
}
