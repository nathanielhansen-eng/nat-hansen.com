"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

type ColorType = "focal" | "internominal" | "boundary";
interface ColorDef {
  id: number;
  hex: string;
  munsell: string;
  type: ColorType;
  gridCol: number;
  gridRow: number;
}

// 12 test chips, hand-matched to Heider's Munsell designations in Exp II.
// gridCol / gridRow give their position in the 16×5 recognition grid below.
const COLORS: ColorDef[] = [
  // Focal (Heider's best-example chips for red, yellow, green, blue)
  { id: 1, hex: "#B01010", munsell: "5R 4/14 (red)",       type: "focal",        gridCol: 0,  gridRow: 1 },
  { id: 2, hex: "#F5D000", munsell: "2.5Y 8/16 (yellow)",  type: "focal",        gridCol: 4,  gridRow: 4 },
  { id: 3, hex: "#1A9870", munsell: "7.5G 5/10 (green)",   type: "focal",        gridCol: 7,  gridRow: 2 },
  { id: 4, hex: "#1548A8", munsell: "2.5PB 5/12 (blue)",   type: "focal",        gridCol: 10, gridRow: 1 },
  // Internominal (centres of naming gaps)
  { id: 5, hex: "#F5C8A5", munsell: "2.5YR 8/6",           type: "internominal", gridCol: 2,  gridRow: 4 },
  { id: 6, hex: "#B8A630", munsell: "10Y 6/10",            type: "internominal", gridCol: 5,  gridRow: 2 },
  { id: 7, hex: "#C5D870", munsell: "10GY 8/10",           type: "internominal", gridCol: 6,  gridRow: 4 },
  { id: 8, hex: "#C5B0D8", munsell: "5P 7/6",              type: "internominal", gridCol: 13, gridRow: 3 },
  // Boundary (adjacent to focal clusters)
  { id: 9,  hex: "#5A1010", munsell: "5R 2/8",             type: "boundary",     gridCol: 0,  gridRow: 0 },
  { id: 10, hex: "#E89868", munsell: "2.5YR 7/10",         type: "boundary",     gridCol: 2,  gridRow: 3 },
  { id: 11, hex: "#4698C0", munsell: "7.5B 6/8",           type: "boundary",     gridCol: 9,  gridRow: 2 },
  { id: 12, hex: "#8068A8", munsell: "5P 6/8",             type: "boundary",     gridCol: 13, gridRow: 2 },
];

// Warmup: one row of saturation gradients per basic colour name.
// Student picks the best example; Heider's Exp I found 92–95% of choices
// land on the two most saturated chips.
interface SaturationRow {
  basicName: string;
  maxHex: string;            // most saturated chip (predicted best example)
  chips: string[];            // 6 chips, from least to most saturated
}
const WARMUP_ROWS: SaturationRow[] = [
  {
    basicName: "red",
    maxHex: "#B01010",
    chips: ["#8A6060", "#9A4848", "#A83535", "#B52020", "#BA1A1A", "#B01010"],
  },
  {
    basicName: "yellow",
    maxHex: "#F5D000",
    chips: ["#D8CE9A", "#E2D272", "#EAD448", "#EFD220", "#F2D108", "#F5D000"],
  },
  {
    basicName: "green",
    maxHex: "#1A9870",
    chips: ["#6E8F7E", "#529078", "#389572", "#259870", "#1A9870", "#0D9A70"],
  },
  {
    basicName: "blue",
    maxHex: "#1548A8",
    chips: ["#6E7A9A", "#5568A5", "#3D57AA", "#284FA9", "#1A4BA8", "#1548A8"],
  },
];

// Recognition grid: 16 hue columns × 5 value rows generated via OKLCH.
// Test chips are slotted into their assigned (col, row) positions so they
// appear in the grid surrounded by near-neighbour distractors.
const HUE_ANGLES = [15, 35, 55, 75, 95, 115, 145, 175, 205, 225, 245, 270, 295, 320, 340, 355];
const VALUE_LEVELS = [0.35, 0.5, 0.65, 0.8, 0.92];
const GRID_COLS = HUE_ANGLES.length;
const GRID_ROWS = VALUE_LEVELS.length;

