"use client";

import { useEffect, useState } from "react";
import PlayerCard, { PlayerCardData } from "@/app/components/PlayerCard";
import { classLabel } from "@/lib/classLabel";

type Row = {
  id: number;
  round: number;
  pickInRound: number | null;
  overallSlot: number;
  intendedLevel: string | null;
  overridePosition: string | null;
  team: { id: number; name: string };
  player: { id: number; name: string; pos: string | null; age: number | null; isCollege: boolean | null };
};

const LEVEL_OPTIONS = ["MAJORS", "RESERVES", "DEV_A", "DEV_B", "YOUTH_ACADEMY"];
const POSITION_OPTIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CL"];

// Same hardcoded convention as the rest of the app pending the team switcher.
const CONTROLLING_TEAM_ID = 105;

export default function DraftRecapPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlayerCardData | null>(null);
  const [cardLoading, setCardLoading] = useState<number | null>(null);
  const [nameQuery, setNameQuery] = useState("");

  function load() {
    setLoading(true);
    fetch(`/api/draft-results?teamId=${CONTROLLING_TEAM_ID}`).then((r) => r.json()).then(setRows).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function patch(id: number, field: "intendedLevel" | "overridePosition", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value || null } : r)));
    await fetch("/api/draft-results", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
  }

  async function openCard(playerId: number) {
    setCardLoading(playerId);
    try {
      const res = await fetch(`/api/players/${playerId}`);
      if (res.ok) setSelected(await res.json());
    } finally {
      setCardLoading(null);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (rows.length === 0) return <p style={{ opacity: 0.7 }}>No picks for your team yet.</p>;

  const visibleRows = rows.filter((r) => r.player.name.toLowerCase().includes(nameQuery.trim().toLowerCase()));

  return (
    <div>
      <p style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 12 }}>
        Your draft class only. Click a name for the quick-glance card (full profile link is inside it) —
        set intended level and, if you'll play them somewhere other than their listed spot, your own
        position note here so the draft-wide position chart stays accurate to your intentions.
      </p>
      <input
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        placeholder="Search by name…"
        style={{ padding: "6px 10px", fontSize: 12.5, marginBottom: 10, width: 220, border: "1px solid #e2e7f0", borderRadius: 6 }}
      />
      <table className="data-table">
        <thead>
          <tr>
            <th>Round</th><th>Overall</th><th className="left">Player</th><th>Listed Pos</th>
            <th>Your Pos</th><th>Age</th><th>Class</th><th>Assign to</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r) => (
            <tr key={r.id}>
              <td>{r.round}{r.pickInRound ? `-${r.pickInRound}` : ""}</td>
              <td>{r.overallSlot}</td>
              <td className="left">
                <button
                  onClick={() => openCard(r.player.id)}
                  disabled={cardLoading === r.player.id}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", borderBottom: "1px dotted currentColor", font: "inherit" }}
                >
                  {cardLoading === r.player.id ? "Loading…" : r.player.name}
                </button>
              </td>
              <td>{r.player.pos}</td>
              <td>
                <select
                  value={r.overridePosition ?? ""}
                  onChange={(e) => patch(r.id, "overridePosition", e.target.value)}
                  style={{ fontSize: 12, padding: "3px 5px" }}
                >
                  <option value="">— same as listed —</option>
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td>{r.player.age ?? "—"}</td>
              <td>{classLabel(r.player.isCollege)}</td>
              <td>
                <select
                  value={r.intendedLevel ?? ""}
                  onChange={(e) => patch(r.id, "intendedLevel", e.target.value)}
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

      {selected && <PlayerCard player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
