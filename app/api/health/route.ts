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

  // Safe inspection of the connection string — never exposes the password.
  // A surprising number of "can't reach database" problems are just a
  // missing/blank DATABASE_URL, a stale host after recreating the DB, or
  // a Neon URL missing the -pooler host / sslmode=require.
  const url = process.env.DATABASE_URL ?? "";
  let urlInfo: Record<string, unknown> = { present: !!url };
  if (url) {
    try {
      const parsed = new URL(url);
      urlInfo = {
        present: true,
        protocol: parsed.protocol,
        host: parsed.hostname,
        port: parsed.port || "(default)",
        database: parsed.pathname.replace("/", ""),
        usesPooler: parsed.hostname.includes("-pooler"),
        hasSslMode: parsed.searchParams.has("sslmode"),
        sslMode: parsed.searchParams.get("sslmode"),
      };
    } catch {
      urlInfo = { present: true, parseError: "DATABASE_URL is set but is not a valid URL" };
    }
  }
  checks.databaseUrl = urlInfo;

  async function check(name: string, fn: () => Promise<unknown>) {
    try {
      checks[name] = { ok: true, result: await fn() };
    } catch (err: any) {
      const message = String(err?.message ?? err);
      checks[name] = {
        ok: false,
        error: message.slice(0, 500),
        ...(message.includes("P1001")
          ? { hint: "P1001 = the database server is unreachable. This is a connection/hosting problem, not a code problem. Check that the database still exists in your Neon dashboard and that DATABASE_URL in Vercel matches its current connection string." }
          : {}),
      };
    }
  }

  await check("database_connection", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  });

  // If we can't even connect, every table check below would just repeat
  // the same error — skip them and return early with the real cause.
  if (!(checks.database_connection as any).ok) {
    return NextResponse.json({ allOk: false, checks }, { status: 500 });
  }

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
