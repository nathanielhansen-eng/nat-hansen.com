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
  statement: {
    fontSize: "20px",
    lineHeight: 1.5,
    color: C.text,
    fontStyle: "italic",
    borderLeft: `3px solid ${C.border}`,
    paddingLeft: "16px",
    marginBottom: "18px",
  },
};

/* ------------------------------------------------------------------ *
 * Stimuli — verbatim from Phillips, J., Luguri, J. B. & Knobe, J.
 * (2015), "Unifying morality's influence on non-moral judgments: The
 * relevance of alternative possibilities", Cognition 145, 30–42.
 * Reproduced experiment: STUDY 4a (intentional action; mediation),
 * a between-subjects harm-vs-help manipulation of Knobe's (2003)
 * chairman vignette. Vignette and both measures at pp. 37–38; results
 * at p. 38.
 *
 *   Vignette (p. 37, boxed): "The vice-president of a company went to
 *   the chairman of the board and said, 'We are thinking of starting a
 *   new program. It will help us increase profits, and it will also
 *   harm [help] the environment.' The chairman of the board answered,
 *   'I don't care at all about harming [helping] the environment. I
 *   just want to make as much profit as I can. Let's start the new
 *   program.' They started the new program. Sure enough, the
 *   environment was harmed [helped]."
 *
 * NB: Phillips et al. use the connective "and" in BOTH conditions
 * (unlike Knobe 2003, whose harm version read "but it will also
 * harm"). So the only words that differ between conditions here are
 * harm/help, harming/helping, harmed/helped.
 *
 * Segments given as {d: "..."} are the wording that differs between
 * the harm and help conditions; they are highlighted in the debrief
 * comparison but rendered as plain text during the task itself. Curly
 * typographic quotes are used here for on-screen display; the wording
 * is otherwise unchanged.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "harm" | "help";

interface Version {
  paras: Seg[][];
  /** Q1 — mediator measure. The alternative Sam raises, after "the
   *  chairman could have wanted to avoid ..." (p. 38). */
  relSam: Seg[];
  /** Q2 — primary DV statement, agree/disagree 1–7 (p. 38). */
  statement: string;
}

interface OrigMeasure {
  harmMean: number;
  harmSd: number;
  helpMean: number;
  helpSd: number;
  t: string;
  df: number;
  p: string;
  d: string;
}

interface Study {
  short: string;
  name: string;
  agent: string;
  harm: Version;
  help: Version;
  /** Published Study 4a results (Phillips et al. 2015, p. 38). */
  orig: { n: number; intentional: OrigMeasure; relevance: OrigMeasure };
  note: string;
}

