"use client";

import { useEffect, useState } from "react";

type DraftResultRow = {
  id: number;
  round: number;
  pickInRound: number | null;
  overallSlot: number;
  team: { id: number; name: string };
  player: { id: number; name: string; pos: string | null; age: number | null };
};

export default function DraftLog() {
  const [rows, setRows] = useState<DraftResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/draft-results").then((r) => r.json()).then(setRows).finally(() => setLoading(false));
  }, []);

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
      <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 10 }}>
        Read-only league-wide log. To set your own picks' minor-league assignment, use "My Draft Recap" instead.
      </p>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Picks by round</h3>
      <table className="data-table" style={{ marginBottom: 24, tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
        </colgroup>
        <thead>
          <tr>
            <th data-tooltip="Round-Pick within round">Round</th>
            <th>Overall</th>
            <th className="left">Team</th>
            <th className="left">Player</th>
            <th>Pos</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.round}{r.pickInRound ? `-${r.pickInRound}` : ""}</td>
              <td>{r.overallSlot}</td>
              <td className="left">{r.team.name}</td>
              <td className="left">
                <a href={`/players/${r.player.id}`} style={{ color: "inherit", borderBottom: "1px dotted currentColor", textDecoration: "none" }}>
                  {r.player.name}
                </a>
              </td>
              <td>{r.player.pos}</td>
              <td>{r.player.age ?? "—"}</td>
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
