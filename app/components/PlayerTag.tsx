// Visual tag system for player status flags. IMPORTANT: this component only
// renders whatever tag it's given — it does NOT compute "overmatched,"
// "needs promotion," or hot/cold itself. That determination needs a window
// of real game-log performance history, which doesn't exist yet (see
// /areas/cba-companion.md — box score/game-log persistence is still
// pending). Until then, every caller passes tag={null} and every player
// renders in normal color, which is the honest state of things.

export type PlayerTagKind = "watch" | "replace" | "promote" | null;
export type StreakKind = "hot" | "cold" | null;

const TAG_STYLES: Record<Exclude<PlayerTagKind, null>, { bg: string; fg: string; label: string }> = {
  watch: { bg: "#fff6d8", fg: "#8a6d00", label: "Watch" },
  replace: { bg: "#fbe4e2", fg: "#a3241c", label: "Replace" },
  promote: { bg: "#e3f5ea", fg: "#146c43", label: "Promote" },
};

export function PlayerTagBadge({ tag }: { tag: PlayerTagKind }) {
  if (!tag) return null;
  const s = TAG_STYLES[tag];
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 10, marginLeft: 6 }}>
      {s.label}
    </span>
  );
}

export function StreakIcon({ streak }: { streak: StreakKind }) {
  if (streak === "hot") return <span title="Hot streak">🔥</span>;
  if (streak === "cold") return <span title="Cold streak">❄️</span>;
  return null;
}

// Name color follows the tag — red for replace, yellow/amber for watch,
// green for promote, normal text color otherwise.
export function tagNameColor(tag: PlayerTagKind): string | undefined {
  if (tag === "replace") return "#a3241c";
  if (tag === "watch") return "#8a6d00";
  if (tag === "promote") return "#146c43";
  return undefined;
}
