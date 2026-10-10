import { put } from "@vercel/blob";
import {
  MEASURES,
  SCALE_MAX,
  SCALE_MIN,
  SLUG,
  TERMS,
  type Measure,
  type Ratings,
  type Submission,
} from "@/lib/reclaimed-slurs";

// Optional launcher-supplied opaque tag: sanitized like the session, dropped
// when empty, never required.
function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function isRating(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= SCALE_MIN && v <= SCALE_MAX;
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  // The block order must be a permutation of the four measures.
  if (!Array.isArray(b.blockOrder) || b.blockOrder.length !== MEASURES.length) return null;
  if (new Set(b.blockOrder).size !== MEASURES.length) return null;
  if (!b.blockOrder.every((m) => (MEASURES as readonly unknown[]).includes(m))) return null;

  if (!b.ratings || typeof b.ratings !== "object") return null;
  const raw = b.ratings as Record<string, unknown>;
  const ratings = {} as Ratings;
  for (const t of TERMS) {
    const row = raw[t];
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const clean = {} as Record<Measure, number>;
    for (const m of MEASURES) {
      if (!isRating(r[m])) return null;
      clean[m] = r[m] as number;
    }
    ratings[t] = clean;
  }

  let age: number | null = null;
  if (b.age !== null && b.age !== undefined) {
    if (typeof b.age !== "number" || !Number.isInteger(b.age) || b.age < 16 || b.age > 100) return null;
    age = b.age;
  }

  const tag = sanitizeTag(b.tag);
  return {
    session: sanitizeSession(b.session),
    ...(tag ? { tag } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    blockOrder: b.blockOrder as Measure[],
    ratings,
    age,
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
  const key = `${SLUG}/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
