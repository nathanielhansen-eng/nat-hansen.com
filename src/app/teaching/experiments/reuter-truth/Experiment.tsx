"use client";

import { useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  corr: "#8C3A2E",
  coh: "#4A6B4F",
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
  btnGhost: {
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.border}`,
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
    fontSize: "19px",
    lineHeight: 1.78,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "26px 28px",
    marginBottom: "32px",
  },
  qlabel: {
    fontSize: "17px",
    lineHeight: 1.5,
    color: C.text,
    marginBottom: "14px",
    display: "block",
  },
  qnum: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.14em",
    color: C.muted,
    marginRight: "10px",
  },
};

/* ------------------------------------------------------------------ *
 * Stimuli — verbatim from Reuter, K. & Brun, G. (2022), "Empirical
 * studies on truth and the project of re-engineering truth", Pacific
 * Philosophical Quarterly 103(3), 493–517.
 * "coherent" is the Study 1 version (answer coheres with the speaker's
 * beliefs but does not correspond to the facts); "incoherent" is the
 * Study 2 version (answer corresponds to the facts but is incoherent
 * with what the speaker had been told). Segments given as {d: "..."}
 * are the wording that differs between the two versions; they are
 * highlighted in the debrief comparison but rendered as plain text
 * during the task itself.
 * The Rolex vignette's "could show it to her" misgenders the anaphor —
 * it is John asking to be shown the watch — but the error is in the
 * published article, so it is kept verbatim and marked [sic].
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Scenario = "party" | "rolex";
type Answer = "true" | "false" | "notsure";
type YesNo = "yes" | "no";
type Order = "party-first" | "rolex-first";

interface Story {
  name: string;
  protagonist: string;
  truthQ: string;
  bkQ: string;
  correctQ: string;
  coherent: Seg[][];
  incoherent: Seg[][];
}

const STORIES: Record<Scenario, Story> = {
  party: {
    name: "The party",
    protagonist: "Robert",
    truthQ: "Was Robert’s answer true or false?",
    bkQ: "Did Robert answer the question to the best of his knowledge?",
    correctQ: "Was Robert’s answer correct?",
    coherent: [
      [
        "Anne and Robert go to a party late at night. On their way to the party, Anne asks Robert whether any of his friends are at the party. Robert answers that Jill is at the party, ",
        { d: "because Jill had told Robert a few hours before that she would go" },
        ". When they arrive at the party, it turns out that Jill had changed her plans, and actually ",
        { d: "is not" },
        " at the party.",
      ],
    ],
    incoherent: [
      [
        "Anne and Robert go to a party late at night. On their way to the party, Anne asks Robert whether any of his friends are at the party. Robert answers that Jill is at the party, ",
        {
          d: "although Robert had been told by Jill a few hours before that she would not go – a piece of information that Robert completely forgot in that moment",
        },
        ". When they arrive at the party, it turns out that Jill had changed her plans, and actually ",
        { d: "is" },
        " at the party.",
      ],
    ],
  },
  rolex: {
    name: "The Rolex",
    protagonist: "Maria",
    truthQ: "Was Maria’s answer true or false?",
    bkQ: "Did Maria answer the question to the best of her knowledge?",
    correctQ: "Was Maria’s answer correct?",
    coherent: [
      [
        "Maria is a watch collector. She keeps all her watches in a safe and knows her collection really well. One day, her friend John asks her, whether she has a 1990 Rolex Submariner in her safe and, if so, could show it to her [sic]. Maria answers that she ",
        { d: "has got" },
        " a 1990 Rolex Submariner in her safe",
        { d: ". After all, she had purchased that watch a few years ago." },
        " When Maria opens the safe a little later, she finds out that a burglar has stolen several watches, among them the 1990 Rolex Submariner.",
      ],
    ],
    incoherent: [
      [
        "Maria is a watch collector. She keeps all her watches in a safe and knows her collection really well. One day, her friend John asks her, whether she has a 1990 Rolex Submariner in her safe and, if so, could show it to her [sic]. Maria answers that she ",
        { d: "has not got" },
        " a 1990 Rolex Submariner in her safe",
        {
          d: ", despite the fact that Maria purchased that watch a few years ago – a piece of information that Maria completely forgot in that moment.",
        },
        " When Maria opens the safe a little later, she finds out that a burglar has stolen several watches, among them the 1990 Rolex Submariner.",
      ],
    ],
  },
};

/** Published percentages from Reuter & Brun (2022) for the debrief. */
const PAPER = {
  part1: { party: 59.6, rolex: 56.8 }, // % answering "true" (Study 1)
  part2: { party: 65.2, rolex: 35.4 }, // % answering "true" (Study 2)
  part3: { direct: 71.1, afterControl: 51.1, correctYes: 44.7 }, // Study 3, Rolex
};

function Paras({ paras, mark }: { paras: Seg[][]; mark: boolean }) {
  return (
    <>
      {paras.map((segs, i) => (
        <p key={i} style={{ margin: i === paras.length - 1 ? 0 : "0 0 16px" }}>
          {segs.map((seg, j) =>
            typeof seg === "string" ? (
              <span key={j}>{seg}</span>
            ) : mark ? (
              <strong key={j} style={{ fontWeight: 600, color: "inherit", background: "#E7E5E4" }}>
                {seg.d}
              </strong>
            ) : (
              <span key={j}>{seg.d}</span>
            )
          )}
        </p>
      ))}
    </>
  );
}

function AnswerButtons({
  value,
  onPick,
}: {
  value: Answer | null;
  onPick: (v: Answer) => void;
}) {
  const opts: { key: Answer; label: string }[] = [
    { key: "true", label: "True" },
    { key: "false", label: "False" },
    { key: "notsure", label: "Not sure" },
  ];
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {opts.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            aria-pressed={on}
            style={{
              flex: "1 1 0",
              padding: "14px 0",
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
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function YesNoButtons({
  value,
  onPick,
}: {
  value: YesNo | null;
  onPick: (v: YesNo) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {(["yes", "no"] as const).map((v) => {
        const on = value === v;
        return (
          <button
            key={v}
            onClick={() => onPick(v)}
            aria-pressed={on}
            style={{
              flex: "1 1 0",
              padding: "14px 0",
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
            {v === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

type Phase = "intro" | "part1" | "break1" | "part2" | "break2" | "part3" | "debrief";

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
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [order, setOrder] = useState<Order | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [part1ShownAt, setPart1ShownAt] = useState<number | null>(null);
  const [part2ShownAt, setPart2ShownAt] = useState<number | null>(null);
  const [part1Answer, setPart1Answer] = useState<Answer | null>(null);
  const [part2Answer, setPart2Answer] = useState<Answer | null>(null);
  const [part1RtMs, setPart1RtMs] = useState<number | null>(null);
  const [part2RtMs, setPart2RtMs] = useState<number | null>(null);
  const [bestKnowledge, setBestKnowledge] = useState<YesNo | null>(null);
  const [correct, setCorrect] = useState<YesNo | null>(null);
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [cmpStory, setCmpStory] = useState<Scenario>("party");
  const [cmpVersion, setCmpVersion] = useState<"coherent" | "incoherent">("coherent");

  const begin = (now: number, assigned: Order) => {
    setOrder(assigned);
    setCmpStory(assigned === "party-first" ? "party" : "rolex");
    setStartedAt(now);
    setPart1ShownAt(now);
    setPhase("part1");
  };

  // `now` is read in the click handler and passed in, so nothing impure runs during render.
  const choosePart1 = (v: Answer, now: number) => {
    if (part1ShownAt !== null && part1RtMs === null) setPart1RtMs(now - part1ShownAt);
    setPart1Answer(v);
  };
  const choosePart2 = (v: Answer, now: number) => {
    if (part2ShownAt !== null && part2RtMs === null) setPart2RtMs(now - part2ShownAt);
    setPart2Answer(v);
  };

  const send = async () => {
    if (submitting) return;
    setSubmitting(true);
    const s1: Scenario = order === "rolex-first" ? "rolex" : "party";
    const s2: Scenario = s1 === "party" ? "rolex" : "party";
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      order,
      part1Scenario: s1,
      part1Answer,
      part1RtMs: part1RtMs ?? 0,
      part2Scenario: s2,
      part2Answer,
      part2RtMs: part2RtMs ?? 0,
      part3BestKnowledge: bestKnowledge,
      part3Correct: correct,
      part3Explanation: explanation.trim().slice(0, 2000),
    };
    try {
      const r = await fetch("/api/experiments/reuter-truth", {
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
  // `order === null` can only happen before "Begin", so this also serves as the
  // type narrowing that lets every later phase treat the assignment as settled.
  if (phase === "intro" || order === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Reuter &amp; Brun &middot; Three parts</div>
          <h1 style={base.h1}>Is it true?</h1>
          <p style={base.body}>
            You will read two short stories and answer a handful of questions about what someone
            says in them. There are three brief parts; the whole thing takes two or three minutes.
            There are no right answers &mdash; this is a study of how people ordinarily use a very
            common word.
          </p>
          <p style={base.small}>
            The order of the stories is assigned at random. Your answers are recorded anonymously
            &mdash; no name, no login, nothing that identifies you. At the end you will see what the
            study is about and the original published results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => begin(Date.now(), Math.random() < 0.5 ? "party-first" : "rolex-first")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const s1: Scenario = order === "rolex-first" ? "rolex" : "party";
  const s2: Scenario = s1 === "party" ? "rolex" : "party";
  const S1 = STORIES[s1];
  const S2 = STORIES[s2];

  /* ----------------------------- PART 1 ----------------------------- */
  if (phase === "part1") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 1 of 3 &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={S1.coherent} mark={false} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              {S1.truthQ}
            </span>
            <AnswerButtons value={part1Answer} onPick={(v) => choosePart1(v, Date.now())} />
          </div>

          <button
            style={{
              ...base.btn,
              opacity: part1Answer ? 1 : 0.35,
              cursor: part1Answer ? "pointer" : "not-allowed",
            }}
            disabled={!part1Answer}
            onClick={() => setPhase("break1")}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- BREAK 1 ----------------------------- */
  if (phase === "break1") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 2 of 3</div>
          <h2 style={base.h2}>A different story</h2>
          <p style={base.body}>
            The next story is about a different situation and a different speaker. It may remind
            you of the first one in places &mdash; read it carefully, because the details matter.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setPart2ShownAt(Date.now());
              setPhase("part2");
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- PART 2 ----------------------------- */
  if (phase === "part2") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 2 of 3 &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={S2.incoherent} mark={false} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q2</span>
              {S2.truthQ}
            </span>
            <AnswerButtons value={part2Answer} onPick={(v) => choosePart2(v, Date.now())} />
          </div>

          <button
            style={{
              ...base.btn,
              opacity: part2Answer ? 1 : 0.35,
              cursor: part2Answer ? "pointer" : "not-allowed",
            }}
            disabled={!part2Answer}
            onClick={() => setPhase("break2")}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- BREAK 2 ----------------------------- */
  if (phase === "break2") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 3 of 3</div>
          <h2 style={base.h2}>Back to the first story</h2>
          <p style={base.body}>
            Finally, three follow-up questions about the <em>first</em>{" "}story you read. It is shown
            again on the next screen so you don&rsquo;t have to rely on memory.
          </p>
          <button style={base.btn} onClick={() => setPhase("part3")}>
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- PART 3 ----------------------------- */
  if (phase === "part3") {
    const ready = bestKnowledge !== null && correct !== null;
    return (
      <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 3 of 3 &middot; The first story again</div>

          <div style={{ ...base.vignette, fontSize: "17px", lineHeight: 1.7 }}>
            <Paras paras={S1.coherent} mark={false} />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q3</span>
              {S1.bkQ}
            </span>
            <YesNoButtons value={bestKnowledge} onPick={setBestKnowledge} />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q4</span>
              {S1.correctQ}
            </span>
            <YesNoButtons value={correct} onPick={setCorrect} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q5</span>
              In Part 1 you said {S1.protagonist}&rsquo;s answer was{" "}
              <strong>
                {part1Answer === "notsure" ? "not sure" : part1Answer === "true" ? "true" : "false"}
              </strong>
              . In a sentence or two, why?
            </span>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Optional, but the explanations are the most interesting part of the class data."
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${C.border}`,
                background: C.well,
                padding: "12px 14px",
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: "17px",
                lineHeight: 1.6,
                color: C.text,
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready || submitting}
            onClick={send}
          >
            {submitting ? "Sending…" : "Submit →"}
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Answer Q3 and Q4 to submit. The written explanation is optional.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------------------------- DEBRIEF ---------------------------- */
  // Which theory each of your answers lines up with. Part 1's answer was
  // coherent-but-not-corresponding, Part 2's corresponding-but-incoherent,
  // so "true" flips its allegiance between the parts.
  const reading = (part: 1 | 2, a: Answer | null): { label: string; colour: string } => {
    if (a === null || a === "notsure") return { label: "neither reading", colour: C.muted };
    const coherentist = part === 1 ? a === "true" : a === "false";
    return coherentist
      ? { label: "the coherence reading", colour: C.coh }
      : { label: "the correspondence reading", colour: C.corr };
  };
  const r1 = reading(1, part1Answer);
  const r2 = reading(2, part2Answer);
  const cmpS = STORIES[cmpStory];

  const bar = (label: string, pct: number, colour: string) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
      <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "110px" }}>{label}</span>
      <span style={{ flex: 1, height: "10px", background: "#E7E5E4", display: "block" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: colour }} />
      </span>
      <span style={{ ...base.mono, fontSize: "14px", color: C.text, width: "52px", textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );

  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Debrief</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <p style={base.body}>
          Both stories pull two things apart that usually travel together. In the first story,{" "}
          {S1.protagonist}&rsquo;s answer fit perfectly with everything {s1 === "party" ? "he" : "she"}{" "}
          had been told &mdash; but it didn&rsquo;t match the facts. In the second, {S2.protagonist}
          &rsquo;s answer matched the facts &mdash; but clashed with everything{" "}
          {s2 === "party" ? "he" : "she"}{" "}had been told. On the{" "}
          <strong style={{ color: C.corr }}>correspondence</strong>{" "}view, a statement is true just
          in case it fits reality. On the <strong style={{ color: C.coh }}>coherence</strong>{" "}view,
          it is true just in case it hangs together with the relevant body of beliefs. Your two
          truth judgments quietly took sides.
        </p>

        <div
          style={{
            borderLeft: `3px solid ${C.border}`,
            background: C.well,
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontSize: "17px", lineHeight: 1.7, color: C.body }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", color: C.muted }}>PART 1</span>{" "}
              You called {S1.protagonist}&rsquo;s answer{" "}
              <strong style={{ color: C.text }}>
                {part1Answer === "notsure" ? "not sure" : part1Answer}
              </strong>{" "}
              &mdash; in line with <strong style={{ color: r1.colour }}>{r1.label}</strong>.
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", color: C.muted }}>PART 2</span>{" "}
              You called {S2.protagonist}&rsquo;s answer{" "}
              <strong style={{ color: C.text }}>
                {part2Answer === "notsure" ? "not sure" : part2Answer}
              </strong>{" "}
              &mdash; in line with <strong style={{ color: r2.colour }}>{r2.label}</strong>.
            </div>
            <div>
              <span style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", color: C.muted }}>PART 3</span>{" "}
              You said {S1.protagonist}{" "}answered to the best of {s1 === "party" ? "his" : "her"}{" "}
              knowledge: <strong style={{ color: C.text }}>{bestKnowledge}</strong>; and that the
              answer was correct: <strong style={{ color: C.text }}>{correct}</strong>.
            </div>
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.corr }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The four vignettes</h2>
        <p style={base.small}>
          Each story exists in two versions, and the class read all four between them. Switch below
          &mdash; the differing wording is highlighted.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          {(["party", "rolex"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setCmpStory(s)}
              aria-pressed={cmpStory === s}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmpStory === s ? C.surface : C.well,
                color: cmpStory === s ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmpStory === s ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              }}
            >
              {STORIES[s].name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(
            [
              ["coherent", "Coherent, not corresponding", C.coh],
              ["incoherent", "Corresponding, not coherent", C.corr],
            ] as const
          ).map(([v, label, colour]) => (
            <button
              key={v}
              onClick={() => setCmpVersion(v)}
              aria-pressed={cmpVersion === v}
              style={{
                flex: "1 1 0",
                padding: "11px 4px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmpVersion === v ? C.surface : C.well,
                color: cmpVersion === v ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmpVersion === v ? `2px solid ${colour}` : `1px solid ${C.border}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "16px" }}>
          <Paras paras={cmpS[cmpVersion]} mark />
        </div>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          You read {S1.name.toLowerCase()} in its coherent version (Part 1) and{" "}
          {S2.name.toLowerCase()} in its non-coherent version (Part 2), so no story appeared twice.
          In the original studies each participant read exactly one version of one story.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>What Reuter and Brun found</h2>
        <p style={base.small}>
          Percent calling the answer &lsquo;true&rsquo;, online samples. If people simply meant
          correspondence by &lsquo;true&rsquo;, the coherent-but-false answers should be called
          &lsquo;true&rsquo; by almost no one.
        </p>
        <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, margin: "18px 0 10px" }}>
          Study 1 &middot; coherent, not corresponding
        </div>
        {bar("Party", PAPER.part1.party, C.coh)}
        {bar("Rolex", PAPER.part1.rolex, C.coh)}
        <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, margin: "18px 0 10px" }}>
          Study 2 &middot; corresponding, not coherent
        </div>
        {bar("Party", PAPER.part2.party, C.corr)}
        {bar("Rolex", PAPER.part2.rolex, C.corr)}
        <p style={{ ...base.small, marginTop: "14px" }}>
          Neither theory&rsquo;s prediction held. Up to 70% of participants counted a statement that
          failed to match the facts as &lsquo;true&rsquo;, and responses split close to 50/50 in
          most conditions &mdash; with very few &lsquo;not sure&rsquo; answers. Reuter and Brun read
          this as evidence that &lsquo;true&rsquo; is <em>ambiguous</em>{" "}in everyday talk between a
          correspondence and a coherence sense, echoing Tarski&rsquo;s remark that the everyday word
          &lsquo;true&rsquo; is &ldquo;certainly not unambiguous&rdquo;.
        </p>

        <h2 style={{ ...base.h2, marginTop: "32px" }}>Part 3 — or did you just mean she was honest?</h2>
        <p style={base.body}>
          The obvious objection: people who said &lsquo;true&rsquo; weren&rsquo;t reporting a
          coherence notion of truth at all &mdash; they substituted an easier question, about
          whether Maria was <em>truthful</em>, or justified, or whether the answer was &lsquo;true
          for her&rsquo;. Study 3 tested this. Asked directly,{" "}
          <strong>{PAPER.part3.direct}%</strong>{" "}called Maria&rsquo;s coherent answer true. When
          the best-of-knowledge question was asked <em>first</em>{" "}&mdash; soaking up the
          truthfulness reading, as in your Part 3 &mdash; that dropped to{" "}
          <strong>{PAPER.part3.afterControl}%</strong>, yet still half the sample said
          &lsquo;true&rsquo;. And only <strong>{PAPER.part3.correctYes}%</strong>{" "}would call the
          answer &lsquo;correct&rsquo;. So substitution explains some coherentist answers, but not
          all of them. The written explanations pointed the same way: &lsquo;It was true based on
          the information she had at the time.&rsquo;
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          If &lsquo;true&rsquo; really is ambiguous, then fact-checking alone cannot settle
          everyday disputes about what is true &mdash; two sides may be using different senses of
          the word, and someone who calls a coherent falsehood &lsquo;true&rsquo; is not thereby a
          liar or a fool. Reuter and Brun argue this makes truth a candidate for{" "}
          <em>conceptual re-engineering</em>: deciding whether public discourse would go better
          with one repaired concept, a two-dimensional one, or two explicitly distinguished
          concepts of truth.
        </p>
        <p style={base.small}>
          One design note: in the original, every comparison was between participants &mdash;
          nobody saw more than one vignette or answered more than one probe first. Your class ran
          the three studies back-to-back within each person, so order effects are possible; treat
          the class data as a structured variant, not an exact replication.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Reuter, K., &amp; Brun, G. (2022). Empirical studies on truth and the project of
          re-engineering truth. <em>Pacific Philosophical Quarterly</em>{" "}103(3), 493&ndash;517.{" "}
          <a href="https://doi.org/10.1111/papq.12370" style={{ color: C.text }}>
            doi:10.1111/papq.12370
          </a>
        </p>
      </div>
    </div>
  );
}
