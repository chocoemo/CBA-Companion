import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLgData } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/lgdata
// Catalogs every league in the save into the League table. New leagues
// default to isCbaAffiliated=false — nothing gets auto-classified as
// "international" or "CBA" without a human confirming it, since guessing
// wrong here would misfile real CBA affiliate leagues as foreign ones.
//
// KNOWN GAP: exact /lgdata JSON shape isn't confirmed from a real sample
// yet. This makes a best-effort guess at field names and stores the full
// raw payload either way — send me a real response and I'll tighten it.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const log = await prisma.syncLog.create({ data: { endpoint: "/lgdata", status: "pending" } });

  try {
    const payload = await getLgData();
    const leagues = extractLeagues(payload);
    let created = 0;
    let updated = 0;

    for (const lg of leagues) {
      if (!lg.id || !lg.name) continue;
      const existing = await prisma.league.findUnique({ where: { id: lg.id } });
      await prisma.league.upsert({
        where: { id: lg.id },
        update: { name: lg.name, raw: lg.raw },
        create: { id: lg.id, name: lg.name, raw: lg.raw, isCbaAffiliated: false },
      });
      if (existing) updated++;
      else created++;
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "ok", finishedAt: new Date(), message: `${created} new, ${updated} updated leagues` },
    });

    return NextResponse.json({
      ok: true,
      created,
      updated,
      rawPayloadSample: payload, // included so you can paste it back if the guess below is wrong
    });
  } catch (err: any) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) },
    });
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

function extractLeagues(payload: any): { id: number; name: string; raw: any }[] {
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.leagues)
    ? payload.leagues
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return list.map((row) => ({
    id: Number(row.league_id ?? row.leagueId ?? row.id ?? row.ID),
    name: String(row.name ?? row.league_name ?? row.Name ?? ""),
    raw: row,
  }));
}
