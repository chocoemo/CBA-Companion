"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HITTER_WEIGHTS, DEFAULT_PITCHER_WEIGHTS, DEFAULT_PITCHER_BONUSES } from "@/lib/fitScore";

type League = { id: number; name: string; isCbaAffiliated: boolean };

export default function SettingsPage() {
  const [hitterWeights, setHitterWeights] = useState<Record<string, number>>(DEFAULT_HITTER_WEIGHTS);
  const [pitcherWeights, setPitcherWeights] = useState<Record<string, number>>(DEFAULT_PITCHER_WEIGHTS);
  const [pitcherBonuses, setPitcherBonuses] = useState<Record<string, number>>(DEFAULT_PITCHER_BONUSES);
  const [roster, setRoster] = useState({
    rosterMinC: "", rosterMaxC: "", rosterMinIF: "", rosterMaxIF: "",
    rosterMinOF: "", rosterMaxOF: "", rosterMinP: "", rosterMaxP: "",
  });
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/leagues").then((r) => r.json()),
    ]).then(([settings, leagueList]) => {
      if (settings.fitWeights?.hitter) setHitterWeights(settings.fitWeights.hitter);
      if (settings.fitWeights?.pitcher) setPitcherWeights(settings.fitWeights.pitcher);
      if (settings.pitcherBonuses) setPitcherBonuses(settings.pitcherBonuses);
      setRoster({
        rosterMinC: settings.rosterMinC ?? "", rosterMaxC: settings.rosterMaxC ?? "",
        rosterMinIF: settings.rosterMinIF ?? "", rosterMaxIF: settings.rosterMaxIF ?? "",
        rosterMinOF: settings.rosterMinOF ?? "", rosterMaxOF: settings.rosterMaxOF ?? "",
        rosterMinP: settings.rosterMinP ?? "", rosterMaxP: settings.rosterMaxP ?? "",
      });
      setLeagues(leagueList);
      setLoading(false);
    });
  }, []);

  async function save() {
    const body: any = {
      fitWeights: { hitter: hitterWeights, pitcher: pitcherWeights },
      pitcherBonuses,
    };
    for (const [k, v] of Object.entries(roster)) {
      body[k] = v === "" ? null : Number(v);
    }
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleLeague(id: number, current: boolean) {
    await fetch("/api/leagues", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, isCbaAffiliated: !current }) });
    setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, isCbaAffiliated: !current } : l)));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Fit score weights</h2>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        Point-scale weights (not multipliers) — the score is a weighted <i>average</i> of the tools below, so it
        naturally lands on the same 20-80-ish scale as the ratings themselves. Doesn't need to sum to 100, but
        that's the convention the defaults follow.
      </p>

      <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 14 }}>Hitters</h3>
      {Object.entries(hitterWeights).map(([tool, w]) => (
        <WeightRow key={tool} label={tool} value={w} max={40} onChange={(v) => setHitterWeights((s) => ({ ...s, [tool]: v }))} />
      ))}

      <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 14 }}>Pitchers</h3>
      {Object.entries(pitcherWeights).map(([tool, w]) => (
        <WeightRow key={tool} label={tool} value={w} max={40} onChange={(v) => setPitcherWeights((s) => ({ ...s, [tool]: v }))} />
      ))}

      <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 14 }}>Pitcher bonuses</h3>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
        Added on top of the weighted average — GB/FB-type bucket bonus, plus a flat bonus for starters.
      </p>
      {Object.entries(pitcherBonuses).map(([key, v]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
          <div style={{ width: 90, fontSize: 12.5 }}>{key}</div>
          <input
            type="number" step={0.5} value={v} style={{ width: 70, fontSize: 12, padding: 3 }}
            onChange={(e) => setPitcherBonuses((s) => ({ ...s, [key]: Number(e.target.value) }))}
          />
        </div>
      ))}

      <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 24, marginBottom: 10 }}>Roster min / max</h2>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        Global defaults for now — per-team/per-level limits are a planned upgrade to this section.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {(["C", "IF", "OF", "P"] as const).map((group) => (
          <div key={group}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{group}</div>
            <input
              type="number" placeholder="min" style={{ width: "100%", marginBottom: 4, padding: 4 }}
              value={(roster as any)[`rosterMin${group}`]}
              onChange={(e) => setRoster((s) => ({ ...s, [`rosterMin${group}`]: e.target.value }))}
            />
            <input
              type="number" placeholder="max" style={{ width: "100%", padding: 4 }}
              value={(roster as any)[`rosterMax${group}`]}
              onChange={(e) => setRoster((s) => ({ ...s, [`rosterMax${group}`]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 24, marginBottom: 10 }}>League classification</h2>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        Auto-set from /lgdata's own "top-level league" flag on each sync — override here only if one looks wrong.
        Checked = shows up in the International tab.
      </p>
      {leagues.length === 0 && <p style={{ opacity: 0.6, fontSize: 12.5 }}>No leagues synced yet.</p>}
      {leagues.map((l) => (
        <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
          <input type="checkbox" checked={!l.isCbaAffiliated} onChange={() => toggleLeague(l.id, l.isCbaAffiliated)} />
          {l.name} <span style={{ opacity: 0.5 }}>(id {l.id})</span>
        </label>
      ))}

      <button
        onClick={save}
        style={{ marginTop: 20, background: "var(--team-accent)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
      >
        Save settings
      </button>
      {saved && <span style={{ marginLeft: 10, color: "#1a7a3c", fontSize: 12.5 }}>Saved.</span>}
    </div>
  );
}

function WeightRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
      <div style={{ width: 90, fontSize: 12.5 }}>{label}</div>
      <input
        type="range" min={0} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <div style={{ width: 30, fontSize: 12, textAlign: "right" }}>{value}</div>
    </div>
  );
}