function buildGrid(colors: ColorDef[]): string[][] {
  const overrides = new Map<string, string>();
  for (const c of colors) overrides.set(`${c.gridCol},${c.gridRow}`, c.hex);
  const grid: string[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    const L = VALUE_LEVELS[row];
    const chroma = 0.12 + 0.04 * Math.sin(L * Math.PI); // more chroma at mid L
    const rowArr: string[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const key = `${col},${row}`;
      if (overrides.has(key)) {
        rowArr.push(overrides.get(key)!);
      } else {
        rowArr.push(`oklch(${L} ${chroma.toFixed(3)} ${HUE_ANGLES[col]})`);
      }
    }
    grid.push(rowArr);
  }
  return grid;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function genArith() {
  const a = Math.floor(Math.random() * 40) + 15;
  const b = Math.floor(Math.random() * 40) + 15;
  return { q: `${a} + ${b}`, ans: a + b };
}

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  focal: "#1A7840",
  internominal: "#C08A18",
  boundary: "#B01568",
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
  h1: { fontSize: "34px", fontWeight: 400, lineHeight: "1.15", marginBottom: "28px", color: C.text },
  h2: { fontSize: "24px", fontWeight: 400, lineHeight: "1.2", marginBottom: "20px", color: C.text },
  body: { fontSize: "19px", lineHeight: "1.72", color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: "1.6", color: C.muted, marginBottom: "16px" },
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
  input: {
    border: `1px solid ${C.border}`,
    padding: "12px 16px",
    fontSize: "19px",
    fontFamily: "'Crimson Pro', Georgia, serif",
    width: "100%",
    outline: "none",
    background: "#FDFAF5",
    boxSizing: "border-box",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
};

function ProgressBar({ value, max, color = C.accent }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: "3px", background: "#E8E2D8", borderRadius: "2px", overflow: "hidden", marginTop: "24px" }}>
      <div
        style={{
          height: "100%",
          background: color,
          width: `${Math.max(0, (value / max) * 100)}%`,
          transition: "width 1s linear",
        }}
      />
    </div>
  );
}

type Phase =
  | "intro"
  | "warmup"
  | "between1"
  | "naming"
  | "between2"
  | "exposure"
  | "retention"
  | "recognition"
  | "results";

type NamingEntry = { name: string; time: number; words: number; letters: number };
type WarmupChoice = { basicName: string; chosenHex: string; chosenIndex: number; maxIndex: number };
type ResultRow = ColorDef & NamingEntry & {
  exposed: boolean;
  recognized: boolean;
  chosenGridHex: string | null;
};

interface Results {
  all: ResultRow[];
  exposed: ResultRow[];
  focal: { named: ResultRow[]; exposed: ResultRow[] };
  internominal: { named: ResultRow[]; exposed: ResultRow[] };
  boundary: { named: ResultRow[]; exposed: ResultRow[] };
  warmup: WarmupChoice[];
}

function avgTime(rows: ResultRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + r.time, 0) / rows.length;
}
function avgLetters(rows: ResultRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + r.letters, 0) / rows.length;
}
function accuracy(rows: ResultRow[]): { correct: number; total: number; pct: number } {
  const total = rows.length;
  const correct = rows.filter((r) => r.recognized).length;
  return { correct, total, pct: total === 0 ? 0 : correct / total };
}

