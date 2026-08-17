import { put } from "@vercel/blob";

/* Allen, Quinlan, Andow & Fischer (2021), "What is it like to be colour-blind?
 * A case study in experimental philosophy of experience", Mind & Language 37(5),
 * 814–839, doi:10.1111/mila.12370 (DOI verified against api.crossref.org).
 *
 * NOTE: this is an ORIGINAL classroom design inspired by the paper, not a
 * replication — the paper's paradigm needs colour-blind participants, NCS print
 * stimuli and EnChroma glasses. See docs/cold-experiments/allen-colour-blind-spec.md. */

type Condition = "favourable" | "unfavourable";
type ViewChoice = "standard" | "alien" | "revised" | "common";
type NewColours = "reds" | "greens" | "pinks-purples" | "blues" | "yellows";
type SelfReportCVD = "yes" | "no" | "unsure";

const VIEW_CHOICE = new Set<string>(["standard", "alien", "revised", "common"]);
const NEW_COLOURS = new Set<string>(["reds", "greens", "pinks-purples", "blues", "yellows"]);
const SELF_REPORT_CVD = new Set<string>(["yes", "no", "unsure"]);
const COLOUR_NAMES = new Set<string>([
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "grey",
]);

/** Fixed presentation order of the six simulated swatches; `namings` is parallel
 *  to this array and the original hue name at index i is the scoring key. */
const SWATCH_KEYS = ["red", "yellow", "purple", "green", "blue", "orange"] as const;
/** Patches whose hue collapses under the deuteranopia transform (red, purple,
 *  green, orange) vs. those it broadly preserves (yellow, blue). */
const RG_KEYS = new Set<string>(["red", "purple", "green", "orange"]);

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  /** Single study; kept for parity with the other experiments. */
  study: 1;
  /** Between-subjects viewing-context vignette (paper p. 4 on favourability). */
  condition: Condition;
  /** Primary DV — which of the paper's four accounts of CVD experience was picked. */
  viewChoice: ViewChoice;
  /** Randomised presentation order of the four options, pipe-joined. */
  viewOrder: string;
  /** 1–5 confidence in the viewChoice. */
  confidence: number;
  viewRtMs: number;
  /* Derived one-hot booleans. Redundant with viewChoice, but they let the generic
   * class-summary summarizer report the whole 4-way distribution as proportions
   * without any bespoke aggregation code. */
  choseStandard: boolean;
  choseAlien: boolean;
  choseRevised: boolean;
  choseCommon: boolean;
  /** Names given to the six deuteranopia-simulated patches, in SWATCH_KEYS order. */
  namings: string[];
  /** Count of patches still named with their original hue's name (0–6). */
  namingScore: number;
  /** Subscore over the four hue-collapsing patches (0–4). */
  rgScore: number;
  /** Subscore over the two preserved patches (0–2). */
  ybScore: number;
  /** Which colour family the participant predicts would look most new with
   *  enhancement glasses. Allen et al.: pinks and purples (pp. 18–19). */
  newColours: NewColours;
  choseNewPinksPurples: boolean;
  /** Optional; null when skipped. Asked last so it cannot prime the tasks. */
  selfReportCVD: SelfReportCVD | null;
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
  if (b.condition !== "favourable" && b.condition !== "unfavourable") return null;

  if (typeof b.viewChoice !== "string" || !VIEW_CHOICE.has(b.viewChoice)) return null;
  const viewChoice = b.viewChoice as ViewChoice;

  // The order string must be a permutation of the four options, not free text.
  if (typeof b.viewOrder !== "string") return null;
  const orderParts = b.viewOrder.split("|");
  if (orderParts.length !== 4) return null;
  if (new Set(orderParts).size !== 4) return null;
  if (!orderParts.every((k) => VIEW_CHOICE.has(k))) return null;

  if (typeof b.confidence !== "number" || !Number.isInteger(b.confidence)) return null;
  if (b.confidence < 1 || b.confidence > 5) return null;

  if (typeof b.viewRtMs !== "number" || !Number.isFinite(b.viewRtMs) || b.viewRtMs < 0) return null;

  if (!Array.isArray(b.namings) || b.namings.length !== SWATCH_KEYS.length) return null;
  const namings: string[] = [];
  for (const v of b.namings) {
    if (typeof v !== "string" || !COLOUR_NAMES.has(v)) return null;
    namings.push(v);
  }

  if (typeof b.newColours !== "string" || !NEW_COLOURS.has(b.newColours)) return null;

  let selfReportCVD: SelfReportCVD | null = null;
  if (b.selfReportCVD !== null && b.selfReportCVD !== undefined) {
    if (typeof b.selfReportCVD !== "string" || !SELF_REPORT_CVD.has(b.selfReportCVD)) return null;
    selfReportCVD = b.selfReportCVD as SelfReportCVD;
  }

  // Scores are recomputed server-side rather than trusted from the client, so
  // the stored aggregate can never disagree with the stored raw answers.
  let namingScore = 0;
  let rgScore = 0;
  let ybScore = 0;
  SWATCH_KEYS.forEach((key, i) => {
    if (namings[i] !== key) return;
    namingScore += 1;
    if (RG_KEYS.has(key)) rgScore += 1;
    else ybScore += 1;
  });

  return {
    session: sanitizeSession(b.session),
    ...(sanitizeTag(b.tag) ? { tag: sanitizeTag(b.tag)! } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    study: 1,
    condition: b.condition,
    viewChoice,
    viewOrder: orderParts.join("|"),
    confidence: b.confidence,
    viewRtMs: b.viewRtMs,
    choseStandard: viewChoice === "standard",
    choseAlien: viewChoice === "alien",
    choseRevised: viewChoice === "revised",
    choseCommon: viewChoice === "common",
    namings,
    namingScore,
    rgScore,
    ybScore,
    newColours: b.newColours as NewColours,
    choseNewPinksPurples: b.newColours === "pinks-purples",
    selfReportCVD,
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
  const key = `allen-colour-blind/${submission.session}/${id}.json`;

  await put(key, JSON.stringify(submission), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  return Response.json({ ok: true });
}
