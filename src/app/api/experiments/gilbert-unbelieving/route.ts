import { put } from "@vercel/blob";

type SignalKind = "true" | "false" | "blank";
type TestResponse = "true" | "false" | "noinfo" | "neverseen";

interface ResponseRow {
  x: string;
  y: string;
  signal: SignalKind;
  interrupted: boolean;
  isFoil: boolean;
  response: TestResponse;
}

interface Submission {
  session: string;
  submittedAt: string;
  missedTones: number;
  responses: ResponseRow[];
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (typeof b.missedTones !== "number") return null;
  if (!Array.isArray(b.responses) || b.responses.length === 0 || b.responses.length > 40) return null;
  for (const row of b.responses) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    if (
      typeof r.x !== "string" ||
      typeof r.y !== "string" ||
      (r.signal !== "true" && r.signal !== "false" && r.signal !== "blank") ||
      typeof r.interrupted !== "boolean" ||
      typeof r.isFoil !== "boolean" ||
      (r.response !== "true" && r.response !== "false" && r.response !== "noinfo" && r.response !== "neverseen")
    )
      return null;
    if (r.x.length > 64 || r.y.length > 64) return null;
  }
  return {
    session: sanitizeSession(b.session),
    submittedAt: b.submittedAt,
    missedTones: b.missedTones,
    responses: b.responses as ResponseRow[],
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
  const key = `gilbert-unbelieving/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