export default function Experiment({ session }: { session: string }) {
  const [phase, setPhase] = useState<Phase>("intro");

  // Warmup (Exp I)
  const [warmupIdx, setWarmupIdx] = useState(0);
  const [warmupChoices, setWarmupChoices] = useState<WarmupChoice[]>([]);

  // Naming (Exp II)
  const [namingOrder, setNamingOrder] = useState<ColorDef[]>([]);
  const [namingIdx, setNamingIdx] = useState(0);
  const [namingData, setNamingData] = useState<Record<number, NamingEntry>>({});
  const [nameInput, setNameInput] = useState("");
  const [namingStart, setNamingStart] = useState<number | null>(null);

  // Recognition (Exp III)
  const [exposureColors, setExposureColors] = useState<ColorDef[]>([]);
  const [expCountdown, setExpCountdown] = useState(5);
  const [retTime, setRetTime] = useState(30);
  const [arith, setArith] = useState<{ q: string; ans: number } | null>(null);
  const [arithInput, setArithInput] = useState("");
  const [arithStatus, setArithStatus] = useState<"" | "correct" | "wrong">("");
  const [selectedGridCells, setSelectedGridCells] = useState<string[]>([]); // "col,row"

  const [results, setResults] = useState<Results | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const arithRef = useRef<HTMLInputElement>(null);

  const grid = useMemo(() => buildGrid(COLORS), []);

  useEffect(() => {
    setNamingOrder(shuffle(COLORS));
  }, []);

  useEffect(() => {
    if (phase === "naming" && namingOrder.length > 0) {
      setNamingStart(Date.now());
      setNameInput("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [phase, namingIdx, namingOrder.length]);

  useEffect(() => {
    if (phase === "exposure") {
      setExpCountdown(5);
      const t = setInterval(() => {
        setExpCountdown((p) => {
          if (p <= 1) {
            clearInterval(t);
            setPhase("retention");
            return 0;
          }
          return p - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "retention") {
      setRetTime(30);
      setArith(genArith());
      setArithInput("");
      setArithStatus("");
      const t = setInterval(() => {
        setRetTime((p) => {
          if (p <= 1) {
            clearInterval(t);
            setPhase("recognition");
            return 0;
          }
          return p - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "recognition") setSelectedGridCells([]);
  }, [phase]);

  const chooseWarmup = (row: SaturationRow, chipIdx: number) => {
    const maxIndex = row.chips.indexOf(row.maxHex);
    const next: WarmupChoice = {
      basicName: row.basicName,
      chosenHex: row.chips[chipIdx],
      chosenIndex: chipIdx,
      maxIndex,
    };
    const updated = [...warmupChoices, next];
    setWarmupChoices(updated);
    if (warmupIdx + 1 >= WARMUP_ROWS.length) {
      setPhase("between1");
    } else {
      setWarmupIdx((p) => p + 1);
    }
  };

  const submitName = () => {
    if (!nameInput.trim() || namingStart === null) return;
    const elapsed = (Date.now() - namingStart) / 1000;
    const trimmed = nameInput.trim();
    const words = trimmed.split(/\s+/).length;
    const letters = trimmed.replace(/\s+/g, "").length;
    const color = namingOrder[namingIdx];
    const updated: Record<number, NamingEntry> = {
      ...namingData,
      [color.id]: { name: trimmed, time: elapsed, words, letters },
    };
    setNamingData(updated);

    if (namingIdx + 1 >= namingOrder.length) {
      // Pick 4 exposure chips: 2 focal + 1 internominal + 1 boundary
      const f = shuffle(COLORS.filter((c) => c.type === "focal")).slice(0, 2);
      const i = shuffle(COLORS.filter((c) => c.type === "internominal")).slice(0, 1);
      const b = shuffle(COLORS.filter((c) => c.type === "boundary")).slice(0, 1);
      setExposureColors(shuffle([...f, ...i, ...b]));
      setPhase("between2");
    } else {
      setNamingIdx((p) => p + 1);
    }
  };

  const checkArith = () => {
    if (arith && parseInt(arithInput) === arith.ans) {
      setArithStatus("correct");
      setTimeout(() => {
        setArith(genArith());
        setArithInput("");
        setArithStatus("");
        arithRef.current?.focus();
      }, 350);
    } else {
      setArithStatus("wrong");
    }
  };

  const toggleGridCell = (col: number, row: number) => {
    const key = `${col},${row}`;
    setSelectedGridCells((p) => {
      if (p.includes(key)) return p.filter((x) => x !== key);
      if (p.length >= exposureColors.length) return p;
      return [...p, key];
    });
  };

  const submitRecognition = async () => {
    const expIds = new Set(exposureColors.map((c) => c.id));
    const selectedKeys = new Set(selectedGridCells);
    const res: ResultRow[] = COLORS.map((c) => {
      const nd: NamingEntry = namingData[c.id] || { name: "?", time: 5, words: 2, letters: 0 };
      const key = `${c.gridCol},${c.gridRow}`;
      const exposed = expIds.has(c.id);
      const recognized = exposed && selectedKeys.has(key);
      const chosenGridHex = exposed ? (recognized ? c.hex : null) : null;
      return { ...c, ...nd, exposed, recognized, chosenGridHex };
    });
    const exp = res.filter((c) => c.exposed);
    const byType = (t: ColorType) => ({
      named: res.filter((c) => c.type === t),
      exposed: exp.filter((c) => c.type === t),
    });
    const r: Results = {
      all: res,
      exposed: exp,
      focal: byType("focal"),
      internominal: byType("internominal"),
      boundary: byType("boundary"),
      warmup: warmupChoices,
    };
    setResults(r);
    setPhase("results");

    try {
      const payload = {
        session,
        submittedAt: new Date().toISOString(),
        warmup: warmupChoices.map((w) => ({
          basicName: w.basicName,
          chosenHex: w.chosenHex,
          chosenSaturationLevel: w.chosenIndex,
          maxSaturationLevel: w.maxIndex,
        })),
        naming: res.map((c) => ({
          id: c.id,
          hex: c.hex,
          munsell: c.munsell,
          type: c.type,
          name: c.name,
          time: c.time,
          words: c.words,
          letters: c.letters,
          exposed: c.exposed,
          recognized: c.recognized,
          chosenGridHex: c.chosenGridHex,
        })),
      };
      const resp = await fetch("/api/experiments/heider-focal-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(resp.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
  };

  // ==================== PHASES ====================

  if (phase === "intro")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Rosch Heider · Journal of Experimental Psychology · 1972</div>
          <h1 style={base.h1}>
            Universals in Colour
            <br />
            Naming &amp; Memory
          </h1>
          <p style={base.body}>
            Eleanor Rosch Heider challenged the Brown &amp; Lenneberg interpretation of the
            codability–memory link. Her claim: some areas of colour space are distinctive
            <em> independently </em> of language. She called them <strong>focal colours</strong>,
            and argued they are named faster, named more briefly, and remembered better in every
            language she tested — including Dani, a New Guinea language with only two basic
            colour terms.
          </p>
          <p style={base.body}>
            This replication has three parts.
          </p>
          <div style={{ ...base.divider }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {[
              ["Warm-up", "Best Examples", "Pick the best example of four basic colour names (Exp I)."],
              ["Part I", "Colour Naming", "Name 12 chips across three categories. Naming time is recorded (Exp II)."],
              ["Part II", "Recognition", "Memorise 4 chips, then find them in an 80-chip array after a delay (Exp III)."],
            ].map(([label, title, desc]) => (
              <div key={label} style={{ borderTop: `2px solid ${C.border}`, paddingTop: "16px" }}>
                <div style={{ ...base.eyebrow, marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px", color: C.text }}>{title}</div>
                <div style={{ fontSize: "14px", color: C.muted, lineHeight: "1.5" }}>{desc}</div>
              </div>
            ))}
          </div>
          <p style={{ ...base.small, fontStyle: "italic", marginTop: "22px" }}>
            Your anonymous responses will be compiled and used for in-class discussion.
          </p>
          <button style={base.btn} onClick={() => setPhase("warmup")}>
            Begin Experiment →
          </button>
        </div>
      </div>
    );

  if (phase === "warmup") {
    const row = WARMUP_ROWS[warmupIdx];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, padding: "44px 52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={base.eyebrow}>Warm-up — Best Example</div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {warmupIdx + 1} / {WARMUP_ROWS.length}
            </div>
          </div>
          <h2 style={base.h2}>
            Which of these is the best example of{" "}
            <span style={{ fontStyle: "italic" }}>{row.basicName}</span>?
          </h2>
          <p style={{ ...base.small }}>
            Click the chip you would point to if asked &ldquo;show me a {row.basicName}.&rdquo;
          </p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${row.chips.length}, 1fr)`, gap: "8px", marginTop: "18px" }}>
            {row.chips.map((hex, i) => (
              <button
                key={i}
                onClick={() => chooseWarmup(row, i)}
                style={{
                  height: "130px",
                  background: hex,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  padding: 0,
                  transition: "transform 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                aria-label={`${row.basicName} option ${i + 1}`}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: C.muted,
            }}
          >
            <span>less saturated</span>
            <span>more saturated →</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "between1")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Warm-up complete</div>
          <h2 style={base.h1}>Now for Part I.</h2>
          <p style={base.body}>
            You will see <strong>12 colour chips</strong>, one at a time. For each, write the
            name you would use for that colour. There are no right answers. <strong>Response
            time is recorded.</strong>
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            Heider&apos;s prediction: focal colours get shorter names (fewer words and letters)
            and are named faster than internominal or boundary colours — in every language.
          </p>
          <button style={base.btn} onClick={() => setPhase("naming")}>
            Start Naming →
          </button>
        </div>
      </div>
    );

  if (phase === "naming" && namingOrder.length > 0) {
    const color = namingOrder[namingIdx];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, padding: "40px 52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={base.eyebrow}>Part I — Colour Naming</div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {namingIdx + 1} / {namingOrder.length}
            </div>
          </div>
          <div
            style={{
              width: "100%",
              height: "260px",
              background: color.hex,
              border: `1px solid rgba(0,0,0,0.07)`,
              marginBottom: "28px",
            }}
          />
          <div
            style={{
              fontSize: "12px",
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: "8px",
            }}
          >
            Name this colour
          </div>
          <input
            ref={inputRef}
            style={base.input}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitName()}
            placeholder="e.g. red, muddy olive, pale greenish yellow…"
            autoComplete="off"
          />
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
            <button style={{ ...base.btn, marginTop: 0 }} onClick={submitName}>
              {namingIdx + 1 < namingOrder.length ? "Next →" : "Finish Part I →"}
            </button>
            <span style={{ fontSize: "13px", color: C.muted }}>or press Enter</span>
          </div>
          <div
            style={{
              marginTop: "28px",
              height: "2px",
              background: "#EDE8DF",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: C.accent,
                width: `${(namingIdx / namingOrder.length) * 100}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "between2")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part I Complete</div>
          <h2 style={base.h1}>Colour naming recorded.</h2>
          <p style={base.body}>
            Now for Part II. You will see <strong>4 colours simultaneously for 5 seconds</strong>.
            Study them carefully.
          </p>
          <p style={base.body}>
            After a 30-second delay filled with arithmetic, you will try to find those 4 colours
            in a larger array of 80 colour chips.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            Heider&apos;s prediction: focal colours are recognised more accurately than
            internominal or boundary colours — even by speakers of languages that lack basic
            chromatic colour terms. Memory for focal colours would therefore be independent of
            naming.
          </p>
          <button style={base.btn} onClick={() => setPhase("exposure")}>
            Start Memory Test →
          </button>
        </div>
      </div>
    );

  if (phase === "exposure")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, textAlign: "center" }}>
          <div style={{ ...base.eyebrow, textAlign: "center" }}>
            Memorise these colours · {expCountdown}s
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "20px 0 24px" }}>
            {exposureColors.map((c) => (
              <div
                key={c.id}
                style={{ height: "180px", background: c.hex, border: "1px solid rgba(0,0,0,0.06)" }}
              />
            ))}
          </div>
          <ProgressBar value={expCountdown} max={5} />
        </div>
      </div>
    );

  if (phase === "retention")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, textAlign: "center" }}>
          <div style={{ ...base.eyebrow, textAlign: "center" }}>
            Retention Interval · {retTime}s remaining
          </div>
          <h2 style={{ ...base.h2, marginBottom: "4px" }}>Solve the arithmetic</h2>
          <p style={{ ...base.small, textAlign: "center" }}>
            Answer as many as you can. Recognition starts automatically.
          </p>
          {arith && (
            <div style={{ margin: "32px 0" }}>
              <div
                style={{
                  fontSize: "52px",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  marginBottom: "20px",
                  color: C.text,
                }}
              >
                {arith.q} = ?
              </div>
              <input
                ref={arithRef}
                type="number"
                style={{
                  ...base.input,
                  textAlign: "center",
                  fontSize: "28px",
                  maxWidth: "180px",
                  margin: "0 auto",
                  display: "block",
                }}
                value={arithInput}
                onChange={(e) => setArithInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkArith()}
                autoFocus
              />
              {arithStatus === "correct" && (
                <div style={{ color: C.focal, fontFamily: "'Space Mono', monospace", marginTop: "14px", fontSize: "22px" }}>
                  ✓ Correct
                </div>
              )}
              {arithStatus === "wrong" && (
                <div style={{ color: "#CC1A14", fontFamily: "'Space Mono', monospace", marginTop: "14px", fontSize: "13px" }}>
                  Incorrect — try again
                </div>
              )}
            </div>
          )}
          <ProgressBar value={retTime} max={30} />
        </div>
      </div>
    );

  if (phase === "recognition") {
    const n = exposureColors.length;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, maxWidth: "960px", padding: "36px 40px" }}>
          <div style={base.eyebrow}>Part II — Recognition</div>
          <h2 style={base.h2}>Find the {n} colours you saw.</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <p style={{ ...base.small, margin: 0 }}>
              Click chips in the array below. Selected chips glow.
            </p>
            <div
              style={{
                ...base.mono,
                fontSize: "13px",
                color: selectedGridCells.length === n ? C.accent : C.muted,
                fontWeight: 700,
              }}
            >
              {selectedGridCells.length} / {n}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gap: "2px",
              marginBottom: "20px",
              background: C.border,
              padding: "2px",
            }}
          >
            {grid.map((rowArr, row) =>
              rowArr.map((cell, col) => {
                const key = `${col},${row}`;
                const selected = selectedGridCells.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleGridCell(col, row)}
                    style={{
                      aspectRatio: "1",
                      background: cell,
                      cursor: "pointer",
                      outline: selected ? `3px solid ${C.text}` : "none",
                      outlineOffset: selected ? "-3px" : "0",
                      transition: "transform 0.08s",
                      transform: selected ? "scale(0.92)" : "scale(1)",
                    }}
                  />
                );
              })
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              color: C.muted,
              marginBottom: "16px",
            }}
          >
            <span>← hues</span>
            <span>values (dark → light) ↓</span>
          </div>
          {selectedGridCells.length === n && (
            <button style={base.btn} onClick={submitRecognition}>
              Submit →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "results" && results) {
    const { exposed, warmup } = results;
    const rec = (k: "focal" | "internominal" | "boundary") => {
      const rows = results[k].exposed;
      return accuracy(rows);
    };
    const fAcc = rec("focal");
    const iAcc = rec("internominal");
    const bAcc = rec("boundary");
    const fTime = avgTime(results.focal.named);
    const iTime = avgTime(results.internominal.named);
    const bTime = avgTime(results.boundary.named);
    const fLett = avgLetters(results.focal.named);
    const iLett = avgLetters(results.internominal.named);
    const bLett = avgLetters(results.boundary.named);

    const totalCorrect = exposed.filter((r) => r.recognized).length;

    // warmup: how close to max
    const warmupBestChoices = warmup.filter((w) => w.chosenIndex >= w.maxIndex - 1).length;

    const W = 460,
      H = 160,
      pad = { l: 80, r: 20, t: 24, b: 40 };
    const maxTimeShown = Math.max(...exposed.map((c) => c.time), 5);
    const xScale = (t: number) => pad.l + (t / maxTimeShown) * (W - pad.l - pad.r);
    const yScale = (v: number) => (v === 1 ? pad.t + 24 : H - pad.b - 20);
    const strokeFor = (t: ColorType) =>
      t === "focal" ? C.focal : t === "internominal" ? C.internominal : C.boundary;

    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, maxWidth: "760px" }}>
          <div style={base.eyebrow}>Experiment Complete</div>
          <h1 style={{ ...base.h1, fontSize: "30px" }}>
            You correctly identified&nbsp;
            <span style={{ borderBottom: `2px solid ${C.accent}` }}>
              {totalCorrect} of {exposed.length}
            </span>
            &nbsp;colours.
          </h1>
          {submitStatus === "ok" && (
            <p style={{ ...base.small, fontStyle: "italic", color: C.focal }}>
              ✓ Your anonymous results were added to the class aggregate.
            </p>
          )}
          {submitStatus === "err" && (
            <p style={{ ...base.small, fontStyle: "italic", color: "#CC1A14" }}>
              (Couldn&apos;t save to the class aggregate — your personal results are still shown below.)
            </p>
          )}

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "16px" }}>Warm-up — your best-example choices</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
            {warmup.map((w) => (
              <div key={w.basicName}>
                <div
                  style={{
                    height: "64px",
                    background: w.chosenHex,
                    border: `1px solid ${C.border}`,
                    marginBottom: "6px",
                  }}
                />
                <div style={{ fontSize: "13px", color: C.text, fontStyle: "italic" }}>
                  {w.basicName}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: C.muted }}>
                  saturation step {w.chosenIndex + 1} / {w.maxIndex + 1}
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...base.small }}>
            You picked the two most saturated chips on{" "}
            <strong>
              {warmupBestChoices} of {warmup.length}
            </strong>{" "}
            colour names. Heider&apos;s 30 subjects (English + 10 other languages) picked them
            on <strong>93% of trials</strong>.
          </p>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "16px" }}>Part I — codability by category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Focal", sub: "(clear examples)", time: fTime, letters: fLett, color: C.focal },
              { label: "Internominal", sub: "(naming gaps)", time: iTime, letters: iLett, color: C.internominal },
              { label: "Boundary", sub: "(near edges)", time: bTime, letters: bLett, color: C.boundary },
            ].map(({ label, sub, time, letters, color }) => (
              <div key={label} style={{ borderTop: `3px solid ${color}`, paddingTop: "12px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: "11px", color: C.muted, marginBottom: "10px" }}>{sub}</div>
                <div style={{ fontSize: "30px", fontWeight: 300, color: C.text, lineHeight: "1" }}>
                  {time.toFixed(1)}s
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "6px",
                  }}
                >
                  mean naming time
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "2px",
                  }}
                >
                  {letters.toFixed(1)} letters avg.
                </div>
              </div>
            ))}
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "16px" }}>Part II — recognition by category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Focal", acc: fAcc, color: C.focal },
              { label: "Internominal", acc: iAcc, color: C.internominal },
              { label: "Boundary", acc: bAcc, color: C.boundary },
            ].map(({ label, acc, color }) => (
              <div key={label} style={{ borderTop: `3px solid ${color}`, paddingTop: "12px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "10px",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: "30px", fontWeight: 300, color: C.text, lineHeight: "1" }}>
                  {acc.correct}
                  <span style={{ fontSize: "18px", color: C.muted }}>/{acc.total}</span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "6px",
                  }}
                >
                  {acc.total > 0 ? `${(acc.pct * 100).toFixed(0)}%` : "none tested"}
                </div>
              </div>
            ))}
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "16px" }}>The {exposed.length} test chips — your data</div>
          <div
            style={{ display: "grid", gridTemplateColumns: `repeat(${exposed.length}, 1fr)`, gap: "10px", marginBottom: "24px" }}
          >
            {exposed.map((c) => (
              <div key={c.id}>
                <div
                  style={{
                    height: "72px",
                    background: c.hex,
                    border: `3px solid ${c.recognized ? C.focal : "#CC1A14"}`,
                    marginBottom: "8px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      background: c.recognized ? C.focal : "#CC1A14",
                      color: "#fff",
                      fontSize: "13px",
                      width: "22px",
                      height: "22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {c.recognized ? "✓" : "✗"}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: C.text, fontStyle: "italic", marginBottom: "2px" }}>
                  &ldquo;{c.name}&rdquo;
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: C.muted }}>
                  {c.type} · {c.time.toFixed(1)}s · {c.letters}L
                </div>
              </div>
            ))}
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "8px" }}>Naming time vs. recognition</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginBottom: "4px" }}>
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#CCC3B0" />
            <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#CCC3B0" />
            <text x={pad.l - 8} y={yScale(1) + 4} textAnchor="end" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
              recognised
            </text>
            <text x={pad.l - 8} y={yScale(0) + 4} textAnchor="end" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
              missed
            </text>
            {[1, 2, 3, 4, 5, 7, 10].map(
              (v) =>
                v <= maxTimeShown && (
                  <g key={v}>
                    <line x1={xScale(v)} y1={H - pad.b} x2={xScale(v)} y2={H - pad.b + 4} stroke="#CCC3B0" />
                    <text x={xScale(v)} y={H - pad.b + 14} textAnchor="middle" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                      {v}s
                    </text>
                  </g>
                )
            )}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
              Naming time
            </text>
            {exposed.map((c) => (
              <g key={c.id}>
                <circle
                  cx={xScale(c.time)}
                  cy={yScale(c.recognized ? 1 : 0)}
                  r="11"
                  fill={c.hex}
                  stroke={strokeFor(c.type)}
                  strokeWidth="2.5"
                />
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", gap: "16px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: C.muted, marginBottom: "20px" }}>
            <span><span style={{ display: "inline-block", width: "10px", height: "10px", background: C.focal, marginRight: "4px", verticalAlign: "middle" }} /> focal</span>
            <span><span style={{ display: "inline-block", width: "10px", height: "10px", background: C.internominal, marginRight: "4px", verticalAlign: "middle" }} /> internominal</span>
            <span><span style={{ display: "inline-block", width: "10px", height: "10px", background: C.boundary, marginRight: "4px", verticalAlign: "middle" }} /> boundary</span>
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "12px" }}>Heider&apos;s Findings</div>
          <p style={base.body}>
            Heider ran versions of these three experiments with English speakers and 23 speakers
            of other languages, then in New Guinea with 21 Dani — speakers of a language with
            only two basic colour terms (<em>mili</em> roughly &ldquo;dark,&rdquo; <em>mola</em>{" "}
            roughly &ldquo;light&rdquo;).
          </p>
          <p style={base.body}>
            Three consistent results: (a) focal colours were given <strong>shorter names</strong>{" "}
            (mean 8.1 letters vs. 12.2 for internominal and 12.7 for boundary) and named{" "}
            <strong>faster</strong> (mean 9.9s vs. 14.8s and 13.1s); (b) focal colours were{" "}
            <strong>more accurately recognised</strong> by both Americans and Dani, even though
            Dani lacked the linguistic codes for them; (c) internominal and boundary colours did{" "}
            <em>not</em> differ from each other.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            The cross-cultural result was Heider&apos;s main move against Brown &amp; Lenneberg:
            if focal colours are remembered better even without a short linguistic code for them,
            codability cannot be doing the causal work. Some areas of the colour space look
            distinctive independent of language.
          </p>

          <button
            style={base.btn}
            onClick={() => {
              setPhase("intro");
              setWarmupIdx(0);
              setWarmupChoices([]);
              setNamingIdx(0);
              setNamingData({});
              setSelectedGridCells([]);
              setResults(null);
              setSubmitStatus("idle");
              setNamingOrder(shuffle(COLORS));
            }}
          >
            Run Again ↺
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={base.wrap}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <p style={base.body}>Loading…</p>
      </div>
    </div>
  );
}
