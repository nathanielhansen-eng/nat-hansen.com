import { put } from "@vercel/blob";

// Cold experiment: Sripada (2010), the Deep Self Concordance model.
// Two-arm, between-subjects design — Rifle Contest (concordance absent) vs.
// Policeman Rifle Contest (concordance present); both outcomes morally NEUTRAL.
// SINGLE-SCALE VERSION: per the study spec (§4), both conditions run on ONE
// identical response instrument — a 6-point agreement scale for the statement
// "Jake intentionally hit the target" (1 = Agree … 6 = Disagree). The original
// paper mixed measures (Knobe's binary for Rifle, Sripada's 6-point for
// Policeman); this is the spec's recommended tighter single-scale replication,
// not a verbatim reproduction of the mixed-measure original.

type Condition = "rifle" | "policeman";
type PriorPhilosophy = "none" | "some" | "extensive";

const PRIOR_PHILOSOPHY = new Set<string>(["none", "some", "extensive"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  /** Single-study design; kept for schema parallelism with the other cold experiments. */
  study: 1;
  condition: Condition;
  /** 1–6 agreement rating: 1 = Agree … 6 = Disagree ("Jake intentionally hit the target"). */
  rating: number;
  /** Derived: agrees the hit was intentional, i.e. a response left of the 1–6 midline (rating <= 3). */
  intentional: boolean;
  /** Reaction time to the single agreement question. */
  responseRtMs: number;
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

  if (b.study !== 1) return null;
  if (b.condition !== "rifle" && b.condition !== "policeman") return null;

  if (
    typeof b.rating !== "number" ||
    !Number.isInteger(b.rating) ||
    b.rating < 1 ||
    b.rating > 6
  ) {
    return null;
  }

  if (typeof b.intentional !== "boolean") return null;

  if (typeof b.responseRtMs !== "number" || !Number.isFinite(b.responseRtMs) || b.responseRtMs < 0) {
    return null;
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
    rating: b.rating,
    intentional: b.intentional,
    responseRtMs: b.responseRtMs,
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
  const key = `sripada-deepself/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
