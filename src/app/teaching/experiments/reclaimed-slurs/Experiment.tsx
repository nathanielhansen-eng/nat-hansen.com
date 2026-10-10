"use client";

import { useMemo, useRef, useState } from "react";
import {
  MEASURES,
  MEASURE_SPECS,
  SCALE_MAX,
  SCALE_MIN,
  SLUG,
  TERMS,
  composite,
  shuffle,
  type Measure,
  type Ratings,
  type Term,
} from "@/lib/reclaimed-slurs";
import pilot from "./pilot-reference.json";

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
  // Plasma stops used for the age groups in the pilot's figures.
  under30: "#CC4778",
  over60: "#F9C726",
};

const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "clamp(28px, 6vw, 52px) clamp(20px, 6vw, 56px)",
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
  h2: { fontSize: "25px", fontWeight: 400, lineHeight: 1.25, marginBottom: "10px", color: C.text },
  body: { fontSize: "19px", lineHeight: 1.65, color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: 1.55, color: C.muted, marginBottom: "14px" },
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
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
};

const SLIDER_CSS = `
.rs-range { -webkit-appearance: none; appearance: none; width: 100%; height: 36px; background: transparent; margin: 0; cursor: pointer; touch-action: none; }
.rs-range::-webkit-slider-runnable-track { height: 4px; background: ${C.border}; }
.rs-range::-moz-range-track { height: 4px; background: ${C.border}; }
.rs-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: ${C.text}; margin-top: -9px; border: 3px solid ${C.surface}; box-shadow: 0 0 0 1px ${C.text}; }
.rs-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${C.text}; border: 3px solid ${C.surface}; box-shadow: 0 0 0 1px ${C.text}; }
.rs-range.untouched::-webkit-slider-thumb { opacity: 0; }
.rs-range.untouched::-moz-range-thumb { opacity: 0; }
`;

type Stage = "intro" | "block" | "age" | "sending" | "done" | "error";
type Draft = { [T in Term]?: { [M in Measure]?: number } };

function RatingSlider({
  value,
  onChange,
  low,
  high,
  label,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  low: string;
  high: string;
  label: string;
}) {
  const touched = value !== undefined;
  return (
    <div>
      <input
        type="range"
        className={`rs-range${touched ? "" : " untouched"}`}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={1}
        value={touched ? value : 0}
        aria-label={label}
        aria-valuetext={touched ? String(value) : "not yet answered"}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => {
          // A click on the untouched track at exactly the midpoint fires no change
          // event; record it so the participant isn't stuck.
          if (!touched) {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            onChange(Math.round(SCALE_MIN + frac * (SCALE_MAX - SCALE_MIN)));
          }
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...base.mono,
          fontSize: "11px",
          color: C.muted,
          letterSpacing: "0.04em",
        }}
      >
        <span>{low} · −50</span>
        <span style={{ color: touched ? C.text : C.muted, fontWeight: touched ? 700 : 400 }}>
          {touched ? (value > 0 ? `+${value}` : value) : "—"}
        </span>
        <span>+50 · {high}</span>
      </div>
    </div>
  );
}

