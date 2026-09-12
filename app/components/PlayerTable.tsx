"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerCard, { PlayerCardData } from "@/app/components/PlayerCard";
import { getRatingColor } from "@/lib/ratingColor";
import { recommendPosition } from "@/lib/positionFit";
import { computeFitScore } from "@/lib/fitScore";

type Pool = "draft" | "fa" | "international" | "all";
type ColumnSet = "draft" | "roster"; // draft: age/class-focused. roster: team/org/level-focused.

type SortKey = "name" | "team" | "level" | "pos" | "age" | "overall" | "potential" | "fitScore";

// Best-effort JUCO/2-year detection from the college name string itself —
// there's no dedicated field for it, so this is a heuristic, not a
// guarantee. Worth double-checking against real draft classes.
function classLabel(college: string | null): string {
  if (!college) return "HS";
  if (/\b(community college|junior college|\bjc\b|jr\.? college)\b/i.test(college)) {
    return `${college} (2YR)`;
  }
  return college;
}

export default function PlayerTable({ pool, columns, teamId }: { pool: Pool; columns: ColumnSet; teamId?: number | null }) {
  const [players, setPlayers] = useState<PlayerCardData[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [ratingSource, setRatingSource] = useState<"scout" | "osa">("scout"); // scout default, per spec
  const [selected, setSelected] = useState<PlayerCardData | null>(null);
  const [fitWeights, setFitWeights] = useState<{ hitter: Record<string, number>; pitcher: Record<string, number> } | null>(null);

  useEffect(() => {
    // "all" without a team would try to ship 9000+ players in one response
    // and blow the serverless timeout — don't even fetch until a team's picked.
    if (pool === "all" && !teamId) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ pool });
    if (teamId) qs.set("teamId", String(teamId));
    fetch(`/api/players?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        const contentType = r.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned a non-JSON response (likely a timeout on a very large query)");
        }
        return r.json();
      })
      .then((data) => {
        setPlayers(data.players ?? []);
        setTruncated(!!data.truncated);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [pool, teamId]);

  useEffect(() => {
    if (columns !== "draft") return;
    fetch("/api/settings").then((r) => r.json()).then((s) => setFitWeights(s.fitWeights ?? null));
  }, [columns]);

  const PITCHER_POS = new Set(["P", "SP", "RP", "CL"]);

  const sorted = useMemo(() => {
    const withVal = players.map((p) => {
      const block = ratingSource === "scout" ? p.scout : p.osa;
      const weights = fitWeights ? (PITCHER_POS.has(p.pos ?? "") ? fitWeights.pitcher : fitWeights.hitter) : undefined;
      const fitScore = columns === "draft" ? computeFitScore(p.pos, block?.tools, weights) : null;
      return { p, overall: block?.overall ?? -1, potential: block?.potential ?? -1, fitScore: fitScore ?? -1 };
    });
    withVal.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "name": av = a.p.name; bv = b.p.name; break;
        case "team": av = a.p.team?.abbr ?? ""; bv = b.p.team?.abbr ?? ""; break;
        case "level": av = a.p.level ?? ""; bv = b.p.level ?? ""; break;
        case "pos": av = a.p.pos ?? ""; bv = b.p.pos ?? ""; break;
        case "age": av = a.p.age ?? 0; bv = b.p.age ?? 0; break;
        case "overall": av = a.overall; bv = b.overall; break;
        case "potential": av = a.potential; bv = b.potential; break;
        case "fitScore": av = a.fitScore; bv = b.fitScore; break;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return withVal;
  }, [players, sortKey, sortDir, ratingSource, fitWeights, columns]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ background: "var(--team-secondary)", padding: 4, borderRadius: 8 }}>
          <button
            style={{ background: ratingSource === "scout" ? "var(--team-accent)" : "transparent", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}
            onClick={() => setRatingSource("scout")}
          >
            Scout
          </button>{" "}
          <button
            style={{ background: ratingSource === "osa" ? "var(--team-accent)" : "transparent", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}
            onClick={() => setRatingSource("osa")}
          >
            OSA
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && pool === "all" && !teamId && (
        <p style={{ opacity: 0.7 }}>Pick a team above to load its players — the full league list is too large to load at once.</p>
      )}

      {!loading && !error && (pool !== "all" || teamId) && players.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No players in this view yet — make sure the relevant syncs have run
          {pool === "draft" ? " (the draft-watch workflow, or a manual /api/sync/draft call)" : ""}.
        </p>
      )}

      {truncated && (
        <p style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>
          Showing the first {players.length} — narrow with a team filter to see everyone in that team.
        </p>
      )}

      {!loading && players.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Player</th>
              {columns === "roster" && <th onClick={() => toggleSort("team")}>Team</th>}
              {columns === "roster" && <th onClick={() => toggleSort("level")}>Level</th>}
              <th onClick={() => toggleSort("pos")}>Pos</th>
              {columns === "draft" && <th data-tooltip="0/blank College from /draftv2 means high schooler">Class</th>}
              {columns === "draft" && <th>Position Fit</th>}
              {columns === "draft" && <th onClick={() => toggleSort("fitScore")} data-tooltip="Weighted composite from your Settings-page tool weights">Fit Score</th>}
              <th onClick={() => toggleSort("age")}>Age</th>
              <th onClick={() => toggleSort("overall")} data-tooltip="Current-year grade, 20-80 scale (can exceed 80)">OVR</th>
              <th onClick={() => toggleSort("potential")} data-tooltip="Projected ceiling, 20-80 scale">POT</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ p, overall, potential, fitScore }) => {
              const block = ratingSource === "scout" ? p.scout : p.osa;
              const posRatings = block?.tools?.positionRatings;
              const posRatingsPot = block?.tools?.positionRatingsPot;
              const fit = posRatings ? recommendPosition(posRatings, posRatingsPot) : null;
              return (
                <tr key={p.id} onClick={() => setSelected(p)}>
                  <td className="left">{p.name}</td>
                  {columns === "roster" && <td>{p.team?.abbr ?? "FA"}</td>}
                  {columns === "roster" && <td>{p.level ?? "—"}</td>}
                  <td>{p.pos}{p.role ? `/${p.role}` : ""}</td>
                  {columns === "draft" && (
                    <td style={{ fontSize: 11 }}>{classLabel(p.college)}</td>
                  )}
                  {columns === "draft" && (
                    <td style={{ fontSize: 11 }}>
                      {fit && fit.recommendedPos !== p.pos ? `→ ${fit.recommendedPos}` : "—"}
                    </td>
                  )}
                  {columns === "draft" && (
                    <td style={{ color: getRatingColor(fitScore >= 0 ? fitScore : null), fontWeight: 700 }}>
                      {fitScore >= 0 ? fitScore : "—"}
                    </td>
                  )}
                  <td>{p.age ?? "—"}</td>
                  <td style={{ color: getRatingColor(overall >= 0 ? overall : null), fontWeight: 700 }}>
                    {overall >= 0 ? overall : "—"}
                  </td>
                  <td style={{ color: getRatingColor(potential >= 0 ? potential : null), fontWeight: 700 }}>
                    {potential >= 0 ? potential : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && <PlayerCard player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
