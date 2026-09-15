"use client";

import { getRatingColor } from "@/lib/ratingColor";
import StatBar from "@/app/components/StatBar";

// Mirrors the OOTP screenshot layout: one full current/potential bar for
// the overall rating, then two narrower columns for vs-L/vs-R. No
// potential value exists per split in the API's data, so those two
// columns are plain colored numbers, not bars with a gap segment.
export default function SplitStatBar({
  label,
  current,
  potential,
  vsL,
  vsR,
  leftHeader = "vs LHP",
  rightHeader = "vs RHP",
  indent = false,
}: {
  label: string;
  current: number | null;
  potential?: number | null;
  vsL: number | null | undefined;
  vsR: number | null | undefined;
  leftHeader?: string;
  rightHeader?: string;
  indent?: boolean;
}) {
  const hasSplits = (vsL !== null && vsL !== undefined) || (vsR !== null && vsR !== undefined);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 10, alignItems: "center", paddingLeft: indent ? 18 : 0 }}>
      <StatBar label={label} current={current} potential={potential} />
      {hasSplits ? (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: "center", color: getRatingColor(vsL ?? null) }} title={leftHeader}>
            {vsL ?? "—"}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: "center", color: getRatingColor(vsR ?? null) }} title={rightHeader}>
            {vsR ?? "—"}
          </div>
        </>
      ) : (
        <>
          <div />
          <div />
        </>
      )}
    </div>
  );
}
