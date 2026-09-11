"use client";

import { useState } from "react";

type RatingBlock = {
  overall: number | null;
  potential: number | null;
  tools: Record<string, any>;
  capturedAt: string;
} | null;

export type PlayerCardData = {
  id: number;
  name: string;
  team: { id: number; abbr: string } | null;
  level: string | null;
  pos: string | null;
  role: string | null;
  age: number | null;
  bats: string | null;
  throws: string | null;
  scout: RatingBlock;
  osa: RatingBlock;
};

// A handful of well-known tool keys we render as headline chips when present;
// anything else in `tools` still gets listed below. Once a real ratings dump
// comes in, this list gets tightened to your league's exact column names.
const HEADLINE_TOOL_KEYS = [
  "contact", "power", "eye", "babip", "speed", "fielding", "arm",
  "stuff", "control", "movement", "stamina", "hold",
];

export default function PlayerCard({ player, onClose }: { player: PlayerCardData; onClose: () => void }) {
  const [source, setSource] = useState<"scout" | "osa">("scout"); // scout is ALWAYS the default view

  const block = source === "scout" ? player.scout : player.osa;
  const missingOtherSource = source === "scout" ? !player.osa : !player.scout;

  const headlineTools = HEADLINE_TOOL_KEYS
    .filter((k) => block?.tools && k in block.tools)
    .map((k) => [k, block!.tools[k]] as const);

  const otherTools = block?.tools
    ? Object.entries(block.tools).filter(([k]) => !HEADLINE_TOOL_KEYS.includes(k))
    : [];

  return (
    <div className="player-card-overlay" onClick={onClose}>
      <div className="player-card" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{player.name}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {player.team?.abbr ?? "FA"} · {player.level ?? "—"} · {player.pos}{player.role ? ` (${player.role})` : ""}
              {player.age ? ` · Age ${player.age}` : ""}
              {player.bats ? ` · B:${player.bats}` : ""}
              {player.throws ? ` · T:${player.throws}` : ""}
            </div>
          </div>
          <div className="source-toggle">
            <button
              className={source === "scout" ? "active" : ""}
              onClick={() => setSource("scout")}
            >
              My Scouts
            </button>{" "}
            <button
              className={source === "osa" ? "active" : ""}
              onClick={() => setSource("osa")}
            >
              OSA
            </button>
          </div>
        </div>

        {!block ? (
          <div style={{ padding: 20 }}>
            No {source === "scout" ? "scouted" : "OSA"} ratings imported for this player yet.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 20, padding: "14px 20px 0" }}>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Overall</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{block.overall ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Potential</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{block.potential ?? "—"}</div>
              </div>
            </div>

            <div className="tool-grid">
              {headlineTools.map(([k, v]) => (
                <div className="tool-chip" key={k} data-tooltip={`${k} (20-80 scale; can exceed 80)`}>
                  <div className="label">{k}</div>
                  <div className="value">{v}</div>
                </div>
              ))}
            </div>

            {otherTools.length > 0 && (
              <details style={{ margin: "0 20px 16px" }}>
                <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.7 }}>
                  All imported fields ({otherTools.length})
                </summary>
                <div className="tool-grid">
                  {otherTools.map(([k, v]) => (
                    <div className="tool-chip" key={k}>
                      <div className="label">{k}</div>
                      <div className="value" style={{ fontSize: 13 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {missingOtherSource && (
              <div style={{ padding: "0 20px 16px", fontSize: 11.5, opacity: 0.6 }}>
                No {source === "scout" ? "OSA" : "scouted"} ratings imported for this player yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
