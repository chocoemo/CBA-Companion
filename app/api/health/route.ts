import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/health — open this in a browser (no secret header needed, it
// exposes only counts, never data). Each check runs independently so one
// broken table doesn't hide the others. This exists because Vercel's
// generic "Application error: a server-side exception has occurred" page
// tells you nothing actionable, and the real cause is almost always a
// schema/database mismatch that shows up clearly here.
export async function GET() {
  const checks: Record<string, unknown> = {};

  async function check(name: string, fn: () => Promise<unknown>) {
    try {
      checks[name] = { ok: true, result: await fn() };
    } catch (err: any) {
      checks[name] = { ok: false, error: String(err?.message ?? err).slice(0, 500) };
    }
  }

  await check("database_connection", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  });
  await check("teams", () => prisma.team.count());
  await check("players", () => prisma.player.count());
  await check("ratings", () => prisma.ratingSnapshot.count());
  await check("standings", () => prisma.standingsSnapshot.count());
  await check("leagues", () => prisma.league.count());
  await check("picks", () => prisma.pick.count());
  await check("draftResults", () => prisma.draftResult.count());
  await check("settings", () => prisma.settings.count());
  await check("ballparks", () => prisma.ballpark.count());
  await check("seasonBatting", () => prisma.playerSeasonBatting.count());
  await check("seasonPitching", () => prisma.playerSeasonPitching.count());
  await check("gameBoxes", () => prisma.gameBox.count());
  await check("plateAppearances", () => prisma.plateAppearance.count());

  // The team dashboard's exact queries — the most likely source of a
  // crash on the landing page specifically.
  await check("dashboard_team_query", () => prisma.team.findUnique({ where: { id: 105 } }));
  await check("dashboard_standings_query", () =>
    prisma.standingsSnapshot.findFirst({ where: { teamId: 105 }, orderBy: { asOf: "desc" } })
  );

  const allOk = Object.values(checks).every((c: any) => c.ok);
  return NextResponse.json({ allOk, checks }, { status: allOk ? 200 : 500 });
}
