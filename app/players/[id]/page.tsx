import { prisma } from "@/lib/prisma";
import { getRatingColor } from "@/lib/ratingColor";
import { recommendPosition } from "@/lib/positionFit";
import { computeFitScore } from "@/lib/fitScore";
import StatBar from "@/app/components/StatBar";
import { PlayerTagBadge, StreakIcon } from "@/app/components/PlayerTag";
import Link from "next/link";

export const dynamic = "force-dynamic"; // always read current DB state, never cache stale data

const HITTER_HEADLINE = ["contact", "power", "eye", "babip", "speed", "gap", "avoidK"];
const PITCHER_HEADLINE = ["stuff", "control", "movement", "stamina", "hrRate", "pbabip"];
const IS_PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

// This page is a SERVER component: the data below is fetched and rendered
// into the HTML before it's ever sent to the browser. That's deliberate —
// it's what makes this page readable by another AI/tool/crawler that
// doesn't execute JavaScript, unlike the rest of the app's client-rendered
// tabs (which show "Loading..." to anything that can't run the fetch).
export default async function PlayerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true, nickname: true } },
      ratings: { orderBy: { capturedAt: "desc" }, take: 2 },
    },
  });

  if (!player) {
    return <main style={{ padding: 20 }}>No player found with ID {id}.</main>;
  }

  const scout = player.ratings.find((r) => r.source === "SCOUT");
  const osa = player.ratings.find((r) => r.source === "OSA");
  const block = scout ?? osa; // scout still the default when both exist
  const tools = (block?.tools as Record<string, any>) ?? null;
  const isPitcher = IS_PITCHER_POS.has(player.pos ?? "");
  const headlineKeys = isPitcher ? PITCHER_HEADLINE : HITTER_HEADLINE;

  const positionRatings = tools?.positionRatings ?? null;
  const positionRatingsPot = tools?.positionRatingsPot ?? null;
  const posFit = positionRatings ? recommendPosition(positionRatings, positionRatingsPot) : null;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const fitWeights = isPitcher ? (settings?.fitWeights as any)?.pitcher : (settings?.fitWeights as any)?.hitter;
  const fitScore = tools ? computeFitScore(player.pos, tools, fitWeights, settings?.pitcherBonuses as any) : null;

  // Tag/streak computation is intentionally NOT done here — see
  // app/components/PlayerTag.tsx. This page always renders neutral until
  // the box-score/game-log history that would justify a real
  // promotion-need or overmatched determination exists.
  const tag = null;
  const streak = null;

  return (
    <main style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: 12.5, opacity: 0.7 }}>&larr; Back to app</Link>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{player.firstName} {player.lastName}</h1>
        <StreakIcon streak={streak} />
        <PlayerTagBadge tag={tag} />
      </div>
      <div style={{ fontSize: 13.5, opacity: 0.8, marginBottom: 20 }}>
        {player.team ? `${player.team.name} ${player.team.nickname}` : "Free Agent"} · {player.level ?? "—"} ·{" "}
        {player.pos}{player.role ? ` (${player.role})` : ""}
        {player.age ? ` · Age ${player.age}` : ""}
        {player.bats ? ` · B:${player.bats}` : ""}
        {player.throws ? ` · T:${player.throws}` : ""}
        {player.isCollege !== null ? ` · ${player.isCollege ? "College" : "HS"}` : ""}
      </div>

      {!block ? (
        <p style={{ opacity: 0.7 }}>No ratings imported for this player yet.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 30, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Overall</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: getRatingColor(block.overall) }}>{block.overall ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Potential</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: getRatingColor(block.potential) }}>{block.potential ?? "—"}</div>
            </div>
            {fitScore !== null && (
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>Fit Score</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: getRatingColor(fitScore) }}>{fitScore}</div>
              </div>
            )}
          </div>

          {posFit && posFit.recommendedPos !== player.pos && (
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              Recommended position: <b>{posFit.recommendedPos}</b> ({posFit.reason})
            </p>
          )}

          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Tools</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {headlineKeys
                .filter((k) => tools && tools[k] !== null && tools[k] !== undefined)
                .map((k) => (
                  <StatBar key={k} label={k} current={tools![k]} potential={tools![`${k}Pot`] ?? null} />
                ))}
            </div>
          </section>

          {isPitcher && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Pitches</h2>
              <div style={{ display: "grid", gap: 6 }}>
                {["fastball", "slider", "curve", "changeup", "sinker", "cutter", "splitter", "forkball", "knuckleball", "knuckleCurve", "circleChange", "screwball"]
                  .filter((k) => tools && typeof tools[k] === "number")
                  .map((k) => (
                    <StatBar key={k} label={k} current={tools![k]} potential={tools![`${k}Pot`] ?? null} />
                  ))}
              </div>
              {tools?.velocity && (
                <p style={{ fontSize: 12.5, marginTop: 8 }}>
                  Velocity: {tools.velocity}{tools.velocityPot && tools.velocityPot !== tools.velocity ? ` → ${tools.velocityPot}` : ""}
                </p>
              )}
            </section>
          )}

          {positionRatings && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Position fit (current → potential)</h2>
              <div style={{ display: "grid", gap: 6 }}>
                {Object.entries(positionRatings)
                  .filter(([, v]) => v !== null && v !== undefined)
                  .map(([pos, v]) => (
                    <StatBar key={pos} label={pos} current={v as number} potential={positionRatingsPot?.[pos] ?? null} />
                  ))}
              </div>
            </section>
          )}

          {!isPitcher && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Fielding</h2>
              <div style={{ display: "grid", gap: 6 }}>
                {["infieldArm", "infieldError", "infieldRange", "outfieldArm", "outfieldError", "outfieldRange", "catcherArm", "catcherBlock", "catcherFraming", "turnDoublePlay"]
                  .filter((k) => tools && typeof tools[k] === "number" && tools[k] > 0)
                  .map((k) => (
                    <StatBar key={k} label={k} current={tools![k]} potential={null} />
                  ))}
              </div>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>
                No potential value exists for these in the API's data — only the position-suitability grades above project a ceiling.
              </p>
            </section>
          )}
        </>
      )}

      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 30 }}>
        Player ID {player.id} · Scout data {scout ? "available" : "not imported"} · OSA data {osa ? "available" : "not imported"}
      </p>
    </main>
  );
}
