"use client";

import { useState } from "react";
import { getRatingColor } from "@/lib/ratingColor";
import { recommendPosition } from "@/lib/positionFit";
import { computeTwoWayTags } from "@/lib/twoWayTags";
import StatBar from "@/app/components/StatBar";

type RatingBlock = {
  overall: number | null;
  potential: number | null;
  tools: Record<string, any>;
  capturedAt: string;
} | null;

export type PlayerCardData = {
  id: number;
  name: string;
  lastName: string;
  team: { id: number; abbr: string } | null;
  level: string | null;
  pos: string | null;
  role: string | null;
  age: number | null;
  bats: string | null;
  throws: string | null;
  isCollege: boolean | null;
  scout: RatingBlock;
  osa: RatingBlock;
};

const HITTER_HEADLINE = ["contact", "power", "eye", "babip", "speed", "gap", "avoidK"];
const PITCHER_HEADLINE = ["stuff", "control", "movement", "stamina", "hrRate", "pbabip"];
const PITCHES = ["fastball", "slider", "curve", "changeup", "sinker", "cutter", "splitter", "forkball", "knuckleball", "knuckleCurve", "circleChange", "screwball"];
const FIELDING = ["infieldArm", "infieldError", "infieldRange", "outfieldArm", "outfieldError", "outfieldRange", "catcherArm", "catcherBlock", "catcherFraming", "turnDoublePlay"];
const IS_PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

export default function PlayerCard({ player, onClose }: { player: PlayerCardData; onClose: () => void }) {
  const [source, setSource] = useState<"scout" | "osa">("scout"); // scout is ALWAYS the default view

  const block = source === "scout" ? player.scout : player.osa;
  const missingOtherSource = source === "scout" ? !player.osa : !player.scout;
  const isPitcher = IS_PITCHER_POS.has(player.pos ?? "");
  const headlineKeys = isPitcher ? PITCHER_HEADLINE : HITTER_HEADLINE;
  const tools = block?.tools ?? null;

  const positionRatings: Record<string, number | null> | null = tools?.positionRatings ?? null;
  const positionRatingsPot: Record<string, number | null> | null = tools?.positionRatingsPot ?? null;
  const posFit = positionRatings ? recommendPosition(positionRatings, positionRatingsPot) : null;
  const twoWayTags = computeTwoWayTags(player.pos, tools);

  return (
    <div className="player-card-overlay" onClick={onClose}>
      <div className="player-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="head">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {player.name}{" "}
              <a href={`/players/${player.id}`} style={{ fontSize: 11, opacity: 0.8, color: "inherit" }}>
                (full profile ↗)
              </a>
            </div>
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
            {twoWayTags.length > 0 && (
              <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {twoWayTags.map((t) => (
                  <span
                    key={t.label}
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                      background: t.tone === "strong" ? "#fbe4e2" : "#e3f0fb",
                      color: t.tone === "strong" ? "#a3241c" : "#1a5a9c",
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="source-toggle">
            <button className={source === "scout" ? "active" : ""} onClick={() => setSource("scout")}>Scout</button>{" "}
            <button className={source === "osa" ? "active" : ""} onClick={() => setSource("osa")}>OSA</button>
          </div>
        </div>

        {!block ? (
          <div style={{ padding: 20 }}>
            No {source === "scout" ? "scouted" : "OSA"} ratings imported for this player yet.
          </div>
        ) : (
          <div style={{ padding: "14px 20px 18px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Overall</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: getRatingColor(block.overall) }}>{block.overall ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Potential</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: getRatingColor(block.potential) }}>{block.potential ?? "—"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 5, marginBottom: 16 }}>
              {headlineKeys
                .filter((k) => tools && tools[k] !== null && tools[k] !== undefined)
                .map((k) => (
                  <StatBar key={k} label={k} current={tools![k]} potential={tools![`${k}Pot`] ?? null} />
                ))}
            </div>

            {isPitcher && PITCHES.some((k) => tools && typeof tools[k] === "number") && (
              <details style={{ marginBottom: 16 }} open>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Pitches</summary>
                <div style={{ display: "grid", gap: 5 }}>
                  {PITCHES.filter((k) => tools && typeof tools[k] === "number").map((k) => (
                    <StatBar key={k} label={k} current={tools![k]} potential={tools![`${k}Pot`] ?? null} />
                  ))}
                </div>
                {tools?.velocity && (
                  <p style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
                    Velocity: {tools.velocity}{tools.velocityPot && tools.velocityPot !== tools.velocity ? ` → ${tools.velocityPot}` : ""}
                  </p>
                )}
              </details>
            )}

            {positionRatings && (
              <details style={{ marginBottom: 16 }} open>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Position fit (current → potential)
                </summary>
                <div style={{ display: "grid", gap: 5 }}>
                  {Object.entries(positionRatings)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([pos, v]) => (
                      <StatBar key={pos} label={pos} current={v as number} potential={positionRatingsPot?.[pos] ?? null} />
                    ))}
                </div>
              </details>
            )}

            {!isPitcher && FIELDING.some((k) => tools && typeof tools[k] === "number" && tools[k] > 0) && (
              <details style={{ marginBottom: 16 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Fielding</summary>
                <div style={{ display: "grid", gap: 5 }}>
                  {FIELDING.filter((k) => tools && typeof tools[k] === "number" && tools[k] > 0).map((k) => (
                    <StatBar key={k} label={k} current={tools![k]} potential={null} />
                  ))}
                </div>
                <p style={{ fontSize: 10.5, opacity: 0.6, marginTop: 4 }}>
                  No potential value exists for these — only the position grades above project a ceiling.
                </p>
              </details>
            )}

            {missingOtherSource && (
              <p style={{ fontSize: 11.5, opacity: 0.6 }}>
                No {source === "scout" ? "OSA" : "scouted"} ratings imported for this player yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
