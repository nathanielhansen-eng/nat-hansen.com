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
    label: "badness (2nd-p)",
    question: (t) => `How bad or good is it for a person to be called ‘${t}’?`,
    low: "Bad",
    high: "Good",
  },
  bad1: {
    label: "badness (1st-p)",
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
