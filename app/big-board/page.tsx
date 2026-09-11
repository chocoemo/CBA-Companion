"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerCard, { PlayerCardData } from "@/app/components/PlayerCard";

type SortKey = "name" | "team" | "level" | "pos" | "age" | "overall" | "potential";

export default function BigBoardPage() {
  const [players, setPlayers] = useState<PlayerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [ratingSource, setRatingSource] = useState<"scout" | "osa">("scout"); // scout default, per spec
  const [selected, setSelected] = useState<PlayerCardData | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => setPlayers(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const withVal = players.map((p) => {
      const block = ratingSource === "scout" ? p.scout : p.osa;
      return { p, overall: block?.overall ?? -1, potential: block?.potential ?? -1 };
    });
    withVal.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "name": av = a.p.name; bv = b.p.name; break;
        case "team": av = a.p.team?.abbr ?? ""; bv = b.p.team?.abbr ?? ""; break;
        case "level": av = a.p.level ?? ""; bv = b.p.level ?? ""; break;
        case "pos": av = a.p.pos ?? ""; bv = b.p.pos ?? ""; break;
        case "age": av = a.p.age ?? 0; bv = b.p.age ?? 0; break;
        case "overall": av = a.overall; bv = b.overall; break;
        case "potential": av = a.potential; bv = b.potential; break;
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return withVal;
  }, [players, sortKey, sortDir, ratingSource]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Big Board</h1>
        <div className="source-toggle" style={{ background: "var(--team-secondary)", padding: 4, borderRadius: 8 }}>
          <button
            className={ratingSource === "scout" ? "active" : ""}
            style={{ background: ratingSource === "scout" ? "var(--team-accent)" : "transparent", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}
            onClick={() => setRatingSource("scout")}
          >
            My Scouts
          </button>{" "}
          <button
            className={ratingSource === "osa" ? "active" : ""}
            style={{ background: ratingSource === "osa" ? "var(--team-accent)" : "transparent", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}
            onClick={() => setRatingSource("osa")}
          >
            OSA
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && players.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No players yet. Run the /players sync (and a ratings sync) via the API routes to populate this board.
        </p>
      )}

      {!loading && players.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Player</th>
              <th onClick={() => toggleSort("team")}>Team</th>
              <th onClick={() => toggleSort("level")}>Level</th>
              <th onClick={() => toggleSort("pos")}>Pos</th>
              <th onClick={() => toggleSort("age")}>Age</th>
              <th onClick={() => toggleSort("overall")} data-tooltip="Current-year grade, 20-80 scale (can exceed 80)">OVR</th>
              <th onClick={() => toggleSort("potential")} data-tooltip="Projected ceiling, 20-80 scale">POT</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ p, overall, potential }) => (
              <tr key={p.id} onClick={() => setSelected(p)}>
                <td className="left">{p.name}</td>
                <td>{p.team?.abbr ?? "FA"}</td>
                <td>{p.level ?? "—"}</td>
                <td>{p.pos}{p.role ? `/${p.role}` : ""}</td>
                <td>{p.age ?? "—"}</td>
                <td>{overall >= 0 ? overall : "—"}</td>
                <td>{potential >= 0 ? potential : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && <PlayerCard player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
