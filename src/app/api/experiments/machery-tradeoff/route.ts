import { put } from "@vercel/blob";

type Condition = "extra-dollar" | "free-cup";
type ValueJudgment = "blameworthy" | "praiseworthy" | "neutral";
type PriorPhilosophy = "none" | "some" | "extensive";

const VALUE_JUDGMENT = new Set<string>(["blameworthy", "praiseworthy", "neutral"]);
const PRIOR_PHILOSOPHY = new Set<string>(["none", "some", "extensive"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  /** Single flagship study; kept for parity with the other experiments. */
  study: 1;
  condition: Condition;
  /** Answer to "did Joe intentionally [pay one dollar more / obtain the cup]?" */
  intentional: boolean;
  /** The "value question" manipulation check. */
  value: ValueJudgment;
  intentRtMs: number;
  valueRtMs: number;
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
  if (b.condition !== "extra-dollar" && b.condition !== "free-cup") return null;

  if (typeof b.intentional !== "boolean") return null;

  if (typeof b.value !== "string" || !VALUE_JUDGMENT.has(b.value)) return null;

  for (const k of ["intentRtMs", "valueRtMs"] as const) {
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
    value: b.value as ValueJudgment,
    intentRtMs: b.intentRtMs as number,
    valueRtMs: b.valueRtMs as number,
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
  const key = `machery-tradeoff/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
