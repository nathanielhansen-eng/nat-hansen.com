// Shared stimuli + scoring for the reclaimed-slurs classroom survey, built for
// Shen-yi (Sam) Liao's class from Hansen & Liao's "Reclaiming Slurs Over
// Apparent Time" New Study 1 (Prolific pilot 2, N = 309 after exclusions).
// Question wording is verbatim from the Qualtrics export; the -50..50 scale and
// the composite (the mean of the four ratings) follow the pilot's .qmd. Pilot 2
// also asked about 'straight' and 'retarded'; this classroom version uses the four
// terms Sam picked.

export const SLUG = "reclaimed-slurs";

export const TERMS = ["queer", "autistic", "slutty", "basic"] as const;
export type Term = (typeof TERMS)[number];

export const MEASURES = ["bad2", "bad1", "offense", "valence"] as const;
export type Measure = (typeof MEASURES)[number];

export interface MeasureSpec {
  /** Label used in the pilot's figures. */
  label: string;
  /** Question with the term spliced in, verbatim from Qualtrics. */
  question: (term: string) => string;
  /** Anchor at -50 and at +50. */
  low: string;
  high: string;
}

export const MEASURE_SPECS: Record<Measure, MeasureSpec> = {
  bad2: {
    label: "badness 2nd-p",
    question: (t) => `How bad or good is it for a person to be called ‘${t}’?`,
    low: "Bad",
    high: "Good",
  },
  bad1: {
    label: "badness 1st-p",
    question: (t) => `How bad or good is it to call a person ‘${t}’?`,
    low: "Bad",
    high: "Good",
  },
  offense: {
    label: "offensiveness",
    question: (t) => `How offensive or inoffensive is the term ‘${t}’?`,
    low: "Offensive",
    high: "Inoffensive",
  },
  valence: {
    label: "negativity",
    question: (t) => `How negative or positive is the term ‘${t}’?`,
    low: "Negative",
    high: "Positive",
  },
};

export const SCALE_MIN = -50;
export const SCALE_MAX = 50;

export type Ratings = Record<Term, Record<Measure, number>>;

export interface Submission {
  session: string;
  /** Random per-participant id linking this record to their pilot record. */
  rid?: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  /** Block order the participant saw (counterbalanced at random). */
  blockOrder: Measure[];
  ratings: Ratings;
  /** Self-reported age in years; null when skipped. */
  age: number | null;
}

/** Composite pejorativeness: the mean of the four ratings (negative = more pejorative). */
export function composite(r: Record<Measure, number>): number {
  return (r.bad2 + r.bad1 + r.offense + r.valence) / 4;
}

export function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ *
 * Pilot block (new, not part of Hansen & Liao's studies), offered after
 * the replication's debrief (students continue at the instructor's
 * go-ahead):
 *   A. self vs other reference — "call yourself '___'" beside the
 *      replication's 1st-person "call a person '___'";
 *   B. in-group membership — optional LGBTQ+ and autistic/neurodivergent
 *      self-identification (the board suppresses any cell under
 *      MIN_CELL so a small class can't out anyone);
 *   plus, on the board only, a real-time table comparing sessions run
 *   with successive cohorts.
 * A random per-participant id (rid) links a pilot record to the same
 * person's replication record, so self-vs-other is a paired comparison.
 * ------------------------------------------------------------------ */

export const PILOT_SLUG = "reclaimed-slurs-pilot";
export const MIN_CELL = 5;

export const SELF_QUESTION = (t: string) => `How bad or good is it to call yourself ‘${t}’?`;

export const INGROUP_QUESTIONS = {
  lgbtq: { term: "queer" as Term, question: "Do you identify as LGBTQ+?", label: "LGBTQ+" },
  autistic: {
    term: "autistic" as Term,
    question: "Do you identify as autistic or neurodivergent?",
    label: "autistic / ND",
  },
} as const;
export type IngroupKey = keyof typeof INGROUP_QUESTIONS;
export type IngroupAnswer = "yes" | "no" | "na";

export interface PilotSubmission {
  session: string;
  rid: string;
  submittedAt: string;
  durationMs: number;
  self: Record<Term, number>;
  ingroup: Record<IngroupKey, IngroupAnswer>;
}
