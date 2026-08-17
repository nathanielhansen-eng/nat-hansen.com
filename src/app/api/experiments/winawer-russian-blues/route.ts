import { put } from "@vercel/blob";

type Interference = "none" | "verbal" | "spatial";
type Side = "left" | "right";
type InputMode = "key" | "pointer";
type ColorVision = "typical" | "atypical" | "unsure";

const INTERFERENCE = new Set<string>(["none", "verbal", "spatial"]);
const SIDE = new Set<string>(["left", "right"]);
const INPUT_MODE = new Set<string>(["key", "pointer"]);
const COLOR_VISION = new Set<string>(["typical", "atypical", "unsure"]);

/** One triad trial. `target` and `distractor` are 1-based indices into the
 * 20-step blue continuum, so within- vs cross-category can be recomputed
 * downstream against whatever boundary the analysis wants (the participant's
 * own elicited boundary, or the nominal 8.5). */
interface Trial {
  block: number;
  interference: Interference;
  target: number;
  distractor: number;
  /** 2 = near-color comparison, 4 = far-color comparison (Winawer p. 7784). */
  distance: number;
  matchSide: Side;
  correct: boolean;
  rtMs: number;
  inputMode: InputMode;
  /** Back-filled from the interference probe covering this trial; null in
   * no-interference blocks. Winawer p. 7782 excludes trials whose interference
   * response was wrong. */
  probeCorrect: boolean | null;
}

interface Probe {
  block: number;
  interference: "verbal" | "spatial";
  index: number;
  correct: boolean;
  rtMs: number;
}

/** Boundary-elicitation trial: was stimulus `id` called the darker blue? */
interface NamingRow {
  id: number;
  dark: boolean;
  rtMs: number;
}

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  blockOrder: Interference[];
  trials: Trial[];
  probes: Probe[];
  naming: NamingRow[];
  /** Transition point in the naming task, as a half-integer (e.g. 8.5). */
  boundary: number;
  /** True when the naming responses were not monotonic, so the transition
   * point had to be fitted rather than read off. */
  boundaryAmbiguous: boolean;
  colorVision: ColorVision | null;
}

// Optional launcher-supplied opaque tag (course-dashboard integration):
// sanitized like the session, dropped when empty, never required.
function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function isStim(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 20;
}

function isRt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 600000;
}

function validateTrial(v: unknown): Trial | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  if (typeof t.block !== "number" || !Number.isInteger(t.block) || t.block < 0 || t.block > 2) return null;
  if (typeof t.interference !== "string" || !INTERFERENCE.has(t.interference)) return null;
  if (!isStim(t.target) || !isStim(t.distractor)) return null;
  if (t.distance !== 2 && t.distance !== 4) return null;
  if (typeof t.matchSide !== "string" || !SIDE.has(t.matchSide)) return null;
  if (typeof t.correct !== "boolean") return null;
  if (!isRt(t.rtMs)) return null;
  if (typeof t.inputMode !== "string" || !INPUT_MODE.has(t.inputMode)) return null;
  if (t.probeCorrect !== null && typeof t.probeCorrect !== "boolean") return null;
  return {
    block: t.block,
    interference: t.interference as Interference,
    target: t.target,
    distractor: t.distractor,
    distance: t.distance,
    matchSide: t.matchSide as Side,
    correct: t.correct,
    rtMs: t.rtMs,
    inputMode: t.inputMode as InputMode,
    probeCorrect: t.probeCorrect as boolean | null,
  };
}

function validateProbe(v: unknown): Probe | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  if (typeof p.block !== "number" || !Number.isInteger(p.block) || p.block < 0 || p.block > 2) return null;
  if (p.interference !== "verbal" && p.interference !== "spatial") return null;
  if (typeof p.index !== "number" || !Number.isInteger(p.index) || p.index < 0 || p.index > 20) return null;
  if (typeof p.correct !== "boolean") return null;
  if (!isRt(p.rtMs)) return null;
  return {
    block: p.block,
    interference: p.interference,
    index: p.index,
    correct: p.correct,
    rtMs: p.rtMs,
  };
}

function validateNaming(v: unknown): NamingRow | null {
  if (!v || typeof v !== "object") return null;
  const n = v as Record<string, unknown>;
  if (!isStim(n.id)) return null;
  if (typeof n.dark !== "boolean") return null;
  if (!isRt(n.rtMs)) return null;
  return { id: n.id, dark: n.dark, rtMs: n.rtMs };
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  if (!Array.isArray(b.blockOrder) || b.blockOrder.length !== 3) return null;
  const blockOrder: Interference[] = [];
  for (const x of b.blockOrder) {
    if (typeof x !== "string" || !INTERFERENCE.has(x)) return null;
    blockOrder.push(x as Interference);
  }
  if (new Set(blockOrder).size !== 3) return null;

  if (!Array.isArray(b.trials) || b.trials.length === 0 || b.trials.length > 200) return null;
  const trials: Trial[] = [];
  for (const x of b.trials) {
    const t = validateTrial(x);
    if (!t) return null;
    trials.push(t);
  }

  if (!Array.isArray(b.probes) || b.probes.length > 40) return null;
  const probes: Probe[] = [];
  for (const x of b.probes) {
    const p = validateProbe(x);
    if (!p) return null;
    probes.push(p);
  }

  if (!Array.isArray(b.naming) || b.naming.length === 0 || b.naming.length > 60) return null;
  const naming: NamingRow[] = [];
  for (const x of b.naming) {
    const n = validateNaming(x);
    if (!n) return null;
    naming.push(n);
  }

  if (typeof b.boundary !== "number" || !Number.isFinite(b.boundary) || b.boundary < 0 || b.boundary > 21) {
    return null;
  }
  if (typeof b.boundaryAmbiguous !== "boolean") return null;

  let colorVision: ColorVision | null = null;
  if (b.colorVision !== null && b.colorVision !== undefined) {
    if (typeof b.colorVision !== "string" || !COLOR_VISION.has(b.colorVision)) return null;
    colorVision = b.colorVision as ColorVision;
  }

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    blockOrder,
    trials,
    probes,
    naming,
    boundary: b.boundary,
    boundaryAmbiguous: b.boundaryAmbiguous,
    colorVision,
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
  const key = `winawer-russian-blues/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
