"use client";

import { useMemo, useState } from "react";
import {
  LADDER_INSTRUCTIONS,
  LADDER_QUESTION,
  LADDER_QUESTION_SEVERE,
  MDD_LADDER,
  PUBLISHED,
  TRAUMA_INSTRUCTIONS,
  TRAUMA_INSTRUCTIONS_SEVERE,
  TRAUMA_SCALE_LABELS,
  TRAUMA_STATEMENT,
  TRAUMA_VIGNETTES,
} from "./stimuli";
import type { PassData, PassOrder, Variant } from "./stimuli";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  vert: "#8C3A2E",
  horiz: "#4A6B4F",
  well: "#FAFAF9",
};

const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "52px 56px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
  },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#78716C",
    marginBottom: "12px",
  },
  h1: { fontSize: "34px", fontWeight: 400, lineHeight: 1.15, marginBottom: "28px", color: C.text },
  h2: { fontSize: "24px", fontWeight: 400, lineHeight: 1.2, marginBottom: "20px", color: C.text },
  body: { fontSize: "19px", lineHeight: 1.72, color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: 1.6, color: C.muted, marginBottom: "16px" },
  btn: {
    background: C.accent,
    color: C.bg,
    border: "none",
    padding: "13px 36px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "20px",
    display: "inline-block",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
  vignette: {
    fontSize: "18px",
    lineHeight: 1.72,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "22px 24px",
    marginBottom: "18px",
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function YesNo({ value, onPick }: { value: boolean | null; onPick: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {([true, false] as const).map((v) => {
        const on = value === v;
        return (
          <button
            key={String(v)}
            onClick={() => onPick(v)}
            aria-pressed={on}
            style={{
              flex: "1 1 0",
              padding: "12px 0",
              fontFamily: "'Space Mono', monospace",
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              background: on ? C.accent : C.well,
              color: on ? C.bg : C.text,
              border: `1px solid ${on ? C.accent : C.border}`,
            }}
          >
            {v ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Approximate percentile of a score within the published sample, assuming
 * normality: Φ((score − M) / SD) from the published mean and SD (see
 * PUBLISHED in stimuli.ts). An approximation — both distributions are
 * bounded and discrete — hence "about" in the debrief copy. Abramowitz &
 * Stegun 7.1.26 erf; |error| < 1.5e-7. Applies to the bare pass only:
 * the published samples answered the unmodified instruments.
 */
function normalPercentile(score: number, m: number, sd: number): number {
  const z = (score - m) / (sd * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-z * z);
  const cdf = 0.5 * (1 + (z < 0 ? -erf : erf));
  return Math.round(cdf * 100);
}

/** Draft state for the pass currently being answered. */
interface Draft {
  variant: Variant;
  ladderYes: (boolean | null)[];
  ladderShownAt: number | null;
  ladderRtMs: number;
  order: number[];
  tIdx: number;
  pageShownAt: number;
  ratings: { id: string; rating: number; position: number; rtMs: number }[];
}

function newDraft(variant: Variant): Draft {
  return {
    variant,
    ladderYes: [null, null, null, null, null],
    ladderShownAt: null,
    ladderRtMs: 0,
    order: shuffle(TRAUMA_VIGNETTES.map((_, i) => i)),
    tIdx: 0,
    pageShownAt: 0,
    ratings: [],
  };
}

function finishPass(d: Draft): PassData {
  const ladderYes = d.ladderYes.map((v) => v === true);
  return {
    ladderYes,
    ladderScore: ladderYes.filter(Boolean).length,
    ladderRtMs: d.ladderRtMs,
    trauma: d.ratings,
    traumaScore: d.ratings.reduce((a, r) => a + r.rating, 0),
  };
}

type Phase = "intro" | "ladder" | "break" | "trauma" | "round2" | "debrief";

export default function Experiment({
  session,
  tag = null,
}: {
  session: string;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Pass order assigned once, in the Begin click handler — never during
  // render (hydration safety).
  const [passOrder, setPassOrder] = useState<PassOrder | null>(null);
  const [passIdx, setPassIdx] = useState<0 | 1>(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [done, setDone] = useState<Partial<Record<Variant, PassData>>>({});
  const [picked, setPicked] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  const variantAt = (order: PassOrder, idx: 0 | 1): Variant =>
    (order === "bare-first") === (idx === 0) ? "bare" : "severe";

  const begin = (now: number, assigned: PassOrder) => {
    setPassOrder(assigned);
    setStartedAt(now);
    const d = newDraft(variantAt(assigned, 0));
    d.ladderShownAt = now;
    setDraft(d);
    setPhase("ladder");
  };

  const pickRung = (rung: number, v: boolean, now: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ladderYes: prev.ladderYes.map((x, i) => (i === rung ? v : x)) };
      if (prev.ladderShownAt !== null) next.ladderRtMs = now - prev.ladderShownAt;
      return next;
    });
  };

  const send = async (finalDone: Partial<Record<Variant, PassData>>) => {
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      passOrder,
      bare: finalDone.bare,
      severe: finalDone.severe,
    };
    try {
      const r = await fetch("/api/experiments/concept-breadth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(r.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
    setPhase("debrief");
    setSubmitting(false);
  };

  /* ----------------------------- INTRO ----------------------------- */
  if (phase === "intro" || passOrder === null || draft === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Concept breadth &middot; Two rounds</div>
          <h1 style={base.h1}>Applying concepts</h1>
          <p style={base.body}>
            You will read short descriptions of people and situations and make a series of quick
            judgments about them, in two rounds. It should take no more than ten minutes to
            complete. There are no right or wrong answers. We are interested in how{" "}
            <em>you</em>{" "}define or think about two concepts.
          </p>
          <p style={base.small}>
            Your answers are recorded anonymously. At the end you will see what the study is about,
            your judgments, and how they compare with the published version of these surveys.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => begin(Date.now(), Math.random() < 0.5 ? "bare-first" : "severe-first")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  const round = passIdx + 1;
  const variant = draft.variant;

  /* ------------------------ PART 1 — THE LADDER ------------------------ */
  if (phase === "ladder") {
    const ready = draft.ladderYes.every((v) => v !== null);
    const question = variant === "bare" ? LADDER_QUESTION : LADDER_QUESTION_SEVERE;
    return (
      <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Round {round} of 2 &middot; Part 1</div>
          <p style={base.body}>{LADDER_INSTRUCTIONS}</p>
          <p style={{ fontSize: "23px", lineHeight: 1.5, fontWeight: 700, color: C.text, marginBottom: "22px" }}>
            {question}
          </p>
          {MDD_LADDER.map((text, i) => (
            <div key={i} style={{ marginBottom: "22px" }}>
              <div style={base.vignette}>{text}</div>
              <YesNo value={draft.ladderYes[i]} onPick={(v) => pickRung(i, v, Date.now())} />
            </div>
          ))}
          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => setPhase("break")}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Please answer Yes or No for every person.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ----------------------------- BREAK ----------------------------- */
  if (phase === "break") {
    const instructions = variant === "bare" ? TRAUMA_INSTRUCTIONS : TRAUMA_INSTRUCTIONS_SEVERE;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Round {round} of 2 &middot; Part 2</div>
          <h2 style={base.h2}>Ten scenarios</h2>
          <p style={base.body}>{instructions}.</p>
          <p style={base.small}>
            Scenarios appear in random order. Rate each one on a six-point scale from{" "}
            &ldquo;strongly disagree&rdquo; to &ldquo;strongly agree&rdquo;.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setDraft((prev) => (prev ? { ...prev, pageShownAt: Date.now() } : prev));
              setPhase("trauma");
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------ PART 2 — TRAUMA ------------------------ */
  if (phase === "trauma") {
    const v = TRAUMA_VIGNETTES[draft.order[draft.tIdx]];
    const isLastPage = draft.tIdx === draft.order.length - 1;
    const isLastPass = passIdx === 1;
    const advance = () => {
      if (picked === null) return;
      const rec = {
        id: v.id,
        rating: picked,
        position: draft.tIdx,
        rtMs: Date.now() - draft.pageShownAt,
      };
      const ratings = [...draft.ratings, rec];
      setPicked(null);
      if (!isLastPage) {
        setDraft({ ...draft, ratings, tIdx: draft.tIdx + 1, pageShownAt: Date.now() });
        return;
      }
      const completed = finishPass({ ...draft, ratings });
      const nextDone = { ...done, [variant]: completed };
      setDone(nextDone);
      if (isLastPass) {
        void send(nextDone);
      } else {
        setPhase("round2");
      }
    };
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>
            Round {round} of 2 &middot; Part 2 &middot; Scenario {draft.tIdx + 1} of{" "}
            {draft.order.length}
          </div>
          <div style={{ ...base.vignette, marginBottom: "24px" }}>{v.text}</div>
          <p style={{ fontSize: "21px", lineHeight: 1.5, fontWeight: 700, color: C.text, marginBottom: "14px" }}>
            {TRAUMA_STATEMENT[variant]}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {TRAUMA_SCALE_LABELS.map((label, i) => {
              const val = i + 1;
              const on = picked === val;
              return (
                <button
                  key={val}
                  onClick={() => setPicked(val)}
                  aria-pressed={on}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textAlign: "left",
                    cursor: "pointer",
                    background: on ? C.accent : C.well,
                    color: on ? C.bg : C.text,
                    border: `1px solid ${on ? C.accent : C.border}`,
                  }}
                >
                  <span style={{ width: "16px", textAlign: "right" }}>{val}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <button
            style={{
              ...base.btn,
              opacity: picked !== null ? 1 : 0.35,
              cursor: picked !== null ? "pointer" : "not-allowed",
            }}
            disabled={picked === null || submitting}
            onClick={advance}
          >
            {isLastPage && passIdx === 1 ? (submitting ? "Sending…" : "Finish →") : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------ ROUND 2 INTERSTITIAL ------------------------ */
  if (phase === "round2") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Round 2 of 2</div>
          <h2 style={base.h2}>The same examples again</h2>
          <p style={base.body}>
            Round 2 shows you the same descriptions as round 1, but with questions that are
            slightly different. Read each question carefully before answering.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              const d = newDraft(variantAt(passOrder, 1));
              d.ladderShownAt = Date.now();
              setDraft(d);
              setPassIdx(1);
              setPhase("ladder");
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------- DEBRIEF ---------------------------- */
  const bare = done.bare!;
  const severe = done.severe!;
  const bareTraumaMean = bare.traumaScore / TRAUMA_VIGNETTES.length;
  const severeTraumaMean = severe.traumaScore / TRAUMA_VIGNETTES.length;
  const ladderPct = normalPercentile(bare.ladderScore, PUBLISHED.mddDepth, PUBLISHED.mddDepthSd);
  const traumaPct = normalPercentile(bareTraumaMean, PUBLISHED.traumaItemMean, PUBLISHED.traumaItemSd);
  const ladderDelta = bare.ladderScore - severe.ladderScore;
  const traumaDelta = bareTraumaMean - severeTraumaMean;

  const scoreRow = (
    label: string,
    yours: string,
    published: string,
    pct: number | null,
    colour: string
  ) => (
    <div
      style={{
        borderLeft: `3px solid ${colour}`,
        background: C.well,
        padding: "16px 20px",
        marginBottom: "14px",
      }}
    >
      <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "17px", lineHeight: 1.65, color: C.body }}>
        Your score: <strong style={{ color: C.text }}>{yours}</strong>. {published}
        {pct !== null && (
          <>
            {" "}Your concept is broader than about{" "}
            <strong style={{ color: colour }}>{pct}%</strong>{" "}of the people in that study.
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Debrief</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <p style={base.body}>
          Psychologists led by Nick Haslam have argued that harm-related concepts like{" "}
          <em>trauma</em>{" "}and{" "}<em>mental disorder</em>{" "}have expanded their meanings over
          recent decades &mdash; a process they call{" "}<strong>concept creep</strong>. The two
          tasks you just did are based on the instruments Haslam&rsquo;s team built to measure how
          broad experimental participants&rsquo; versions of those concepts are, in the two
          dimensions they distinguish.
        </p>
        <p style={base.body}>
          Part 1 measured{" "}<strong style={{ color: C.vert }}>vertical extent</strong>: all five
          descriptions were examples of depression graded from most to least severe, and your score
          is how far down the severity scale you were willing to describe the case as a
          &ldquo;mental disorder&rdquo;. Part 2 measured{" "}
          <strong style={{ color: C.horiz }}>horizontal extent</strong>: how many of the ten
          different situations describing varieties of trauma and losses and setbacks you were
          willing to count as traumatic, and how strongly.
        </p>
        <p style={base.body}>
          You responded to the same examples twice, but with slightly different prompts. One
          prompt was exactly as published, and the other was slightly modified, by adding the
          word{" "}<strong>&ldquo;severe&rdquo;</strong>. The comparisons with the published
          samples below use your answers to the unmodified questions.
        </p>

        {scoreRow(
          "Part 1 · Vertical — the depression scale",
          `${bare.ladderScore} of 5 rungs`,
          `In the original US sample (N = 502), the average respondent said Yes to ${PUBLISHED.mddDepth} of these five descriptions, and ${Math.round(PUBLISHED.mddRung4Yes * 100)}% said Yes to the second-mildest one.`,
          ladderPct,
          C.vert
        )}
        {scoreRow(
          "Part 2 · Horizontal — the trauma scenarios",
          `${bare.traumaScore} of 60 (average ${bareTraumaMean.toFixed(1)} per scenario)`,
          `In the original US sample (N = 301), the average rating was ${PUBLISHED.traumaItemMean} per scenario on the same six-point scale.`,
          traumaPct,
          C.horiz
        )}

        <div
          style={{
            borderLeft: `3px solid ${C.text}`,
            background: C.well,
            padding: "16px 20px",
            marginBottom: "14px",
          }}
        >
          <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>
            The effect of adding one degree modifier
          </div>
          <div style={{ fontSize: "17px", lineHeight: 1.65, color: C.body }}>
            With &ldquo;severe&rdquo; in the question, you said Yes to{" "}
            <strong style={{ color: C.text }}>{severe.ladderScore} of 5</strong>{" "}rungs
            {ladderDelta !== 0 ? (
              <>
                {" "}&mdash; your threshold moved{" "}
                <strong style={{ color: C.vert }}>
                  {Math.abs(ladderDelta)} rung{Math.abs(ladderDelta) === 1 ? "" : "s"}{" "}
                  {ladderDelta > 0 ? "up the severity scale" : "down the severity scale"}
                </strong>
                .
              </>
            ) : (
              <>{" "}&mdash; the same as without it.</>
            )}{" "}
            Your average &ldquo;severely traumatic&rdquo; rating was{" "}
            <strong style={{ color: C.text }}>{severeTraumaMean.toFixed(1)}</strong>{" "}per scenario
            {Math.abs(traumaDelta) >= 0.05 ? (
              <>
                , {traumaDelta > 0 ? "lower" : "higher"} than your{" "}
                &ldquo;traumatic&rdquo; ratings by{" "}
                <strong style={{ color: C.horiz }}>{Math.abs(traumaDelta).toFixed(1)}</strong>{" "}
                points.
              </>
            ) : (
              <>, essentially unchanged.</>
            )}
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.vert }}>
            Your response could not be saved to the running totals. Everything above still works,
            but the live class results will not include you.
          </p>
        )}

        <div style={base.divider} />

        <h2 style={base.h2}>Where the materials come from</h2>
        <p style={base.body}>
          The depression scale is one of seven scales in Tse and Haslam&rsquo;s Concept
          Breadth&ndash;Vertical scale; the full experiment runs the same five-step design for
          bipolar disorder, anxiety, OCD, and more. The trauma scenarios are the complete Trauma
          subscale of McGrath and Haslam&rsquo;s Harm Concept Breadth Scale, which has parallel
          subscales for bullying, prejudice, and mental disorder. The unmodified versions are
          reproduced verbatim from the authors&rsquo; published materials (CC-BY), except that one
          person has been renamed; the
          &ldquo;severe&rdquo; versions are our modifications of them, and are not part of the
          original experiments. The authors&rsquo; studies found that people who score
          broadly on one harm concept tend to score broadly on the others, and that broader
          mental-disorder concepts predict self-diagnosis.
        </p>
        <p style={base.small}>
          One design note: this demonstration presents experimental probes twice &mdash; once as
          published and once with &ldquo;severe&rdquo; inserted, in an order chosen at random for
          each person &mdash; scores here are indicative, and not intended as a replication of
          either experiment.
        </p>

        <p style={base.small}>
          Tse, J. S. Y., &amp; Haslam, N. (2023). Individual differences in the expansiveness of
          mental disorder concepts: development and validation of concept breadth scales.{" "}
          <em>BMC Psychiatry</em>, 23, 718.{" "}
          <a href="https://doi.org/10.1186/s12888-023-05152-6" style={{ color: C.text }}>
            doi:10.1186/s12888-023-05152-6
          </a>
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          McGrath, M. J., &amp; Haslam, N. (2020). Development and validation of the Harm Concept
          Breadth Scale: Assessing individual differences in harm inflation.{" "}
          <em>PLoS ONE</em>, 15(8), e0237732.{" "}
          <a href="https://doi.org/10.1371/journal.pone.0237732" style={{ color: C.text }}>
            doi:10.1371/journal.pone.0237732
          </a>
        </p>
      </div>
    </div>
  );
}
