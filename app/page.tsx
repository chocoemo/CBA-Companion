import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatStreak } from "@/lib/formatStreak";

export const dynamic = "force-dynamic";

// Hardcoded until the team switcher exists — same convention as the rest
// of the app (Calgary is the default/only controlling team for now).
const CONTROLLING_TEAM_ID = 105;

export default async function TeamDashboardPage() {
  // Wrapped so a database/schema problem shows an actionable message here
  // instead of Next.js's opaque "Application error: a server-side
  // exception has occurred" page, which gives no way to diagnose it
  // without digging through server logs.
  let team = null;
  let latestStanding = null;
  let loadError: string | null = null;

  try {
    team = await prisma.team.findUnique({ where: { id: CONTROLLING_TEAM_ID } });
    latestStanding = await prisma.standingsSnapshot.findFirst({
      where: { teamId: CONTROLLING_TEAM_ID },
      orderBy: { asOf: "desc" },
    });
  } catch (err: any) {
    loadError = String(err?.message ?? err);
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: 820 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Couldn&apos;t load the dashboard</h1>
        <p style={{ fontSize: 13, marginBottom: 10 }}>
          This is usually a database/schema mismatch after a deploy. Open{" "}
          <a href="/api/health" style={{ color: "var(--team-primary)" }}>/api/health</a> for a per-table breakdown.
        </p>
        <pre style={{ background: "#fff", padding: 12, borderRadius: 6, fontSize: 11.5, overflowX: "auto", whiteSpace: "pre-wrap" }}>
          {loadError}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        {team ? `${team.name} ${team.nickname}` : "Calgary"}
      </h1>
      <p style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 20 }}>
        Team dashboard — this is the app's landing page.
      </p>

      <section style={{ marginBottom: 26 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Record</h2>
        {!latestStanding ? (
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            Not synced yet — run <code>POST /api/sync/lgdata</code> to pull current standings.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 26 }}>
            <Stat label="Record" value={`${latestStanding.wins}-${latestStanding.losses}`} />
            <Stat label="GB" value={latestStanding.gb?.toString() ?? "—"} />
            <Stat label="Streak" value={formatStreak(latestStanding.streakNum)} />
          </div>
        )}
      </section>

      <section style={{ marginBottom: 26 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Last 7 games</h2>
        <p style={{ opacity: 0.6, fontSize: 12.5 }}>
          Not available yet — this needs per-game history (<code>/gamehistory</code> sync), which
          isn't built. The streak above is the closest available signal in the meantime.
        </p>
      </section>

      <section style={{ marginBottom: 26 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Hot / cold performers</h2>
        <p style={{ opacity: 0.6, fontSize: 12.5 }}>
          Not available yet — needs a trailing-performance window from game-log data
          (<code>/atbats</code>), which is season-only at the source and hasn't been archived yet.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Roster watch</h2>
        <p style={{ opacity: 0.6, fontSize: 12.5 }}>
          Not available yet — promotion-need and overmatched flags need real performance history
          to justify, same dependency as above. The visual tag system (watch/replace/promote,
          hot/cold icons) is already built — see any player's <Link href="/draft">Big Board</Link>{" "}
          row — it just isn't computing anything yet.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
