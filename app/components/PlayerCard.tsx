"use client";

import { useState } from "react";
import { getRatingColor, getRatingBg } from "@/lib/ratingColor";
import { recommendPosition } from "@/lib/positionFit";

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

const HITTER_HEADLINE = ["contact", "power", "eye", "babip", "speed", "gap"];
const PITCHER_HEADLINE = ["stuff", "control", "movement", "stamina"];
const IS_PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

export default function PlayerCard({ player, onClose }: { player: PlayerCardData; onClose: () => void }) {
  const [source, setSource] = useState<"scout" | "osa">("scout"); // scout is ALWAYS the default view

  const block = source === "scout" ? player.scout : player.osa;
  const missingOtherSource = source === "scout" ? !player.osa : !player.scout;
  const isPitcher = IS_PITCHER_POS.has(player.pos ?? "");
  const headlineKeys = isPitcher ? PITCHER_HEADLINE : HITTER_HEADLINE;

  const headlineTools = headlineKeys
    .filter((k) => block?.tools && block.tools[k] !== null && block.tools[k] !== undefined)
    .map((k) => [k, block!.tools[k] as number] as const);

  const positionRatings: Record<string, number | null> | null = block?.tools?.positionRatings ?? null;
  const positionRatingsPot: Record<string, number | null> | null = block?.tools?.positionRatingsPot ?? null;
  const posFit = positionRatings ? recommendPosition(positionRatings, positionRatingsPot) : null;

  const otherTools = block?.tools
    ? Object.entries(block.tools).filter(
        ([k, v]) => !headlineKeys.includes(k) && k !== "positionRatings" && v !== null && v !== undefined && v !== 0
      )
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
            {posFit && posFit.recommendedPos !== player.pos && (
              <div style={{ fontSize: 11.5, marginTop: 3, opacity: 0.9 }}>
                Recommended position: <b>{posFit.recommendedPos}</b> ({posFit.reason})
              </div>
            )}
          </div>
          <div className="source-toggle">
            <button
              className={source === "scout" ? "active" : ""}
              onClick={() => setSource("scout")}
            >
              Scout
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
                <div style={{ fontSize: 26, fontWeight: 800, color: getRatingColor(block.overall) }}>
                  {block.overall ?? "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Potential</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: getRatingColor(block.potential) }}>
                  {block.potential ?? "—"}
                </div>
              </div>
            </div>

            <div className="tool-grid">
              {headlineTools.map(([k, v]) => (
                <div
                  className="tool-chip"
                  key={k}
                  data-tooltip={`${k} (20-80 scale; can exceed 80)`}
                  style={{ background: getRatingBg(v) }}
                >
                  <div className="label">{k}</div>
                  <div className="value" style={{ color: getRatingColor(v) }}>{v}</div>
                </div>
              ))}
            </div>

            {positionRatings && (
              <details style={{ margin: "0 20px 16px" }} open>
                <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.7 }}>Position fit</summary>
                <div className="tool-grid">
                  {Object.entries(positionRatings)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([pos, v]) => (
                      <div className="tool-chip" key={pos} style={{ background: getRatingBg(v as number) }}>
                        <div className="label">{pos}</div>
                        <div className="value" style={{ color: getRatingColor(v as number) }}>{v}</div>
                      </div>
                    ))}
                </div>
              </details>
            )}

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
