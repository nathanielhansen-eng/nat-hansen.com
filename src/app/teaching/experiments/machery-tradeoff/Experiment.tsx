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
  cost: "#8C3A2E",
  bonus: "#4A6B4F",
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
 * Stimuli — verbatim from Machery, E. (2008), "The Folk Concept of
 * Intentional Action: Philosophical and Experimental Issues", Mind &
 * Language 23(2), 165–189 (probes p. 179, results p. 180). Straight
 * quotes/apostrophes are used in place of the source's typographic
 * marks; wording is otherwise verbatim.
 *
 * This is a two-arm between-subjects design: each participant reads
 * exactly one probe. The two probes differ in whether Joe's foreseen
 * extra outcome is a COST he incurs (paying one dollar more) or a
 * BONUS he receives (a free commemorative cup).
 * ------------------------------------------------------------------ */
type Condition = "extra-dollar" | "free-cup";
type ValueJudgment = "blameworthy" | "praiseworthy" | "neutral";

interface Version {
  paras: string[];
  /** Q1 — the intentionality forced choice (binary yes/no), verbatim. */
  intentQ: string;
  /** Q2 — the "value question" manipulation check (3-way), verbatim. */
  valueQ: string;
  /** Short action phrase for the debrief summary. */
  action: string;
}

interface Study {
  short: string;
  name: string;
  agent: string;
  "extra-dollar": Version;
  "free-cup": Version;
  orig: {
    n: number;
    costPct: number;
    bonusPct: number;
    chi: string;
    p: string;
    costNeutralPct: number;
    bonusNeutralPct: number;
    valueChi: string;
    valueP: string;
  };
  note: string;
}

const STUDY: Study = {
  short: "Experiment 1",
  name: "The smoothie shop",
  agent: "Joe",
  "extra-dollar": {
    paras: [
      "Joe was feeling quite dehydrated, so he stopped by the local smoothie shop to buy the largest sized drink available. Before ordering, the cashier told him that the Mega-Sized Smoothies were now one dollar more than they used to be. Joe replied, \"I don't care if I have to pay one dollar more, I just want the biggest smoothie you have.\" Sure enough, Joe received the Mega-Sized Smoothie and paid one dollar more for it.",
    ],
    intentQ: "Did Joe intentionally pay one dollar more?",
    valueQ: "Was paying one dollar more blameworthy, praiseworthy, or neutral?",
    action: "pay one dollar more",
  },
  "free-cup": {
    paras: [
      "Joe was feeling quite dehydrated, so he stopped by the local smoothie shop to buy the largest sized drink available. Before ordering, the cashier told him that if he bought a Mega-Sized Smoothie he would get it in a special commemorative cup. Joe replied, \"I don't care about a commemorative cup, I just want the biggest smoothie you have.\" Sure enough, Joe received the Mega-Sized Smoothie in a commemorative cup.",
    ],
    intentQ: "Did Joe intentionally obtain the commemorative cup?",
    valueQ: "Was obtaining the commemorative cup blameworthy, praiseworthy, or neutral?",
    action: "obtain the commemorative cup",
  },
  orig: {
    n: 126,
    costPct: 95,
    bonusPct: 45,
    chi: "37.2",
    p: "< .001",
    costNeutralPct: 90,
    bonusNeutralPct: 81,
    valueChi: "3.2",
    valueP: "> .1",
  },
  note:
    "The two probes are not a single lexical swap. In the extra-dollar case the foreseen extra outcome is a cost Joe pays; in the free-cup case it is a bonus he receives. Both are equally foreseen, and both were judged morally neutral — so any difference in how people describe Joe's intentions cannot be a matter of blame or praise.",
};

function Paras({ paras }: { paras: string[] }) {
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ margin: i === paras.length - 1 ? 0 : "0 0 16px" }}>
          {p}
        </p>
      ))}
    </>
  );
}

const VALUE_OPTS: { key: ValueJudgment; label: string }[] = [
  { key: "blameworthy", label: "Blameworthy" },
  { key: "praiseworthy", label: "Praiseworthy" },
  { key: "neutral", label: "Neutral" },
];

type Phase = "intro" | "task" | "background" | "debrief";
type Prior = "none" | "some" | "extensive";

