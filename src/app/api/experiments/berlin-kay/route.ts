import { put } from "@vercel/blob";

type ColorVision = "typical" | "atypical" | "unsure";
const COLOR_VISION = new Set<string>(["typical", "atypical", "unsure"]);

/** One basic color term's mapping: the chips the participant says the word
 * covers, plus the single best-example chip. Chips are WCS chip numbers
 * (1-330), the stable ids from chips.ts. */
interface TermMap {
  term: string;
  focal: number;
  chips: number[];
}

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  language: string;
  native: boolean | null;
  colorVision: ColorVision | null;
  terms: TermMap[];
}

function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

/** Free text (language name, color terms) — printable, control chars out. */
function sanitizeText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  return t || null;
}

function isCnum(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 330;
}

function validateTerm(v: unknown): TermMap | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const term = sanitizeText(t.term, 40);
  if (!term) return null;
  if (!isCnum(t.focal)) return null;
  if (!Array.isArray(t.chips) || t.chips.length === 0 || t.chips.length > 330) return null;
  const chips: number[] = [];
  const seen = new Set<number>();
  for (const c of t.chips) {
    if (!isCnum(c) || seen.has(c)) return null;
    seen.add(c);
    chips.push(c);
  }
  if (!seen.has(t.focal)) return null;
  return { term, focal: t.focal, chips };
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  const language = sanitizeText(b.language, 60);
  if (!language) return null;

  let native: boolean | null = null;
  if (b.native !== null && b.native !== undefined) {
    if (typeof b.native !== "boolean") return null;
    native = b.native;
  }

  let colorVision: ColorVision | null = null;
  if (b.colorVision !== null && b.colorVision !== undefined) {
    if (typeof b.colorVision !== "string" || !COLOR_VISION.has(b.colorVision)) return null;
    colorVision = b.colorVision as ColorVision;
  }

  if (!Array.isArray(b.terms) || b.terms.length === 0 || b.terms.length > 20) return null;
  const terms: TermMap[] = [];
  const seenTerms = new Set<string>();
  for (const x of b.terms) {
    const t = validateTerm(x);
    if (!t) return null;
    const key = t.term.toLowerCase();
    if (seenTerms.has(key)) return null;
    seenTerms.add(key);
    terms.push(t);
  }

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    language,
    native,
    colorVision,
    terms,
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
  const key = `berlin-kay/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
