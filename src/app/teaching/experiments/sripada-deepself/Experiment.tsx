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
  // Two neutral tones, one per condition — NOT a moral good/bad coding.
  // Both outcomes in this study are morally neutral; the tones only tell the
  // "concordance absent" arm apart from the "concordance present" arm.
  rifle: "#7A6A52",
  policeman: "#3E5C74",
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
 * Stimuli — verbatim from Sripada, C. S. (2010), "The Deep Self Model
 * and asymmetries in folk judgments about intentional action",
 * Philosophical Studies 151(2), 159–176.
 *   - Rifle Contest (concordance ABSENT, morally NEUTRAL): the shared
 *     paragraph, originally Knobe (2006), reported p. 170.
 *   - Policeman Rifle Contest (concordance PRESENT, morally NEUTRAL):
 *     Sripada's own vignette, pp. 171–172 — the SAME shared paragraph
 *     with one attitude-setting paragraph prepended.
 * Segments given as {d: "..."} are the added attitude-setting text that
 * appears ONLY in the Policeman version; they are highlighted in the
 * debrief comparison but rendered as plain text during the task itself.
 * OCR spacing/punctuation artifacts were normalized; wording is unaltered,
 * including the spelling variants "bulls-eye" / "bull's eye" / "bull's-eye"
 * as printed. (The source's "Jake→John" name slip is in the Aunt Killer
 * arm, which this flagship does not use, so no slip is reproduced here.)
 *
 * SINGLE-SCALE VERSION (spec §4): the original data mixed response
 * instruments — Knobe's binary intentional/not for the Rifle Contest,
 * Sripada's 6-point agreement scale for the Policeman case. Per the spec's
 * recommendation, BOTH conditions here are run on ONE identical instrument:
 * the 6-point agreement scale for "Jake intentionally hit the target"
 * (1 = Agree … 6 = Disagree), verbatim from p. 172. This is a tighter
 * single-scale replication, not a verbatim reproduction of the
 * mixed-measure original.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type Condition = "rifle" | "policeman";

// The verbatim paragraph shared, word-for-word, by both conditions (p. 170).
const SHARED_PARA =
  "Jake desperately wants to win the rifle contest. He knows that he will only win the contest if he hits the bulls-eye. He raises the rifle, gets the bull's eye in the sights, and presses the trigger. But Jake isn't very good at using his rifle. His hand slips on the barrel of the gun, and the shot goes wild... Nonetheless, the bullet lands directly on the bull's-eye. Jake wins the contest.";

// The attitude-setting paragraph prepended ONLY in the Policeman version (pp. 171–172).
const POLICEMAN_PARA =
  "Ever since he was a little boy, Jake has wanted to be a police officer more than anything else, and he would be devastated if his dream never came true. So Jake decides to go to register at the local police academy. However, the police academy has too many recruits for its entering class. In order to decide who will stay and who will be cut, the recruits have a competition to see who can hit a target with a rifle.";

interface Version {
  paras: Seg[][];
}

interface Study {
  short: string;
  name: string;
  agent: string;
  /** Statement rated for agreement — identical across both conditions (single-scale). */
  statement: string;
  lo: string;
  hi: string;
  rifle: Version;
  policeman: Version;
  /** Original figures, honestly labelled by their (differing) source measures. */
  orig: {
    rifle: { pct: number; measure: string };
    policeman: { pct: number; mean: number; n: number; measure: string };
  };
  note: string;
}

const STUDY: Study = {
  short: "Rifle / Policeman",
  name: "The rifle contest",
  agent: "Jake",
  statement: "Jake intentionally hit the target.",
  lo: "1 — Agree",
  hi: "6 — Disagree",
  rifle: {
    // Concordance ABSENT: Jake enters a rifle contest with no established
    // skill or stake, so subjects infer no settled commitment the win fits.
    paras: [[SHARED_PARA]],
  },
  policeman: {
    // Concordance PRESENT: the added first paragraph supplies a lifelong,
    // settled ambition (becoming a police officer) that winning concords with.
    paras: [[{ d: POLICEMAN_PARA }], [SHARED_PARA]],
  },
  orig: {
    rifle: { pct: 23, measure: "Knobe (2006) binary intentional/not question" },
    policeman: {
      pct: 90,
      mean: 2.0,
      n: 40,
      measure: "Sripada (2010) 6-point agreement scale, N = 40",
    },
  },
  note:
    "Both versions end on the exact same paragraph — the shot 'goes wild' yet lands on the bull's-eye and Jake wins. The Policeman version adds only the opening paragraph (highlighted), which gives Jake a lifelong, settled ambition the win fits. Nothing about the outcome's moral status changes: winning a rifle contest is neutral in both. The single manipulation is whether the story supplies a deep, stable commitment the outcome concords with.",
};

