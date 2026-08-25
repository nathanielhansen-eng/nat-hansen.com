"use client";

import { useMemo, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  harm: "#8C3A2E",
  help: "#4A6B4F",
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
 * Stimuli — verbatim from Knobe, J. (2003), "Intentional action and
 * side effects in ordinary language", Analysis 63(3), 190–194.
 * Segments given as {d: "..."} are the wording that differs between
 * the harm and help conditions; they are highlighted in the debrief
 * comparison but rendered as plain text during the task itself.
 * Two typographical errors in the printed Study 2 text ("seargent",
 * "my the squad") are silently corrected.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "harm" | "help";

interface Version {
  paras: Seg[][];
  q1: string;
  lo: string;
  hi: string;
  q2: string;
}

interface Study {
  short: string;
  name: string;
  agent: string;
  harm: Version;
  help: Version;
  orig: { n: number; harmPct: number; helpPct: number; chi: string; p: string };
  note: string;
}

const STUDIES: Record<1 | 2, Study> = {
  1: {
    short: "Study 1",
    name: "The chairman and the environment",
    agent: "chairman",
    harm: {
      paras: [
        [
          "The vice-president of a company went to the chairman of the board and said, ‘We are thinking of starting a new program. It will help us increase profits, ",
          { d: "but" },
          " it will also ",
          { d: "harm" },
          " the environment.’",
        ],
        [
          "The chairman of the board answered, ‘I don’t care at all about ",
          { d: "harming" },
          " the environment. I just want to make as much profit as I can. Let’s start the new program.’",
        ],
        ["They started the new program. Sure enough, the environment was ", { d: "harmed" }, "."],
      ],
      q1: "How much blame does the chairman deserve for what he did?",
      lo: "0 — no blame at all",
      hi: "6 — a great deal of blame",
      q2: "Did the chairman intentionally harm the environment?",
    },
    help: {
      paras: [
        [
          "The vice-president of a company went to the chairman of the board and said, ‘We are thinking of starting a new program. It will help us increase profits, ",
          { d: "and" },
          " it will also ",
          { d: "help" },
          " the environment.’",
        ],
        [
          "The chairman of the board answered, ‘I don’t care at all about ",
          { d: "helping" },
          " the environment. I just want to make as much profit as I can. Let’s start the new program.’",
        ],
        ["They started the new program. Sure enough, the environment was ", { d: "helped" }, "."],
      ],
      q1: "How much praise does the chairman deserve for what he did?",
      lo: "0 — no praise at all",
      hi: "6 — a great deal of praise",
      q2: "Did the chairman intentionally help the environment?",
    },
    orig: { n: 78, harmPct: 82, helpPct: 23, chi: "27.2", p: "< .001" },
    note:
      "Knobe describes the help vignette as “exactly the same, except that the word ‘harm’ was replaced by ‘help’.” As printed, one further word differs: the harm version reads “but it will also harm”, the help version “and it will also help”. So the contrast is not purely a single lexical swap — the connective shifts too.",
  },
  2: {
    short: "Study 2",
    name: "The lieutenant and Thompson Hill",
    agent: "lieutenant",
    harm: {
      paras: [
        [
          "A lieutenant was talking with a sergeant. The lieutenant gave the order: ‘Send your squad to the top of Thompson Hill.’",
        ],
        [
          "The sergeant said: ‘",
          { d: "But if" },
          " I send my squad to the top of Thompson Hill, ",
          { d: "we’ll be moving the men directly into the enemy’s line of fire. Some of them will surely be killed!" },
          "’",
        ],
        [
          "The lieutenant answered: ‘Look, I know that ",
          { d: "they’ll be in the line of fire, and I know that some of them will be killed" },
          ". But I don’t care at all about what happens to our soldiers. All I care about is taking control of Thompson Hill.’",
        ],
        [
          "The squad was sent to the top of Thompson Hill. As expected, the soldiers were ",
          { d: "moved into the enemy’s line of fire, and some of them were killed" },
          ".",
        ],
      ],
      q1: "How much blame does the lieutenant deserve for what he did?",
      lo: "0 — no blame at all",
      hi: "6 — a great deal of blame",
      q2: "Did the lieutenant intentionally put the soldiers in the line of fire?",
    },
    help: {
      paras: [
        [
          "A lieutenant was talking with a sergeant. The lieutenant gave the order: ‘Send your squad to the top of Thompson Hill.’",
        ],
        [
          "The sergeant said: ‘",
          { d: "If" },
          " I send my squad to the top of Thompson Hill, ",
          { d: "we’ll be taking the men out of the enemy’s line of fire. They’ll be rescued!" },
          "’",
        ],
        [
          "The lieutenant answered: ‘Look, I know that ",
          { d: "we’ll be taking them out of the line of fire, and I know that some of them would have been killed otherwise" },
          ". But I don’t care at all about what happens to our soldiers. All I care about is taking control of Thompson Hill.’",
        ],
        [
          "The squad was sent to the top of Thompson Hill. As expected, the soldiers were ",
          { d: "taken out of the enemy’s line of fire, and they thereby escaped getting killed" },
          ".",
        ],
      ],
      q1: "How much praise does the lieutenant deserve for what he did?",
      lo: "0 — no praise at all",
      hi: "6 — a great deal of praise",
      q2: "Did the lieutenant intentionally take the soldiers out of the line of fire?",
    },
    orig: { n: 42, harmPct: 77, helpPct: 30, chi: "9.5", p: "< .01" },
    note:
      "Knobe transposed the same structure from a corporate to a military setting to check that the Study 1 result was not an artefact of how people think about corporations and environmental damage. Because these two versions are longer and differ in more wording, the manipulation is less surgical than in Study 1.",
  },
};

/** Computed from the published response data of the Oldenburg replications
 *  (Kornmesser & Bauer, course-x-phi-2024), Study 1 only. */
const REPLICATIONS = [
  { group: "Group 1", n: 54, harm: { yes: 23, n: 29 }, help: { yes: 1, n: 25 } },
  { group: "Group 2", n: 47, harm: { yes: 21, n: 24 }, help: { yes: 1, n: 23 } },
  { group: "Group 3", n: 52, harm: { yes: 22, n: 26 }, help: { yes: 4, n: 26 } },
];

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
  study: 1 | 2;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const S = STUDIES[study];

  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [condition, setCondition] = useState<Condition | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [taskShownAt, setTaskShownAt] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [intentional, setIntentional] = useState<boolean | null>(null);
  const [ratingRtMs, setRatingRtMs] = useState<number | null>(null);
  const [intentRtMs, setIntentRtMs] = useState<number | null>(null);
  const [prior, setPrior] = useState<Prior | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [compare, setCompare] = useState<Condition | null>(null);

  const replRows = useMemo(
    () =>
      REPLICATIONS.map((r) => ({
        group: r.group,
        n: r.n,
        harmPct: Math.round((r.harm.yes / r.harm.n) * 100),
        helpPct: Math.round((r.help.yes / r.help.n) * 100),
      })),
    []
  );

  const startTask = (now: number, assigned: Condition) => {
    setCondition(assigned);
    setCompare(assigned);
    setStartedAt(now);
    setTaskShownAt(now);
    setPhase("task");
  };

  // `now` is read in the click handler and passed in, so nothing impure runs during render.
  const chooseRating = (v: number, now: number) => {
    if (taskShownAt !== null && ratingRtMs === null) setRatingRtMs(now - taskShownAt);
    setRating(v);
  };
  const chooseIntent = (v: boolean, now: number) => {
    if (taskShownAt !== null && intentRtMs === null) setIntentRtMs(now - taskShownAt);
    setIntentional(v);
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
      rating,
      intentional,
      ratingRtMs: ratingRtMs ?? 0,
      intentRtMs: intentRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/knobe-side-effect", {
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
          <div style={base.eyebrow}>Knobe 2003 &middot; {S.short}</div>
          <h1 style={base.h1}>The side-effect effect</h1>
          <p style={base.body}>
            You will read one short scenario and answer two questions about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answers are recorded anonymously &mdash; no name, no login, nothing
            that identifies you. After you answer you will see both versions and the original 2003
            results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => startTask(Date.now(), Math.random() < 0.5 ? "harm" : "help")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const V = S[condition];
  const condColour = condition === "harm" ? C.harm : C.help;
  const cmp: Condition = compare ?? condition;
  const cmpColour = cmp === "harm" ? C.harm : C.help;

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = rating !== null && intentional !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{S.short} &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} mark={false} />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              {V.q1}
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

          <div style={{ marginBottom: "8px" }}>
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

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => setPhase("background")}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Answer both questions to continue.
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
  const o = S.orig;
  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; {S.short}</div>
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
            {condition}{" "}condition
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You said the {S.agent} <strong style={{ color: C.text }}>{intentional ? "did" : "did not"}</strong>{" "}
            bring the side effect about intentionally, with a {condition === "harm" ? "blame" : "praise"}{" "}rating of{" "}
            <strong style={{ color: C.text }}>{rating}</strong>{" "}out of 6.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.harm }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The two versions</h2>
        <p style={base.small}>
          Half the room read the other one. Switch between them &mdash; the differing wording is
          highlighted.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(["harm", "help"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCompare(c)}
              aria-pressed={cmp === c}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmp === c ? C.surface : C.well,
                color: cmp === c ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmp === c ? `2px solid ${cmpColour}` : `1px solid ${C.border}`,
              }}
            >
              {c}{" "}version
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "16px" }}>
          <Paras paras={S[cmp].paras} mark />
        </div>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {S.note}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Knobe&rsquo;s original result</h2>
        <div style={{ marginBottom: "14px" }}>
          {([["Harm", o.harmPct, C.harm], ["Help", o.helpPct, C.help]] as const).map((row) => (
            <div
              key={row[0]}
              style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}
            >
              <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "48px" }}>
                {row[0]}
              </span>
              <span style={{ flex: 1, height: "10px", background: "#EDE6D8", display: "block" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${row[1]}%`,
                    background: row[2],
                  }}
                />
              </span>
              <span style={{ ...base.mono, fontSize: "14px", color: C.text, width: "44px", textAlign: "right" }}>
                {row[1]}%
              </span>
            </div>
          ))}
        </div>
        <p style={base.small}>
          Percent answering &lsquo;yes, intentionally&rsquo;. N&nbsp;=&nbsp;{o.n}, &chi;&sup2;(1)&nbsp;=&nbsp;{o.chi},
          p&nbsp;{o.p}. Knobe&rsquo;s participants were people spending time in a Manhattan public park.
        </p>

        <h2 style={{ ...base.h2, marginTop: "32px" }}>Three classroom replications</h2>
        <p style={base.small}>
          Master&rsquo;s students at the University of Oldenburg replicated Study 1 in three groups
          in 2024. These percentages are computed from their published response data.
        </p>
        <div style={{ overflowX: "auto", marginBottom: "18px" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "15px" }}>
            <thead>
              <tr>
                {["Group", "N", "Harm", "Help"].map((h) => (
                  <th
                    key={h}
                    style={{
                      ...base.mono,
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.muted,
                      fontWeight: 400,
                      textAlign: h === "Group" ? "left" : "right",
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
              {replRows.map((r) => (
                <tr key={r.group}>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, color: C.body }}>
                    {r.group}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.body }}>
                    {r.n}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.harm }}>
                    {r.harmPct}%
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", ...base.mono, fontSize: "14px", color: C.help }}>
                    {r.helpPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          Standard analyses of intentional action treated the moral status of an outcome as
          irrelevant to whether it was brought about intentionally. Knobe&rsquo;s two vignettes are
          matched on everything those analyses said should matter &mdash; foresight, indifference,
          causal structure &mdash; and differ only in whether the side effect is bad or good. If
          moral valence were irrelevant, both versions should get the same answer. They do not, by
          roughly sixty percentage points. Alfred Mele, whose analysis ruled out ever calling a side
          effect intentional, retracted that view in response to an earlier draft of this paper.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Knobe, J. (2003). Intentional action and side effects in ordinary language.{" "}
          <em>Analysis</em>{" "}63(3), 190&ndash;194.{" "}
          <a href="https://doi.org/10.1093/analys/63.3.190" style={{ color: C.text }}>
            doi:10.1093/analys/63.3.190
          </a>
        </p>
      </div>
    </div>
  );
}
