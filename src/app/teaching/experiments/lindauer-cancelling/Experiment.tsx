"use client";

import { useState } from "react";

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
  cancel: "#A6772E",
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
};

/* ------------------------------------------------------------------ *
 * Stimuli — verbatim from Lindauer, M. & Southwood, N. (2021), "How to
 * cancel the Knobe effect: the role of sufficiently strong moral
 * censure", American Philosophical Quarterly 58(2), 181–186. The
 * chairman vignette (helping / harming versions) is reproduced by the
 * authors at p. 182 from Knobe (2003a, p. 191); the three agreement
 * statements and the 0–6 Likert scale ("0 = Not at All", "6 = Fully
 * Agree") are given at p. 183 and n. 6. Segments given as {d: "..."}
 * are the wording that differs between the helping and harming
 * vignettes; they are highlighted in the debrief comparison but
 * rendered as plain text during the task itself. Curly typographic
 * quotes are used here for on-screen display; the wording is otherwise
 * unchanged.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "helping" | "harming" | "cancelling";
type Vignette = "helping" | "harming";

const VIGNETTES: Record<Vignette, Seg[][]> = {
  harming: [
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
  helping: [
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
};

interface CondSpec {
  label: string;
  colour: string;
  /** Which of the two original Knobe vignettes this condition reads. */
  vignette: Vignette;
  /** The single dependent statement, agree/disagree on a 0–6 scale (p. 183). */
  statement: string;
}

const CONDITIONS: Record<Condition, CondSpec> = {
  helping: {
    label: "helping",
    colour: C.help,
    vignette: "helping",
    statement: "The chairman didn’t intentionally help the environment.",
  },
  harming: {
    label: "harming",
    colour: C.harm,
    vignette: "harming",
    statement: "The chairman didn’t intentionally harm the environment.",
  },
  cancelling: {
    label: "cancelling",
    colour: C.cancel,
    vignette: "harming",
    statement:
      "The chairman didn’t intentionally harm the environment, but he knowingly harmed the environment, and he is morally responsible and should be blamed for doing so.",
  },
};

const ORDER: Condition[] = ["helping", "harming", "cancelling"];

/** Published values from Lindauer & Southwood (2021), p. 184, for the
 *  compare-to-original display. Means are agreement on the 0–6 scale. */
