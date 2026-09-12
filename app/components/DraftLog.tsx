"use client";

import { useEffect, useState } from "react";

type DraftResultRow = {
  id: number;
  round: number;
  pickInRound: number | null;
  overallSlot: number;
  intendedLevel: string | null;
  team: { id: number; name: string };
  player: { id: number; name: string; pos: string | null; age: number | null };
};

const LEVEL_OPTIONS = ["MAJORS", "RESERVES", "DEV_A", "DEV_B", "YOUTH_ACADEMY"];

// Hardcoded until the team switcher (Phase-later) exists — same convention
// as the rest of the app (Calgary is the default/only controlling team).
const CONTROLLING_TEAM_ID = 105;

export default function DraftLog() {
  const [rows, setRows] = useState<DraftResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/draft-results").then((r) => r.json()).then(setRows).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setLevel(id: number, level: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, intendedLevel: level || null } : r)));
    await fetch("/api/draft-results", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, intendedLevel: level }),
    });
  }

  // Position mix by team — actual listed position, for the "who's drafting what" chart.
  const byTeam = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const key = r.team.name;
    const posCounts = byTeam.get(key) ?? {};
    const pos = r.player.pos ?? "?";
    posCounts[pos] = (posCounts[pos] ?? 0) + 1;
    byTeam.set(key, posCounts);
  }
  const allPositions = Array.from(new Set(rows.map((r) => r.player.pos ?? "?"))).sort();

  if (loading) return <p>Loading…</p>;
  if (rows.length === 0) return <p style={{ opacity: 0.7 }}>No picks logged yet — run /api/sync/draft (or the draft-watch workflow) once the draft is underway.</p>;

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Picks by round</h3>
      <table className="data-table" style={{ marginBottom: 24, tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th data-tooltip="Round-Pick within round">Round</th>
            <th>Overall</th>
            <th className="left">Team</th>
            <th className="left">Player</th>
            <th>Pos</th>
            <th>Age</th>
            <th>Assign to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.round}{r.pickInRound ? `-${r.pickInRound}` : ""}</td>
              <td>{r.overallSlot}</td>
              <td className="left">{r.team.name}</td>
              <td className="left">{r.player.name}</td>
              <td>{r.player.pos}</td>
              <td>{r.player.age ?? "—"}</td>
              <td onClick={(e) => e.stopPropagation()}>
                {r.team.id === CONTROLLING_TEAM_ID ? (
                  <select
                    value={r.intendedLevel ?? ""}
                    onChange={(e) => setLevel(r.id, e.target.value)}
                    style={{ fontSize: 11.5, padding: "2px 4px", width: "100%" }}
                  >
                    <option value="">— not set —</option>
                    {LEVEL_OPTIONS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                ) : (
                  <span style={{ opacity: 0.4, fontSize: 11.5 }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Positions drafted, by team</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th className="left">Team</th>
            {allPositions.map((p) => <th key={p}>{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from(byTeam.entries()).map(([team, counts]) => (
            <tr key={team}>
              <td className="left">{team}</td>
              {allPositions.map((p) => <td key={p}>{counts[p] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
