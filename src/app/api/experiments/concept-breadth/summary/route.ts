import { list, get } from "@vercel/blob";
import { TRAUMA_IDS } from "@/app/teaching/experiments/concept-breadth/stimuli";

// PUBLIC aggregate-only summary. Two consumers: the participant debrief
// (percentile against the whole pool) and the live projector view (one
// session's running totals against the pool). Never serves raw
// submissions — counts and means only, so leaving it open matches the
// class-summary endpoint's privacy posture.

export const dynamic = "force-dynamic";

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}

interface Agg {
  n: number;
  /** Yes-count per ladder rung, index 0 = most severe. */
  ladderYes: number[];
  /** Histogram of ladder scores 0–5. */
  ladderScoreHist: number[];
  /** Histogram of trauma total scores 10–60 (51 buckets). */
  traumaScoreHist: number[];
  /** Per-vignette rating counts, six buckets each (1–6). */
  trauma: Record<string, number[]>;
}

function emptyAgg(): Agg {
  const trauma: Record<string, number[]> = {};
  for (const id of TRAUMA_IDS) trauma[id] = [0, 0, 0, 0, 0, 0];
  return {
    n: 0,
    ladderYes: [0, 0, 0, 0, 0],
    ladderScoreHist: [0, 0, 0, 0, 0, 0],
    traumaScoreHist: new Array(51).fill(0),
    trauma,
  };
}

function addTo(agg: Agg, s: Record<string, unknown>): void {
  if (!Array.isArray(s.ladderYes) || s.ladderYes.length !== 5) return;
  if (!Array.isArray(s.trauma)) return;
  const ladderYes = s.ladderYes as unknown[];
  if (!ladderYes.every((v) => typeof v === "boolean")) return;
  agg.n += 1;
  let score = 0;
  ladderYes.forEach((v, i) => {
    if (v) {
      agg.ladderYes[i] += 1;
      score += 1;
    }
  });
  agg.ladderScoreHist[score] += 1;
  let tScore = 0;
  let tN = 0;
  for (const raw of s.trauma as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !(r.id in agg.trauma)) continue;
    if (typeof r.rating !== "number" || r.rating < 1 || r.rating > 6) continue;
    agg.trauma[r.id][Math.round(r.rating) - 1] += 1;
    tScore += Math.round(r.rating);
    tN += 1;
  }
  if (tN === TRAUMA_IDS.length && tScore >= 10 && tScore <= 60) {
    agg.traumaScoreHist[tScore - 10] += 1;
  }
}

async function loadAll(): Promise<Record<string, unknown>[]> {
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "concept-breadth/", cursor, limit: 1000 });
    for (const b of page.blobs) pathnames.push(b.pathname);
    cursor = page.cursor;
  } while (cursor);

  const fetched = await Promise.all(
    pathnames.map(async (p) => {
      try {
        const r = await get(p, { access: "private" });
        if (!r || r.statusCode !== 200) return null;
        const text = await new Response(r.stream).text();
        const parsed = JSON.parse(text) as Record<string, unknown>;
        // Recover the session from the pathname so old records need no field.
        const parts = p.split("/");
        if (parts.length >= 3) parsed.__session = parts[1];
        return parsed;
      } catch {
        return null;
      }
    })
  );
  return fetched.filter((x): x is Record<string, unknown> => x !== null);
}

// The live view polls every few seconds; a short per-instance cache keeps
// each poll from re-listing and re-reading every blob. Best-effort only
// (serverless instances each hold their own), which is fine for a cadence
// where a few seconds of staleness is invisible.
let cache: { at: number; submissions: Record<string, unknown>[] } | null = null;
const CACHE_MS = 5000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionParam = url.searchParams.get("session");
  const session = sessionParam ? sanitizeSession(sessionParam) : null;

  const now = Date.now();
  if (!cache || now - cache.at > CACHE_MS) {
    cache = { at: now, submissions: await loadAll() };
  }

  const pool = emptyAgg();
  const sess = emptyAgg();
  for (const s of cache.submissions) {
    addTo(pool, s);
    if (session && s.__session === session) addTo(sess, s);
  }

  return Response.json({
    ok: true,
    pool,
    ...(session ? { session, sessionAgg: sess } : {}),
  });
}
