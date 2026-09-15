"use client";

import { useState } from "react";
import { getRatingColor } from "@/lib/ratingColor";
import { recommendPosition } from "@/lib/positionFit";
import { computeFitScore } from "@/lib/fitScore";
import { computeTwoWayTags } from "@/lib/twoWayTags";
import { computeInjuryTag, computePremiumFieldingTag } from "@/lib/statusTags";
import StatBar from "@/app/components/StatBar";
import SplitStatBar from "@/app/components/SplitStatBar";

type RatingBlock = { overall: number | null; potential: number | null; tools: Record<string, any> } | null;

const IS_PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

const POSITION_FIT_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const FIELDING_ORDER: { key: string; label: string }[] = [
  { key: "catcherBlock", label: "Catcher Blocking" },
  { key: "catcherFraming", label: "Catcher Framing" },
  { key: "catcherArm", label: "Catcher Arm" },
  { key: "infieldRange", label: "Infield Range" },
  { key: "infieldError", label: "Infield Error" },
  { key: "infieldArm", label: "Infield Arm" },
  { key: "turnDoublePlay", label: "Turn DP" },
  { key: "outfieldRange", label: "Outfield Range" },
  { key: "outfieldError", label: "Outfield Error" },
  { key: "outfieldArm", label: "Outfield Arm" },
];
const PITCHES_LABELS: Record<string, string> = {
  fastball: "Fastball", slider: "Slider", curve: "Curveball", changeup: "Changeup",
  sinker: "Sinker", cutter: "Cutter", splitter: "Splitter", forkball: "Forkball",
  knuckleball: "Knuckleball", knuckleCurve: "Knuckle Curve", circleChange: "Circle Change", screwball: "Screwball",
};

