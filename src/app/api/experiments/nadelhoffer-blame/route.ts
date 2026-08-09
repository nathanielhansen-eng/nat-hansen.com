import { put } from "@vercel/blob";

type Condition = "C1" | "C2";
type PriorPhilosophy = "none" | "some" | "extensive";

const PRIOR_PHILOSOPHY = new Set<string>(["none", "some", "extensive"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  /** C1 = fleeing thief kills a pursuing police officer; C2 = innocent driver kills an attempted carjacker. */
  condition: Condition;
  /** Answer to "did the agent knowingly bring about the victim's death?" */
  knowingly: boolean;
  /** Answer to "did the agent intentionally bring about the victim's death?" */
  intentional: boolean;
  /** 0–6 blame rating (0 = no blame, 6 = a lot of blame). */
  rating: number;
  knowinglyRtMs: number;
  intentRtMs: number;
  ratingRtMs: number;
  /** Optional; null when the participant skipped it. */
  priorPhilosophy: PriorPhilosophy | null;
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

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  // Only one study exists for this experiment, but the field is kept for schema parity.
  if (b.study !== 1) return null;
  if (b.condition !== "C1" && b.condition !== "C2") return null;

  if (typeof b.knowingly !== "boolean") return null;
  if (typeof b.intentional !== "boolean") return null;

  if (
    typeof b.rating !== "number" ||
    !Number.isInteger(b.rating) ||
    b.rating < 0 ||
    b.rating > 6
  ) {
    return null;
  }

  for (const k of ["knowinglyRtMs", "intentRtMs", "ratingRtMs"] as const) {
    const v = b[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  }

  let priorPhilosophy: PriorPhilosophy | null = null;
  if (b.priorPhilosophy !== null && b.priorPhilosophy !== undefined) {
    if (typeof b.priorPhilosophy !== "string" || !PRIOR_PHILOSOPHY.has(b.priorPhilosophy)) return null;
    priorPhilosophy = b.priorPhilosophy as PriorPhilosophy;
  }

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    study: 1,
    condition: b.condition,
    knowingly: b.knowingly,
    intentional: b.intentional,
    rating: b.rating,
    knowinglyRtMs: b.knowinglyRtMs as number,
    intentRtMs: b.intentRtMs as number,
    ratingRtMs: b.ratingRtMs as number,
    priorPhilosophy,
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
  const key = `nadelhoffer-blame/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
