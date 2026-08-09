"use client";

import { useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  c1: "#8C3A2E",
  c2: "#4A6B4F",
  well: "#FDFAF5",
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
 * Stimuli — verbatim from Nadelhoffer, T. (2006), "Bad Acts,
 * Blameworthy Agents, and Intentional Actions: Some Problems for Juror
 * Impartiality", Philosophical Explorations 9(2), 203–219 (pp. 209–210).
 * The two conditions are the paper's own between-subjects "Smith study",
 * modelled on D.P.P. v. Smith [1961]. Segments given as {d: "..."} are
 * the role words (agent / victim) that carry the manipulation; they are
 * highlighted in the debrief comparison but rendered as plain text
 * during the task itself.
 *
 * NOTE ON DESIGN: unlike a clean Knobe-style minimal pair, C1 and C2
 * differ in MORE than one variable at once — the agent (thief vs.
 * innocent driver) AND the victim (police officer vs. attempted
 * carjacker) both change. The design is therefore confounded, and
 * Nadelhoffer says so himself (p. 210). This is the pedagogical point of
 * the debrief, not an oversight.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "C1" | "C2";

interface Version {
  /** Short human label for the toggle / summary. */
  label: string;
  agent: string;
  victim: string;
  paras: Seg[][];
  q1: string; // knowingly
  q2: string; // intentionally
  q3: string; // blame
  lo: string;
  hi: string;
}

const VERSIONS: Record<Condition, Version> = {
  C1: {
    label: "Thief kills officer",
    agent: "thief",
    victim: "officer",
    paras: [
      [
        "Imagine that a ",
        { d: "thief" },
        " is driving a car full of recently stolen goods. While he is waiting at a red light, a ",
        { d: "police officer" },
        " comes up to the window of the car while brandishing a gun. When he sees the ",
        { d: "officer" },
        ", the ",
        { d: "thief" },
        " speeds off through the intersection. Amazingly, the ",
        { d: "officer" },
        " manages to hold on to the side of the car as it speeds off. The ",
        { d: "thief" },
        " swerves in a zigzag fashion in the hope of escaping—knowing full well that doing so places the ",
        { d: "officer" },
        " in grave danger. But the ",
        { d: "thief" },
        " doesn’t care; he just wants to get away. Unfortunately for the ",
        { d: "officer" },
        ", the ",
        { d: "thief" },
        "’s attempt to shake him off is successful. As a result, the ",
        { d: "officer" },
        " rolls into oncoming traffic and sustains fatal injuries. He dies minutes later.",
      ],
    ],
    q1: "Did the thief knowingly bring about the officer’s death?",
    q2: "Did the thief intentionally bring about the officer’s death?",
    q3: "How much blame does the thief deserve for the death of the officer?",
    lo: "0 — no blame",
    hi: "6 — a lot of blame",
  },
  C2: {
    label: "Driver kills carjacker",
    agent: "driver",
    victim: "thief",
    paras: [
      [
        "Imagine that a ",
        { d: "man" },
        " is waiting in his car at a red light. Suddenly, a ",
        { d: "car thief" },
        " approaches his window while brandishing a gun. When he sees the ",
        { d: "thief" },
        ", the ",
        { d: "driver" },
        " panics and speeds off through the intersection. Amazingly, the ",
        { d: "thief" },
        " manages to hold on to the side of the car as it speeds off. The ",
        { d: "driver" },
        " swerves in a zigzag fashion in the hope of escaping—knowing full well that doing so places the ",
        { d: "thief" },
        " in grave danger. But the ",
        { d: "driver" },
        " doesn’t care; he just wants to get away. Unfortunately for the ",
        { d: "thief" },
        ", the ",
        { d: "driver" },
        "’s attempt to shake him off is successful. As a result, the ",
        { d: "thief" },
        " rolls into oncoming traffic and sustains fatal injuries. He dies minutes later.",
      ],
    ],
    q1: "Did the driver knowingly bring about the thief’s death?",
    q2: "Did the driver intentionally bring about the thief’s death?",
    q3: "How much blame does the driver deserve for the death of the thief?",
    lo: "0 — no blame",
    hi: "6 — a lot of blame",
  },
};

/** Published results of Nadelhoffer's (2006) Smith study (N = 126, ~63 per cell,
 *  pp. 209–210). No comprehension or manipulation checks were reported. */
const ORIG = {
  n: 126,
  perCell: 63,
  C1: { knowingly: 75, intentionally: 37, blame: 5.11 },
  C2: { knowingly: 51, intentionally: 10, blame: 2.01 },
  chiKnow: { chi: "7.62", p: "< .01" },
  chiInt: { chi: "12.94", p: "< .001" },
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
              <strong key={j} style={{ fontWeight: 600, color: "inherit", background: "#F0E8D8" }}>
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

type Phase = "intro" | "task" | "background" | "debrief";
type Prior = "none" | "some" | "extensive";

export default function Experiment({
  session,
  study,
  tag = null,
}: {
  session: string;
  /** Only one study exists; kept for parity with the other experiments. */
  study: 1;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [condition, setCondition] = useState<Condition | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [taskShownAt, setTaskShownAt] = useState<number | null>(null);
  const [knowingly, setKnowingly] = useState<boolean | null>(null);
  const [intentional, setIntentional] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [knowinglyRtMs, setKnowinglyRtMs] = useState<number | null>(null);
  const [intentRtMs, setIntentRtMs] = useState<number | null>(null);
  const [ratingRtMs, setRatingRtMs] = useState<number | null>(null);
  const [prior, setPrior] = useState<Prior | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [compare, setCompare] = useState<Condition | null>(null);

  const startTask = (now: number, assigned: Condition) => {
    setCondition(assigned);
    setCompare(assigned);
    setStartedAt(now);
    setTaskShownAt(now);
    setPhase("task");
  };

  // `now` is read in the click handler and passed in, so nothing impure runs during render.
  const chooseKnowingly = (v: boolean, now: number) => {
    if (taskShownAt !== null && knowinglyRtMs === null) setKnowinglyRtMs(now - taskShownAt);
    setKnowingly(v);
  };
  const chooseIntent = (v: boolean, now: number) => {
    if (taskShownAt !== null && intentRtMs === null) setIntentRtMs(now - taskShownAt);
    setIntentional(v);
  };
  const chooseRating = (v: number, now: number) => {
    if (taskShownAt !== null && ratingRtMs === null) setRatingRtMs(now - taskShownAt);
    setRating(v);
  };

  const send = async (priorValue: Prior | null) => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      study,
      condition,
      knowingly,
      intentional,
      rating,
      knowinglyRtMs: knowinglyRtMs ?? 0,
      intentRtMs: intentRtMs ?? 0,
      ratingRtMs: ratingRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/nadelhoffer-blame", {
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
  // `condition === null` can only happen before "Begin", so this also serves as the
  // type narrowing that lets every later phase treat the assignment as settled.
  if (phase === "intro" || condition === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Nadelhoffer 2006 &middot; the Smith study</div>
          <h1 style={base.h1}>Bad acts, blameworthy agents</h1>
          <p style={base.body}>
            You will read one short scenario and answer three questions about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answers are recorded anonymously &mdash; no name, no login, nothing
            that identifies you. After you answer you will see both versions and the original 2006
            results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => startTask(Date.now(), Math.random() < 0.5 ? "C1" : "C2")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const V = VERSIONS[condition];
  const condColour = condition === "C1" ? C.c1 : C.c2;
  const cmp: Condition = compare ?? condition;
  const cmpColour = cmp === "C1" ? C.c1 : C.c2;

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = knowingly !== null && intentional !== null && rating !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} mark={false} />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              {V.q1}
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              {([false, true] as const).map((v) => {
                const on = knowingly === v;
                return (
                  <button
                    key={String(v)}
                    onClick={() => chooseKnowingly(v, Date.now())}
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
                    {v ? "Yes" : "No"}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q2</span>
              {V.q2}
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              {([false, true] as const).map((v) => {
                const on = intentional === v;
                return (
                  <button
                    key={String(v)}
                    onClick={() => chooseIntent(v, Date.now())}
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
                    {v ? "Yes" : "No"}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q3</span>
              {V.q3}
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                const on = rating === n;
                return (
                  <button
                    key={n}
                    onClick={() => chooseRating(n, Date.now())}
                    aria-pressed={on}
                    style={{
                      flex: "1 1 44px",
                      minWidth: "44px",
                      padding: "12px 0",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "16px",
                      cursor: "pointer",
                      background: on ? C.accent : C.well,
                      color: on ? C.bg : C.text,
                      border: `1px solid ${on ? C.accent : C.border}`,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                marginTop: "8px",
                fontSize: "13px",
                color: C.muted,
              }}
            >
              <span>{V.lo}</span>
              <span>{V.hi}</span>
            </div>
          </div>

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => setPhase("background")}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Answer all three questions to continue.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- BACKGROUND -------------------------- */
  if (phase === "background") {
    const opts: { key: Prior; label: string }[] = [
      { key: "none", label: "None" },
      { key: "some", label: "A course or two" },
      { key: "extensive", label: "Extensive — a degree or research in philosophy" },
    ];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>One last question &middot; optional</div>
          <h2 style={base.h2}>How much philosophy have you studied?</h2>
          <p style={base.small}>
            Asked after your answers so it cannot influence them. It lets the class check whether
            philosophical training changes the pattern &mdash; the &lsquo;expertise&rsquo; objection
            to this kind of evidence. Skip it if you prefer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
            {opts.map((o) => (
              <button
                key={o.key}
                onClick={() => setPrior(o.key)}
                aria-pressed={prior === o.key}
                style={{
                  textAlign: "left",
                  padding: "14px 18px",
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "18px",
                  cursor: "pointer",
                  background: prior === o.key ? C.accent : C.well,
                  color: prior === o.key ? C.bg : C.text,
                  border: `1px solid ${prior === o.key ? C.accent : C.border}`,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button style={base.btn} disabled={submitting} onClick={() => send(prior)}>
              {submitting ? "Sending…" : "Submit →"}
            </button>
            <button style={base.btnGhost} disabled={submitting} onClick={() => send(null)}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- DEBRIEF ---------------------------- */
  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Nadelhoffer 2006</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <div
          style={{
            borderLeft: `3px solid ${condColour}`,
            background: C.well,
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: condColour, marginBottom: "8px" }}>
            {V.label}
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You said the {V.agent}{" "}
            <strong style={{ color: C.text }}>{knowingly ? "did" : "did not"}</strong>{" "}knowingly and{" "}
            <strong style={{ color: C.text }}>{intentional ? "did" : "did not"}</strong>{" "}intentionally
            bring about the {V.victim}&rsquo;s death, and assigned{" "}
            <strong style={{ color: C.text }}>{rating}</strong>{" "}out of 6 for blame.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.c1 }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The two versions</h2>
        <p style={base.small}>
          Half the room read the other one. Switch between them &mdash; the words that were changed
          are highlighted.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(["C1", "C2"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCompare(c)}
              aria-pressed={cmp === c}
              style={{
                flex: "1 1 0",
                padding: "11px 8px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmp === c ? C.surface : C.well,
                color: cmp === c ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmp === c ? `2px solid ${cmpColour}` : `1px solid ${C.border}`,
              }}
            >
              {VERSIONS[c].label}
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "16px" }}>
          <Paras paras={VERSIONS[cmp].paras} mark />
        </div>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          Both drivers do exactly the same thing &mdash; swerve to shake off a person clinging to the
          car, knowing it is dangerous, and that person dies. But notice how much the highlighting
          changes between the versions: not just <em>one</em>{" "}word but <em>two things at once</em>.
          In one version the driver is a fleeing <em>thief</em>{" "}and the victim an innocent{" "}
          <em>police officer</em>; in the other the driver is an innocent <em>man</em>{" "}and the victim
          an armed <em>carjacker</em>. Hold on to that &mdash; it is the whole lesson below.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Nadelhoffer&rsquo;s original result</h2>
        <p style={base.small}>
          N&nbsp;=&nbsp;{ORIG.n}{" "}undergraduates, about {ORIG.perCell}{" "}per version. Percentages are of
          people answering &lsquo;yes&rsquo;; blame is the mean 0&ndash;6 rating.
        </p>
        <div style={{ overflowX: "auto", marginBottom: "14px" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "15px", minWidth: "420px" }}>
            <thead>
              <tr>
                {["", "Knowingly", "Intentionally", "Mean blame"].map((h, i) => (
                  <th
                    key={h || "row"}
                    style={{
                      ...base.mono,
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.muted,
                      fontWeight: 400,
                      textAlign: i === 0 ? "left" : "right",
                      borderBottom: `1px solid ${C.border}`,
                      padding: "8px 10px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["C1", "C2"] as const).map((c) => {
                const colour = c === "C1" ? C.c1 : C.c2;
                const o = ORIG[c];
                return (
                  <tr key={c}>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: colour, fontSize: "16px" }}>
                      {VERSIONS[c].label}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.body }}>
                      {o.knowingly}%
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.text, fontWeight: 700 }}>
                      {o.intentionally}%
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.body }}>
                      {o.blame.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={base.small}>
          The contrasts on the two yes/no items were both statistically significant: knowingly, 75%
          vs 51% &mdash; &chi;&sup2;(1,&nbsp;N&nbsp;=&nbsp;{ORIG.n})&nbsp;=&nbsp;{ORIG.chiKnow.chi},
          p&nbsp;{ORIG.chiKnow.p}; intentionally, 37% vs 10% &mdash;
          &chi;&sup2;(1,&nbsp;N&nbsp;=&nbsp;{ORIG.n})&nbsp;=&nbsp;{ORIG.chiInt.chi}, p&nbsp;
          {ORIG.chiInt.p}. Nadelhoffer reported no test statistic for the blame contrast (5.11 vs
          2.01), and the study included no comprehension or manipulation checks.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>The account</h2>
        <p style={base.body}>
          The same foreseen, unwanted death is called &lsquo;intentional&rsquo; nearly four times as
          often when the driver is a thief as when he is an innocent man. Nadelhoffer&rsquo;s reading,
          borrowing Mark Alicke&rsquo;s culpable-control model, is that a bad outcome or a
          blameworthy agent triggers a spontaneous negative reaction, and that reaction biases the
          way we describe <em>how</em>{" "}the act was done. Blame comes first and colours the judgment
          of intent &mdash; the moral cart pulling the intentional horse. If that is right, the
          harm/help asymmetry is a moral <em>biasing</em>{" "}effect, a performance error, rather than a
          feature of the concept of intentional action itself.
        </p>

        <h2 style={{ ...base.h2, marginTop: "32px" }}>A lesson in experimental design</h2>
        <p style={base.body}>
          Here is the catch, and it is the reason this particular study is worth running in a
          methods class. The two versions do not differ in just one thing. Between them the design
          changes the agent (a blameworthy thief versus an innocent driver) <em>and</em>{" "}the victim
          (an innocent officer versus an armed carjacker) at the same time. The variables are
          confounded: badness-of-outcome, blameworthiness-of-agent, and innocence-of-victim all move
          together. So while the numbers show that moral standing tracks the intentionality judgment,
          this study on its own <em>cannot</em>{" "}tell us which of those factors is doing the work, or
          whether it is all of them. Nadelhoffer concedes exactly this and calls the study
          &lsquo;preliminary&rsquo;, noting that further studies would be needed to separate the
          effects. A cleaner design would vary one factor at a time. Read this less as a settled
          result than as a worked example of why a real effect and a confounded design can sit side
          by side.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Nadelhoffer, T. (2006). Bad acts, blameworthy agents, and intentional actions: Some
          problems for juror impartiality. <em>Philosophical Explorations</em>{" "}9(2), 203&ndash;219.{" "}
          <a href="https://doi.org/10.1080/13869790600641905" style={{ color: C.text }}>
            doi:10.1080/13869790600641905
          </a>
        </p>
      </div>
    </div>
  );
}
