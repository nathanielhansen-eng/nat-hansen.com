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
};

/* ------------------------------------------------------------------ *
 * Stimuli — verbatim from Pettit, D. & Knobe, J. (2009), "The
 * pervasive impact of moral judgment", Mind & Language 24(5), 586–604
 * (chairman vignette reproduced at p. 588; "decided" statement and
 * 1–7 scale at p. 592). Segments given as {d: "..."} are the wording
 * that differs between the harm and help conditions; they are
 * highlighted in the debrief comparison but rendered as plain text
 * during the task itself. Curly typographic quotes are used here for
 * on-screen display; the wording is otherwise unchanged.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "harm" | "help";

interface Version {
  paras: Seg[][];
  /** The single dependent statement, agree/disagree on a 1–7 scale (p. 592). */
  statement: string;
}

interface Study {
  short: string;
  name: string;
  agent: string;
  harm: Version;
  help: Version;
  orig: { n: number; harmMean: number; helpMean: number; t: string; df: number; p: string };
  note: string;
}

const STUDIES: Record<1, Study> = {
  1: {
    short: "Study 3",
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
      statement: "The chairman decided to harm the environment.",
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
      statement: "The chairman decided to help the environment.",
    },
    orig: { n: 37, harmMean: 4.6, helpMean: 2.7, t: "2.4", df: 35, p: "< .05" },
    note:
      "The two versions are identical except for whether the program is said to ‘help’ or ‘harm’ the environment (and the matching connective: ‘but it will also harm’ versus ‘and it will also help’). The chairman’s state of mind — indifference to the side effect, a choice made only for profit — is described in exactly the same words in both.",
  },
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
  study: 1;
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
      const r = await fetch("/api/experiments/pettit-knobe-decided", {
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
          <div style={base.eyebrow}>Pettit &amp; Knobe 2009 &middot; {S.short}</div>
          <h1 style={base.h1}>The pervasive impact of moral judgment</h1>
          <p style={base.body}>
            You will read one short scenario and answer a single question about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answers are recorded anonymously &mdash; no name, no login, nothing
            that identifies you. After you answer you will see both versions and the original 2009
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
    const ready = rating !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{S.short} &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} mark={false} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>How much do you agree or disagree with the following statement?</span>
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
              {V.statement}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
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
              <span>1 &mdash; disagree</span>
              <span>7 &mdash; agree</span>
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
            {condition} version
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You rated your agreement with &ldquo;The {S.agent} decided to {condition} the
            environment&rdquo; as <strong style={{ color: C.text }}>{rating}</strong> out of 7.
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
              {c} version
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "12px" }}>
          <Paras paras={S[cmp].paras} mark />
        </div>
        <p style={{ ...base.small, marginBottom: "16px" }}>
          Everyone was then asked how much they agreed that &ldquo;the {S.agent} decided to{" "}
          <strong style={{ color: cmpColour }}>{cmp}</strong> the environment,&rdquo; on a scale from
          1 (&lsquo;disagree&rsquo;) to 7 (&lsquo;agree&rsquo;).
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {S.note}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Pettit and Knobe&rsquo;s original result</h2>
        <div style={{ marginBottom: "14px" }}>
          {([["Harm", o.harmMean, C.harm], ["Help", o.helpMean, C.help]] as const).map((row) => (
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
                    width: `${(row[1] / 7) * 100}%`,
                    background: row[2],
                  }}
                />
              </span>
              <span style={{ ...base.mono, fontSize: "14px", color: C.text, width: "44px", textAlign: "right" }}>
                {row[1].toFixed(1)}
              </span>
            </div>
          ))}
        </div>
        <p style={base.small}>
          Mean agreement that the {S.agent} &lsquo;decided&rsquo; to bring the outcome about, on a 1
          (&lsquo;disagree&rsquo;) to 7 (&lsquo;agree&rsquo;) scale. N&nbsp;=&nbsp;{o.n},
          t({o.df})&nbsp;=&nbsp;{o.t}, p&nbsp;{o.p}. Pettit and Knobe&rsquo;s participants were
          undergraduate students taking philosophy classes at UNC&ndash;Chapel Hill.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          The side-effect effect was first found for the word &lsquo;intentionally&rsquo;: people are
          far more willing to say a foreseen bad side effect was brought about intentionally than a
          foreseen good one. Pettit and Knobe asked whether that asymmetry is a quirk of
          &lsquo;intentionally&rsquo; or something broader. Here the word is
          &lsquo;decided&rsquo; &mdash; an ordinary description of someone&rsquo;s state of mind, with
          none of the special features philosophers had attributed to intentional action. The two
          versions describe the {S.agent}&rsquo;s mind in exactly the same way and differ only in
          whether the program helps or harms the environment, yet people agree more that he
          &lsquo;decided&rsquo; to harm than that he &lsquo;decided&rsquo; to help.
        </p>
        <p style={base.body}>
          Pettit and Knobe report the same moral asymmetry for a whole family of folk-psychological
          concepts &mdash; desiring, being in favour of, and advocating an outcome, and even being
          opposed to one &mdash; and conclude that moral judgment is a pervasive input to how we read
          other minds, not a special feature of the concept of intentional action.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Pettit, D., &amp; Knobe, J. (2009). The pervasive impact of moral judgment.{" "}
          <em>Mind &amp; Language</em> 24(5), 586&ndash;604.{" "}
          <a href="https://doi.org/10.1111/j.1468-0017.2009.01375.x" style={{ color: C.text }}>
            doi:10.1111/j.1468-0017.2009.01375.x
          </a>
        </p>
      </div>
    </div>
  );
}
