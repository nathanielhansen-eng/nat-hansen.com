import { list, get } from "@vercel/blob";
import { TRAUMA_IDS } from "@/app/teaching/experiments/concept-breadth/stimuli";

// PUBLIC aggregate-only summary for ONE session (group). Sole consumer is
// the live projector view; comparisons between groups happen from the
// instructor dashboard's session picker. Never serves raw submissions —
// counts and means only, so leaving it open matches the class-summary
// endpoint's privacy posture. Records from the pre-two-pass schema are
// skipped (they lack the bare/severe passes).

export const dynamic = "force-dynamic";

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}

interface VariantAgg {
  /** Yes-count per ladder rung, index 0 = most severe. */
  ladderYes: number[];
  /** Histogram of ladder scores 0–5. */
  ladderScoreHist: number[];
  /** Histogram of trauma total scores 10–60 (51 buckets). */
  traumaScoreHist: number[];
  /** Per-vignette rating counts, six buckets each (1–6). */
  trauma: Record<string, number[]>;
}

interface Agg {
  /** Complete two-pass records counted. */
  n: number;
  bare: VariantAgg;
  severe: VariantAgg;
  /** Ladder threshold movement, bare vs severe: "up" = fewer Yes with
   * "severe" (the threshold climbed the severity scale). */
  ladderShift: { up: number; same: number; down: number };
  /** Sum over persons of (bare per-item mean − severe per-item mean),
   * for the group's mean trauma shift. */
  traumaDeltaSum: number;
}

function emptyVariantAgg(): VariantAgg {
  const trauma: Record<string, number[]> = {};
  for (const id of TRAUMA_IDS) trauma[id] = [0, 0, 0, 0, 0, 0];
  return {
    ladderYes: [0, 0, 0, 0, 0],
    ladderScoreHist: [0, 0, 0, 0, 0, 0],
    traumaScoreHist: new Array(51).fill(0),
    trauma,
  };
}

function emptyAgg(): Agg {
  return {
    n: 0,
    bare: emptyVariantAgg(),
    severe: emptyVariantAgg(),
    ladderShift: { up: 0, same: 0, down: 0 },
    traumaDeltaSum: 0,
  };
}

/** Validates and folds one pass into a variant aggregate; returns the
 * pass's (ladderScore, trauma per-item mean) or null if malformed. */
function addPass(agg: VariantAgg, raw: unknown): { ladderScore: number; traumaMean: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.ladderYes) || s.ladderYes.length !== 5) return null;
  if (!(s.ladderYes as unknown[]).every((v) => typeof v === "boolean")) return null;
  if (!Array.isArray(s.trauma)) return null;

  let score = 0;
  (s.ladderYes as boolean[]).forEach((v, i) => {
    if (v) {
      agg.ladderYes[i] += 1;
      score += 1;
    }
  });
  agg.ladderScoreHist[score] += 1;

  let tScore = 0;
  let tN = 0;
  for (const t of s.trauma as unknown[]) {
    if (!t || typeof t !== "object") continue;
    const r = t as Record<string, unknown>;
    if (typeof r.id !== "string" || !(r.id in agg.trauma)) continue;
    if (typeof r.rating !== "number" || r.rating < 1 || r.rating > 6) continue;
    agg.trauma[r.id][Math.round(r.rating) - 1] += 1;
    tScore += Math.round(r.rating);
    tN += 1;
  }
  if (tN !== TRAUMA_IDS.length || tScore < 10 || tScore > 60) return null;
  agg.traumaScoreHist[tScore - 10] += 1;
  return { ladderScore: score, traumaMean: tScore / TRAUMA_IDS.length };
}

function addTo(agg: Agg, s: Record<string, unknown>): void {
  // Fold into copies first so a half-malformed record can't leave one
  // variant counted and the other not.
  const bareCopy = JSON.parse(JSON.stringify(agg.bare)) as VariantAgg;
  const severeCopy = JSON.parse(JSON.stringify(agg.severe)) as VariantAgg;
  const b = addPass(bareCopy, s.bare);
  const v = addPass(severeCopy, s.severe);
  if (!b || !v) return;
  agg.bare = bareCopy;
  agg.severe = severeCopy;
  agg.n += 1;
  if (v.ladderScore < b.ladderScore) agg.ladderShift.up += 1;
  else if (v.ladderScore > b.ladderScore) agg.ladderShift.down += 1;
  else agg.ladderShift.same += 1;
  agg.traumaDeltaSum += b.traumaMean - v.traumaMean;
}

async function loadSession(session: string): Promise<Agg> {
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `concept-breadth/${session}/`, cursor, limit: 1000 });
    for (const b of page.blobs) pathnames.push(b.pathname);
    cursor = page.cursor;
  } while (cursor);

  const agg = emptyAgg();
  const fetched = await Promise.all(
    pathnames.map(async (p) => {
      try {
        const r = await get(p, { access: "private" });
        if (!r || r.statusCode !== 200) return null;
        const text = await new Response(r.stream).text();
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
  );
  for (const s of fetched) if (s) addTo(agg, s);
  return agg;
}

// The live view polls every few seconds; a short per-instance cache keeps
// each poll from re-listing and re-reading the session's blobs. Best-effort
// only (serverless instances each hold their own), which is fine for a
// cadence where a few seconds of staleness is invisible.
const cache = new Map<string, { at: number; agg: Agg }>();
const CACHE_MS = 3000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionParam = url.searchParams.get("session");
  const session = sessionParam ? sanitizeSession(sessionParam) : "";
  if (!session) {
    return Response.json({ ok: false, error: "session required" }, { status: 400 });
  }

  const now = Date.now();
  const hit = cache.get(session);
  const agg = hit && now - hit.at <= CACHE_MS ? hit.agg : await loadSession(session);
  if (!hit || now - hit.at > CACHE_MS) cache.set(session, { at: now, agg });

  return Response.json({ ok: true, session, agg });
}
