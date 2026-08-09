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
  violate: "#8C3A2E",
  conform: "#4A6B4F",
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
 * Stimuli — verbatim from Uttich, K. & Lombrozo, T. (2010), "Norms
 * inform mental state ascriptions: A rational explanation for the
 * side-effect effect", Cognition 116(1), 87–100 (Experiment 1, the
 * CEO cover story, p. 89–90).
 *
 * The design is 2 (norm TYPE: moral vs. conventional) × 2 (norm
 * STATUS: conforming vs. violating). The action and the side effect
 * are held identical across the conforming/violating members of each
 * matched pair; only the stipulated norm changes. Segments given as
 * {d: "..."} are the wording that differs between the conforming and
 * violating members of a pair; they are highlighted in the debrief
 * comparison but rendered as plain text during the task.
 *
 * Note on the conventional pair: the published article prints the
 * conforming frame prose ("dark colour / darker than blue") and marks
 * only the vice-president's line with a bracketed alternative. The
 * violating arm below flips the stated convention consistently
 * (light / lighter than blue, and a final line contrary to it) so the
 * stimulus a violating-condition participant would receive is
 * internally coherent; this reconstruction is flagged in the note.
 * Curly quotation marks in the source are rendered as straight quotes
 * per house style; wording, thresholds and colours are otherwise
 * exact.
 * ------------------------------------------------------------------ */
type Seg = string | { d: string };
type NormType = "moral" | "conventional";
type NormStatus = "conforming" | "violating";

interface Version {
  paras: Seg[][];
}

interface NormPair {
  short: string;
  agent: string;
  /** Verbatim appropriateness item (p. 90). */
  item: string;
  conforming: Version;
  violating: Version;
  note: string;
}

const NORMS: Record<NormType, NormPair> = {
  moral: {
    short: "Moral norm",
    agent: "CEO",
    item: "How appropriate is it to say the CEO intentionally harmed the environment?",
    conforming: {
      paras: [
        [
          `A regulatory agency for the Gizmo industry exists in order to provide environmental standards even though it does not have the authority to ensure compliance with these standards. This regulatory agency has established an environmental standard, which states that a company may only start new programs if the chance of environmental harm due to the program is under `,
          { d: "45%" },
          `.`,
        ],
        [
          `The vice-president of a company in the Gizmo industry went to the chairman of the board and said, "We are thinking of starting a new program. It will help us increase profits, but there is a 25% chance that it will also harm the environment. The industry standard is to only start programs of this type when the chance for harm is under `,
          { d: "45%" },
          `."`,
        ],
        [
          `The chairman of the board answered, "I don't care at all about harming the environment. I just want to make as much profit as I can. Let's start the new program."`,
        ],
        [`They started the program. As it happened, the environment was harmed.`],
      ],
    },
    violating: {
      paras: [
        [
          `A regulatory agency for the Gizmo industry exists in order to provide environmental standards even though it does not have the authority to ensure compliance with these standards. This regulatory agency has established an environmental standard, which states that a company may only start new programs if the chance of environmental harm due to the program is under `,
          { d: "5%" },
          `.`,
        ],
        [
          `The vice-president of a company in the Gizmo industry went to the chairman of the board and said, "We are thinking of starting a new program. It will help us increase profits, but there is a 25% chance that it will also harm the environment. The industry standard is to only start programs of this type when the chance for harm is under `,
          { d: "5%" },
          `."`,
        ],
        [
          `The chairman of the board answered, "I don't care at all about harming the environment. I just want to make as much profit as I can. Let's start the new program."`,
        ],
        [`They started the program. As it happened, the environment was harmed.`],
      ],
    },
    note:
      "The moral pair holds everything constant except the stipulated industry standard. In the violating arm the standard is that harm must be under 5% and the actual chance is 25% (breached); in the conforming arm the standard is under 45%, so the same 25% is within it. The action and the outcome — a 25% chance of harm, and the environment harmed — are identical.",
  },
  conventional: {
    short: "Conventional norm",
    agent: "chairman of the board",
    item:
      "How appropriate is it to say the chairman of the board intentionally made Gizmos colored darker than blue?",
    conforming: {
      paras: [
        [
          `The convention in the Gizmo industry is for Gizmos to be a `,
          { d: "dark" },
          ` color. Specifically, the convention is to make Gizmos that are colored `,
          { d: "darker than blue" },
          `.`,
        ],
        [
          `The vice-president of a company in the Gizmo industry went to the chairman of the board and said, "We are thinking of starting a new program. It will help us increase profits, but it will result in our Gizmos being colored black. The convention is to make Gizmos colored `,
          { d: "darker than blue, so we would be complying with the convention" },
          `."`,
        ],
        [
          `The chairman of the board answered, "I don't care at all about the color of the Gizmos. I just want to make as much profit as I can. Let's start the new program."`,
        ],
        [`They started the program. As it happened, the Gizmos were black, `, { d: "colored darker than blue" }, `.`],
      ],
    },
    violating: {
      paras: [
        [
          `The convention in the Gizmo industry is for Gizmos to be a `,
          { d: "light" },
          ` color. Specifically, the convention is to make Gizmos that are colored `,
          { d: "lighter than blue" },
          `.`,
        ],
        [
          `The vice-president of a company in the Gizmo industry went to the chairman of the board and said, "We are thinking of starting a new program. It will help us increase profits, but it will result in our Gizmos being colored black. The convention is to make Gizmos colored `,
          { d: "lighter than blue, so we would be violating the convention" },
          `."`,
        ],
        [
          `The chairman of the board answered, "I don't care at all about the color of the Gizmos. I just want to make as much profit as I can. Let's start the new program."`,
        ],
        [`They started the program. As it happened, the Gizmos were black, `, { d: "contrary to the lighter-than-blue convention" }, `.`],
      ],
    },
    note:
      "The conventional pair is the paper's cleanest cut: the norm at stake is a mere colour convention with no moral content. The action and outcome are identical — the Gizmos come out black — and only the stipulated convention flips. As printed, the article marks just the vice-president's line with a bracketed alternative and leaves the frame prose in the conforming form; the violating version here flips the stated convention throughout so it reads coherently.",
  },
};

