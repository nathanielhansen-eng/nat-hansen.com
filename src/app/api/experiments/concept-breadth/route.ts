import { put } from "@vercel/blob";
import { TRAUMA_IDS } from "@/app/teaching/experiments/concept-breadth/stimuli";
import type {
  Submission,
  TraumaResponse,
} from "@/app/teaching/experiments/concept-breadth/stimuli";

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
  for (const k of ["durationMs", "ladderRtMs"] as const) {
    const v = b[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  }

  if (!Array.isArray(b.ladderYes) || b.ladderYes.length !== 5) return null;
  if (!b.ladderYes.every((v) => typeof v === "boolean")) return null;
  const ladderYes = b.ladderYes as boolean[];
  const ladderScore = ladderYes.filter(Boolean).length;
  if (b.ladderScore !== ladderScore) return null;

  if (!Array.isArray(b.trauma) || b.trauma.length !== TRAUMA_IDS.length) return null;
  const seen = new Set<string>();
  const trauma: TraumaResponse[] = [];
  for (const raw of b.trauma) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
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
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs as number,
    ladderYes,
    ladderScore,
    ladderRtMs: b.ladderRtMs as number,
    trauma,
    traumaScore,
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
