"use client";

import { useMemo, useRef, useState } from "react";
import {
  SETS,
  TRIADS,
  REPS,
  PUBLISHED,
  PRACTICE,
  isPredicted,
  type SetId,
  type StimulusChip,
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
  well: "#FAFAF9",
  red: "#CC1A14",
  // The paper mounts triads on off-white Munsell display card in a light box.
  card: "#E7E5E4",
};

const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(10px, 3vw, 20px)",
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
  well: {
    fontSize: "17px",
    lineHeight: 1.7,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "22px 24px",
    marginBottom: "26px",
  },
  input: {
    border: `1px solid ${C.border}`,
    padding: "12px 16px",
    fontSize: "19px",
    fontFamily: "'Crimson Pro', Georgia, serif",
    width: "100%",
    outline: "none",
    background: C.well,
    boxSizing: "border-box" as const,
  },
  // Task screens run on a plain field, nothing that could cue the design.
  stage: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
};

type Phase = "intro" | "language" | "practice" | "block" | "break" | "wrapup" | "debrief";
type ColorVision = "typical" | "atypical" | "unsure";

interface Trial {
  set: SetId;
  triad: number; // index into TRIADS
  rep: number;
  /** Position permutation: order[i] = which of the triad's three chips sits at
   * screen position i (0 top, 1 bottom-left, 2 bottom-right). */
  order: [number, number, number];
}

interface TrialResult {
  set: SetId;
  triad: number;
  rep: number;
  pair: [number, number]; // 1-based chip indices in the series, sorted
  predicted: boolean;
  rtMs: number;
}

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeBlock(set: SetId): Trial[] {
  const trials: Trial[] = [];
  for (let t = 0; t < TRIADS.length; t++) {
    for (let rep = 0; rep < REPS; rep++) {
      trials.push({
        set,
        triad: t,
        rep,
        order: shuffle([0, 1, 2]) as [number, number, number],
      });
    }
  }
  return shuffle(trials);
}

/** The three chips laid out as the paper mounts them: an equilateral
 * triangle, one above, two below, on an off-white card. */
function TriadCard({
  chips,
  order,
  selected,
  onPick,
}: {
  chips: StimulusChip[];
  order: [number, number, number];
  selected: number[];
  onPick: (chipIdx: number) => void;
}) {
  const chipEl = (chipIdx: number) => {
    const isSel = selected.includes(chipIdx);
    return (
      <button
        aria-label="color chip"
        onClick={() => onPick(chipIdx)}
        style={{
          width: "clamp(72px, 18vw, 110px)",
          height: "clamp(72px, 18vw, 110px)",
          background: chips[chipIdx].hex,
          border: "none",
          borderRadius: "2px",
          cursor: "pointer",
          boxShadow: isSel
            ? "0 0 0 3px #FFFFFF, 0 0 0 6px #1C1917"
            : "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    );
  };
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: "4px",
        padding: "clamp(24px, 6vw, 44px) clamp(28px, 8vw, 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(20px, 5vw, 36px)",
      }}
    >
      <div>{chipEl(order[0])}</div>
      <div style={{ display: "flex", gap: "clamp(28px, 9vw, 72px)" }}>
        {chipEl(order[1])}
        {chipEl(order[2])}
      </div>
    </div>
  );
}

