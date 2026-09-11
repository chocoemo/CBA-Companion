// A simple shared-secret check for the /api/sync/* routes. These routes
// call out to StatsPlus (which is rate-limited) on your behalf, so they
// shouldn't be left wide open on the public internet — anyone who found the
// URL could burn your rate limit. This is NOT a login system, just a
// "did this request come from something I control" check.
export function checkSyncSecret(req: Request): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.SYNC_SECRET;
  if (!expected) {
    // No secret configured — allow through, but this should only happen
    // during local development. Set SYNC_SECRET in Vercel before going live.
    return { ok: true };
  }
  const provided = req.headers.get("x-sync-secret");
  if (provided !== expected) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: "Missing or invalid x-sync-secret header" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  return { ok: true };
}
