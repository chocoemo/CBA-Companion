"use client";
import { useState } from "react";
import PlayerTable from "@/app/components/PlayerTable";
import DraftLog from "@/app/components/DraftLog";

const SUBTABS = ["Big Board", "Draft Log", "Power/Speed"] as const;

export default function DraftPage() {
  const [sub, setSub] = useState<typeof SUBTABS[number]>("Big Board");
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

      {sub === "Big Board" && <PlayerTable pool="draft" columns="draft" />}
      {sub === "Draft Log" && <DraftLog />}
      {sub === "Power/Speed" && (
        <p style={{ opacity: 0.7 }}>
          Power/Speed view (à la Choco's Dashboard) — coming with the custom
          at-least/at-most filter builder.
        </p>
      )}
    </div>
  );
}
