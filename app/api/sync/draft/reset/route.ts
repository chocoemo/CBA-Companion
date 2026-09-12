import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/draft/reset?year=YYYY
// Deletes all Pick/DraftResult rows for a draft year. Use this ONCE after
// deploying the overallSlot-uniqueness fix, since data synced under the old
// (buggy) round+team key is unrecoverable in place — picks from the same
// team in the same round had silently overwritten each other. After
// resetting, re-run /api/sync/draft (or let draft-watch's next tick do it)
// to rebuild cleanly from /draftv2.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(req.url);
  const draftYear = Number(searchParams.get("year"));
  if (!draftYear) {
    return NextResponse.json({ ok: false, error: "Pass ?year=YYYY" }, { status: 400 });
  }

  const picks = await prisma.pick.findMany({ where: { draftYear }, select: { id: true } });
  const pickIds = picks.map((p) => p.id);

  const deletedResults = await prisma.draftResult.deleteMany({ where: { pickId: { in: pickIds } } });
  const deletedPicks = await prisma.pick.deleteMany({ where: { draftYear } });

  return NextResponse.json({ ok: true, deletedResults: deletedResults.count, deletedPicks: deletedPicks.count });
}
