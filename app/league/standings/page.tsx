import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  // Latest snapshot per team — StandingsSnapshot is append-only (one row
  // per /api/sync/lgdata run), so this grabs the most recent row for each.
  const latestPerTeam = await prisma.standingsSnapshot.findMany({
    orderBy: { asOf: "desc" },
    include: { team: { select: { id: true, name: true, nickname: true, leagueId: true } } },
    take: 500, // generous — dedup by team below, just a safety cap
  });

  const seen = new Set<number>();
  const rows = latestPerTeam.filter((r) => {
    if (seen.has(r.teamId)) return false;
    seen.add(r.teamId);
    return true;
  });

  rows.sort((a, b) => b.wins - b.losses - (a.wins - a.losses));

  if (rows.length === 0) {
    return <p style={{ opacity: 0.7 }}>No standings synced yet — run POST /api/sync/lgdata.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th className="left">Team</th>
          <th>W</th>
          <th>L</th>
          <th>Pct</th>
          <th>GB</th>
          <th>Streak</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.teamId}>
            <td className="left">{r.team.name} {r.team.nickname}</td>
            <td>{r.wins}</td>
            <td>{r.losses}</td>
            <td>{(r.wins / Math.max(1, r.wins + r.losses)).toFixed(3).replace(/^0/, "")}</td>
            <td>{r.gb ?? "—"}</td>
            <td>{r.streak ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