const STUDIES: Record<1, Study> = {
  1: {
    short: "Study 4a",
    name: "The chairman and the environment",
    agent: "chairman",
    harm: {
      paras: [
        [
          "The vice-president of a company went to the chairman of the board and said, ‘We are thinking of starting a new program. It will help us increase profits, and it will also ",
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
      relSam: ["Well, the chairman could have wanted to avoid ", { d: "harming" }, " the environment."],
      statement: "The chairman of the board intentionally harmed the environment.",
    },
    help: {
      paras: [
        [
          "The vice-president of a company went to the chairman of the board and said, ‘We are thinking of starting a new program. It will help us increase profits, and it will also ",
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
      relSam: ["Well, the chairman could have wanted to avoid ", { d: "helping" }, " the environment."],
      statement: "The chairman of the board intentionally helped the environment.",
    },
    // Study 4a, N = 401 (Phillips et al. 2015, p. 38):
    //   Intentional action — harm M = 6.00, SD = 1.29; help M = 1.87,
    //   SD = 1.28; t(399) = 32.10, p < .001, d = 3.21.
    //   Relevance of alternatives (reverse-coded) — harm M = 5.54,
    //   SD = 1.73; help M = 3.41, SD = 1.80; t(399) = 12.10, p < .001,
    //   d = 1.21.
    orig: {
      n: 401,
      intentional: {
        harmMean: 6.0, harmSd: 1.29, helpMean: 1.87, helpSd: 1.28,
        t: "32.10", df: 399, p: "< .001", d: "3.21",
      },
      relevance: {
        harmMean: 5.54, harmSd: 1.73, helpMean: 3.41, helpSd: 1.80,
        t: "12.10", df: 399, p: "< .001", d: "1.21",
      },
    },
    note:
      "The two versions are identical except for whether the program is said to ‘help’ or ‘harm’ the environment (‘harm’/‘help’, ‘harming’/‘helping’, ‘harmed’/‘helped’). The chairman’s state of mind — indifference to the side effect, a choice made only for profit — is described in exactly the same words in both. Phillips et al. use the connective ‘and’ in both versions, so the contrast is a single moral swap.",
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

function Line({ segs, mark }: { segs: Seg[]; mark: boolean }) {
  return (
    <>
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
    </>
  );
}

/** The Sam/Alex exchange (Phillips et al. 2015, p. 38). Alex's closing line
 *  asserts the alternative is NOT relevant; participants rate agreement with
 *  Alex, and the paper reverse-codes that to a relevance score. */
function Dialogue({ relSam, mark }: { relSam: Seg[]; mark: boolean }) {
  const speaker: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.muted,
    marginRight: "8px",
  };
  return (
    <div style={{ ...base.vignette, marginBottom: "18px" }}>
      <p style={{ margin: "0 0 12px" }}>
        <span style={speaker}>Alex</span>‘I wonder how things could have gone differently.’
      </p>
      <p style={{ margin: "0 0 12px" }}>
        <span style={speaker}>Sam</span>‘<Line segs={relSam} mark={mark} />’
      </p>
      <p style={{ margin: 0 }}>
        <span style={speaker}>Alex</span>‘Really? Of all the ways things could have gone differently,
        that doesn’t seem like the one that’s relevant to consider.’
      </p>
    </div>
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
  // Q1: raw agreement with Alex that the "avoid the side effect" possibility is
  // NOT relevant (reverse-coded to relevance in analysis). Q2: agreement that the
  // chairman acted intentionally (primary DV).
  const [relevanceAgree, setRelevanceAgree] = useState<number | null>(null);
  const [intentional, setIntentional] = useState<number | null>(null);
  const [relevanceRtMs, setRelevanceRtMs] = useState<number | null>(null);
  const [intentionalRtMs, setIntentionalRtMs] = useState<number | null>(null);
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
  const chooseRelevance = (v: number, now: number) => {
    if (taskShownAt !== null && relevanceRtMs === null) setRelevanceRtMs(now - taskShownAt);
    setRelevanceAgree(v);
  };
  const chooseIntentional = (v: number, now: number) => {
    if (taskShownAt !== null && intentionalRtMs === null) setIntentionalRtMs(now - taskShownAt);
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
      intentional,
      relevanceAgree,
      intentionalRtMs: intentionalRtMs ?? 0,
      relevanceRtMs: relevanceRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/phillips-alternatives", {
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
          <div style={base.eyebrow}>Phillips, Luguri &amp; Knobe 2015 &middot; {S.short}</div>
          <h1 style={base.h1}>The relevance of alternative possibilities</h1>
          <p style={base.body}>
            You will read one short scenario and answer two questions about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answers are recorded anonymously &mdash; no name, no login, nothing
            that identifies you. After you answer you will see both versions and the original 2015
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
  const scaleButton = (
    value: number | null,
    onChoose: (v: number, now: number) => void
  ) => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => {
        const on = value === n;
        return (
          <button
            key={n}
            onClick={() => onChoose(n, Date.now())}
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
  );
  const endpoints = (lo: string, hi: string) => (
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
      <span>{lo}</span>
      <span>{hi}</span>
    </div>
  );

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = relevanceAgree !== null && intentional !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{S.short} &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} mark={false} />
          </div>

          {/* Q1 — relevance of the alternative (mediator measure) */}
          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              Imagine two people, Sam and Alex, discussing what happened. How much do you agree or
              disagree with Alex?
            </span>
            <Dialogue relSam={V.relSam} mark={false} />
            {scaleButton(relevanceAgree, chooseRelevance)}
            {endpoints("1 — completely disagree", "7 — completely agree")}
          </div>

          {/* Q2 — intentional action (primary DV) */}
          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>How much do you agree or disagree with the following statement?</span>
            <div style={base.statement}>{V.statement}</div>
            {scaleButton(intentional, chooseIntentional)}
            {endpoints("1 — strongly disagree", "7 — strongly agree")}
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
  // Reverse-code the participant's own relevance answer, exactly as the paper does:
  // relevance = 8 − (agreement that the alternative is irrelevant).
  const relevanceScore = relevanceAgree === null ? null : 8 - relevanceAgree;
  const oi = o.intentional;
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
            You rated your agreement that the {S.agent}{" "}
            <strong style={{ color: C.text }}>
              intentionally {condition === "harm" ? "harmed" : "helped"} the environment
            </strong>{" "}
            as <strong style={{ color: C.text }}>{intentional}</strong> out of 7. You rated the
            alternative &mdash; that he could have wanted to avoid it &mdash; at a relevance of{" "}
            <strong style={{ color: C.text }}>{relevanceScore}</strong> out of 7.
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
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "16px" }}>
          <Paras paras={S[cmp].paras} mark />
        </div>
        <p style={{ ...base.small, marginBottom: "10px" }}>
          Everyone was then shown Sam and Alex discussing an alternative &mdash; that the {S.agent}{" "}
          could have wanted to avoid <strong style={{ color: cmpColour }}>{cmp}ing</strong> the
          environment &mdash; and asked how relevant that possibility was, before rating whether he
          acted intentionally.
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {S.note}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>The original 2015 result</h2>
        <p style={{ ...base.small, marginBottom: "18px" }}>
          Mean agreement that the {S.agent} <em>intentionally</em> brought the side effect about, on
          a 1 (&lsquo;strongly disagree&rsquo;) to 7 (&lsquo;strongly agree&rsquo;) scale.
        </p>
        <div style={{ marginBottom: "14px" }}>
          {([["Harm", oi.harmMean, C.harm], ["Help", oi.helpMean, C.help]] as const).map((row) => (
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
                {row[1].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <p style={base.small}>
          N&nbsp;=&nbsp;{o.n}, t({oi.df})&nbsp;=&nbsp;{oi.t}, p&nbsp;{oi.p}, d&nbsp;=&nbsp;{oi.d}.
          Phillips, Luguri and Knobe recruited their participants through Amazon&rsquo;s Mechanical
          Turk.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          On the same scale, people also judged the alternative &mdash; that the {S.agent} could have
          wanted to <em>avoid</em> the side effect &mdash; as more relevant when the environment was
          harmed (M&nbsp;=&nbsp;{o.relevance.harmMean.toFixed(2)}) than when it was helped
          (M&nbsp;=&nbsp;{o.relevance.helpMean.toFixed(2)}), t({o.relevance.df})&nbsp;=&nbsp;
          {o.relevance.t}, p&nbsp;{o.relevance.p} (relevance ratings reverse-coded).
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          Knobe (2003) first found that people are far more willing to say a foreseen <em>bad</em>{" "}
          side effect was brought about intentionally than a foreseen <em>good</em> one, even though
          the agent&rsquo;s indifference is described in exactly the same words. Phillips, Luguri and
          Knobe ask <em>why</em> morality has this effect &mdash; and propose a single answer that
          also covers a whole family of related findings.
        </p>
        <p style={base.body}>
          Their account turns on <strong>alternative possibilities</strong>. When we judge what
          someone did, we compare it against certain ways things could have gone otherwise &mdash;
          but we treat only some of those alternatives as worth considering at all. Their claim is
          that a moral judgment shapes which alternatives seem relevant: we find it relevant to
          consider possibilities in which a morally bad outcome is replaced by a good one, and
          largely irrelevant to consider the reverse. In the harm version, the possibility that the
          {" "}{S.agent} wanted to <em>avoid</em> harming the environment feels relevant, and against
          that backdrop his indifference looks like intent; in the help version, the matching
          possibility feels beside the point, and the same indifference reads as an accident. In this
          study, that judgment of relevance both moved with the moral swap and statistically mediated
          its effect on the intentional-action rating.
        </p>
        <p style={base.body}>
          The paper shows the very same pattern across four kinds of ordinarily factual judgment: not
          only <strong>intentional action</strong> (this study), but also whether an agent acted{" "}
          <strong>freely</strong> or was forced, whether an action <strong>caused</strong> an
          outcome, and whether an agent <strong>did</strong> something rather than merely{" "}
          <strong>allowed</strong> it to happen. In each domain morality shifts the judgment, in each
          it shifts the relevance of alternatives, and &mdash; most tellingly &mdash; directly
          manipulating which alternatives seem relevant, by non-moral means, reproduces the effect.
          On this view the side-effect effect is not a quirk of the word &lsquo;intentionally&rsquo;
          but one instance of a general way that moral thinking reaches into how we describe the
          world.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Phillips, J., Luguri, J. B., &amp; Knobe, J. (2015). Unifying morality&rsquo;s influence on
          non-moral judgments: The relevance of alternative possibilities.{" "}
          <em>Cognition</em> 145, 30&ndash;42.{" "}
          <a href="https://doi.org/10.1016/j.cognition.2015.08.001" style={{ color: C.text }}>
            doi:10.1016/j.cognition.2015.08.001
          </a>
        </p>
      </div>
    </div>
  );
}
