"use client";

import { useEffect, useState } from "react";
import { classLabel } from "@/lib/classLabel";

type DraftResultRow = {
  id: number;
  round: number;
  pickInRound: number | null;
  overallSlot: number;
  overridePosition: string | null;
  team: { id: number; name: string };
  player: { id: number; name: string; pos: string | null; age: number | null; isCollege: boolean | null };
};

export default function DraftLog() {
  const [rows, setRows] = useState<DraftResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState("");

  useEffect(() => {
    fetch("/api/draft-results").then((r) => r.json()).then(setRows).finally(() => setLoading(false));
  }, []);

  const visibleRows = rows.filter((r) => r.player.name.toLowerCase().includes(nameQuery.trim().toLowerCase()));

  // Position mix by team — uses YOUR override when you've set one,
  // otherwise the actual listed position, so this chart reflects real
  // intentions rather than just whatever S+ has them tagged as.
  const byTeam = new Map<string, Record<string, number>>();
  for (const r of visibleRows) {
    const key = r.team.name;
    const posCounts = byTeam.get(key) ?? {};
    const pos = r.overridePosition || r.player.pos || "?";
    posCounts[pos] = (posCounts[pos] ?? 0) + 1;
    byTeam.set(key, posCounts);
  }
  const allPositions = Array.from(
    new Set(visibleRows.map((r) => r.overridePosition || r.player.pos || "?"))
  ).sort();

  if (loading) return <p>Loading…</p>;
  if (rows.length === 0) return <p style={{ opacity: 0.7 }}>No picks logged yet — run /api/sync/draft (or the draft-watch workflow) once the draft is underway.</p>;

  return (
    <div>
      <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 10 }}>
        Read-only league-wide log. To set your own picks' minor-league assignment or position, use "My Draft Recap" instead.
      </p>
      <input
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        placeholder="Search by name…"
        style={{ padding: "6px 10px", fontSize: 12.5, marginBottom: 10, width: 220, border: "1px solid #e2e7f0", borderRadius: 6 }}
      />
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Picks by round</h3>
      <table className="data-table" style={{ marginBottom: 24, tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "27%" }} />
          <col style={{ width: "27%" }} />
          <col style={{ width: "8%" }} />
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
            <th>Class</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r) => (
            <tr key={r.id}>
              <td>{r.round}{r.pickInRound ? `-${r.pickInRound}` : ""}</td>
              <td>{r.overallSlot}</td>
              <td className="left">{r.team.name}</td>
              <td className="left">
                <a href={`/players/${r.player.id}`} style={{ color: "inherit", borderBottom: "1px dotted currentColor", textDecoration: "none" }}>
                  {r.player.name}
                </a>
              </td>
              <td>{r.overridePosition ? `${r.overridePosition}*` : r.player.pos}</td>
              <td>{r.player.age ?? "—"}</td>
              <td>{classLabel(r.player.isCollege)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 10.5, opacity: 0.55, marginTop: -14, marginBottom: 24 }}>
        * = your own position override, set on "My Draft Recap" — not what S+ has them listed as.
      </p>

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
