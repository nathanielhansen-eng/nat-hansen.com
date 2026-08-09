import { put } from "@vercel/blob";

type Condition = "harm" | "help";
type PriorPhilosophy = "none" | "some" | "extensive";

const PRIOR_PHILOSOPHY = new Set<string>(["none", "some", "extensive"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: Condition;
  /** Primary DV. 1–7 agreement with "The chairman of the board intentionally
   *  harmed [helped] the environment." (Phillips, Luguri & Knobe 2015, p. 38). */
  intentional: number;
  /** Mediator measure, stored RAW. 1–7 agreement with Alex's claim that the
   *  possibility "the chairman could have wanted to avoid harming [helping] the
   *  environment" is NOT relevant to consider. The paper reverse-codes this to a
   *  relevance score: relevance = 8 − relevanceAgree (Phillips et al. 2015, p. 38). */
  relevanceAgree: number;
  intentionalRtMs: number;
  relevanceRtMs: number;
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

function isRating1to7(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7;
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  if (b.study !== 1) return null;
  if (b.condition !== "harm" && b.condition !== "help") return null;

  if (!isRating1to7(b.intentional)) return null;
  if (!isRating1to7(b.relevanceAgree)) return null;

  for (const k of ["intentionalRtMs", "relevanceRtMs"] as const) {
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
    intentional: b.intentional,
    relevanceAgree: b.relevanceAgree,
    intentionalRtMs: b.intentionalRtMs as number,
    relevanceRtMs: b.relevanceRtMs as number,
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
  const key = `phillips-alternatives/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
