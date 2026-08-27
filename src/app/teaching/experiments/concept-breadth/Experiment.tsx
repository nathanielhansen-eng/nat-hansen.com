"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Pool aggregates served by the public summary endpoint. */
interface PoolSummary {
  n: number;
  ladderScoreHist: number[];
  traumaScoreHist: number[];
}

/** Midrank percentile of `score` within a histogram whose bucket i starts at `offset + i`. */
function percentile(hist: number[], offset: number, score: number): number | null {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total < 1) return null;
  const idx = score - offset;
  let below = 0;
  for (let i = 0; i < hist.length && i < idx; i++) below += hist[i];
  const ties = idx >= 0 && idx < hist.length ? hist[idx] : 0;
  return Math.round(((below + ties / 2) / total) * 100);
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
  const [pool, setPool] = useState<PoolSummary | null>(null);

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

  // The debrief compares you with everyone who has taken it before; fetched
  // once, aggregate-only, after submission.
  useEffect(() => {
    if (phase !== "debrief") return;
    let cancelled = false;
    fetch("/api/experiments/concept-breadth/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.ok || !d.pool) return;
        setPool(d.pool as PoolSummary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [phase]);

  /* ----------------------------- INTRO ----------------------------- */
  if (phase === "intro" || order === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Concept breadth &middot; Two parts</div>
          <h1 style={base.h1}>Where do the concepts stop?</h1>
          <p style={base.body}>
            You will read short descriptions of people and situations and make a series of quick
            judgments about them &mdash; fifteen in all, taking three or four minutes. There are no
            right or wrong answers. We are interested in your personal opinions: how{" "}
            <em>you</em>{" "}define or think about two very common concepts.
          </p>
          <p style={base.small}>
            Your answers are recorded anonymously &mdash; no name, no login, nothing that identifies
            you. At the end you will see what the study is about, your own scores, and how they
            compare with everyone who has answered before you.
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
          <h2 style={base.h2}>Ten short scenarios</h2>
          <p style={base.body}>{TRAUMA_INSTRUCTIONS}.</p>
          <p style={base.small}>
            Each scenario appears on its own page, in a random order. Rate each one on a six-point
            scale from &ldquo;strongly disagree&rdquo; to &ldquo;strongly agree&rdquo;.
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
  const ladderPct = pool ? percentile(pool.ladderScoreHist, 0, ladderScore) : null;
  const traumaPct = pool ? percentile(pool.traumaScoreHist, 10, traumaScore) : null;
  const poolBig = (pool?.n ?? 0) >= 10;

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
        {poolBig && pct !== null && (
          <>
            {" "}Your concept is broader than about{" "}
            <strong style={{ color: colour }}>{pct}%</strong>{" "}of the people who have taken this
            before you.
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
          tasks you just did are the instruments his team built to measure how broad{" "}
          <em>your</em>{" "}versions of those concepts are, in the two directions they distinguish.
        </p>
        <p style={base.body}>
          Part 1 measured{" "}<strong style={{ color: C.vert }}>vertical breadth</strong>: all five
          descriptions were the same condition &mdash; depression &mdash; graded from most to least
          severe, and your score is how far down the severity ladder you kept saying &ldquo;mental
          disorder&rdquo;. Part 2 measured{" "}
          <strong style={{ color: C.horiz }}>horizontal breadth</strong>: ten qualitatively
          different situations, from events that would satisfy a psychiatric manual&rsquo;s
          definition of a traumatic stressor to ordinary losses and setbacks, and your score is how
          many kinds of thing you counted as traumatic, and how strongly.
        </p>

        {scoreRow(
          "Part 1 · Vertical — the depression ladder",
          `${ladderScore} of 5 rungs`,
          `In the authors' US sample (N = 502), the average respondent said Yes to ${PUBLISHED.mddDepth} of these five descriptions, and ${Math.round(PUBLISHED.mddRung4Yes * 100)}% said Yes to the second-mildest one on its own.`,
          ladderPct,
          C.vert
        )}
        {scoreRow(
          "Part 2 · Horizontal — the trauma scenarios",
          `${traumaScore} of 60 (average ${traumaMean.toFixed(1)} per scenario)`,
          `In the authors' US sample (N = 301), the average rating was ${PUBLISHED.traumaItemMean} per scenario on the same six-point scale.`,
          traumaPct,
          C.horiz
        )}

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.vert }}>
            Your response could not be saved to the running totals. Everything above still works,
            but the comparison figures will not include you.
          </p>
        )}

        <div style={base.divider} />

        <h2 style={base.h2}>Where the materials come from</h2>
        <p style={base.body}>
          The depression ladder is one of seven such ladders in Tse and Haslam&rsquo;s Concept
          Breadth&ndash;Vertical scale; the full instrument runs the same five-step design for
          bipolar disorder, anxiety, OCD, and more. The trauma scenarios are the complete Trauma
          subscale of McGrath and Haslam&rsquo;s Harm Concept Breadth Scale, which has parallel
          subscales for bullying, prejudice, and mental disorder. Both are reproduced verbatim from
          the authors&rsquo; published materials (CC-BY). Their studies found that people who score
          broadly on one harm concept tend to score broadly on the others &mdash; and that broader
          mental-disorder concepts predict self-diagnosis, over and above how much distress a
          person reports.
        </p>
        <p style={base.small}>
          One design note: this demonstration presents one ladder and one subscale, back to back,
          with the scenarios in random order &mdash; scores here are indicative, not a validated
          administration of either full instrument.
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
