"use client";

import { useState, useEffect, useRef } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

type ColorType = "focal" | "boundary";
interface ColorDef {
  id: number;
  hex: string;
  type: ColorType;
}

const COLORS: ColorDef[] = [
  { id: 1, hex: "#CC1A14", type: "focal" },
  { id: 2, hex: "#E8720C", type: "focal" },
  { id: 3, hex: "#EDD000", type: "focal" },
  { id: 4, hex: "#1A7840", type: "focal" },
  { id: 5, hex: "#1548A8", type: "focal" },
  { id: 6, hex: "#6B1F8C", type: "focal" },
  { id: 7, hex: "#1B8A7E", type: "boundary" },
  { id: 8, hex: "#7A9E1A", type: "boundary" },
  { id: 9, hex: "#E34A20", type: "boundary" },
  { id: 10, hex: "#B01568", type: "boundary" },
  { id: 11, hex: "#C9A218", type: "boundary" },
  { id: 12, hex: "#5E7090", type: "boundary" },
];

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

// ---- 1954 dress, for the description only ----
//
// The front page of Brown & Lenneberg as it was set: letterspaced caps for
// the title, the authors in caps with a small-caps "and" between them,
// affiliations in italic, and an opening paragraph that starts on a
// two-line drop cap with the first words carried in small caps. The face is
// a Modern in the manner of the original's — an evocation of the period,
// not a claim about which type the journal used, which this scan cannot
// tell us.
//
// It stops at the description. Every phase that puts a color on screen
// keeps the neutral ground it had: type is not neutral for a color-memory
// task, and dressing the stimulus would put the period look inside the
// measurement.
const SERIF_1954 = "'Bodoni Moda', 'Didot', 'Bodoni MT', Georgia, serif";

