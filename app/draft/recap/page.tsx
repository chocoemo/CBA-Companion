"use client";

import { useEffect, useState } from "react";

type Row = {
  id: number;
  round: number;
  pickInRound: number | null;
  overallSlot: number;
  intendedLevel: string | null;
  team: { id: number; name: string };
  player: { id: number; name: string; pos: string | null; age: number | null };
};

const LEVEL_OPTIONS = ["MAJORS", "RESERVES", "DEV_A", "DEV_B", "YOUTH_ACADEMY"];

// Same hardcoded convention as the rest of the app pending the team switcher.
const CONTROLLING_TEAM_ID = 105;

export default function DraftRecapPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/draft-results?teamId=${CONTROLLING_TEAM_ID}`).then((r) => r.json()).then(setRows).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setLevel(id: number, level: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, intendedLevel: level || null } : r)));
    await fetch("/api/draft-results", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, intendedLevel: level }),
    });
  }

  if (loading) return <p>Loading…</p>;
  if (rows.length === 0) return <p style={{ opacity: 0.7 }}>No picks for your team yet.</p>;

  return (
    <div>
      <p style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 12 }}>
        Your draft class only — set where each player will land once they're officially part of the org.
        Click a name for their full profile.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Round</th><th>Overall</th><th className="left">Player</th><th>Pos</th><th>Age</th><th>Assign to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.round}{r.pickInRound ? `-${r.pickInRound}` : ""}</td>
              <td>{r.overallSlot}</td>
              <td className="left">
                <a href={`/players/${r.player.id}`} style={{ color: "inherit", borderBottom: "1px dotted currentColor", textDecoration: "none" }}>
                  {r.player.name}
                </a>
              </td>
              <td>{r.player.pos}</td>
              <td>{r.player.age ?? "—"}</td>
              <td>
                <select
                  value={r.intendedLevel ?? ""}
                  onChange={(e) => setLevel(r.id, e.target.value)}
                  style={{ fontSize: 12, padding: "3px 5px" }}
                >
                  <option value="">— not set —</option>
                  {LEVEL_OPTIONS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
