"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HITTER_WEIGHTS, DEFAULT_PITCHER_WEIGHTS, DEFAULT_PITCHER_BONUSES } from "@/lib/fitScore";

type League = { id: number; name: string; isCbaAffiliated: boolean };
type Team = { id: number; name: string; nickname: string };

// Explicit order, since Postgres JSONB does NOT preserve object key
// insertion order on round-trip — relying on Object.entries() iteration
// order silently scrambled the display order after the first save.
const BONUS_DISPLAY_ORDER = ["EX GB", "GB", "NEU", "FB", "EX FB", "SP"];

const BONUS_LABELS: Record<string, string> = {
  "EX GB": "EX GB groundball type",
  "GB": "GB groundball type",
  "NEU": "NEU groundball type",
  "FB": "FB groundball type",
  "EX FB": "EX FB groundball type",
  "SP": "Starter bonus",
};

export default function SettingsPage() {
  const [hitterWeights, setHitterWeights] = useState<Record<string, number>>(DEFAULT_HITTER_WEIGHTS);
  const [pitcherWeights, setPitcherWeights] = useState<Record<string, number>>(DEFAULT_PITCHER_WEIGHTS);
  const [pitcherBonuses, setPitcherBonuses] = useState<Record<string, number>>(DEFAULT_PITCHER_BONUSES);
  const [roster, setRoster] = useState({
    rosterMinC: "", rosterMaxC: "", rosterMinIF: "", rosterMaxIF: "",
    rosterMinOF: "", rosterMaxOF: "", rosterMinP: "", rosterMaxP: "",
  });
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [includeMyPark, setIncludeMyPark] = useState(false);
  const [includedLeagueParks, setIncludedLeagueParks] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/leagues").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ]).then(([settings, leagueList, teamList]) => {
      if (settings.fitWeights?.hitter) setHitterWeights(settings.fitWeights.hitter);
      if (settings.fitWeights?.pitcher) setPitcherWeights(settings.fitWeights.pitcher);
      if (settings.pitcherBonuses) setPitcherBonuses(settings.pitcherBonuses);
      setIncludeMyPark(!!settings.includeMyPark);
      setIncludedLeagueParks(settings.includedLeagueParks ?? {});
      setRoster({
        rosterMinC: settings.rosterMinC ?? "", rosterMaxC: settings.rosterMaxC ?? "",
        rosterMinIF: settings.rosterMinIF ?? "", rosterMaxIF: settings.rosterMaxIF ?? "",
        rosterMinOF: settings.rosterMinOF ?? "", rosterMaxOF: settings.rosterMaxOF ?? "",
        rosterMinP: settings.rosterMinP ?? "", rosterMaxP: settings.rosterMaxP ?? "",
      });
      setLeagues(leagueList);
      setTeams(teamList);
      setLoading(false);
    });
  }, []);

  async function save() {
    const body: any = {
      fitWeights: { hitter: hitterWeights, pitcher: pitcherWeights },
      pitcherBonuses,
      includeMyPark,
      includedLeagueParks,
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

  const hitterTotal = Object.values(hitterWeights).reduce((a, b) => a + (b || 0), 0);
  const pitcherTotal = Object.values(pitcherWeights).reduce((a, b) => a + (b || 0), 0);

  return (
    <div style={{ maxWidth: 780 }}>
      <InfoPanel />

      <SectionCard title="Hitter Weights">
        <p style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 10 }}>
          Every rating is on the 20-80 scale, so Fit is a weighted average of them. Weights are normalized to
          100% before use — type any numbers, only the proportions matter. Uncheck a row to drop it entirely
          (same as setting it to 0) without losing the number if you turn it back on.
        </p>
        {Object.entries(hitterWeights).map(([tool, w]) => (
          <WeightRow
            key={tool}
            label={tool}
            value={w}
            max={80}
            pct={hitterTotal > 0 ? Math.round((w / hitterTotal) * 100) : 0}
            onChange={(v) => setHitterWeights((s) => ({ ...s, [tool]: v }))}
          />
        ))}
      </SectionCard>

      <SectionCard title="Pitcher Weights">
        {Object.entries(pitcherWeights).map(([tool, w]) => (
          <WeightRow
            key={tool}
            label={tool}
            value={w}
            max={80}
            pct={pitcherTotal > 0 ? Math.round((w / pitcherTotal) * 100) : 0}
            onChange={(v) => setPitcherWeights((s) => ({ ...s, [tool]: v }))}
          />
        ))}

        <h3 style={{ fontSize: 12.5, fontWeight: 800, marginTop: 16, marginBottom: 4, textTransform: "uppercase", opacity: 0.7 }}>
          Bonuses (added after the weighted average, in rating points)
        </h3>
        {BONUS_DISPLAY_ORDER.filter((key) => key in pitcherBonuses).map((key) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <div style={{ width: 200, fontSize: 12.5 }}>{BONUS_LABELS[key] ?? key}</div>
            <input
              type="number" step={0.5} value={pitcherBonuses[key]} style={{ width: 70, fontSize: 12, padding: 3 }}
              onChange={(e) => setPitcherBonuses((s) => ({ ...s, [key]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Ballpark Factors">
        <p style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 10 }}>
          Scaffolding only for now — syncing park factor data (<code>/api/sync/ballparks</code>), but the
          actual formula for how a park factor should nudge Fit Score isn't built yet (needs a real
          <code> /ballparks</code> sample to design against). These toggles are saved and ready for when that lands.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
          <input type="checkbox" checked={includeMyPark} onChange={(e) => setIncludeMyPark(e.target.checked)} />
          Include my own ballpark in the standard Fit Score
        </label>
        <p style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 6 }}>
          League-wide parks to include in a separate "league-adjusted" Fit Score (once built):
        </p>
        {teams.length === 0 && <p style={{ opacity: 0.6, fontSize: 12.5 }}>No teams synced yet.</p>}
        {teams.map((t) => (
          <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={includedLeagueParks[t.id] ?? true}
              onChange={(e) => setIncludedLeagueParks((s) => ({ ...s, [t.id]: e.target.checked }))}
            />
            {t.name} {t.nickname}
          </label>
        ))}
      </SectionCard>

      <SectionCard title="Roster Min / Max">
        <p style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 8 }}>
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
      </SectionCard>

      <SectionCard title="League Classification">
        <p style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 10 }}>
          Auto-set from /lgdata's own "top-level league" flag on each sync — override here only if one looks
          wrong. Checked = shows up in the International tab.
        </p>
        {leagues.length === 0 && <p style={{ opacity: 0.6, fontSize: 12.5 }}>No leagues synced yet.</p>}
        {leagues.map((l) => (
          <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
            <input type="checkbox" checked={!l.isCbaAffiliated} onChange={() => toggleLeague(l.id, l.isCbaAffiliated)} />
            {l.name} <span style={{ opacity: 0.5 }}>(id {l.id})</span>
          </label>
        ))}
      </SectionCard>

      <button
        onClick={save}
        style={{ marginTop: 4, background: "var(--team-accent)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
      >
        Save settings
      </button>
      {saved && <span style={{ marginLeft: 10, color: "#1a7a3c", fontSize: 12.5 }}>Saved.</span>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e7f0", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ background: "var(--team-secondary)", color: "#fff", padding: "8px 14px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function InfoPanel() {
  return (
    <details style={{ background: "#fff", border: "1px solid #e2e7f0", borderRadius: 8, marginBottom: 16 }}>
      <summary style={{ background: "var(--team-secondary)", color: "#fff", padding: "8px 14px", fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}>
        How the weights work
      </summary>
      <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6 }}>
        <p><b>Fit is a weighted average of 20-80 ratings</b>, so a Fit of 62 means "this player averages 62
          across the things you said you care about, in the proportions you set." It lands on the same scale
          as the ratings themselves, which is why it reads like an OVR but isn't one.</p>
        <p><b>Only the proportions matter.</b> Weights are normalized before use, so 30/20/19/15/3 and
          60/40/38/30/6 give identical results. Set a weight to 0 (or uncheck it) to drop a rating entirely.</p>
        <p><b>Missing values don't drag anyone down.</b> If a player has no value for a weighted rating,
          that rating's weight is removed from the average rather than scored as a zero.</p>
        <p><b>Pitcher bonuses are flat rating points</b> added after the average, not weights. A groundballer
          at +4 gets four points of Fit regardless of how you set the sliders.</p>
      </div>
    </details>
  );
}

function WeightRow({ label, value, max, pct, onChange }: { label: string; value: number; max: number; pct: number; onChange: (v: number) => void }) {
  const enabled = value > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked ? (value || 20) : 0)}
        title="Uncheck to drop this rating entirely"
      />
      <div style={{ width: 90, fontSize: 12.5, opacity: enabled ? 1 : 0.4 }}>{label}</div>
      <input
        type="range" min={0} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <input
        type="number" min={0} max={max} value={value} style={{ width: 55, fontSize: 12, padding: 3 }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div style={{ width: 42, fontSize: 12, textAlign: "right", opacity: 0.75 }}>{pct}%</div>
    </div>
  );
}
