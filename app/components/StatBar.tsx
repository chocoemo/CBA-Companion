"use client";

import { getRatingColor, getBarWidthPct } from "@/lib/ratingColor";

// Mirrors OOTP's own player-report bars: a solid segment for the current
// grade, then — only when potential is higher — a visually distinct
// striped segment out to the potential grade, so "hasn't gotten there yet"
// reads at a glance rather than blending into a single gradient.
export default function StatBar({
  current,
  potential,
  label,
  showNumbers = true,
}: {
  current: number | null;
  potential?: number | null;
  label?: string;
  showNumbers?: boolean;
}) {
  const hasPotential = potential !== null && potential !== undefined;
  const showGap = hasPotential && current !== null && potential! > current;

  const curPct = getBarWidthPct(current);
  const potPct = hasPotential ? getBarWidthPct(potential) : curPct;
  const curColor = getRatingColor(current);
  const potColor = hasPotential ? getRatingColor(potential) : curColor;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {label && <div style={{ width: 110, fontSize: 12.5, flexShrink: 0 }}>{label}</div>}
      {showNumbers && (
        <div style={{ width: hasPotential && showGap ? 62 : 30, fontSize: 12.5, fontWeight: 700, flexShrink: 0, textAlign: "right" }}>
          <span style={{ color: curColor }}>{current ?? "—"}</span>
          {showGap && (
            <>
              <span style={{ opacity: 0.4 }}> / </span>
              <span style={{ color: potColor }}>{potential}</span>
            </>
          )}
        </div>
      )}
      <div style={{ flex: 1, height: 9, background: "#1c1c1c14", borderRadius: 4, position: "relative", overflow: "hidden", minWidth: 60 }}>
        <div style={{ position: "absolute", inset: 0, background: "#00000010" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${curPct}%`, background: curColor, borderRadius: 4 }} />
        {showGap && (
          <div
            style={{
              position: "absolute",
              left: `${curPct}%`,
              top: 0,
              bottom: 0,
              width: `${Math.max(0, potPct - curPct)}%`,
              background: `repeating-linear-gradient(45deg, ${potColor}88, ${potColor}88 3px, ${potColor}33 3px, ${potColor}33 6px)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
