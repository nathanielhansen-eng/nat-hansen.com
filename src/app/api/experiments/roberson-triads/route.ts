import { put } from "@vercel/blob";
import { TRIADS, REPS, isPredicted, type SetId } from "@/app/teaching/experiments/roberson-triads/stimuli";

type ColorVision = "typical" | "atypical" | "unsure";
const COLOR_VISION = new Set<string>(["typical", "atypical", "unsure"]);
const SET_IDS = new Set<string>(["gb", "nw"]);

interface TrialResult {
  set: SetId;
  triad: number;
  rep: number;
  pair: [number, number];
  predicted: boolean;
  rtMs: number;
}

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  firstLanguage: string;
  colorVision: ColorVision | null;
  setOrder: [SetId, SetId];
  trials: TrialResult[];
  /** Recomputed server-side from the trials — the client's copy is ignored. */
  scores: { gb: number; nw: number };
}

function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function sanitizeText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  return t || null;
}

function isRt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 600000;
}

function validateTrial(v: unknown): TrialResult | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (typeof t.set !== "string" || !SET_IDS.has(t.set)) return null;
  if (typeof t.triad !== "number" || !Number.isInteger(t.triad) || t.triad < 0 || t.triad >= TRIADS.length) return null;
  if (typeof t.rep !== "number" || !Number.isInteger(t.rep) || t.rep < 0 || t.rep >= REPS) return null;
  if (!Array.isArray(t.pair) || t.pair.length !== 2) return null;
  const def = TRIADS[t.triad];
  const pair = (t.pair as unknown[]).filter(
    (x): x is number => typeof x === "number" && (def.chips as number[]).includes(x),
  );
  if (pair.length !== 2) return null;
  const sorted = [...pair].sort((a, b) => a - b) as [number, number];
  if (sorted[0] === sorted[1]) return null;
  if (!isRt(t.rtMs)) return null;
  return {
    set: t.set as SetId,
    triad: t.triad,
    rep: t.rep,
    pair: sorted,
    predicted: isPredicted(def, sorted),
    rtMs: t.rtMs,
  };
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  const firstLanguage = sanitizeText(b.firstLanguage, 60);
  if (!firstLanguage) return null;

  let colorVision: ColorVision | null = null;
  if (b.colorVision !== null && b.colorVision !== undefined) {
    if (typeof b.colorVision !== "string" || !COLOR_VISION.has(b.colorVision)) return null;
    colorVision = b.colorVision as ColorVision;
  }

  if (!Array.isArray(b.setOrder) || b.setOrder.length !== 2) return null;
  const [s0, s1] = b.setOrder as unknown[];
  if (typeof s0 !== "string" || typeof s1 !== "string" || !SET_IDS.has(s0) || !SET_IDS.has(s1) || s0 === s1) return null;

  const maxTrials = TRIADS.length * REPS * 2;
  if (!Array.isArray(b.trials) || b.trials.length === 0 || b.trials.length > maxTrials) return null;
  const trials: TrialResult[] = [];
  for (const x of b.trials) {
    const t = validateTrial(x);
    if (!t) return null;
    trials.push(t);
  }

  const scores = {
    gb: trials.filter((t) => t.set === "gb" && t.predicted).length,
    nw: trials.filter((t) => t.set === "nw" && t.predicted).length,
  };

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    firstLanguage,
    colorVision,
    setOrder: [s0 as SetId, s1 as SetId],
    trials,
    scores,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const submission = validate(body);
  if (!submission) {
    return Response.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `roberson-triads/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