// Where one score sits against the pilot's two age groups, on the -50..50 line.
function ScoreStrip({ term, score }: { term: Term; score: number }) {
  const ref = pilot.terms[term];
  const x = (v: number) => `${((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
  const mark = (v: number, color: string, title: string) => (
    <div
      title={title}
      style={{
        position: "absolute",
        left: x(v),
        top: "50%",
        width: "12px",
        height: "12px",
        transform: "translate(-50%, -50%) rotate(45deg)",
        background: color,
        border: "1px solid #333",
      }}
    />
  );
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "20px", color: C.text }}>‘{term}’</span>
        <span style={{ ...base.mono, fontSize: "13px", color: C.text }}>
          you: {score > 0 ? "+" : ""}
          {score.toFixed(1)}
        </span>
      </div>
      <div style={{ position: "relative", height: "26px", margin: "4px 0" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "2px", background: C.border }} />
        <div style={{ position: "absolute", left: "50%", top: "20%", bottom: "20%", width: "1px", background: "#aaa" }} />
        {mark(ref.under30.mean, C.under30, `Pilot under-30s: ${ref.under30.mean}`)}
        {mark(ref.over60.mean, C.over60, `Pilot over-60s: ${ref.over60.mean}`)}
        <div
          style={{
            position: "absolute",
            left: x(score),
            top: "50%",
            width: "14px",
            height: "14px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: C.text,
            border: `2px solid ${C.surface}`,
            boxShadow: `0 0 0 1px ${C.text}`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", ...base.mono, fontSize: "10px", color: C.muted }}>
        <span>−50</span>
        <span>0</span>
        <span>+50</span>
      </div>
    </div>
  );
}

export default function Experiment({ session, tag }: { session: string; tag: string | null }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [blockIdx, setBlockIdx] = useState(0);
  const [ratings, setRatings] = useState<Draft>({});
  const [ageText, setAgeText] = useState("");
  const startedAt = useRef<number>(0);

  // Block order and within-block term order are randomized once per participant.
  const blockOrder = useMemo(() => shuffle(MEASURES), []);
  const termOrders = useMemo(
    () => Object.fromEntries(MEASURES.map((m) => [m, shuffle(TERMS)])) as Record<Measure, Term[]>,
    [],
  );

  const measure = blockOrder[blockIdx];
  const spec = MEASURE_SPECS[measure];
  const blockDone = TERMS.every((t) => ratings[t]?.[measure] !== undefined);

  const setRating = (t: Term, m: Measure, v: number) =>
    setRatings((prev) => ({ ...prev, [t]: { ...prev[t], [m]: v } }));

  const ageNum = ageText.trim() === "" ? null : Number(ageText);
  const ageValid = ageNum === null || (Number.isInteger(ageNum) && ageNum >= 16 && ageNum <= 100);

  async function submit() {
    setStage("sending");
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.current,
      blockOrder,
      ratings: ratings as Ratings,
      age: ageNum,
    };
    try {
      const r = await fetch(`/api/experiments/${SLUG}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStage(r.ok ? "done" : "error");
    } catch {
      setStage("error");
    }
  }

  return (
    <div style={base.wrap}>
      <style>{FONTS + SLIDER_CSS}</style>
      <div style={base.card}>
        {stage === "intro" && (
          <>
            <div style={base.eyebrow}>Classroom survey · about 3 minutes</div>
            <h1 style={base.h1}>Four words, four questions</h1>
            <p style={base.body}>
              You will see four words that are sometimes used to describe people. For each one we ask four
              short questions, each on a slider from −50 to +50. There are no right answers: we want to
              know how the words strike <em>you</em>.
            </p>
            <p style={base.small}>
              Some of these words can be used as insults. Your answers are anonymous: nothing identifies
              you, and the class will only see pooled results. You can stop at any time.
            </p>
            <button
              style={base.btn}
              onClick={() => {
                startedAt.current = Date.now();
                setStage("block");
              }}
            >
              Begin →
            </button>
          </>
        )}

        {stage === "block" && (
          <>
            <div style={base.eyebrow}>
              Part {blockIdx + 1} of {blockOrder.length}
            </div>
            <h2 style={base.h2}>{spec.question("____")}</h2>
            <p style={base.small}>Move each slider. The marker appears once you touch the line.</p>
            <div style={base.divider} />
            {termOrders[measure].map((t) => (
              <div key={t} style={{ marginBottom: "30px" }}>
                <div style={{ fontSize: "18px", color: C.text, marginBottom: "4px" }}>{spec.question(t)}</div>
                <RatingSlider
                  value={ratings[t]?.[measure]}
                  onChange={(v) => setRating(t, measure, v)}
                  low={spec.low}
                  high={spec.high}
                  label={spec.question(t)}
                />
              </div>
            ))}
            <button
              style={{ ...base.btn, opacity: blockDone ? 1 : 0.35, cursor: blockDone ? "pointer" : "not-allowed" }}
              disabled={!blockDone}
              onClick={() => {
                window.scrollTo({ top: 0 });
                if (blockIdx + 1 < blockOrder.length) setBlockIdx(blockIdx + 1);
                else setStage("age");
              }}
            >
              Next →
            </button>
          </>
        )}

        {stage === "age" && (
          <>
            <div style={base.eyebrow}>Last question</div>
            <h2 style={base.h2}>What is your age in years?</h2>
            <p style={base.small}>Optional. Leave it blank if you would rather not say.</p>
            <input
              inputMode="numeric"
              value={ageText}
              onChange={(e) => setAgeText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              style={{
                border: `1px solid ${C.border}`,
                padding: "12px 16px",
                fontSize: "19px",
                fontFamily: "'Crimson Pro', Georgia, serif",
                width: "140px",
                background: C.well,
                outline: "none",
              }}
            />
            {!ageValid && (
              <div style={{ ...base.mono, fontSize: "12px", color: "#CC1A14", marginTop: "8px" }}>
                Please enter a whole number between 16 and 100, or leave it blank.
              </div>
            )}
            <div>
              <button
                style={{ ...base.btn, opacity: ageValid ? 1 : 0.35 }}
                disabled={!ageValid}
                onClick={submit}
              >
                Submit →
              </button>
            </div>
          </>
        )}

        {stage === "sending" && <p style={base.body}>Sending…</p>}

        {stage === "error" && (
          <>
            <p style={base.body}>Something went wrong sending your answers.</p>
            <button style={base.btn} onClick={submit}>
              Try again
            </button>
          </>
        )}

        {stage === "done" && (
          <>
            <div style={base.eyebrow}>Thank you · recorded</div>
            <h2 style={base.h2}>Where your answers sit</h2>
            <p style={base.body}>
              Averaging your four answers for a word gives one score from −50 to +50. Lower means the
              word struck you as more pejorative. The diamonds are averages from a 2025 online survey
              of US adults that asked the same questions: the{" "}
              <span style={{ color: C.under30 }}>◆</span> under-30s and the{" "}
              <span style={{ color: "#B8900A" }}>◆</span> over-60s.
            </p>
            <div style={base.divider} />
            {TERMS.map((t) => (
              <ScoreStrip key={t} term={t} score={composite(ratings[t] as Record<Measure, number>)} />
            ))}
            <p style={base.small}>Your instructor will show the class results in a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
