// Thin client for the StatsPlus API (https://wiki.statsplus.net/web-tools/statsplus-api)
// Server-side only — never expose STATSPLUS_TOKEN to the browser.

const LGURL = process.env.STATSPLUS_LGURL ?? "cba";
const TOKEN = process.env.STATSPLUS_TOKEN ?? "";
const BASE = `https://statsplus.net/${LGURL}/api`;
const USER_AGENT = "CBA-Companion/0.1 (+https://github.com/your-org/cba-companion)";

// ---- Reference tables (see "Reference tables" in the API docs) ----

export const LEVEL_IDS: Record<number, string> = {
  1: "ml",
  2: "aaa",
  3: "aa",
  4: "a",
  5: "short_a",
  6: "rookie",
  7: "indy",
  8: "international",
  10: "college",
  11: "high_school",
};

export const POSITION_IDS: Record<number, string> = {
  1: "P", 2: "C", 3: "1B", 4: "2B", 5: "3B", 6: "SS",
  7: "LF", 8: "CF", 9: "RF", 10: "DH",
};

export const ROLE_IDS: Record<number, string> = {
  11: "SP", 12: "RP", 13: "CL",
};

export const BATS_THROWS: Record<number, string> = { 1: "R", 2: "L", 3: "S" };

// CBA-specific: all three MLB-tier leagues (PL/SL/BL) report as OOTP level 1 (ml).
// The actual tier comes from /lgdata's league grouping, not from /players' Level field.
export const MINOR_LEVEL_FROM_OOTP: Record<number, string> = {
  1: "MAJORS",
  2: "RESERVES",       // AAA-equivalent
  3: "DEV_A",          // AA-equivalent
  4: "DEV_B",          // A-equivalent
  6: "YOUTH_ACADEMY",  // Rookie-equivalent
};

// ---- Low-level fetch helpers ----

class StatsPlusRateLimitError extends Error {
  constructor(public waitSeconds: number, message: string) {
    super(message);
    this.name = "StatsPlusRateLimitError";
  }
}

class StatsPlusHumanMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatsPlusHumanMessageError";
  }
}

function withToken(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(`${BASE}${path}`);
  if (TOKEN) url.searchParams.set("token", TOKEN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

// Handles the API's "HTTP 200 but it's actually a plain-text message for a
// human" footgun documented across every rate-limited/async endpoint.
async function fetchChecked(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (res.status === 204) return res; // no data — caller should treat as empty
  if (res.status === 429) {
    const text = await res.text();
    throw new StatsPlusRateLimitError(parseWaitSeconds(text), text);
  }
  if (res.status >= 400) {
    const text = await res.text();
    throw new Error(`StatsPlus API ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.startsWith("text/plain")) {
    const text = await res.text();
    const waitMatch = text.match(/wait (\d+) seconds/i);
    if (waitMatch) throw new StatsPlusRateLimitError(Number(waitMatch[1]), text);
    // "still in progress" is handled by the caller (ratings poller), not here.
    throw new StatsPlusHumanMessageError(text);
  }

  return res;
}

function parseWaitSeconds(text: string): number {
  const m = text.match(/wait (\d+) seconds/i);
  return m ? Number(m[1]) : 60;
}

// ---- Simple CSV parser (no external dep, good enough for S+'s quoted CSVs) ----
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    return obj;
  });
}

// ---- Endpoints ----

export async function getDate(): Promise<string> {
  const res = await fetchChecked(withToken("/date/"));
  return (await res.text()).trim();
}

export async function getTeams() {
  const res = await fetchChecked(withToken("/teams/"));
  return parseCsv(await res.text());
}

export async function getLgData() {
  const res = await fetchChecked(withToken("/lgdata/"));
  return res.json();
}

export async function getPlayers(opts: { retiredOnly0?: boolean } = {}) {
  const res = await fetchChecked(
    withToken("/players/", opts.retiredOnly0 ? { retired: 0 } : {})
  );
  if (res.status === 204) return [];
  return parseCsv(await res.text());
}

export async function getContracts() {
  const res = await fetchChecked(withToken("/contract/"));
  if (res.status === 204) return [];
  return parseCsv(await res.text());
}

export async function getContractExtensions() {
  const res = await fetchChecked(withToken("/contractextension/"));
  if (res.status === 204) return [];
  return parseCsv(await res.text());
}

export async function getDraftPool(lid?: number) {
  const res = await fetchChecked(withToken("/draftpool/", { lid }));
  if (res.status === 204) return [];
  return parseCsv(await res.text());
}

export async function getDraftV2() {
  const res = await fetchChecked(withToken("/draftv2/"));
  return res.json();
}

export async function getTradeBlock(): Promise<number[]> {
  const res = await fetchChecked(withToken("/tradeblock/"));
  const json = await res.json();
  return json.player_ids ?? [];
}

export async function getBallparks(lid?: number) {
  const res = await fetchChecked(withToken("/ballparks/", { lid }));
  return res.json();
}

// /ratings is async: kick off the request, get back a mycsv URL, poll it.
// osa=true bypasses auth (anonymous, 15 min/IP rate limit) and always
// returns OSA ratings — use osa=false with a token for your own scouts.
export async function requestRatings(osa: boolean): Promise<string> {
  const res = await fetchChecked(withToken("/ratings/", osa ? { osa: 1 } : {}));
  const text = await res.text();
  const urlMatch = text.match(/https:\/\/\S+mycsv\S+/);
  if (!urlMatch) throw new Error(`Unexpected /ratings response: ${text}`);
  return urlMatch[0];
}

export type RatingsPollResult =
  | { status: "ready"; rows: Record<string, string>[] }
  | { status: "pending" }
  | { status: "error"; message: string };

export async function pollRatings(mycsvUrl: string): Promise<RatingsPollResult> {
  const res = await fetch(mycsvUrl, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.startsWith("text/csv")) {
    return { status: "ready", rows: parseCsv(await res.text()) };
  }
  const text = await res.text();
  if (/still in progress/i.test(text)) return { status: "pending" };
  return { status: "error", message: text };
}

export { StatsPlusRateLimitError, StatsPlusHumanMessageError };
