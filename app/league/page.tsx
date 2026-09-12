"use client";
import { useEffect, useState } from "react";
import PlayerTable from "@/app/components/PlayerTable";

const SUBTABS = ["Free Agents", "Standings", "Players"] as const;

type Team = { id: number; name: string; nickname: string; abbr: string };

export default function LeaguePage() {
  const [sub, setSub] = useState<typeof SUBTABS[number]>("Free Agents");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => setTeams([]));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            style={{
              background: sub === s ? "var(--team-accent)" : "var(--team-tertiary)",
              color: sub === s ? "#fff" : "var(--team-secondary)",
              border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {sub === "Free Agents" && <PlayerTable pool="fa" columns="roster" />}

      {sub === "Players" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedTeam ?? ""}
              onChange={(e) => setSelectedTeam(e.target.value ? Number(e.target.value) : null)}
              style={{ padding: "6px 10px", fontSize: 13 }}
            >
              <option value="">— pick a team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} {t.nickname}</option>
              ))}
            </select>
            {teams.length === 0 && (
              <span style={{ fontSize: 11.5, opacity: 0.6, marginLeft: 8 }}>
                No teams synced yet — run /api/sync/teams.
              </span>
            )}
          </div>
          <PlayerTable pool="all" columns="roster" teamId={selectedTeam} />
        </div>
      )}

      {sub === "Standings" && (
        <p style={{ opacity: 0.7 }}>
          Standings/history/leaderboards (CBA-I parity) — scoped for a coming
          phase; needs /lgdata wired to a StandingsSnapshot view.
        </p>
      )}
    </div>
  );
}
