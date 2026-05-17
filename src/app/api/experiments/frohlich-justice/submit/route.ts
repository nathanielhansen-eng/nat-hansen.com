import { put } from "@vercel/blob";

type PrincipleId =
  | "max-floor"
  | "max-average"
  | "max-average-floor"
  | "max-average-range";

const PRINCIPLE_IDS: ReadonlySet<string> = new Set([
  "max-floor",
  "max-average",
  "max-average-floor",
  "max-average-range",
]);

const CLASS_LABELS: ReadonlySet<string> = new Set([
  "High",
  "Medium high",
  "Medium",
  "Medium low",
  "Low",
]);

type Choice = { principle: PrincipleId; constraint?: number };

type ChatMsg = { role: "user" | "assistant"; speaker: string; content: string };

type VoteRecord = {
  speaker: string;
  vote: "YES" | "NO" | "ABSTAIN";
  reason: string;
};

interface Submission {
  session: string;
  submittedAt: string;
  rank1: PrincipleId[] | null;
  rank2: PrincipleId[] | null;
  rankFinal: PrincipleId[] | null;
  individual: {
    choice: Choice;
    classLabel: string;
    income: number;
  } | null;
  group: {
    proposal: Choice;
    distributionId: string;
    classLabel: string;
    income: number;
  } | null;
  voteRound: number;
  chatTurns: number;
  chat: ChatMsg[];
  finalVotes: VoteRecord[] | null;
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || "default";
}

function isPrincipleId(v: unknown): v is PrincipleId {
  return typeof v === "string" && PRINCIPLE_IDS.has(v);
}

function isRanking(v: unknown): v is PrincipleId[] {
  return (
    Array.isArray(v) &&
    v.length === 4 &&
    v.every(isPrincipleId) &&
    new Set(v).size === 4
  );
}

function isChoice(v: unknown): v is Choice {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!isPrincipleId(o.principle)) return false;
  if (
    o.constraint !== undefined &&
    (typeof o.constraint !== "number" || !Number.isFinite(o.constraint))
  )
    return false;
  return true;
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.session !== "string" || typeof b.submittedAt !== "string")
    return null;

  if (b.rank1 !== null && !isRanking(b.rank1)) return null;
  if (b.rank2 !== null && !isRanking(b.rank2)) return null;
  if (b.rankFinal !== null && !isRanking(b.rankFinal)) return null;

  // individual
  let individual: Submission["individual"] = null;
  if (b.individual !== null && typeof b.individual === "object") {
    const i = b.individual as Record<string, unknown>;
    if (
      !isChoice(i.choice) ||
      typeof i.classLabel !== "string" ||
      !CLASS_LABELS.has(i.classLabel) ||
      typeof i.income !== "number"
    )
      return null;
    individual = {
      choice: i.choice,
      classLabel: i.classLabel,
      income: i.income,
    };
  }

  // group
  let group: Submission["group"] = null;
  if (b.group !== null && typeof b.group === "object") {
    const g = b.group as Record<string, unknown>;
    if (
      !isChoice(g.proposal) ||
      typeof g.distributionId !== "string" ||
      typeof g.classLabel !== "string" ||
      !CLASS_LABELS.has(g.classLabel) ||
      typeof g.income !== "number"
    )
      return null;
    group = {
      proposal: g.proposal,
      distributionId: g.distributionId.slice(0, 8),
      classLabel: g.classLabel,
      income: g.income,
    };
  }

  if (typeof b.voteRound !== "number") return null;
  if (typeof b.chatTurns !== "number") return null;
  if (!Array.isArray(b.chat) || b.chat.length > 200) return null;
  const chat: ChatMsg[] = [];
  for (const m of b.chat) {
    if (!m || typeof m !== "object") return null;
    const r = m as Record<string, unknown>;
    if (
      (r.role !== "user" && r.role !== "assistant") ||
      typeof r.speaker !== "string" ||
      typeof r.content !== "string"
    )
      return null;
    chat.push({
      role: r.role,
      speaker: r.speaker.slice(0, 64),
      content: r.content.slice(0, 4000),
    });
  }

  let finalVotes: VoteRecord[] | null = null;
  if (b.finalVotes !== null && b.finalVotes !== undefined) {
    if (!Array.isArray(b.finalVotes) || b.finalVotes.length > 10) return null;
    const out: VoteRecord[] = [];
    for (const v of b.finalVotes) {
      if (!v || typeof v !== "object") return null;
      const r = v as Record<string, unknown>;
      if (
        typeof r.speaker !== "string" ||
        (r.vote !== "YES" && r.vote !== "NO" && r.vote !== "ABSTAIN") ||
        typeof r.reason !== "string"
      )
        return null;
      out.push({
        speaker: r.speaker.slice(0, 64),
        vote: r.vote,
        reason: r.reason.slice(0, 1000),
      });
    }
    finalVotes = out;
  }

  return {
    session: sanitizeSession(b.session),
    submittedAt: b.submittedAt,
    rank1: (b.rank1 as PrincipleId[] | null) ?? null,
    rank2: (b.rank2 as PrincipleId[] | null) ?? null,
    rankFinal: (b.rankFinal as PrincipleId[] | null) ?? null,
    individual,
    group,
    voteRound: b.voteRound,
    chatTurns: b.chatTurns,
    chat,
    finalVotes,
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
    return Response.json(
      { ok: false, error: "invalid payload" },
      { status: 400 },
    );
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `frohlich-justice/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
