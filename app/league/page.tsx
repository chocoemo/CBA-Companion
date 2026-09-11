"use client";
import { useState } from "react";
import PlayerTable from "@/app/components/PlayerTable";

const SUBTABS = ["Free Agents", "Standings", "Players"] as const;

export default function LeaguePage() {
  const [sub, setSub] = useState<typeof SUBTABS[number]>("Free Agents");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            style={{
              background: sub === s ? "var(--team-accent)" : "var(--team-tertiary)",
              color: sub === s ? "#fff" : "var(--team-secondary)",
              border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {sub === "Free Agents" && <PlayerTable pool="fa" columns="roster" />}
      {sub === "Players" && <PlayerTable pool="all" columns="roster" />}
      {sub === "Standings" && (
        <p style={{ opacity: 0.7 }}>
          Standings/history/leaderboards (CBA-I parity) — scoped for a coming
          phase; needs /lgdata wired to a StandingsSnapshot view.
        </p>
      )}
    </div>
  );
}
