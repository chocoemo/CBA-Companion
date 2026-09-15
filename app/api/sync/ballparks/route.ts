import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBallparks } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/ballparks
// KNOWN GAP: /ballparks' exact JSON field names aren't confirmed from a
// real sample yet — this makes a best-effort guess at several plausible
// key names and keeps the full raw payload either way. This data isn't
// used for anything yet (the park-factor-adjusted Fit Score isn't built),
// so getting the exact mapping perfect isn't urgent — send a real sample
// when convenient and I'll lock it down.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const log = await prisma.syncLog.create({ data: { endpoint: "/ballparks", status: "pending" } });

  try {
    const payload = await getBallparks();
    const list: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.parks) ? payload.parks : Array.isArray(payload?.teams) ? payload.teams : [];

    let count = 0;
    for (const p of list) {
      const teamId = Number(p.team_id ?? p.teamId ?? p.id);
      if (!teamId) continue;
      await prisma.ballpark.upsert({
        where: { teamId },
        update: {
          name: p.name ?? p.park_name ?? null,
          capacity: p.capacity ?? null,
          stadiumType: p.stadium_type ?? p.type ?? null,
          surface: p.surface ?? null,
          hrFactor: p.hr_factor ?? p.hrFactor ?? null,
          doublesFactor: p.doubles_factor ?? null,
          triplesFactor: p.triples_factor ?? null,
          raw: p,
        },
        create: {
          teamId,
          name: p.name ?? p.park_name ?? null,
          capacity: p.capacity ?? null,
          stadiumType: p.stadium_type ?? p.type ?? null,
          surface: p.surface ?? null,
          hrFactor: p.hr_factor ?? p.hrFactor ?? null,
          doublesFactor: p.doubles_factor ?? null,
          triplesFactor: p.triples_factor ?? null,
          raw: p,
        },
      });
      count++;
    }

    await prisma.syncLog.update({ where: { id: log.id }, data: { status: "ok", finishedAt: new Date(), message: `${count} ballparks upserted` } });
    return NextResponse.json({ ok: true, count, rawSample: list.slice(0, 2) });
  } catch (err: any) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) } });
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
