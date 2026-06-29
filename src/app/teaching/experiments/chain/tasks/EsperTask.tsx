"use client";

import { useMemo, useState } from "react";
import { STIMULI } from "@/lib/chain/tasks/esper";
import type { ChainTaskComponentProps } from "./types";

type Phase = "intro" | "learn" | "test" | "review";

const CREAM = "#F4F0E8";
const INK = "#1A1814";
const MONO = "'Space Mono', monospace";
const SERIF = "'Crimson Pro', Georgia, serif";

// Four distinct nonsense shapes, rendered in red or green.
function ShapeSVG({
  shape,
  color,
  size = 140,
}: {
  shape: number;
  color: "red" | "green";
  size?: number;
}) {
  const fill = color === "red" ? "#C0392B" : "#27865A";
  const paths: Record<number, string> = {
    1: "M20 60 Q30 15 70 22 Q120 10 118 55 Q128 100 78 102 Q34 116 24 78 Z",
    2: "M30 28 L110 22 L100 70 L118 110 L44 116 L38 72 L20 64 Z",
    3: "M70 14 L86 52 L126 54 L94 80 L106 120 L70 96 L34 120 L46 80 L14 54 L54 52 Z",
    4: "M58 16 L82 16 L82 52 L118 52 L118 78 L82 78 L82 122 L58 122 L58 78 L22 78 L22 52 L58 52 Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      aria-label={`shape ${shape}, ${color}`}
    >
      <path d={paths[shape]} fill={fill} stroke={INK} strokeWidth={2.5} />
    </svg>
  );
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const btn = (primary = true): React.CSSProperties => ({
  background: primary ? INK : "transparent",
  color: primary ? CREAM : INK,
  border: primary ? "none" : `1px solid ${INK}`,
  padding: "13px 34px",
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
});

export default function EsperTask({
  input,
  submitting,
  onSubmit,
}: ChainTaskComponentProps) {
  const names = (input as { names: string[] }).names;

  const [phase, setPhase] = useState<Phase>("intro");
  // learn: two passes through all 8 in fixed canonical order
  const [learnIdx, setLearnIdx] = useState(0);
  // test: randomized order, capturing typed answers + timing
  const testOrder = useMemo(() => shuffled(STIMULI.map((_, i) => i)), []);
  const [testIdx, setTestIdx] = useState(0);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [trials, setTrials] = useState<{ id: string; typed: string; ms: number }[]>(
    [],
  );
  const [shownAt, setShownAt] = useState<number>(() => Date.now());
  const [current, setCurrent] = useState("");

  const LEARN_TOTAL = STIMULI.length * 2;

  function wrap(children: React.ReactNode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: CREAM,
          fontFamily: SERIF,
          color: INK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        {children}
      </div>
    );
  }

  if (phase === "intro") {
    return wrap(
      <div style={{ maxWidth: 560 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: 14,
          }}
        >
          Esper (1966) · artificial language
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 400, marginBottom: 16 }}>
          Learn the names of eight objects
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.55, marginBottom: 14 }}>
          You&apos;ll be shown eight figures — four shapes, each in red and
          green — each with a made-up name. Study them twice. Then you&apos;ll be
          shown each figure and asked to type its name <em>from memory</em>.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 28, color: "#5b5347" }}>
          Whatever you type becomes the language taught to the next student in
          the chain. Don&apos;t look anything up — just do your best to remember.
        </p>
        <button style={btn()} onClick={() => setPhase("learn")}>
          Start learning →
        </button>
      </div>,
    );
  }

  if (phase === "learn") {
    const stimIdx = learnIdx % STIMULI.length;
    const s = STIMULI[stimIdx];
    const pass = Math.floor(learnIdx / STIMULI.length) + 1;
    return wrap(
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: 18,
          }}
        >
          Study · pass {pass} of 2 · {(learnIdx % STIMULI.length) + 1}/
          {STIMULI.length}
        </div>
        <ShapeSVG shape={s.shape} color={s.color} />
        <div style={{ fontSize: 40, fontWeight: 600, margin: "18px 0 30px" }}>
          {names[stimIdx]}
        </div>
        <button
          style={btn()}
          onClick={() => {
            if (learnIdx + 1 >= LEARN_TOTAL) {
              setShownAt(Date.now());
              setPhase("test");
            } else {
              setLearnIdx(learnIdx + 1);
            }
          }}
        >
          {learnIdx + 1 >= LEARN_TOTAL ? "Begin test →" : "Next →"}
        </button>
      </div>,
    );
  }

  if (phase === "test") {
    const stimIdx = testOrder[testIdx];
    const s = STIMULI[stimIdx];
    const commit = () => {
      const ans = current.trim();
      if (!ans) return;
      const ms = Date.now() - shownAt;
      setTyped((t) => ({ ...t, [stimIdx]: ans }));
      setTrials((tr) => [...tr, { id: s.id, typed: ans, ms }]);
      setCurrent("");
      if (testIdx + 1 >= testOrder.length) {
        setPhase("review");
      } else {
        setTestIdx(testIdx + 1);
        setShownAt(Date.now());
      }
    };
    return wrap(
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: 18,
          }}
        >
          Recall · {testIdx + 1}/{testOrder.length}
        </div>
        <ShapeSVG shape={s.shape} color={s.color} />
        <div style={{ margin: "20px 0 8px", fontSize: 17, color: "#5b5347" }}>
          What is this called?
        </div>
        <input
          autoFocus
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          style={{
            border: `1px solid #DDD5C0`,
            padding: "12px 16px",
            fontSize: 24,
            fontFamily: SERIF,
            textAlign: "center",
            width: 260,
            outline: "none",
            background: "#FDFAF5",
            marginBottom: 24,
          }}
        />
        <div>
          <button style={btn()} onClick={commit}>
            {testIdx + 1 >= testOrder.length ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>,
    );
  }

  // review
  return wrap(
    <div style={{ maxWidth: 560 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#9A8866",
          marginBottom: 14,
        }}
      >
        Your answers
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 400, marginBottom: 20 }}>
        This is what you&apos;ll pass on
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {STIMULI.map((s, i) => (
          <div key={s.id} style={{ textAlign: "center" }}>
            <ShapeSVG shape={s.shape} color={s.color} size={70} />
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {typed[i] ?? "—"}
            </div>
          </div>
        ))}
      </div>
      <button
        style={{ ...btn(), opacity: submitting ? 0.6 : 1 }}
        disabled={submitting}
        onClick={() => {
          const out = STIMULI.map((_, i) => typed[i] ?? "");
          onSubmit({ names: out, trials });
        }}
      >
        {submitting ? "Submitting…" : "Pass it on →"}
      </button>
    </div>,
  );
}

// Compact renderer for reveal/dashboard: show the 8 names in canonical order.
export function renderEsperSummary(value: unknown) {
  const names = (value as { names?: string[] })?.names ?? [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {STIMULI.map((s, i) => (
        <span
          key={s.id}
          title={s.id}
          style={{
            fontFamily: MONO,
            fontSize: 12,
            background: s.color === "red" ? "#F6E2DF" : "#DEF0E7",
            border: "1px solid #DDD5C0",
            padding: "2px 6px",
            borderRadius: 3,
          }}
        >
          {names[i] ?? "—"}
        </span>
      ))}
    </div>
  );
}
