import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PlayerProfileBody from "@/app/components/PlayerProfileBody";

export const dynamic = "force-dynamic"; // always read current DB state, never cache stale data

// Server component: fetches everything up front and renders real HTML —
// deliberate, so this page is readable by anything that doesn't execute
// JavaScript (unlike the rest of the app's client-rendered tabs).
export default async function PlayerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true, nickname: true } },
      ratings: { orderBy: { capturedAt: "desc" }, take: 2 },
    },
  });

  if (!player) {
    return <main style={{ padding: 20 }}>No player found with ID {id}.</main>;
  }

  const scout = player.ratings.find((r) => r.source === "SCOUT");
  const osa = player.ratings.find((r) => r.source === "OSA");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <main style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: 12.5, opacity: 0.7 }}>&larr; Back to app</Link>
      <div style={{ marginTop: 10 }}>
        <PlayerProfileBody
          playerId={player.id}
          name={`${player.firstName} ${player.lastName}`}
          team={player.team ? `${player.team.name} ${player.team.nickname}` : "Free Agent"}
          level={player.level}
          pos={player.pos}
          role={player.role}
          age={player.age}
          height={player.height}
          bats={player.bats}
          throws={player.throws}
          isCollege={player.isCollege}
          scout={scout ? { overall: scout.overall, potential: scout.potential, tools: scout.tools as any } : null}
          osa={osa ? { overall: osa.overall, potential: osa.potential, tools: osa.tools as any } : null}
          fitWeights={settings?.fitWeights as any}
          pitcherBonuses={settings?.pitcherBonuses as any}
        />
      </div>
      <p style={{ fontSize: 11, opacity: 0.5, marginTop: 30 }}>
        Player ID {player.id} · Scout data {scout ? "available" : "not imported"} · OSA data {osa ? "available" : "not imported"}
      </p>
    </main>
  );
}
