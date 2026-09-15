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
  8: "INTERNATIONAL_COMPLEX", // each org's own int'l academy — was unmapped, so these players fell through with level=null
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

// IMPORTANT: several endpoints that return REAL data (/teams, /players,
// /contract, /contractextension, /atbats, /draftpool, /date, /tokencheck)
// are served with Content-Type text/plain — the SAME content type used for
// the API's "this is a message for a human" errors (rate limits, bad
// tokens, etc). So content-type alone can't tell data and errors apart.
// Instead we match the small, specific set of known human-message phrases
// documented by the API, and treat everything else as real data regardless
// of its content type.
const HUMAN_MESSAGE_PATTERNS: RegExp[] = [
  /request too soon,?\s*wait \d+ seconds/i,
  /this api requires user to be logged in/i,
  /invalid or unknown api token/i,
  /api token has expired/i,
  /ratings are not published for this league/i,
  /the ratings are being updated/i,
  /request id .* still in progress/i,
  /request id .* is not recognized/i,
  /the request id is no longer valid/i,
  /no such api endpoint/i,
  /^token expired$/i,
  /^invalid token$/i,
  /voting is still open/i,
  /at-bat data has not been imported/i,
];

function looksLikeHumanMessage(text: string): boolean {
  return HUMAN_MESSAGE_PATTERNS.some((re) => re.test(text));
}

// Fetches a URL, checks HTTP-level errors, then checks the BODY (not the
// content-type) against known "message for a human" phrases before handing
// the raw text back to the caller to parse as CSV/JSON/whatever it expects.
async function fetchChecked(url: string): Promise<{ text: string; status: number }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (res.status === 204) return { text: "", status: 204 };

  const text = await res.text();

  if (res.status === 429) throw new StatsPlusRateLimitError(parseWaitSeconds(text), text);
  if (res.status >= 400) throw new Error(`StatsPlus API ${res.status}: ${text}`);

  if (looksLikeHumanMessage(text)) {
    const waitMatch = text.match(/wait (\d+) seconds/i);
    if (waitMatch) throw new StatsPlusRateLimitError(Number(waitMatch[1]), text);
    throw new StatsPlusHumanMessageError(text);
  }

  return { text, status: res.status };
}

function parseWaitSeconds(text: string): number {
  const m = text.match(/wait (\d+) seconds/i);
  return m ? Number(m[1]) : 60;
}

// A few endpoints (/draftv2 seen live, possibly others) don't always return
// clean single-document JSON — e.g. a stray leading token before the real
// object. Rather than let a native SyntaxError with just a character
// position surface (useless for debugging), this tries a straight parse
// first, then recovers by parsing from the first { or [, and if that still
// fails, throws an error that includes an actual snippet of what came back
// so the next failure is diagnosable instead of cryptic.
function safeJsonParse(text: string, label: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[{\[]/);
    if (start > 0) {
      try {
        return JSON.parse(text.slice(start));
      } catch {
        // fall through to the diagnostic error below
      }
    }
    const snippet = text.slice(0, 300);
    throw new Error(`${label}: response was not valid JSON. Raw snippet: ${JSON.stringify(snippet)}`);
  }
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
  const { text } = await fetchChecked(withToken("/date/"));
  return text.trim();
}

export async function getTeams() {
  const { text, status } = await fetchChecked(withToken("/teams/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getLgData() {
  const { text, status } = await fetchChecked(withToken("/lgdata/"));
  if (status === 204 || !text) return null;
  return safeJsonParse(text, "/lgdata");
}

export async function getPlayers(opts: { retiredOnly0?: boolean } = {}) {
  const { text, status } = await fetchChecked(
    withToken("/players/", opts.retiredOnly0 ? { retired: 0 } : {})
  );
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getContracts() {
  const { text, status } = await fetchChecked(withToken("/contract/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getContractExtensions() {
  const { text, status } = await fetchChecked(withToken("/contractextension/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getDraftPool(lid?: number) {
  const { text, status } = await fetchChecked(withToken("/draftpool/", { lid }));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

// Confirmed live: /draftv2 is CSV (same as /teams, /players, /contract),
// NOT JSON — columns are ID (player id), Round, Pick In Round, Supp
// (supplemental pick flag), Overall, Player Name, Team, Team ID, Position,
// Age, College (0/empty = high schooler), Auto Pick, Time (UTC).
export async function getDraftV2() {
  const { text, status } = await fetchChecked(withToken("/draftv2/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

// Requires login/token; rate-limited to once per 5 min per team. Returns
// ALL games since the league started using StatsPlus — genuinely
// historical already, unlike /atbats below.
export async function getGameHistory() {
  const { text, status } = await fetchChecked(withToken("/gamehistory/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

// Token required, rate-limited to once per 60s per team. NO tid/pid/etc
// filters passed here on purpose — whole-league scope, per design. This is
// CURRENT-SEASON-ONLY at the source (StatsPlus rebuilds it from scratch
// each import and does not retain history) — see the PlateAppearance model
// comment for why this gets synced indefinitely rather than "just once
// before the season ends."
export async function getAtBats() {
  const { text, status } = await fetchChecked(withToken("/atbats/"));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

// Token required. Format mirrors OOTP's own career batting/pitching stats
// tables (varies slightly by OOTP version) — "up to four... stat split
// lines" per player (split_id: 1=overall, 2=vsL, 3=vsR). No pid passed
// here on purpose (whole-league scope, same convention as /atbats).
export async function getPlayerBatStats(year: number) {
  const { text, status } = await fetchChecked(withToken("/playerbatstatsv2/", { year, split: 1 }));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getPlayerPitchStats(year: number) {
  const { text, status } = await fetchChecked(withToken("/playerpitchstatsv2/", { year, split: 1 }));
  if (status === 204 || !text) return [];
  return parseCsv(text);
}

export async function getTradeBlock(): Promise<number[]> {
  const { text, status } = await fetchChecked(withToken("/tradeblock/"));
  if (status === 204 || !text) return [];
  const json = safeJsonParse(text, "/tradeblock");
  return json.player_ids ?? [];
}

// Token required, JSON response: "park factors, capacity, stadium type
// (open/dome/etc), playing surface" per the docs. Exact field names not
// confirmed against a real sample yet — see the sync route's defensive
// parsing and its note about that.
export async function getBallparks(lid?: number) {
  const { text, status } = await fetchChecked(withToken("/ballparks/", { lid }));
  if (status === 204 || !text) return null;
  return safeJsonParse(text, "/ballparks");
}

// /ratings is async: kick off the request, get back a mycsv URL, poll it.
// osa=true bypasses auth (anonymous, 15 min/IP rate limit) and always
// returns OSA ratings — use osa=false with a token for your own scouts.
export async function requestRatings(osa: boolean): Promise<string> {
  const { text } = await fetchChecked(withToken("/ratings/", osa ? { osa: 1 } : {}));
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