const ORIGINAL: Record<Condition, { n: number; mean: number; sd: number }> = {
  helping: { n: 101, mean: 5.29, sd: 1.17 },
  harming: { n: 105, mean: 0.57, sd: 1.21 },
  cancelling: { n: 102, mean: 5.16, sd: 1.38 },
};
const ANOVA = { f: "475.86", df1: 2, df2: 305, p: "< .001", eta2: ".76", n: 308 };

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
  const [rating, setRating] = useState<number | null>(null);
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
      rating,
      ratingRtMs: ratingRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/lindauer-cancelling", {
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
          <div style={base.eyebrow}>Lindauer &amp; Southwood 2021</div>
          <h1 style={base.h1}>How to cancel the Knobe effect</h1>
          <p style={base.body}>
            You will read one short scenario and answer a single question about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of three versions of the study, and will see only
            that one. Your answers are recorded anonymously &mdash; no name, no login, nothing that
            identifies you. After you answer you will see all three versions and the original 2021
            results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => {
              const r = Math.random();
              const assigned: Condition = r < 1 / 3 ? "helping" : r < 2 / 3 ? "harming" : "cancelling";
              startTask(Date.now(), assigned);
            }}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const spec = CONDITIONS[condition];
  const condColour = spec.colour;
  const cmp: Condition = compare ?? condition;
  const cmpSpec = CONDITIONS[cmp];

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = rating !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={VIGNETTES[spec.vignette]} mark={false} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>How much do you agree with the following statement?</span>
            <div
              style={{
                fontSize: "20px",
                lineHeight: 1.5,
                color: C.text,
                fontStyle: "italic",
                borderLeft: `3px solid ${C.border}`,
                paddingLeft: "16px",
                marginBottom: "18px",
              }}
            >
              {spec.statement}
            </div>
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
              <span>0 &mdash; Not at All</span>
              <span>6 &mdash; Fully Agree</span>
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
              Choose a rating to continue.
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
            Asked after your answer so it cannot influence it. It lets the class check whether
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
        <div style={base.eyebrow}>Thank you</div>
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
            {spec.label}{" "}condition
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You read the <strong style={{ color: C.text }}>{spec.vignette}</strong>{" "}vignette and rated
            your agreement with &ldquo;{spec.statement}&rdquo; as{" "}
            <strong style={{ color: C.text }}>{rating}</strong>{" "}out of 6.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.harm }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The three versions</h2>
        <p style={base.small}>
          The room was split three ways. Switch between them &mdash; the wording that differs between
          the helping and harming vignettes is highlighted, and each condition&rsquo;s statement is
          shown below.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {ORDER.map((c) => (
            <button
              key={c}
              onClick={() => setCompare(c)}
              aria-pressed={cmp === c}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmp === c ? C.surface : C.well,
                color: cmp === c ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmp === c ? `2px solid ${CONDITIONS[c].colour}` : `1px solid ${C.border}`,
              }}
            >
              {CONDITIONS[c].label}
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "12px" }}>
          <Paras paras={VIGNETTES[cmpSpec.vignette]} mark />
        </div>
        <p style={{ ...base.small, marginBottom: "16px" }}>
          Readers in the <strong style={{ color: cmpSpec.colour }}>{cmpSpec.label}</strong>{" "}condition
          saw the {cmpSpec.vignette}{" "}vignette and rated their agreement, on a 0
          (&lsquo;Not at All&rsquo;) to 6 (&lsquo;Fully Agree&rsquo;) scale, with:
        </p>
        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.5,
            color: C.text,
            fontStyle: "italic",
            borderLeft: `3px solid ${cmpSpec.colour}`,
            paddingLeft: "16px",
            marginBottom: "16px",
          }}
        >
          {cmpSpec.statement}
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          The cancelling condition reads the very same harming vignette as the harming condition. The
          only difference between them is the statement: the cancelling statement lets a reader deny
          that the chairman acted intentionally while still condemning him in the strongest terms.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Lindauer and Southwood&rsquo;s original result</h2>
        <div style={{ marginBottom: "14px" }}>
          {ORDER.map((c) => {
            const m = ORIGINAL[c].mean;
            return (
              <div
                key={c}
                style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}
              >
                <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "80px" }}>
                  {CONDITIONS[c].label}
                </span>
                <span style={{ flex: 1, height: "10px", background: "#EDE6D8", display: "block" }}>
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${(m / 6) * 100}%`,
                      background: CONDITIONS[c].colour,
                    }}
                  />
                </span>
                <span style={{ ...base.mono, fontSize: "14px", color: C.text, width: "44px", textAlign: "right" }}>
                  {m.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <p style={base.small}>
          Mean agreement on a 0 (&lsquo;Not at All&rsquo;) to 6 (&lsquo;Fully Agree&rsquo;) scale.
          N&nbsp;=&nbsp;{ANOVA.n} (helping&nbsp;{ORIGINAL.helping.n}, harming&nbsp;{ORIGINAL.harming.n},
          cancelling&nbsp;{ORIGINAL.cancelling.n}). A one-way ANOVA found a significant difference between
          the conditions, F({ANOVA.df1},&nbsp;{ANOVA.df2})&nbsp;=&nbsp;{ANOVA.f}, p&nbsp;{ANOVA.p},
          &eta;&sup2;&nbsp;=&nbsp;{ANOVA.eta2}. Tukey&rsquo;s HSD: helping&nbsp;&gt;&nbsp;harming
          (p&nbsp;&lt;&nbsp;.001, d&nbsp;=&nbsp;3.97) and cancelling&nbsp;&gt;&nbsp;harming
          (p&nbsp;&lt;&nbsp;.001, d&nbsp;=&nbsp;3.54), while helping and cancelling did not differ
          (p&nbsp;=&nbsp;.74, d&nbsp;=&nbsp;.10). The authors recruited their participants through
          Amazon&rsquo;s Mechanical Turk.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          In Knobe&rsquo;s original study, people who read the harming vignette readily said the
          chairman harmed the environment <em>intentionally</em>, while people who read the matching
          helping vignette were reluctant to say he helped it intentionally &mdash; even though his
          state of mind is described in exactly the same way in both. This study asks <em>why</em>. On
          the pragmatic explanation, saying &lsquo;intentionally&rsquo; of the harm is a way of
          registering that what the chairman did was really not okay; to <em>deny</em>{" "}it would seem
          to let him off the hook. If that is right, then giving people another way to condemn him
          should free them to deny the intentional description.
        </p>
        <p style={base.body}>
          That is what the cancelling condition does. Its readers see the harming vignette but rate a
          statement that denies intentional harm <em>and</em>{" "}insists the chairman knowingly harmed
          the environment and is morally responsible and should be blamed. Agreement with that
          statement (mean&nbsp;{ORIGINAL.cancelling.mean.toFixed(2)}) was just as high as agreement in
          the helping condition ({ORIGINAL.helping.mean.toFixed(2)}) and far above the plain harming
          condition ({ORIGINAL.harming.mean.toFixed(2)}). The harm/help asymmetry cancels once people
          can deny intentional action while still strongly condemning the agent. The authors read this
          as the first survey evidence in favour of the pragmatic explanation of the Knobe effect: the
          word &lsquo;intentionally&rsquo; had been carrying the weight of moral censure.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Lindauer, M., &amp; Southwood, N. (2021). How to cancel the Knobe effect: the role of
          sufficiently strong moral censure. <em>American Philosophical Quarterly</em>{" "}58(2),
          181&ndash;186.{" "}
          <a href="https://doi.org/10.2307/48614004" style={{ color: C.text }}>
            doi:10.2307/48614004
          </a>
        </p>
      </div>
    </div>
  );
}
