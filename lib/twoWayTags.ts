// Universal DH means pitchers never actually hit in-game, but the game
// still simulates hidden hitting ability for them (and vice versa for
// position players who can pitch) — this surfaces that hidden signal,
// using POTENTIAL grades since that's the real talent ceiling regardless
// of whether it's been developed, per the "even untried, still show it"
// philosophy applied elsewhere on the card.
const PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);
const NOTABLE_THRESHOLD = 45; // roughly "average or better" on the 20-80 scale
const STRONG_LEAN_MARGIN = 15; // how much better one side has to be to call it a profile mismatch

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type TwoWayTag = { label: string; tone: "notable" | "strong" };

export function computeTwoWayTags(pos: string | null, tools: Record<string, any> | null | undefined): TwoWayTag[] {
  if (!tools) return [];
  const isPitcher = pos ? PITCHER_POS.has(pos) : false;

  const hitScore = avg([tools.contactPot ?? tools.contact, tools.powerPot ?? tools.power, tools.eyePot ?? tools.eye]);
  const pitchScore = avg([tools.stuffPot ?? tools.stuff, tools.controlPot ?? tools.control]);

  const tags: TwoWayTag[] = [];

  if (isPitcher && hitScore !== null && hitScore >= NOTABLE_THRESHOLD) {
    const strong = pitchScore !== null && hitScore - pitchScore >= STRONG_LEAN_MARGIN;
    tags.push({ label: strong ? "Profiles better as a hitter" : "Two-way potential (bat)", tone: strong ? "strong" : "notable" });
  }
  if (!isPitcher && pitchScore !== null && pitchScore >= NOTABLE_THRESHOLD) {
    const strong = hitScore !== null && pitchScore - hitScore >= STRONG_LEAN_MARGIN;
    tags.push({ label: strong ? "Profiles better as a pitcher" : "Two-way potential (arm)", tone: strong ? "strong" : "notable" });
  }

  return tags;
}
