import { put } from "@vercel/blob";
import {
  CONTEXTS,
  INGROUP_QUESTIONS,
  PILOT_SLUG,
  SCALE_MAX,
  SCALE_MIN,
  TERMS,
  type Context,
  type IngroupAnswer,
  type IngroupKey,
  type PilotSubmission,
  type Term,
} from "@/lib/reclaimed-slurs";

const ANSWERS = new Set<string>(["yes", "no", "na"]);

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function isRating(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= SCALE_MIN && v <= SCALE_MAX;
}

function validate(body: unknown): PilotSubmission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.rid !== "string" || !/^[a-z0-9]{8,32}$/.test(b.rid)) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  const selfRaw = b.self as Record<string, unknown> | undefined;
  const ctxRaw = b.context as Record<string, Record<string, unknown>> | undefined;
  const inRaw = b.ingroup as Record<string, unknown> | undefined;
  if (!selfRaw || !ctxRaw || !inRaw || typeof selfRaw !== "object" || typeof ctxRaw !== "object" || typeof inRaw !== "object")
    return null;

  const self = {} as Record<Term, number>;
  const context = {} as Record<Term, Record<Context, number>>;
  for (const t of TERMS) {
    if (!isRating(selfRaw[t])) return null;
    self[t] = selfRaw[t] as number;
    const row = ctxRaw[t];
    if (!row || typeof row !== "object") return null;
    const clean = {} as Record<Context, number>;
    for (const c of CONTEXTS) {
      if (!isRating(row[c])) return null;
      clean[c] = row[c] as number;
    }
    context[t] = clean;
  }

  const ingroup = {} as Record<IngroupKey, IngroupAnswer>;
  for (const k of Object.keys(INGROUP_QUESTIONS) as IngroupKey[]) {
    const v = inRaw[k];
    if (typeof v !== "string" || !ANSWERS.has(v)) return null;
    ingroup[k] = v as IngroupAnswer;
  }

  return {
    session: sanitizeSession(b.session),
    rid: b.rid,
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    self,
    context,
    ingroup,
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
  await put(`${PILOT_SLUG}/${submission.session}/${id}.json`, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return Response.json({ ok: true });
}
