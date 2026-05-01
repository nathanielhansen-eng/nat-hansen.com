import { put } from "@vercel/blob";

type QType = "extension" | "intensity";

const ALLOWED_TERMS = new Set<string>([
  "racist",
  "disagreeable",
  "terrible",
  "worthless",
  "slightly racist",
  "moderately racist",
  "extremely racist",
  "racially ignorant",
  "racially insensitive",
  "racially unjust",
]);

const RACE_KEYS = new Set<string>([
  "ai_an",
  "asian",
  "black",
  "hispanic",
  "mena",
  "nh_pi",
  "white",
  "other",
]);

interface ResponseRow {
  questionType: QType;
  term: string;
  value: number;
  rtMs: number;
}

interface Demographics {
  age: number | null;
  ageDeclined: boolean;
  gender: string | null;
  genderDeclined: boolean;
  race: string[];
  raceOther: string | null;
  raceDeclined: boolean;
}

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  blockOrder: string[];
  responses: ResponseRow[];
  demographics: Demographics;
}

const EXPECTED_RESPONSES = 20;

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  if (!Array.isArray(b.blockOrder)) return null;
  for (const id of b.blockOrder) if (typeof id !== "string" || id.length > 64) return null;

  if (!Array.isArray(b.responses) || b.responses.length !== EXPECTED_RESPONSES) return null;
  const responses: ResponseRow[] = [];
  for (const row of b.responses) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    if (r.questionType !== "extension" && r.questionType !== "intensity") return null;
    if (typeof r.term !== "string" || !ALLOWED_TERMS.has(r.term)) return null;
    if (typeof r.value !== "number" || !Number.isFinite(r.value) || r.value < 0 || r.value > 100) return null;
    if (typeof r.rtMs !== "number" || !Number.isFinite(r.rtMs) || r.rtMs < 0) return null;
    responses.push({
      questionType: r.questionType,
      term: r.term,
      value: r.value,
      rtMs: r.rtMs,
    });
  }

  // Verify the expected breakdown: 1 ext + 1 int for "racist", 3+3 for each of thin/degree/alt
  const counts = new Map<string, { ext: number; int: number }>();
  for (const r of responses) {
    const c = counts.get(r.term) ?? { ext: 0, int: 0 };
    if (r.questionType === "extension") c.ext += 1;
    else c.int += 1;
    counts.set(r.term, c);
  }
  for (const term of ALLOWED_TERMS) {
    const c = counts.get(term);
    if (!c || c.ext !== 1 || c.int !== 1) return null;
  }

  const d = b.demographics;
  if (!d || typeof d !== "object") return null;
  const dr = d as Record<string, unknown>;

  if (typeof dr.ageDeclined !== "boolean") return null;
  let age: number | null = null;
  if (dr.ageDeclined) {
    if (dr.age !== null) return null;
  } else {
    if (typeof dr.age !== "number" || !Number.isInteger(dr.age) || dr.age < 13 || dr.age > 120) return null;
    age = dr.age;
  }

  if (typeof dr.genderDeclined !== "boolean") return null;
  let gender: string | null = null;
  if (dr.genderDeclined) {
    if (dr.gender !== null) return null;
  } else {
    if (typeof dr.gender !== "string" || dr.gender.length === 0 || dr.gender.length > 200) return null;
    gender = dr.gender;
  }

  if (typeof dr.raceDeclined !== "boolean") return null;
  if (!Array.isArray(dr.race)) return null;
  const race: string[] = [];
  for (const k of dr.race) {
    if (typeof k !== "string" || !RACE_KEYS.has(k)) return null;
    race.push(k);
  }
  let raceOther: string | null = null;
  if (race.includes("other")) {
    if (typeof dr.raceOther !== "string" || dr.raceOther.length === 0 || dr.raceOther.length > 200) return null;
    raceOther = dr.raceOther;
  } else {
    if (dr.raceOther !== null && dr.raceOther !== "") return null;
  }
  if (!dr.raceDeclined && race.length === 0) return null;
  if (dr.raceDeclined && race.length !== 0) return null;

  return {
    session: sanitizeSession(b.session),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    blockOrder: b.blockOrder as string[],
    responses,
    demographics: {
      age,
      ageDeclined: dr.ageDeclined,
      gender,
      genderDeclined: dr.genderDeclined,
      race,
      raceOther,
      raceDeclined: dr.raceDeclined,
    },
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
  const key = `conceptual-inflation/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
