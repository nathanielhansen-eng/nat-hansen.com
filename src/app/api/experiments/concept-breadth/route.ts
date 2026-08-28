import { put } from "@vercel/blob";
import { TRAUMA_IDS } from "@/app/teaching/experiments/concept-breadth/stimuli";
import type {
  PassData,
  PassOrder,
  Submission,
  TraumaResponse,
} from "@/app/teaching/experiments/concept-breadth/stimuli";

const PASS_ORDERS = new Set<string>(["bare-first", "severe-first"]);

function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function validatePass(raw: unknown): PassData | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  if (typeof b.ladderRtMs !== "number" || !Number.isFinite(b.ladderRtMs) || b.ladderRtMs < 0)
    return null;

  if (!Array.isArray(b.ladderYes) || b.ladderYes.length !== 5) return null;
  if (!b.ladderYes.every((v) => typeof v === "boolean")) return null;
  const ladderYes = b.ladderYes as boolean[];
  const ladderScore = ladderYes.filter(Boolean).length;
  if (b.ladderScore !== ladderScore) return null;

  if (!Array.isArray(b.trauma) || b.trauma.length !== TRAUMA_IDS.length) return null;
  const seen = new Set<string>();
  const trauma: TraumaResponse[] = [];
  for (const t of b.trauma) {
    if (!t || typeof t !== "object") return null;
    const r = t as Record<string, unknown>;
    if (typeof r.id !== "string" || !TRAUMA_IDS.includes(r.id) || seen.has(r.id)) return null;
    seen.add(r.id);
    if (typeof r.rating !== "number" || !Number.isInteger(r.rating) || r.rating < 1 || r.rating > 6)
      return null;
    if (typeof r.position !== "number" || !Number.isInteger(r.position) || r.position < 0 || r.position >= TRAUMA_IDS.length)
      return null;
    if (typeof r.rtMs !== "number" || !Number.isFinite(r.rtMs) || r.rtMs < 0) return null;
    trauma.push({ id: r.id, rating: r.rating, position: r.position, rtMs: r.rtMs });
  }
  const traumaScore = trauma.reduce((a, r) => a + r.rating, 0);
  if (b.traumaScore !== traumaScore) return null;

  return {
    ladderYes,
    ladderScore,
    ladderRtMs: b.ladderRtMs as number,
    trauma,
    traumaScore,
  };
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0)
    return null;
  if (typeof b.passOrder !== "string" || !PASS_ORDERS.has(b.passOrder)) return null;

  const bare = validatePass(b.bare);
  const severe = validatePass(b.severe);
  if (!bare || !severe) return null;

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    passOrder: b.passOrder as PassOrder,
    bare,
    severe,
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
  const key = `concept-breadth/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
