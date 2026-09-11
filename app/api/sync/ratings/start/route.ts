import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestRatings } from "@/lib/statsplus";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/ratings/start?source=scout|osa
// Kicks off the async ratings dump and stores the mycsv poll URL in a
// SyncLog row (status "pending") for /api/sync/ratings/poll to pick up.
// Respect S+'s rate limit yourself: don't call this more than once every
// 5 minutes for scout ratings, or 15 minutes for anonymous OSA.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") === "osa" ? "osa" : "scout";
  const endpoint = source === "osa" ? "/ratings:osa" : "/ratings:scout";

  const log = await prisma.syncLog.create({ data: { endpoint, status: "pending" } });

  try {
    const mycsvUrl = await requestRatings(source === "osa");
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { message: mycsvUrl },
    });
    return NextResponse.json({ ok: true, logId: log.id, pollAfterSeconds: 30 });
  } catch (err: any) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: "error", finishedAt: new Date(), message: String(err?.message ?? err) },
    });
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
