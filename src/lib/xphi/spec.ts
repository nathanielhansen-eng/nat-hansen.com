// Spec types for stimuli-driven vignette studies (roadmap Tier A), plus
// the server-side validator and generic class-summary summarizer for the
// standard payload those studies produce:
//
//   { session, tag?, submittedAt, durationMs, condition,
//     answers: { [qid]: number | string },   // likert → number, choice → option key
//     rts:     { [qid]: number },            // ms from task shown to first answer
//     background: string | null }
//
// Spec files are plain server-safe modules (no "use client") so the same
// object drives both the client <VignetteStudy> and the submit route's
// validation. First consumer: Beebe & Buckwalter (2010); expect the spec
// surface to flex a little when that lands.

import type { ReactNode } from "react";
import type { Seg } from "./vignette";
import { mean } from "./stats";

export interface ConditionDef {
  key: string;
  /** Shown in the debrief comparison tabs and the "your condition" box. */
  label: string;
  colour: string;
  paras: Seg[][];
}

/** A per-condition string: either one string for all conditions or a map
 *  keyed by condition (Knobe's blame/praise wording). */
export type CondText = string | Record<string, string>;

export function condText(t: CondText | undefined, cond: string): string {
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t[cond] ?? "");
}

export type QuestionDef =
  | {
      kind: "likert";
      id: string;
      prompt: CondText;
      min: number;
      max: number;
      lo: CondText;
      hi: CondText;
    }
  | {
      kind: "choice";
      id: string;
      prompt: CondText;
      options: { key: string; label: string }[];
    };

export interface BackgroundDef {
  eyebrow?: string;
  heading: string;
  small?: ReactNode;
  options: { key: string; label: string }[];
}

export interface PaperBar {
  label: string;
  pct: number;
  colour: string;
}

export interface DebriefDef {
  title: string;
  /** Body of the coloured your-answer box. */
  summary: (ctx: { condition: ConditionDef; answers: Record<string, number | string> }) => ReactNode;
  compareIntro?: ReactNode;
  /** Caveat under the comparison (stimulus-matching notes etc.). */
  comparisonNote?: ReactNode;
  paper?: { heading: string; intro?: ReactNode; bars: PaperBar[]; note?: ReactNode };
  sections?: { heading: string; body: ReactNode }[];
  citation: ReactNode;
}

export interface VignetteStudySpec {
  slug: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  introSmall?: ReactNode;
  taskEyebrow?: string;
  conditions: ConditionDef[];
  questions: QuestionDef[];
  background?: BackgroundDef;
  debrief: DebriefDef;
}

/* ----------------------- server-side validation ----------------------- */

/** The validation-relevant skeleton of a spec (no JSX, no colours). */
export interface SpecShape {
  conditions: string[];
  questions: (
    | { kind: "likert"; id: string; min: number; max: number }
    | { kind: "choice"; id: string; options: string[] }
  )[];
  backgroundOptions?: string[];
}

export function shapeOf(spec: VignetteStudySpec): SpecShape {
  return {
    conditions: spec.conditions.map((c) => c.key),
    questions: spec.questions.map((q) =>
      q.kind === "likert"
        ? { kind: "likert", id: q.id, min: q.min, max: q.max }
        : { kind: "choice", id: q.id, options: q.options.map((o) => o.key) }
    ),
    ...(spec.background ? { backgroundOptions: spec.background.options.map((o) => o.key) } : {}),
  };
}

export interface SpecSubmission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  condition: string;
  answers: Record<string, number | string>;
  rts: Record<string, number>;
  background: string | null;
}

/** Validate the standard spec-study payload against a shape. Uses the
 *  callers' sanitizers for session/tag so policies stay in one place. */
export function validateSpecSubmission(
  shape: SpecShape,
  body: unknown,
  sanitize: { session: (s: string) => string; tag: (v: unknown) => string | null }
): SpecSubmission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.session !== "string" || typeof b.submittedAt !== "string") return null;
  if (b.submittedAt.length > 40) return null;
  if (typeof b.durationMs !== "number" || !Number.isFinite(b.durationMs) || b.durationMs < 0)
    return null;
  if (typeof b.condition !== "string" || !shape.conditions.includes(b.condition)) return null;

  if (!b.answers || typeof b.answers !== "object") return null;
  if (!b.rts || typeof b.rts !== "object") return null;
  const answersIn = b.answers as Record<string, unknown>;
  const rtsIn = b.rts as Record<string, unknown>;

  const answers: Record<string, number | string> = {};
  const rts: Record<string, number> = {};
  for (const q of shape.questions) {
    const v = answersIn[q.id];
    if (q.kind === "likert") {
      if (typeof v !== "number" || !Number.isInteger(v) || v < q.min || v > q.max) return null;
      answers[q.id] = v;
    } else {
      if (typeof v !== "string" || !q.options.includes(v)) return null;
      answers[q.id] = v;
    }
    const rt = rtsIn[q.id];
    if (typeof rt !== "number" || !Number.isFinite(rt) || rt < 0) return null;
    rts[q.id] = rt;
  }

  let background: string | null = null;
  if (b.background !== null && b.background !== undefined) {
    if (
      typeof b.background !== "string" ||
      !shape.backgroundOptions ||
      !shape.backgroundOptions.includes(b.background)
    )
      return null;
    background = b.background;
  }

  const tag = sanitize.tag(b.tag);
  return {
    session: sanitize.session(b.session),
    ...(tag ? { tag } : {}),
    submittedAt: b.submittedAt,
    durationMs: b.durationMs,
    condition: b.condition,
    answers,
    rts,
    background,
  };
}

/* ------------------- generic class-summary aggregate ------------------- */

const tagOf = (s: Record<string, unknown>): string | null =>
  typeof s.tag === "string" && s.tag ? s.tag : null;

/** Condition × answer aggregate for a spec study: per condition, option
 *  counts for each choice question and means for each likert question.
 *  Records carry only condition, answers, and tag — never free text or
 *  background. */
export function summarizeSpecStudy(shape: SpecShape, submissions: Record<string, unknown>[]) {
  const valid = submissions.filter(
    (s) =>
      typeof s.condition === "string" &&
      shape.conditions.includes(s.condition) &&
      !!s.answers &&
      typeof s.answers === "object"
  );
  const records = valid.map((s) => {
    const answersIn = s.answers as Record<string, unknown>;
    const answers: Record<string, number | string> = {};
    for (const q of shape.questions) {
      const v = answersIn[q.id];
      if (q.kind === "likert" && typeof v === "number") answers[q.id] = v;
      if (q.kind === "choice" && typeof v === "string" && q.options.includes(v)) answers[q.id] = v;
    }
    return { condition: s.condition as string, answers, tag: tagOf(s) };
  });

  const byCondition = Object.fromEntries(
    shape.conditions.map((cond) => {
      const rows = records.filter((r) => r.condition === cond);
      const questions = Object.fromEntries(
        shape.questions.map((q) => {
          if (q.kind === "likert") {
            const vals = rows
              .map((r) => r.answers[q.id])
              .filter((v): v is number => typeof v === "number");
            return [q.id, { n: vals.length, mean: mean(vals) }];
          }
          const counts = Object.fromEntries(
            q.options.map((o) => [o, rows.filter((r) => r.answers[q.id] === o).length])
          );
          return [q.id, { n: rows.filter((r) => q.id in r.answers).length, counts }];
        })
      );
      return [cond, { n: rows.length, questions }];
    })
  );

  return { records, aggregate: { n: records.length, byCondition } };
}
