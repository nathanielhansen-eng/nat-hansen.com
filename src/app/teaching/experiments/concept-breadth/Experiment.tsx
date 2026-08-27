"use client";

import { useMemo, useState } from "react";
import {
  LADDER_INSTRUCTIONS,
  LADDER_QUESTION,
  MDD_LADDER,
  PUBLISHED,
  TRAUMA_INSTRUCTIONS,
  TRAUMA_SCALE_LABELS,
  TRAUMA_VIGNETTES,
} from "./stimuli";

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
    color: C.muted,
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
 * Stegun 7.1.26 erf; |error| < 1.5e-7.
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

type Phase = "intro" | "ladder" | "break" | "trauma" | "debrief";

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

  // Part 1 — the ladder. Index 0 = most severe.
  const [ladderYes, setLadderYes] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [ladderShownAt, setLadderShownAt] = useState<number | null>(null);
  const [ladderRtMs, setLadderRtMs] = useState<number>(0);

  // Part 2 — the trauma vignettes, one per page in a per-participant order.
  // Assigned in the Begin handler, never during render (hydration safety).
  const [order, setOrder] = useState<number[] | null>(null);
  const [tIdx, setTIdx] = useState(0);
  const [pageShownAt, setPageShownAt] = useState<number>(0);
  const [ratings, setRatings] = useState<
    { id: string; rating: number; position: number; rtMs: number }[]
  >([]);
  const [picked, setPicked] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  const ladderScore = useMemo(() => ladderYes.filter((v) => v === true).length, [ladderYes]);
  const traumaScore = useMemo(() => ratings.reduce((a, r) => a + r.rating, 0), [ratings]);

  const begin = (now: number) => {
    setOrder(shuffle(TRAUMA_VIGNETTES.map((_, i) => i)));
    setStartedAt(now);
    setLadderShownAt(now);
    setPhase("ladder");
  };

  const pickRung = (rung: number, v: boolean, now: number) => {
    setLadderYes((prev) => prev.map((x, i) => (i === rung ? v : x)));
    if (ladderShownAt !== null) setLadderRtMs(now - ladderShownAt);
  };

  const send = async (finalRatings: typeof ratings) => {
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      ladderYes: ladderYes.map((v) => v === true),
      ladderScore: ladderYes.filter((v) => v === true).length,
      ladderRtMs,
      trauma: finalRatings,
      traumaScore: finalRatings.reduce((a, r) => a + r.rating, 0),
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
  if (phase === "intro" || order === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Concept breadth &middot; Two parts</div>
          <h1 style={base.h1}>Applying concepts</h1>
          <p style={base.body}>
            You will read fifteen short descriptions of people and situations and make a series of
            quick judgments about them. It should take no more than five minutes to complete. There
            are no right or wrong answers. We are interested in how{" "}
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
          <button style={base.btn} onClick={() => begin(Date.now())}>
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------- PART 1 — THE LADDER ----------------------- */
  if (phase === "ladder") {
    const ready = ladderYes.every((v) => v !== null);
    return (
      <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 1 of 2</div>
          <p style={base.body}>{LADDER_INSTRUCTIONS}</p>
          <p style={{ ...base.body, fontWeight: 600 }}>{LADDER_QUESTION}</p>
          {MDD_LADDER.map((text, i) => (
            <div key={i} style={{ marginBottom: "22px" }}>
              <div style={base.vignette}>{text}</div>
              <YesNo value={ladderYes[i]} onPick={(v) => pickRung(i, v, Date.now())} />
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
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 2 of 2</div>
          <h2 style={base.h2}>Ten scenarios</h2>
          <p style={base.body}>{TRAUMA_INSTRUCTIONS}.</p>
          <p style={base.small}>
            Scenarios appear in random order. Rate each one on a six-point scale from{" "}
            &ldquo;strongly disagree&rdquo; to &ldquo;strongly agree&rdquo;.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setPageShownAt(Date.now());
              setPhase("trauma");
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------- PART 2 — TRAUMA ----------------------- */
  if (phase === "trauma") {
    const v = TRAUMA_VIGNETTES[order[tIdx]];
    const isLast = tIdx === order.length - 1;
    const advance = () => {
      if (picked === null) return;
      const rec = {
        id: v.id,
        rating: picked,
        position: tIdx,
        rtMs: Date.now() - pageShownAt,
      };
      const next = [...ratings, rec];
      setRatings(next);
      setPicked(null);
      if (isLast) {
        void send(next);
      } else {
        setTIdx(tIdx + 1);
        setPageShownAt(Date.now());
      }
    };
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>
            Part 2 of 2 &middot; Scenario {tIdx + 1} of {order.length}
          </div>
          <div style={{ ...base.vignette, marginBottom: "24px" }}>{v.text}</div>
          <p style={{ ...base.small, marginBottom: "10px" }}>
            What happened to the person named in the scenario was traumatic.
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
            {isLast ? (submitting ? "Sending…" : "Finish →") : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------- DEBRIEF ---------------------------- */
  const traumaMean = traumaScore / TRAUMA_VIGNETTES.length;
  const ladderPct = normalPercentile(ladderScore, PUBLISHED.mddDepth, PUBLISHED.mddDepthSd);
  const traumaPct = normalPercentile(traumaMean, PUBLISHED.traumaItemMean, PUBLISHED.traumaItemSd);

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
          tasks you just did are the instruments his team built to measure how broad experimental
          participants&rsquo; versions of those concepts are, in the two dimensions they
          distinguish.
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

        {scoreRow(
          "Part 1 · Vertical — the depression scale",
          `${ladderScore} of 5 rungs`,
          `In the original US sample (N = 502), the average respondent said Yes to ${PUBLISHED.mddDepth} of these five descriptions, and ${Math.round(PUBLISHED.mddRung4Yes * 100)}% said Yes to the second-mildest one.`,
          ladderPct,
          C.vert
        )}
        {scoreRow(
          "Part 2 · Horizontal — the trauma scenarios",
          `${traumaScore} of 60 (average ${traumaMean.toFixed(1)} per scenario)`,
          `In the original US sample (N = 301), the average rating was ${PUBLISHED.traumaItemMean} per scenario on the same six-point scale.`,
          traumaPct,
          C.horiz
        )}

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
          subscales for bullying, prejudice, and mental disorder. Both are reproduced verbatim from
          the authors&rsquo; published materials (CC-BY). Their studies found that people who score
          broadly on one harm concept tend to score broadly on the others, and that broader
          mental-disorder concepts predict self-diagnosis.
        </p>
        <p style={base.small}>
          One design note: this demonstration presents one ladder and one subscale, back to back,
          with the scenarios in random order &mdash; scores here are indicative, and not intended
          as a replication of either experiment.
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