const WHY_MATTERS_1 =
  "On the Deep Self Concordance model (Sripada 2010), people call a foreseen outcome 'intentional' more readily when it fits the agent's settled, longstanding values and commitments — the attitudes of the agent's 'Deep Self' — and this holds independent of whether the outcome is morally good, bad, or neutral.";

const WHY_MATTERS_2 =
  "Both versions here are morally neutral, so moral valence is held fixed. The only thing that varies is whether the story gives Jake a stable commitment the win concords with. Where it does — the lifelong aspiring police officer — people agree the hit was intentional. Where it does not — the bare rifle contest, entered by someone with no rifle skill and no established stake — they do not. Because both outcomes are neutral, an account on which 'bad outcomes look more intentional' cannot explain the gap. Concordance with who the agent deeply is can.";

const ORIG_NOTE =
  "These two numbers come from different response measures. The Rifle Contest figure is Knobe's (2006) binary intentional/not question; the Policeman figure is Sripada's own 6-point agreement scale (N = 40), counting responses to the left of the midline, with a mean of 2.0 on the 1–6 scale (1 = Agree). Because the instruments differ, the 23% → 90% jump is not a like-for-like contrast. This classroom version instead puts BOTH conditions on that single 6-point scale, so your class's two bars are directly comparable to each other.";

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
  /** Single-study design; kept for parity with the other cold experiments. */
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
  const [rating, setRating] = useState<number | null>(null);
  const [responseRtMs, setResponseRtMs] = useState<number | null>(null);
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
    if (taskShownAt !== null && responseRtMs === null) setResponseRtMs(now - taskShownAt);
    setRating(v);
  };

  const send = async (priorValue: Prior | null) => {
    if (submitting) return;
    setSubmitting(true);
    // Left of the 1–6 midline (rating <= 3) counts as agreeing the hit was intentional.
    const intentional = rating !== null ? rating <= 3 : false;
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      study,
      condition,
      rating,
      intentional,
      responseRtMs: responseRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/sripada-deepself", {
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
          <div style={base.eyebrow}>Sripada 2010 &middot; {S.short}</div>
          <h1 style={base.h1}>The deep self and intentional action</h1>
          <p style={base.body}>
            You will read one short scenario and answer one question about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the scenario, and will see
            only that one. Your answer is recorded anonymously &mdash; no name, no login, nothing
            that identifies you. Afterwards you will see both versions and the original results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() => startTask(Date.now(), Math.random() < 0.5 ? "rifle" : "policeman")}
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const V = S[condition];
  const condColour = condition === "rifle" ? C.rifle : C.policeman;
  const condLabel = condition === "rifle" ? "Rifle Contest" : "Policeman Rifle Contest";
  const cmp: Condition = compare ?? condition;
  const cmpColour = cmp === "rifle" ? C.rifle : C.policeman;

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
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              How much do you agree with the following statement?
            </span>
            <div
              style={{
                fontSize: "19px",
                fontStyle: "italic",
                color: C.text,
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              &ldquo;{S.statement}&rdquo;
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => {
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
              <span>{S.lo}</span>
              <span>{S.hi}</span>
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
              Choose a point on the scale to continue.
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
  const agreed = rating !== null && rating <= 3;
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
            {condLabel}
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You rated your agreement with &ldquo;{S.statement}&rdquo; at{" "}
            <strong style={{ color: C.text }}>{rating}</strong> out of 6 (1 = agree, 6 = disagree)
            &mdash; which counts as{" "}
            <strong style={{ color: C.text }}>{agreed ? "agreeing" : "disagreeing"}</strong> that the
            hit was intentional.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.rifle }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The two versions</h2>
        <p style={base.small}>
          Half the room read the other one. Switch between them &mdash; the wording that the
          Policeman version adds is highlighted.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(["rifle", "policeman"] as const).map((c) => (
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
              {c === "rifle" ? "Rifle Contest" : "Policeman version"}
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

        <h2 style={base.h2}>The original results</h2>
        <div style={{ marginBottom: "14px" }}>
          {([["Rifle Contest", o.rifle.pct, C.rifle], ["Policeman", o.policeman.pct, C.policeman]] as const).map((row) => (
            <div
              key={row[0]}
              style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}
            >
              <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "120px" }}>
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
          Percent judging the hit intentional: Rifle Contest {o.rifle.pct}% ({o.rifle.measure});
          Policeman {o.policeman.pct}% agreeing, mean {o.policeman.mean.toFixed(1)} on the 1&ndash;6
          scale ({o.policeman.measure}).
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {ORIG_NOTE}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>{WHY_MATTERS_1}</p>
        <p style={base.body}>{WHY_MATTERS_2}</p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Sripada, C. S. (2010). The Deep Self Model and asymmetries in folk judgments about
          intentional action. <em>Philosophical Studies</em> 151(2), 159&ndash;176.{" "}
          <a href="https://doi.org/10.1007/s11098-009-9423-5" style={{ color: C.text }}>
            doi:10.1007/s11098-009-9423-5
          </a>
        </p>
      </div>
    </div>
  );
}
