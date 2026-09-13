"use client";
import { useEffect, useState } from "react";
import PlayerTable from "@/app/components/PlayerTable";

type Team = { id: number; name: string; nickname: string; abbr: string };

export default function LeaguePlayersPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => setTeams([]));
  }, []);

  return (
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
            No teams synced yet — run /api/sync/lgdata (or /api/sync/teams).
          </span>
        )}
      </div>
      <PlayerTable pool="all" columns="roster" teamId={selectedTeam} />
    </div>
  );
}