export default function Experiment({
  session,
  study,
  tag = null,
}: {
  session: string;
  study: 1;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const S = STUDY;

  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [condition, setCondition] = useState<Condition | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [taskShownAt, setTaskShownAt] = useState<number | null>(null);
  const [intentional, setIntentional] = useState<boolean | null>(null);
  const [value, setValue] = useState<ValueJudgment | null>(null);
  const [intentRtMs, setIntentRtMs] = useState<number | null>(null);
  const [valueRtMs, setValueRtMs] = useState<number | null>(null);
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
  const chooseIntent = (v: boolean, now: number) => {
    if (taskShownAt !== null && intentRtMs === null) setIntentRtMs(now - taskShownAt);
    setIntentional(v);
  };
  const chooseValue = (v: ValueJudgment, now: number) => {
    if (taskShownAt !== null && valueRtMs === null) setValueRtMs(now - taskShownAt);
    setValue(v);
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
      intentional,
      value,
      intentRtMs: intentRtMs ?? 0,
      valueRtMs: valueRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/machery-tradeoff", {
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
          <div style={base.eyebrow}>Machery 2008 &middot; {S.short}</div>
          <h1 style={base.h1}>The trade-off hypothesis</h1>
          <p style={base.body}>
            You will read one short scenario and answer two questions about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answers are recorded anonymously &mdash; no name, no login, nothing
            that identifies you. After you answer you will see both versions and the original 2008
            results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => startTask(Date.now(), Math.random() < 0.5 ? "extra-dollar" : "free-cup")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const V = S[condition];
  const condColour = condition === "extra-dollar" ? C.cost : C.bonus;
  const cmp: Condition = compare ?? condition;
  const cmpColour = cmp === "extra-dollar" ? C.cost : C.bonus;

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = intentional !== null && value !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{S.short} &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              {V.intentQ}
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
              <span style={base.qnum}>Q2</span>
              {V.valueQ}
            </span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {VALUE_OPTS.map((o) => {
                const on = value === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => chooseValue(o.key, Date.now())}
                    aria-pressed={on}
                    style={{
                      flex: "1 1 0",
                      minWidth: "120px",
                      padding: "14px 0",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
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
            You said {S.agent} <strong style={{ color: C.text }}>{intentional ? "did" : "did not"}</strong>{" "}
            {V.action}{" "}intentionally, and judged it{" "}
            <strong style={{ color: C.text }}>{value}</strong>.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.cost }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The two versions</h2>
        <p style={base.small}>
          Half the room read the other one. Switch between them.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(["extra-dollar", "free-cup"] as const).map((c) => (
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
          <Paras paras={S[cmp].paras} />
        </div>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {S.note}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Machery&rsquo;s original result</h2>
        <p style={base.small}>
          Did Joe do it intentionally? Percent answering &lsquo;yes&rsquo;.
        </p>
        <div style={{ marginBottom: "14px" }}>
          {([["Extra dollar", o.costPct, C.cost], ["Free cup", o.bonusPct, C.bonus]] as const).map((row) => (
            <div
              key={row[0]}
              style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}
            >
              <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "88px" }}>
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
          p&nbsp;{o.p}. Machery&rsquo;s participants were University of Pittsburgh undergraduates.
        </p>

        <h2 style={{ ...base.h2, marginTop: "32px" }}>The manipulation check</h2>
        <p style={base.small}>
          The second question &mdash; whether the action was blameworthy, praiseworthy, or neutral
          &mdash; is there to show the two cases are morally on a par. In the original, both were
          overwhelmingly called <em>neutral</em>: {o.costNeutralPct}% for the extra dollar,{" "}
          {o.bonusNeutralPct}% for the free cup (&chi;&sup2;(2)&nbsp;=&nbsp;{o.valueChi},
          p&nbsp;{o.valueP}, not significant). So the gap in the intentionality answers cannot be a
          blame-or-praise effect.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          This study varied one thing between two groups of readers: whether Joe&rsquo;s foreseen
          extra outcome was a <em>cost</em>{" "}he paid (an extra dollar) or a <em>bonus</em>{" "}he received
          (a free commemorative cup) on the way to the smoothie he actually wanted. Ninety-five
          percent of readers said Joe intentionally paid the extra dollar, but only forty-five
          percent said he intentionally obtained the free cup &mdash; even though both were equally
          foreseen and both were judged morally neutral.
        </p>
        <p style={base.body}>
          Machery reads this as evidence for the <em>trade-off hypothesis</em>: we treat a foreseen
          cost as something the agent knowingly takes on to get what they want, so we call it
          intentional; a foreseen windfall is just a bonus, so we do not. Because the smoothie case
          has no moral content, the asymmetry cannot be a matter of blame or praise &mdash; which is
          the challenge this study poses to accounts that make morality do the work.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Machery, E. (2008). The folk concept of intentional action: Philosophical and experimental
          issues. <em>Mind &amp; Language</em>{" "}23(2), 165&ndash;189.{" "}
          <a href="https://doi.org/10.1111/j.1468-0017.2007.00336.x" style={{ color: C.text }}>
            doi:10.1111/j.1468-0017.2007.00336.x
          </a>
        </p>
      </div>
    </div>
  );
}
