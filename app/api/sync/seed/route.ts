import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seedData";
import { checkSyncSecret } from "@/lib/auth";

// POST /api/sync/seed
// Runs once after your first deploy, from a browser/Postman/curl — no local
// Prisma CLI needed. Safe to call again later; it won't duplicate data.
export async function POST(req: Request) {
  const authCheck = checkSyncSecret(req);
  if (!authCheck.ok) return authCheck.response;

  const result = await runSeed(prisma);
  return NextResponse.json({ ok: true, ...result });
}
