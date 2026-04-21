import { put } from "@vercel/blob";

interface NamingRow {
  id: number;
  hex: string;
  type: "focal" | "boundary";
  name: string;
  time: number;
  words: number;
  exposed: boolean;
  selected: boolean;
  correct: boolean;
}

interface Submission {
  session: string;
  submittedAt: string;
  naming: NamingRow[];
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (!Array.isArray(b.naming) || b.naming.length !== 12) return null;
  for (const row of b.naming) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== "number" ||
      typeof r.hex !== "string" ||
      (r.type !== "focal" && r.type !== "boundary") ||
      typeof r.name !== "string" ||
      typeof r.time !== "number" ||
      typeof r.words !== "number" ||
      typeof r.exposed !== "boolean" ||
      typeof r.selected !== "boolean" ||
      typeof r.correct !== "boolean"
    )
      return null;
    if (r.name.length > 200) return null;
  }
  return {
    session: sanitizeSession(b.session),
    submittedAt: b.submittedAt,
    naming: b.naming as NamingRow[],
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
  const key = `brown-lenneberg/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