/** 1–7 appropriateness scale anchors, verbatim (p. 90). */
const SCALE = {
  lo: "1 — not at all appropriate",
  mid: "4 — neither appropriate nor inappropriate",
  hi: "7 — very appropriate",
};

/** Published values from Uttich & Lombrozo (2010), Experiment 1, for
 *  side-by-side comparison in the debrief. */
const ORIG = {
  n: 300,
  status: { f: "12.828", df: "1, 288", p: "< .01" },
  interaction: { f: "2.269", df: "1, 288", p: ".133" },
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
  study: 1 | 2;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration. Each participant is assigned to one of the four
  // (norm type × norm status) cells, each dimension flipped by an independent coin.
  const [normType, setNormType] = useState<NormType | null>(null);
  const [normStatus, setNormStatus] = useState<NormStatus | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [taskShownAt, setTaskShownAt] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingRtMs, setRatingRtMs] = useState<number | null>(null);
  const [prior, setPrior] = useState<Prior | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  // Debrief comparison selectors, seeded from the assigned cell.
  const [cmpType, setCmpType] = useState<NormType | null>(null);
  const [cmpStatus, setCmpStatus] = useState<NormStatus | null>(null);

  const startTask = (now: number, t: NormType, s: NormStatus) => {
    setNormType(t);
    setNormStatus(s);
    setCmpType(t);
    setCmpStatus(s);
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
      normType,
      normStatus,
      rating,
      ratingRtMs: ratingRtMs ?? 0,
      priorPhilosophy: priorValue,
    };
    try {
      const r = await fetch("/api/experiments/uttich-lombrozo-norms", {
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
  // `normType === null` can only happen before "Begin", so this also serves as the
  // type narrowing that lets every later phase treat the assignment as settled.
  if (phase === "intro" || normType === null || normStatus === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Uttich &amp; Lombrozo 2010 &middot; Experiment 1</div>
          <h1 style={base.h1}>Norms and intentional action</h1>
          <p style={base.body}>
            You will read one short scenario and answer a single question about it. It takes about a
            minute. There are no right answers &mdash; this is a study of how people ordinarily
            describe what someone did.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of four versions of the scenario, and will see
            only that one. Your answer is recorded anonymously &mdash; no name, no login, nothing
            that identifies you. Afterwards you will see all four versions and the original 2010
            results.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() =>
              startTask(
                Date.now(),
                Math.random() < 0.5 ? "moral" : "conventional",
                Math.random() < 0.5 ? "conforming" : "violating"
              )
            }
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const N = NORMS[normType];
  const V = N[normStatus];
  const statusColour = normStatus === "violating" ? C.violate : C.conform;

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = rating !== null;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{N.short} &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} mark={false} />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q</span>
              {N.item}
            </span>
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
                gap: "12px",
                marginTop: "8px",
                fontSize: "13px",
                color: C.muted,
              }}
            >
              <span>{SCALE.lo}</span>
              <span style={{ textAlign: "center" }}>{SCALE.mid}</span>
              <span style={{ textAlign: "right" }}>{SCALE.hi}</span>
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
  const cmpT: NormType = cmpType ?? normType;
  const cmpS: NormStatus = cmpStatus ?? normStatus;
  const cmpN = NORMS[cmpT];
  const cmpColour = cmpS === "violating" ? C.violate : C.conform;

  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Uttich &amp; Lombrozo 2010</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <div
          style={{
            borderLeft: `3px solid ${statusColour}`,
            background: C.well,
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: statusColour, marginBottom: "8px" }}>
            {normType} norm &middot; {normStatus}
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You rated it{" "}
            <strong style={{ color: C.text }}>{rating}</strong> out of 7 &mdash; how appropriate it
            is to say the {N.agent} {normType === "moral" ? "intentionally harmed the environment" : "intentionally made the Gizmos colored darker than blue"}, where the norm the outcome
            {" "}
            <strong style={{ color: C.text }}>{normStatus === "violating" ? "violated" : "conformed to"}</strong>{" "}
            was {normType === "moral" ? "a moral (environmental) standard" : "a purely conventional colour rule"}.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.violate }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The four versions</h2>
        <p style={base.small}>
          The study crosses two things: whether the norm at stake is <em>moral</em> or merely a{" "}
          <em>colour convention</em>, and whether the outcome <em>conforms to</em> or{" "}
          <em>violates</em> that norm. You saw one of the four cells; the rest of the room saw the
          others. Switch between them &mdash; within each norm type, the wording that differs
          between conforming and violating is highlighted.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
          {(["moral", "conventional"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCmpType(t)}
              aria-pressed={cmpT === t}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmpT === t ? C.surface : C.well,
                color: cmpT === t ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmpT === t ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              }}
            >
              {t} norm
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {(["conforming", "violating"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setCmpStatus(s)}
              aria-pressed={cmpS === s}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmpS === s ? C.surface : C.well,
                color: cmpS === s ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmpS === s ? `2px solid ${s === "violating" ? C.violate : C.conform}` : `1px solid ${C.border}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "10px" }}>
          <Paras paras={cmpN[cmpS].paras} mark />
        </div>
        <p style={{ ...base.small, marginBottom: "16px" }}>
          <span style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.12em", color: cmpColour, textTransform: "uppercase" }}>
            {cmpN.item}
          </span>
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          {cmpN.note}
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>The original result</h2>
        <p style={base.body}>
          Uttich &amp; Lombrozo ran this with N&nbsp;=&nbsp;{ORIG.n} participants across all four
          cells (plus two other cover stories). Averaging over norm type, people rated the very same
          outcome <strong style={{ color: C.violate }}>more appropriate to call &lsquo;intentional&rsquo;</strong>{" "}
          when it <strong style={{ color: C.violate }}>violated</strong> the applicable norm than
          when it <strong style={{ color: C.conform }}>conformed</strong> to it &mdash; a main effect
          of norm status, F({ORIG.status.df})&nbsp;=&nbsp;{ORIG.status.f}, p&nbsp;{ORIG.status.p}.
        </p>
        <p style={base.body}>
          Crucially, there was <strong style={{ color: C.text }}>no norm-status &times; norm-type
          interaction</strong>, F({ORIG.interaction.df})&nbsp;=&nbsp;{ORIG.interaction.f},
          p&nbsp;=&nbsp;{ORIG.interaction.p}: the conforming-to-violating gap was comparable whether
          the norm was moral or a mere colour convention. The asymmetry showed up even for the
          convention, where nothing morally good or bad is at stake &mdash; the key result.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          Knobe (2003) found that people are far more willing to call a foreseen side effect
          &lsquo;intentional&rsquo; when it is <em>bad</em> than when it is <em>good</em>. One reading is
          that moral badness is doing the work. Uttich &amp; Lombrozo argue instead for a{" "}
          <strong style={{ color: C.text }}>&lsquo;Rational Scientist&rsquo;</strong> account: what matters
          is norm <em>violation</em>, not moral valence as such. Norm-conforming behaviour is
          uninformative &mdash; an agent has a standing reason to comply anyway &mdash; whereas
          norm-violating behaviour reveals a countervailing reason strong enough to override the
          norm, licensing the inference that the agent wanted the outcome enough to accept it, which
          in turn supports an &lsquo;intentional&rsquo; ascription. Because the mechanism is
          informativeness rather than morality, the same asymmetry should appear for a purely
          conventional norm &mdash; and it does.
        </p>
        <p style={base.small}>
          Two cautions the authors themselves stress. First, the claim is that norm status is{" "}
          <em>sufficient</em> to produce the effect and that moral status is <em>not necessary</em>{" "}
          &mdash; not that moral judgment plays no role at all. Second, the effects are modest: they
          rest on a main effect pooled across cells rather than a dramatic flip in any single one. In
          the main study the individual CEO-moral cell was not significant on its own (it only
          reached significance in a large N&nbsp;=&nbsp;431 replication). So read this as evidence
          that norm violation, not moral badness specifically, drives the side-effect effect &mdash;
          not as a clean per-cell knockout.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Uttich, K., &amp; Lombrozo, T. (2010). Norms inform mental state ascriptions: A rational
          explanation for the side-effect effect. <em>Cognition</em> 116(1), 87&ndash;100.{" "}
          <a href="https://doi.org/10.1016/j.cognition.2010.04.003" style={{ color: C.text }}>
            doi:10.1016/j.cognition.2010.04.003
          </a>
        </p>
      </div>
    </div>
  );
}