export default function PlayerProfileBody({
  playerId, name, team, level, pos, role, age, height, bats, throws, isCollege,
  scout, osa, fitWeights, pitcherBonuses,
}: {
  playerId: number; name: string; team: string; level: string | null; pos: string | null; role: string | null;
  age: number | null; height: number | null; bats: string | null; throws: string | null; isCollege: boolean | null;
  scout: RatingBlock; osa: RatingBlock;
  fitWeights: { hitter: Record<string, number>; pitcher: Record<string, number> } | null;
  pitcherBonuses: Record<string, number> | null;
}) {
  const [source, setSource] = useState<"scout" | "osa">("scout");
  const listedIsPitcher = IS_PITCHER_POS.has(pos ?? "");
  const [view, setView] = useState<"batting" | "pitching">(listedIsPitcher ? "pitching" : "batting");

  const block = source === "scout" ? scout : osa;
  const tools = block?.tools ?? null;
  const missingOtherSource = source === "scout" ? !osa : !scout;

  const hasBattingData = !!tools && typeof tools.contact === "number";
  const hasPitchingData = !!tools && typeof tools.stuff === "number";

  const positionRatings: Record<string, number | null> | null = tools?.positionRatings ?? null;
  const positionRatingsPot: Record<string, number | null> | null = tools?.positionRatingsPot ?? null;
  const posFit = positionRatings ? recommendPosition(positionRatings, positionRatingsPot) : null;

  const fitWeightsForPos = listedIsPitcher ? fitWeights?.pitcher : fitWeights?.hitter;
  const fitScore = tools ? computeFitScore(pos, tools, fitWeightsForPos, pitcherBonuses) : null;

  const twoWayTags = computeTwoWayTags(pos, tools);
  const injuryTag = computeInjuryTag(tools?.injuryProne);
  const premiumFieldTag = computePremiumFieldingTag(positionRatings, positionRatingsPot);

  const splits = tools?.splits ?? {};

  return (
    <div>
      {/* Header: name + big OVR/POT/FIT on one line */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>{name}</h1>
        {block && (
          <div style={{ display: "flex", gap: 24 }}>
            <BigStat label="Overall" value={block.overall} />
            <BigStat label="Potential" value={block.potential} />
            {fitScore !== null && <BigStat label="Fit Score" value={fitScore} />}
          </div>
        )}
      </div>

      <div style={{ fontSize: 13.5, opacity: 0.85, marginBottom: 6 }}>
        {team} · {level ?? "—"} · {pos}{role ? ` (${role})` : ""}
        {age ? ` · Age ${age}` : ""}
        {height ? ` · ${height}cm` : ""}
        {bats ? ` · B:${bats}` : ""}
        {throws ? ` · T:${throws}` : ""}
        {isCollege !== null ? ` · ${isCollege ? "College" : "HS"}` : ""}
        {tools?.scoutAccuracy ? ` · Scout Acc: ${tools.scoutAccuracy}` : ""}
        {tools?.injuryProne ? ` · Injury: ${tools.injuryProne}` : ""}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {twoWayTags.map((t) => (
          <Tag key={t.label} bg={t.tone === "strong" ? "#fbe4e2" : "#e3f0fb"} fg={t.tone === "strong" ? "#a3241c" : "#1a5a9c"} label={t.label} />
        ))}
        {premiumFieldTag && <Tag bg={premiumFieldTag.bg} fg={premiumFieldTag.fg} label={premiumFieldTag.label} />}
        {injuryTag && <Tag bg={injuryTag.bg} fg={injuryTag.fg} label={injuryTag.label} />}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <div style={{ background: "var(--team-secondary)", padding: 4, borderRadius: 8 }}>
          <ToggleBtn active={source === "scout"} onClick={() => setSource("scout")} label="Scout" />
          <ToggleBtn active={source === "osa"} onClick={() => setSource("osa")} label="OSA" />
        </div>
        {(hasBattingData || hasPitchingData) && (
          <div style={{ background: "var(--team-secondary)", padding: 4, borderRadius: 8 }}>
            <ToggleBtn active={view === "batting"} onClick={() => setView("batting")} label="Batting" disabled={!hasBattingData} />
            <ToggleBtn active={view === "pitching"} onClick={() => setView("pitching")} label="Pitching" disabled={!hasPitchingData} />
          </div>
        )}
      </div>

      {/* Placeholder for a future section: last 7/14 splits, vs-hand game
          logs, season stats. Per spec this sits HERE — between the header
          above and the batting/pitching content below — for both single-
          and two-way players. Not built yet; needs game-log history and a
          confirmed stat list. */}

      {!block ? (
        <p style={{ opacity: 0.7 }}>No {source === "scout" ? "scouted" : "OSA"} ratings imported for this player yet.</p>
      ) : view === "batting" ? (
        <BattingView tools={tools} posFit={posFit} pos={pos} positionRatings={positionRatings} positionRatingsPot={positionRatingsPot} />
      ) : (
        <PitchingView tools={tools} />
      )}

      {missingOtherSource && (
        <p style={{ fontSize: 11.5, opacity: 0.6, marginTop: 16 }}>
          No {source === "scout" ? "OSA" : "scouted"} ratings imported for this player yet.
        </p>
      )}
    </div>
  );
}

function BattingView({ tools, posFit, pos, positionRatings, positionRatingsPot }: any) {
  const splits = tools?.splits ?? {};
  return (
    <>
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Batting Ratings</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 4, fontSize: 10.5, opacity: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
          <div /> <div style={{ textAlign: "center" }}>vs LHP</div> <div style={{ textAlign: "center" }}>vs RHP</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <SplitStatBar label="BABIP" current={tools.babip} potential={tools.babipPot} vsL={splits.babip?.l} vsR={splits.babip?.r} />
          <SplitStatBar label="Avoid K's" current={tools.avoidK} potential={tools.avoidKPot} vsL={splits.avoidK?.l} vsR={splits.avoidK?.r} />
          <SplitStatBar label="Gap" current={tools.gap} potential={tools.gapPot} vsL={splits.gap?.l} vsR={splits.gap?.r} />
          <SplitStatBar label="Power" current={tools.power} potential={tools.powerPot} vsL={splits.power?.l} vsR={splits.power?.r} />
          <SplitStatBar label="Eye" current={tools.eye} potential={tools.eyePot} vsL={splits.eye?.l} vsR={splits.eye?.r} />
        </div>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 11.5, opacity: 0.6 }}>Hidden/advanced (Contact overall)</summary>
          <div style={{ marginTop: 6 }}>
            <StatBar label="contact" current={tools.contact} potential={tools.contactPot} />
          </div>
        </details>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Baserunning &amp; Bunting</h2>
        <div style={{ display: "grid", gap: 6 }}>
          <StatBar label="Speed" current={tools.speed} />
          <StatBar label="Stealing Aggr." current={tools.stealingAggressiveness} />
          <StatBar label="Stealing Ability" current={tools.steal} />
          <StatBar label="Baserunning" current={tools.baserunning} />
          <StatBar label="Sacrifice Bunt" current={tools.sacBunt} />
          <StatBar label="Bunt for Hit" current={tools.buntForHit} />
        </div>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Batted Ball Profile</h2>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Groundball code: {tools.gbTypeCodeRaw ?? "—"} · Flyball code: {tools.fbTypeCodeRaw ?? "—"}
        </p>
        <p style={{ fontSize: 10.5, opacity: 0.55, marginTop: 2 }}>
          Raw codes only — the code-to-label mapping (e.g. "Pull Hitter"/"Normal") isn't confirmed yet.
        </p>
      </section>

      {positionRatings && (
        <section style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Position Fit (current → potential)</h2>
          {posFit && posFit.recommendedPos !== pos && (
            <p style={{ fontSize: 12.5, marginBottom: 6 }}>Recommended: <b>{posFit.recommendedPos}</b> ({posFit.reason})</p>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            {POSITION_FIT_ORDER.filter((p) => positionRatings[p] !== null && positionRatings[p] !== undefined).map((p) => (
              <StatBar key={p} label={p} current={positionRatings[p]} potential={positionRatingsPot?.[p] ?? null} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Fielding</h2>
        <div style={{ display: "grid", gap: 6 }}>
          {FIELDING_ORDER.filter((f) => typeof tools[f.key] === "number" && tools[f.key] > 0).map((f) => (
            <StatBar key={f.key} label={f.label} current={tools[f.key]} />
          ))}
        </div>
        <p style={{ fontSize: 10.5, opacity: 0.55, marginTop: 4 }}>
          No potential value exists for these — only the position grades above project a ceiling.
        </p>
      </section>
    </>
  );
}

function PitchingView({ tools }: any) {
  const splits = tools?.splits ?? {};
  const pitchEntries = Object.keys(PITCHES_LABELS)
    .filter((k) => typeof tools[k] === "number")
    .map((k) => ({ key: k, label: PITCHES_LABELS[k], current: tools[k] as number, potential: (tools[`${k}Pot`] as number) ?? tools[k] }))
    .sort((a, b) => b.potential - a.potential || b.current - a.current);

  return (
    <>
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Pitching Tools</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 4, fontSize: 10.5, opacity: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
          <div /> <div style={{ textAlign: "center" }}>vs LHB</div> <div style={{ textAlign: "center" }}>vs RHB</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <SplitStatBar label="Stuff" current={tools.stuff} potential={tools.stuffPot} vsL={splits.stuff?.l} vsR={splits.stuff?.r} leftHeader="vs LHB" rightHeader="vs RHB" />
          <SplitStatBar label="Movement" current={tools.movement} potential={tools.movementPot} vsL={splits.movement?.l} vsR={splits.movement?.r} leftHeader="vs LHB" rightHeader="vs RHB" />
          <SplitStatBar label="HR Rate" current={tools.hrRate} potential={tools.hrRatePot} vsL={splits.hrRate?.l} vsR={splits.hrRate?.r} leftHeader="vs LHB" rightHeader="vs RHB" indent />
          <SplitStatBar label="PBABIP" current={tools.pbabip} potential={tools.pbabipPot} vsL={splits.pbabip?.l} vsR={splits.pbabip?.r} leftHeader="vs LHB" rightHeader="vs RHB" indent />
          <SplitStatBar label="Control" current={tools.control} potential={tools.controlPot} vsL={splits.control?.l} vsR={splits.control?.r} leftHeader="vs LHB" rightHeader="vs RHB" />
        </div>
      </section>

      {pitchEntries.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Pitching Ratings</h2>
          <div style={{ display: "grid", gap: 6 }}>
            {pitchEntries.map((p) => (
              <StatBar key={p.key} label={p.label} current={p.current} potential={tools[`${p.key}Pot`] ?? null} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Other Pitching Info</h2>
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <StatBar label="Stamina" current={tools.stamina} />
          <StatBar label="Hold Runners" current={tools.holdRunners} />
          <StatBar label="Sac Bunt" current={tools.sacBunt} />
        </div>
        <p style={{ fontSize: 12.5 }}>
          GB/FB type: {tools.gbfbType ?? "—"} (approximate — bucket boundaries not fully confirmed) · Arm Slot: {tools.armSlot ?? "—"}
        </p>
        <p style={{ fontSize: 12.5, marginTop: 4 }}>
          Velocity: {tools.velocity ?? "—"}{tools.velocityPot && tools.velocityPot !== tools.velocity ? ` → ${tools.velocityPot}` : ""}
        </p>
        <p style={{ fontSize: 10.5, opacity: 0.55, marginTop: 6 }}>
          "Pitcher Type" isn't included here — I haven't located a confirmed raw field for it yet.
        </p>
      </section>
    </>
  );
}

function BigStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.6, textAlign: "right" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: getRatingColor(value), textAlign: "right" }}>{value ?? "—"}</div>
    </div>
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ background: bg, color: fg, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{label}</span>
  );
}

function ToggleBtn({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? "var(--team-accent)" : "transparent", color: "#fff", border: "none",
        padding: "5px 12px", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, fontSize: 12.5,
      }}
    >
      {label}
    </button>
  );
}
