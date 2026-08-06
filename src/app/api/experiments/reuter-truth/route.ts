import { sanitizeSession, sanitizeTag } from "@/lib/xphi/blob";
import { handleSubmitPOST } from "@/lib/xphi/routes";

type Scenario = "party" | "rolex";
type Answer = "true" | "false" | "notsure";
type YesNo = "yes" | "no";
type Order = "party-first" | "rolex-first";

const SCENARIOS = new Set<string>(["party", "rolex"]);
const ANSWERS = new Set<string>(["true", "false", "notsure"]);
const YESNO = new Set<string>(["yes", "no"]);
const ORDERS = new Set<string>(["party-first", "rolex-first"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  order: Order;
  /** Part 1 = Study 1 version: coherent with the speaker's beliefs, not corresponding. */
  part1Scenario: Scenario;
  part1Answer: Answer;
  part1RtMs: number;
  /** Part 2 = Study 2 version of the other story: corresponding, not coherent. */
  part2Scenario: Scenario;
  part2Answer: Answer;
  part2RtMs: number;
  /** Part 3 = Study 3 probes about the Part 1 story. */
  part3BestKnowledge: YesNo;
  part3Correct: YesNo;
  /** Free-text explanation of the Part 1 answer; may be empty. */
  part3Explanation: string;
}

function validate(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0) return null;

  if (typeof b.order !== "string" || !ORDERS.has(b.order)) return null;
  if (typeof b.part1Scenario !== "string" || !SCENARIOS.has(b.part1Scenario)) return null;
  if (typeof b.part2Scenario !== "string" || !SCENARIOS.has(b.part2Scenario)) return null;
  // The scenarios are determined by the order; reject inconsistent records.
  const s1 = b.order === "party-first" ? "party" : "rolex";
  if (b.part1Scenario !== s1 || b.part2Scenario === s1) return null;

  if (typeof b.part1Answer !== "string" || !ANSWERS.has(b.part1Answer)) return null;
  if (typeof b.part2Answer !== "string" || !ANSWERS.has(b.part2Answer)) return null;
  if (typeof b.part3BestKnowledge !== "string" || !YESNO.has(b.part3BestKnowledge)) return null;
  if (typeof b.part3Correct !== "string" || !YESNO.has(b.part3Correct)) return null;

  for (const k of ["part1RtMs", "part2RtMs"] as const) {
    const v = b[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  }

  if (typeof b.part3Explanation !== "string") return null;

  return {
    session: sanitizeSession(b.session, "default"),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    order: b.order as Order,
    part1Scenario: b.part1Scenario as Scenario,
    part1Answer: b.part1Answer as Answer,
    part1RtMs: b.part1RtMs as number,
    part2Scenario: b.part2Scenario as Scenario,
    part2Answer: b.part2Answer as Answer,
    part2RtMs: b.part2RtMs as number,
    part3BestKnowledge: b.part3BestKnowledge as YesNo,
    part3Correct: b.part3Correct as YesNo,
    part3Explanation: b.part3Explanation.trim().slice(0, 2000),
  };
}

export const POST = (request: Request) => handleSubmitPOST("reuter-truth", request, validate);