export default function Experiment({ session, tag }: { session: string; tag: string | null }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [firstLanguage, setFirstLanguage] = useState("");
  const [colorVision, setColorVision] = useState<ColorVision | null>(null);

  const [setOrder, setSetOrder] = useState<[SetId, SetId] | null>(null);
  const [blockIdx, setBlockIdx] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [trialIdx, setTrialIdx] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);

  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceNote, setPracticeNote] = useState<string | null>(null);
  const [practiceOrder, setPracticeOrder] = useState<[number, number, number]>([0, 1, 2]);

  const [selected, setSelected] = useState<number[]>([]);
  const shownAt = useRef<number>(0);
  const locked = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  const scores = useMemo(() => {
    const tally = (set: SetId) => results.filter((r) => r.set === set && r.predicted).length;
    return { gb: tally("gb"), nw: tally("nw") };
  }, [results]);

  const startPractice = () => {
    setPracticeIdx(0);
    setPracticeNote(null);
    setPracticeOrder(shuffle([0, 1, 2]) as [number, number, number]);
    setSelected([]);
    setPhase("practice");
    shownAt.current = Date.now();
  };

  const startBlock = (which: 0 | 1, order?: [SetId, SetId]) => {
    const o = order ?? setOrder!;
    setBlockIdx(which);
    setTrials(makeBlock(o[which]));
    setTrialIdx(0);
    setSelected([]);
    setPhase("block");
    shownAt.current = Date.now();
  };

  const pickPractice = (chipIdx: number) => {
    if (locked.current) return;
    setSelected((prev) => {
      if (prev.includes(chipIdx)) return prev.filter((x) => x !== chipIdx);
      const next = [...prev, chipIdx];
      if (next.length === 2) {
        locked.current = true;
        const ok = next.includes(0) && next.includes(1);
        setTimeout(() => {
          locked.current = false;
          setSelected([]);
          if (!ok) {
            // Practice exists to confirm the task is understood (p. 389):
            // point out the intended pair and let them try once more.
            setPracticeNote(PRACTICE[practiceIdx].note);
            setPracticeOrder(shuffle([0, 1, 2]) as [number, number, number]);
            shownAt.current = Date.now();
            return;
          }
          setPracticeNote(null);
          if (practiceIdx === 0) {
            setPracticeIdx(1);
            setPracticeOrder(shuffle([0, 1, 2]) as [number, number, number]);
            shownAt.current = Date.now();
          } else {
            const o: [SetId, SetId] = Math.random() < 0.5 ? ["gb", "nw"] : ["nw", "gb"];
            setSetOrder(o);
            startBlock(0, o);
          }
        }, 350);
      }
      return next;
    });
  };

  const pickTrial = (chipIdx: number) => {
    if (locked.current) return;
    setSelected((prev) => {
      if (prev.includes(chipIdx)) return prev.filter((x) => x !== chipIdx);
      const next = [...prev, chipIdx];
      if (next.length === 2) {
        locked.current = true;
        const trial = trials[trialIdx];
        const def = TRIADS[trial.triad];
        const pair = next
          .map((i) => def.chips[i])
          .sort((a, b) => a - b) as [number, number];
        const result: TrialResult = {
          set: trial.set,
          triad: trial.triad,
          rep: trial.rep,
          pair,
          predicted: isPredicted(def, pair),
          rtMs: Date.now() - shownAt.current,
        };
        setTimeout(() => {
          locked.current = false;
          setResults((r) => [...r, result]);
          setSelected([]);
          if (trialIdx + 1 < trials.length) {
            setTrialIdx(trialIdx + 1);
            shownAt.current = Date.now();
          } else if (blockIdx === 0) {
            setPhase("break");
          } else {
            setPhase("wrapup");
          }
        }, 350);
      }
      return next;
    });
  };

  const send = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      firstLanguage: firstLanguage.trim().slice(0, 60),
      colorVision,
      setOrder,
      trials: results,
      scores,
    };
    try {
      const r = await fetch("/api/experiments/roberson-triads", {
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

  /* ------------------------------ INTRO ------------------------------ */
  if (phase === "intro") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Roberson, Davies &amp; Davidoff 2000</div>
          <h1 style={base.h1}>Which two look most alike?</h1>
          <p style={base.body}>
            You will see three color chips at a time, arranged in a triangle. Your job is simply
            to click the <em>two that look most like each other</em>. That&rsquo;s the whole
            task — there are no right or wrong answers, only your eye.
          </p>
          <p style={base.body}>
            There are two short stretches of these judgments with a pause between, about five
            minutes in all. It matters where the colors come from, but you&rsquo;ll be told that
            at the end — knowing it now would spoil your data.
          </p>
          <p style={base.small}>
            Your responses are recorded anonymously — no name, no login. What is recorded is
            which pairs you chose and how long you took. Best taken on a laptop or a phone held
            sideways, screen bright.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setStartedAt(Date.now());
              setPhase("language");
            }}
          >
            Begin →
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- LANGUAGE ----------------------------- */
  if (phase === "language") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>One question first</div>
          <h2 style={base.h2}>What was your first language?</h2>
          <p style={base.small}>
            The language you grew up speaking. It matters to the analysis — you&rsquo;ll see why
            at the end.
          </p>
          <input
            style={base.input}
            value={firstLanguage}
            maxLength={60}
            autoFocus
            placeholder="e.g. English"
            onChange={(e) => setFirstLanguage(e.target.value)}
          />
          <button
            style={{ ...base.btn, opacity: firstLanguage.trim() ? 1 : 0.4 }}
            disabled={!firstLanguage.trim()}
            onClick={startPractice}
          >
            Two practice rounds →
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- PRACTICE ----------------------------- */
  if (phase === "practice") {
    return (
      <div style={base.stage}>
        <style>{FONTS}</style>
        <p style={{ ...base.mono, fontSize: "11px", color: C.muted, marginBottom: "16px" }}>
          practice {practiceIdx + 1} of 2 — click the two that look most alike
        </p>
        <TriadCard
          chips={PRACTICE[practiceIdx].chips}
          order={practiceOrder}
          selected={selected}
          onPick={pickPractice}
        />
        {practiceNote && (
          <p style={{ ...base.small, marginTop: "16px", color: C.body }}>
            Most people pick {practiceNote} here — try once more, choosing purely by how similar
            the colors look.
          </p>
        )}
      </div>
    );
  }

  /* ------------------------------- BLOCK ------------------------------- */
  if (phase === "block") {
    const trial = trials[trialIdx];
    const def = TRIADS[trial.triad];
    const chips = def.chips.map((i) => SETS[trial.set].chips[i - 1]);
    return (
      <div style={base.stage}>
        <style>{FONTS}</style>
        <p style={{ ...base.mono, fontSize: "11px", color: C.muted, marginBottom: "16px" }}>
          {blockIdx === 0 ? "first" : "second"} stretch · {trialIdx + 1} / {trials.length}
        </p>
        <TriadCard chips={chips} order={trial.order} selected={selected} onPick={pickTrial} />
        <p style={{ ...base.mono, fontSize: "10px", color: C.muted, marginTop: "16px" }}>
          click the two that look most alike
        </p>
      </div>
    );
  }

  /* ------------------------------- BREAK ------------------------------- */
  if (phase === "break") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Halfway</div>
          <h2 style={base.h2}>One stretch down, one to go</h2>
          <p style={base.body}>
            The second stretch works exactly the same way: three chips, click the two that look
            most alike. The colors will be different.
          </p>
          <button style={base.btn} onClick={() => startBlock(1)}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------- WRAPUP ------------------------------- */
  if (phase === "wrapup") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Last question</div>
          <h2 style={base.h2}>As far as you know, is your color vision typical?</h2>
          {(
            [
              ["typical", "Typical, as far as I know"],
              ["atypical", "Atypical (e.g. some form of color-blindness)"],
              ["unsure", "Not sure"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              style={{
                display: "block",
                fontSize: "17px",
                color: C.body,
                marginBottom: "6px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="cv"
                checked={colorVision === v}
                onChange={() => setColorVision(v)}
                style={{ marginRight: "10px" }}
              />
              {label}
            </label>
          ))}
          <button
            style={{ ...base.btn, opacity: colorVision !== null && !submitting ? 1 : 0.5 }}
            disabled={colorVision === null || submitting}
            onClick={send}
          >
            {submitting ? "Sending…" : "Submit →"}
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------- DEBRIEF ------------------------------- */
  const cell = (v: number, mine?: boolean) => (
    <td
      style={{
        padding: "8px 14px",
        borderBottom: `1px solid ${C.border}`,
        fontFamily: "'Space Mono', monospace",
        fontSize: "13px",
        color: mine ? "#1E7A46" : C.text,
        fontWeight: mine ? 700 : 400,
      }}
    >
      {v}
    </td>
  );
  return (
    <div style={{ ...base.wrap, alignItems: "flex-start" }}>
      <style>{FONTS}</style>
      <div style={{ ...base.card, maxWidth: "760px" }}>
        <div style={base.eyebrow}>Debrief</div>
        <h2 style={base.h2}>The double dissociation</h2>
        {submitStatus === "err" && (
          <p style={{ ...base.mono, fontSize: "12px", color: C.red }}>
            Your responses could not be sent — tell your instructor. The debrief below still
            applies.
          </p>
        )}
        <p style={base.body}>
          One set of chips straddled the boundary English draws between <em>green</em> and{" "}
          <em>blue</em>. The other straddled a boundary English does not mark at all: the line
          Berinmo — a language of Papua New Guinea with five basic color terms — draws between{" "}
          <em>nol</em> and <em>wor</em>, cutting straight through what English calls green. In
          each triad there was one pairing that respects the boundary; the question is whether
          your eye favored it.
        </p>
        <div style={base.well}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["", "green–blue (of 32)", "nol–wor (of 32)"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 14px",
                      borderBottom: `2px solid ${C.border}`,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, fontSize: "16px" }}>
                  <b>You</b>
                </td>
                {cell(scores.gb, true)}
                {cell(scores.nw, true)}
              </tr>
              <tr>
                <td style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, fontSize: "16px" }}>
                  English speakers (published)
                </td>
                {cell(PUBLISHED.english.gb)}
                {cell(PUBLISHED.english.nw)}
              </tr>
              <tr>
                <td style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, fontSize: "16px" }}>
                  Berinmo speakers (published)
                </td>
                {cell(PUBLISHED.berinmo.gb)}
                {cell(PUBLISHED.berinmo.nw)}
              </tr>
            </tbody>
          </table>
          <p style={{ ...base.mono, fontSize: "11px", color: C.muted, margin: "10px 0 0" }}>
            Boundary-respecting choices out of 32; the paper treats 16 as chance. Means from
            Table 10, p. 389.
          </p>
        </div>
        <p style={base.body}>
          Roberson, Davies and Davidoff found a double dissociation: English speakers followed
          the green–blue boundary and sat at chance on nol–wor; Berinmo speakers did exactly the
          reverse. Each group&rsquo;s <em>language</em>, not a universal perceptual boundary,
          predicted where similarity snapped into place. That was the paper&rsquo;s answer to
          the universalist reading of Berlin &amp; Kay and of Rosch Heider&rsquo;s Dani work —
          and your row of the table is one more English-arm data point (or, if your first
          language draws these lines differently, something rarer and more interesting).
        </p>
        <div style={base.well}>
          <strong>Where this deviates from the original.</strong>{" "}The original used painted
          Munsell chips in a daylight light box; you used a screen, and the nine green–blue
          chips sit slightly outside what an sRGB monitor can show, so each lost a little
          saturation (uniformly, with the hue steps preserved). The original&rsquo;s two
          sessions a week apart are here two stretches a minute apart, and its participants
          were screened with clinical color-vision tests — you were asked instead.
        </div>
        <p style={base.small}>
          Source: Roberson, D., Davies, I. &amp; Davidoff, J. (2000), &ldquo;Color Categories
          Are Not Universal: Replications and New Evidence From a Stone-Age Culture&rdquo;,
          J. Exp. Psychol.: General 129(3), 369–398, doi:10.1037/0096-3445.129.3.369.
          Experiment 4; triads from Figure 8; chip colorimetry from the Munsell renotation
          data. Stimuli: nine chips spanning 7.5G→7.5B and nine spanning 5Y→5G, all Munsell
          value 5, chroma 8.
        </p>
      </div>
    </div>
  );
}