const paper: Record<string, React.CSSProperties> = {
  card: {
    background: "#FCFAF6",
    border: `1px solid ${C.border}`,
    maxWidth: "720px",
    width: "100%",
    padding: "64px 72px 40px",
    boxShadow: "0 2px 18px rgba(0,0,0,0.06)",
    fontFamily: SERIF_1954,
  },
  title: {
    fontFamily: SERIF_1954,
    fontSize: "27px",
    fontWeight: 400,
    letterSpacing: "0.14em",
    lineHeight: "1.3",
    textAlign: "center",
    textTransform: "uppercase",
    color: C.text,
    margin: "0 0 26px",
  },
  author: {
    fontFamily: SERIF_1954,
    fontSize: "17px",
    letterSpacing: "0.09em",
    textAlign: "center",
    textTransform: "uppercase",
    color: C.text,
    margin: "0 0 2px",
  },
  conjunction: { fontSize: "13px", letterSpacing: "0.1em" },
  affiliation: {
    fontFamily: SERIF_1954,
    fontStyle: "italic",
    fontSize: "16px",
    lineHeight: "1.35",
    textAlign: "center",
    color: C.text,
    margin: "0 0 20px",
  },
  body: {
    fontFamily: SERIF_1954,
    fontSize: "18px",
    lineHeight: "1.6",
    color: C.text,
    textAlign: "justify",
    hyphens: "auto",
    margin: "0 0 14px",
  },
  dropcap: {
    float: "left",
    fontFamily: SERIF_1954,
    fontSize: "58px",
    lineHeight: "0.82",
    paddingRight: "8px",
    paddingTop: "4px",
    color: C.text,
  },
  opener: { fontVariant: "small-caps", letterSpacing: "0.04em" },
  sectionHead: {
    fontFamily: SERIF_1954,
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textAlign: "center",
    color: C.text,
    margin: "26px 0 12px",
  },
  footnoteRule: {
    borderTop: `1px solid ${C.border}`,
    width: "34%",
    margin: "30px 0 10px",
  },
  footnote: {
    fontFamily: SERIF_1954,
    fontSize: "14px",
    lineHeight: "1.5",
    color: C.body,
    textAlign: "justify",
    hyphens: "auto",
    margin: "0 0 8px",
  },
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

type NamingEntry = { name: string; time: number; words: number };
type ResultRow = ColorDef & NamingEntry & { exposed: boolean; selected: boolean; correct: boolean };

interface Results {
  all: ResultRow[];
  exposed: ResultRow[];
  correct: number;
  focalCorrect: number;
  focalTotal: number;
  boundaryCorrect: number;
  boundaryTotal: number;
  avgFocalTime: number;
  avgBoundaryTime: number;
}

export default function Experiment({
  session,
  tag = null,
}: {
  session: string;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<
    "intro" | "naming" | "between" | "exposure" | "retention" | "recognition" | "results"
  >("intro");
  const [shuffled, setShuffled] = useState<ColorDef[]>([]);
  const [namingIdx, setNamingIdx] = useState(0);
  const [namingData, setNamingData] = useState<Record<number, NamingEntry>>({});
  const [nameInput, setNameInput] = useState("");
  const [namingStart, setNamingStart] = useState<number | null>(null);
  const [exposureColors, setExposureColors] = useState<ColorDef[]>([]);
  const [expCountdown, setExpCountdown] = useState(3);
  const [retTime, setRetTime] = useState(30);
  const [arith, setArith] = useState<{ q: string; ans: number } | null>(null);
  const [arithInput, setArithInput] = useState("");
  const [arithStatus, setArithStatus] = useState<"" | "correct" | "wrong">("");
  const [selections, setSelections] = useState<number[]>([]);
  const [recognitionGrid, setRecognitionGrid] = useState<ColorDef[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const arithRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShuffled(shuffle(COLORS));
  }, []);

  useEffect(() => {
    if (phase === "naming" && shuffled.length > 0) {
      setNamingStart(Date.now());
      setNameInput("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [phase, namingIdx, shuffled.length]);

  useEffect(() => {
    if (phase === "exposure") {
      setExpCountdown(3);
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
    if (phase === "recognition") {
      setRecognitionGrid(shuffle(COLORS));
      setSelections([]);
    }
  }, [phase]);

  const submitName = () => {
    if (!nameInput.trim() || namingStart === null) return;
    const elapsed = (Date.now() - namingStart) / 1000;
    const words = nameInput.trim().split(/\s+/).length;
    const color = shuffled[namingIdx];
    const updated: Record<number, NamingEntry> = {
      ...namingData,
      [color.id]: { name: nameInput.trim(), time: elapsed, words },
    };
    setNamingData(updated);

    if (namingIdx + 1 >= shuffled.length) {
      const focal = shuffle(COLORS.filter((c) => c.type === "focal")).slice(0, 2);
      const boundary = shuffle(COLORS.filter((c) => c.type === "boundary")).slice(0, 2);
      setExposureColors(shuffle([...focal, ...boundary]));
      setPhase("between");
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

  const toggleSel = (id: number) => {
    setSelections((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 4) return p;
      return [...p, id];
    });
  };

  const submitRecognition = async () => {
    const expSet = new Set(exposureColors.map((c) => c.id));
    const res: ResultRow[] = COLORS.map((c) => {
      const nd: NamingEntry = namingData[c.id] || { name: "?", time: 5, words: 2 };
      return {
        ...c,
        ...nd,
        exposed: expSet.has(c.id),
        selected: selections.includes(c.id),
        correct: expSet.has(c.id) && selections.includes(c.id),
      };
    });
    const exp = res.filter((c) => c.exposed);
    const fExp = exp.filter((c) => c.type === "focal");
    const bExp = exp.filter((c) => c.type === "boundary");
    const avgTime = (arr: ResultRow[]) => arr.reduce((s, c) => s + c.time, 0) / (arr.length || 1);
    const r: Results = {
      all: res,
      exposed: exp,
      correct: exp.filter((c) => c.correct).length,
      focalCorrect: fExp.filter((c) => c.correct).length,
      focalTotal: fExp.length,
      boundaryCorrect: bExp.filter((c) => c.correct).length,
      boundaryTotal: bExp.length,
      avgFocalTime: avgTime(fExp),
      avgBoundaryTime: avgTime(bExp),
    };
    setResults(r);
    setPhase("results");

    try {
      const payload = {
        session,
        ...(tag ? { tag } : {}),
        submittedAt: new Date().toISOString(),
        naming: res.map((c) => ({
          id: c.id,
          hex: c.hex,
          type: c.type,
          name: c.name,
          time: c.time,
          words: c.words,
          exposed: c.exposed,
          selected: c.selected,
          correct: c.correct,
        })),
      };
      const resp = await fetch("/api/experiments/brown-lenneberg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(resp.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
  };

  if (phase === "intro")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={paper.card}>
          <h1 style={paper.title}>
            A Study in Language and Cognition
            <sup style={{ fontSize: "0.5em", letterSpacing: 0 }}>1</sup>
          </h1>
          <p style={paper.author}>Roger W. Brown</p>
          <p style={paper.affiliation}>Harvard University</p>
          <p style={paper.author}>
            <span style={paper.conjunction}>and </span>Eric H. Lenneberg
          </p>
          <p style={paper.affiliation}>
            Center for International Studies,
            <br />
            Massachusetts Institute of Technology
          </p>

          <p style={paper.body}>
            <span style={paper.dropcap}>&ldquo;I</span>
            <span style={paper.opener}>t is popularly believed</span> that
            reality is present in much the same form to all men of sound
            mind.&rdquo;
          </p>
          <p style={{ ...paper.body, marginTop: "22px" }}>
            Brown and Lenneberg proposed that colors with short, agreed upon
            names — <em>focal colors</em> — are more available to the mind than
            colors that are identified with a longer phrase, and that
            availability will show up in memory tasks. They found that ease of
            naming predicts ease of recognition.
          </p>
          <p style={paper.body}>
            What follows is their experiment with you as the participant. It has
            two parts: First, you will name twelve colors, and the time it takes
            to name each one will be recorded. Then after a delay, you will try
            to pick out four of them again as a test of memory.
          </p>

          <div style={paper.sectionHead}>Procedure</div>
          <p style={paper.body}>
            <b style={{ fontWeight: 700 }}>Part I.</b> Name each color as you
            would to someone who has to pick it out later.{" "}
            <b style={{ fontWeight: 700 }}>Part II.</b> Four colors are shown
            briefly; after an interval filled with arithmetic, you will look for
            them in a larger array.
          </p>

          <div style={paper.footnoteRule} />
          <p style={paper.footnote}>
            <sup>1</sup> A classroom replication of Brown, R. W., &amp;
            Lenneberg, E. H., &ldquo;A Study in Language and Cognition&rdquo;
            (1954), pp. 454&ndash;462. Your responses are anonymous and are
            compiled for discussion in class.
          </p>
          <button style={{ ...base.btn, fontFamily: SERIF_1954, letterSpacing: "0.14em" }} onClick={() => setPhase("naming")}>
            Begin the experiment
          </button>
        </div>
      </div>
    );

  if (phase === "naming" && shuffled.length > 0) {
    const color = shuffled[namingIdx];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, padding: "40px 52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={base.eyebrow}>Part I — Color Naming</div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {namingIdx + 1} / {shuffled.length}
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
            Name this color
          </div>
          <input
            ref={inputRef}
            style={base.input}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitName()}
            placeholder="e.g. red, dark teal, bluish green…"
            autoComplete="off"
          />
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
            <button style={{ ...base.btn, marginTop: 0 }} onClick={submitName}>
              {namingIdx + 1 < shuffled.length ? "Next →" : "Finish Part I →"}
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
                width: `${(namingIdx / shuffled.length) * 100}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "between")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part I Complete</div>
          <h2 style={base.h1}>Color naming recorded.</h2>
          <p style={base.body}>
            Now for Part II. You will see <strong>4 colors simultaneously for 3 seconds</strong>. Study them.
          </p>
          <p style={base.body}>
            After a short delay filled with arithmetic problems, you will identify those colors from the full set of 12.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            The colors were selected to include both easy-to-name and harder-to-name items.
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
          <div style={{ ...base.eyebrow, textAlign: "center" }}>Memorize these colors · {expCountdown}s</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "20px 0 24px" }}>
            {exposureColors.map((c) => (
              <div
                key={c.id}
                style={{ height: "180px", background: c.hex, border: "1px solid rgba(0,0,0,0.06)" }}
              />
            ))}
          </div>
          <ProgressBar value={expCountdown} max={3} />
        </div>
      </div>
    );

  if (phase === "retention")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, textAlign: "center" }}>
          <div style={{ ...base.eyebrow, textAlign: "center" }}>Retention Interval · {retTime}s remaining</div>
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
                <div
                  style={{
                    color: "#1A7840",
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "14px",
                    fontSize: "22px",
                  }}
                >
                  ✓ Correct
                </div>
              )}
              {arithStatus === "wrong" && (
                <div
                  style={{
                    color: "#CC1A14",
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "14px",
                    fontSize: "13px",
                  }}
                >
                  Incorrect — try again
                </div>
              )}
            </div>
          )}
          <ProgressBar value={retTime} max={30} />
        </div>
      </div>
    );

  if (phase === "recognition")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, padding: "44px 52px" }}>
          <div style={base.eyebrow}>Part II — Recognition</div>
          <h2 style={base.h2}>Which 4 colors did you see?</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <p style={{ ...base.small, margin: 0 }}>Click to select. When you have chosen 4, submit.</p>
            <div
              style={{
                ...base.mono,
                fontSize: "13px",
                color: selections.length === 4 ? C.accent : C.muted,
                fontWeight: 700,
              }}
            >
              {selections.length} / 4
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "24px" }}
          >
            {recognitionGrid.map((c) => (
              <div
                key={c.id}
                onClick={() => toggleSel(c.id)}
                style={{
                  height: "90px",
                  background: c.hex,
                  border: selections.includes(c.id) ? `3px solid ${C.accent}` : "3px solid transparent",
                  outline: selections.includes(c.id) ? `1px solid ${C.accent}` : "none",
                  cursor: "pointer",
                  transition: "transform 0.1s, border-color 0.1s",
                  transform: selections.includes(c.id) ? "scale(0.95)" : "scale(1)",
                  boxSizing: "border-box",
                }}
              />
            ))}
          </div>
          {selections.length === 4 && (
            <button style={base.btn} onClick={submitRecognition}>
              Submit →
            </button>
          )}
        </div>
      </div>
    );

  if (phase === "results" && results) {
    const {
      exposed,
      correct,
      focalCorrect,
      focalTotal,
      boundaryCorrect,
      boundaryTotal,
      avgFocalTime,
      avgBoundaryTime,
    } = results;

    const sortedExposed = [...exposed].sort((a, b) => a.time - b.time);
    const maxTime = Math.max(...exposed.map((c) => c.time), 5);
    const W = 460,
      H = 140,
      pad = { l: 48, r: 20, t: 20, b: 36 };
    const xScale = (t: number) => pad.l + (t / maxTime) * (W - pad.l - pad.r);
    const yScale = (v: number) => (v === 1 ? pad.t + 20 : H - pad.b - 20);

    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, maxWidth: "720px" }}>
          <div style={base.eyebrow}>Experiment Complete</div>
          <h1 style={{ ...base.h1, fontSize: "30px" }}>
            You correctly identified&nbsp;
            <span style={{ borderBottom: `2px solid ${C.accent}` }}>{correct} of 4</span>
            &nbsp; colors.
          </h1>
          {submitStatus === "ok" && (
            <p style={{ ...base.small, fontStyle: "italic", color: "#1A7840" }}>
              ✓ Your anonymous results were added to the class aggregate.
            </p>
          )}
          {submitStatus === "err" && (
            <p style={{ ...base.small, fontStyle: "italic", color: "#CC1A14" }}>
              (Couldn&apos;t save to the class aggregate — your personal results are still shown below.)
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            {[
              {
                label: "Focal colors",
                sub: "(easy to name)",
                c: focalCorrect,
                t: focalTotal,
                time: avgFocalTime,
                color: "#1A7840",
              },
              {
                label: "Boundary colors",
                sub: "(harder to name)",
                c: boundaryCorrect,
                t: boundaryTotal,
                time: avgBoundaryTime,
                color: "#B01568",
              },
            ].map(({ label, sub, c, t, time, color }) => (
              <div
                key={label}
                style={{ borderTop: `3px solid ${color}`, paddingTop: "14px", paddingRight: "16px" }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: "13px", color: C.muted, marginBottom: "12px" }}>{sub}</div>
                <div style={{ fontSize: "40px", fontWeight: 300, color: C.text, lineHeight: "1" }}>
                  {c}
                  <span style={{ fontSize: "20px", color: C.muted }}>/{t}</span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: C.muted,
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "6px",
                  }}
                >
                  avg. {time.toFixed(1)}s to name
                </div>
              </div>
            ))}
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "16px" }}>The 4 test colors — your naming data</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "28px" }}
          >
            {sortedExposed.map((c) => (
              <div key={c.id}>
                <div
                  style={{
                    height: "72px",
                    background: c.hex,
                    border: c.correct ? `3px solid #1A7840` : `3px solid #CC1A14`,
                    marginBottom: "8px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      background: c.correct ? "#1A7840" : "#CC1A14",
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
                    {c.correct ? "✓" : "✗"}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: C.text, fontStyle: "italic", marginBottom: "2px" }}>
                  &ldquo;{c.name}&rdquo;
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: C.muted }}>
                  {c.time.toFixed(1)}s · {c.words}w
                </div>
              </div>
            ))}
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "8px" }}>Naming time vs. recognition — your data</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginBottom: "4px" }}>
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#CCC3B0" strokeWidth="1" />
            <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#CCC3B0" strokeWidth="1" />
            <text
              x={pad.l - 8}
              y={yScale(1) + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              recognized
            </text>
            <text
              x={pad.l - 8}
              y={yScale(0) + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              missed
            </text>
            {[1, 2, 3, 4, 5].map(
              (v) =>
                v <= maxTime && (
                  <g key={v}>
                    <line
                      x1={xScale(v)}
                      y1={H - pad.b}
                      x2={xScale(v)}
                      y2={H - pad.b + 4}
                      stroke="#CCC3B0"
                      strokeWidth="1"
                    />
                    <text
                      x={xScale(v)}
                      y={H - pad.b + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="'Space Mono', monospace"
                      fill={C.muted}
                    >
                      {v}s
                    </text>
                  </g>
                )
            )}
            <text
              x={W / 2}
              y={H - 2}
              textAnchor="middle"
              fontSize="10"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              Naming time
            </text>
            {exposed.map((c) => (
              <g key={c.id}>
                <circle
                  cx={xScale(c.time)}
                  cy={yScale(c.correct ? 1 : 0)}
                  r="12"
                  fill={c.hex}
                  stroke={c.correct ? "#1A7840" : "#CC1A14"}
                  strokeWidth="2"
                />
                <text
                  x={xScale(c.time)}
                  y={yScale(c.correct ? 1 : 0) - 16}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="'Space Mono', monospace"
                  fill={C.muted}
                >
                  {c.time.toFixed(1)}s
                </text>
              </g>
            ))}
          </svg>
          <p style={{ fontSize: "13px", color: C.muted, fontStyle: "italic", marginBottom: "24px" }}>
            Each circle represents one of the 4 test colors, plotted by how quickly you named it and whether you
            recognized it.
          </p>

          {/* The paper's own findings return to the paper's dress — your
              numbers above stay in the house face, theirs wear 1954. */}
          <div style={base.divider} />
          <div style={{ ...paper.sectionHead, marginTop: "0" }}>
            Brown &amp; Lenneberg&apos;s Findings
          </div>
          <p style={paper.body}>
            In the original experiment with 24 Munsell color chips, Brown and Lenneberg found a rank-order correlation
            of <strong>.415</strong> between codability and recognition. When a 30-second interval filled with
            distractor tasks was used (as here), the correlation rose to <strong>.487</strong> — higher storage demand
            made linguistic coding matter more.
          </p>
          <p style={paper.body}>
            The key variable was <em>codability</em>: a composite of naming speed, syllable count, and inter-rater
            agreement. Colors that everyone names quickly and consistently (<em>&ldquo;red,&rdquo; &ldquo;blue&rdquo;</em>) are
            remembered better than colors requiring negotiation (<em>&ldquo;a sort of brownish gold,&rdquo; &ldquo;between blue and
            gray&rdquo;</em>).
          </p>
          <div style={paper.footnoteRule} />
          <p style={paper.footnote}>
            <sup>2</sup> A companion Zuni Indian study confirmed the effect cross-culturally: Zuni speakers, who use one
            word for orange and yellow, confused those two colors in recognition significantly more than English
            speakers did.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setPhase("intro");
              setNamingIdx(0);
              setNamingData({});
              setSelections([]);
              setResults(null);
              setSubmitStatus("idle");
              setShuffled(shuffle(COLORS));
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
