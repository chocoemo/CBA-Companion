"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HITTER_WEIGHTS, DEFAULT_PITCHER_WEIGHTS } from "@/lib/fitScore";

type League = { id: number; name: string; isCbaAffiliated: boolean };

export default function SettingsPage() {
  const [hitterWeights, setHitterWeights] = useState<Record<string, number>>(DEFAULT_HITTER_WEIGHTS);
  const [pitcherWeights, setPitcherWeights] = useState<Record<string, number>>(DEFAULT_PITCHER_WEIGHTS);
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
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Fit score weights</h2>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        Drives the "Fit Score" composite on the draft Big Board — separate from the position-fit
        recommendation, which uses your C/CF/SS priority hierarchy directly.
      </p>

      <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 14 }}>Hitters</h3>
      {Object.entries(hitterWeights).map(([tool, w]) => (
        <WeightRow key={tool} label={tool} value={w} onChange={(v) => setHitterWeights((s) => ({ ...s, [tool]: v }))} />
      ))}

      <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 14 }}>Pitchers</h3>
      {Object.entries(pitcherWeights).map(([tool, w]) => (
        <WeightRow key={tool} label={tool} value={w} onChange={(v) => setPitcherWeights((s) => ({ ...s, [tool]: v }))} />
      ))}

      <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 24, marginBottom: 10 }}>Roster min / max</h2>
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
        Mark which leagues are NOT affiliated with any CBA org — those players show up in the
        International tab. Everything defaults to unclassified (excluded from International)
        until you flip it here. Run the /lgdata sync first if this list is empty.
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

function WeightRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
      <div style={{ width: 90, fontSize: 12.5 }}>{label}</div>
      <input
        type="range" min={0} max={2} step={0.05} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <div style={{ width: 36, fontSize: 12, textAlign: "right" }}>{value.toFixed(2)}</div>
    </div>
  );
}
