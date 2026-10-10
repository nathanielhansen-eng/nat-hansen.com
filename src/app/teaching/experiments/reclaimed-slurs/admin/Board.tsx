"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  MEASURES,
  MEASURE_SPECS,
  SLUG,
  TERMS,
  composite,
  type Measure,
  type Submission,
  type Term,
} from "@/lib/reclaimed-slurs";
import pilot from "../pilot-reference.json";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
};

// The pilot's figures are ggplot2 theme_bw() with viridis "plasma" fills
// (begin 0.5, end 0.9). Age groups take the two ends; the four question types
// take four evenly spaced stops; the class gets plasma's deep purple, outside
// that range, so it never reads as one of the pilot's groups.
const PLASMA = {
  under30: "#CC4778",
  over60: "#F9C726",
  class: "#5C01A6",
  measures: { bad1: "#CC4778", bad2: "#E56B5D", offense: "#F89441", valence: "#FDC328" } as Record<Measure, string>,
};
const FIG_FONT = "Helvetica, Arial, sans-serif";

const eyebrow: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: C.muted,
};
const panel: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  padding: "24px clamp(14px, 3vw, 28px)",
  marginBottom: "24px",
};
const btn: React.CSSProperties = {
  background: C.text,
  color: C.bg,
  border: "none",
  padding: "9px 18px",
  fontFamily: "'Space Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = { ...btn, background: "transparent", color: C.text, border: `1px solid ${C.border}` };
const th: React.CSSProperties = {
  ...eyebrow,
  fontSize: "10px",
  padding: "8px 10px",
  borderBottom: `1px solid ${C.border}`,
  textAlign: "right",
};
const td: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "13px",
  padding: "7px 10px",
  borderBottom: `1px solid #EEE`,
  textAlign: "right",
  color: C.text,
};

/* ---------------------------- statistics ---------------------------- */

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
function sd(v: number[]) {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
// R's quantile type 7, as used by geom_violin's quantile lines.
function quantile(v: number[], p: number) {
  const s = [...v].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return s[lo] + (h - lo) * (s[Math.min(lo + 1, s.length - 1)] - s[lo]);
}
// R's bw.nrd0, the default bandwidth for geom_violin.
function bandwidth(v: number[]) {
  const s = sd(v);
  const iqr = quantile(v, 0.75) - quantile(v, 0.25);
  const lo = Math.min(s, iqr / 1.34) || s || 1;
  return 0.9 * lo * Math.pow(v.length, -0.2);
}
function density(v: number[], grid: number[]) {
  const h = bandwidth(v);
  const d = grid.map(
    (g) => v.reduce((a, x) => a + Math.exp(-0.5 * ((g - x) / h) ** 2), 0) / (v.length * h * Math.sqrt(2 * Math.PI)),
  );
  const m = Math.max(...d);
  return d.map((x) => x / m);
}
// Cronbach's alpha over k items, rows = participants.
function cronbach(rows: number[][]) {
  if (rows.length < 3) return null;
  const k = rows[0].length;
  const itemVar = Array.from({ length: k }, (_, j) => sd(rows.map((r) => r[j])) ** 2).reduce((a, b) => a + b, 0);
  const totalVar = sd(rows.map((r) => r.reduce((a, b) => a + b, 0))) ** 2;
  if (totalVar === 0) return null;
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}
// Welch's t-test, two-sided p via the regularized incomplete beta.
function welch(a: { mean: number; sd: number; n: number }, b: { mean: number; sd: number; n: number }) {
  const va = a.sd ** 2 / a.n;
  const vb = b.sd ** 2 / b.n;
  const t = (a.mean - b.mean) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.n - 1) + vb ** 2 / (b.n - 1));
  return { t, df, p: betai(df / 2, 0.5, df / (df + t * t)) };
}
function betai(a: number, b: number, x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
function betacf(a: number, b: number, x: number) {
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
    c = 1 + aa / c;
    c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
    c = 1 + aa / c;
    c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}
function lgamma(z: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.9999999999998099;
  for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/* ------------------------------ figure ------------------------------ */

interface ViolinData {
  label: string;
  fill: string;
  n: number;
  mean: number;
  q: number[];
  /** Normalized density on GRID (max 1); null draws points only. */
  density: number[] | null;
  points?: number[];
  /** Hollow reference diamond (e.g. the pilot mean for the same question). */
  refMean?: number;
}

const GRID: number[] = pilot.grid;

function summarize(label: string, fill: string, v: number[], refMean?: number): ViolinData {
  return {
    label,
    fill,
    n: v.length,
    mean: v.length ? mean(v) : NaN,
    q: v.length ? [0.25, 0.5, 0.75].map((p) => quantile(v, p)) : [],
    density: v.length >= 4 && sd(v) > 0 ? density(v, GRID) : null,
    points: v,
    refMean,
  };
}

function fromPilot(label: string, fill: string, s: { n: number; mean: number; q: number[]; density: number[] }): ViolinData {
  return { label, fill, n: s.n, mean: s.mean, q: s.q, density: s.density };
}

// One panel in the idiom of the pilot's ggplot figures: theme_bw grid,
// grey zero line, violins trimmed to the data range with dotted quartiles
// and a white diamond at the mean.
function ViolinFigure({ violins, yLabel, xLabel }: { violins: ViolinData[]; yLabel: string; xLabel: string }) {
  const W = 600;
  const H = 400;
  const m = { l: 62, r: 12, t: 12, b: 56 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const y = (v: number) => m.t + ((55 - v) / 110) * ph;
  const slot = pw / violins.length;
  const half = slot * 0.36;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", fontFamily: FIG_FONT }}>
      <rect x={m.l} y={m.t} width={pw} height={ph} fill="#FFF" stroke="#333" strokeWidth={0.8} />
      {Array.from({ length: 21 }, (_, i) => -50 + i * 5).map((v) => (
        <line key={v} x1={m.l} x2={m.l + pw} y1={y(v)} y2={y(v)} stroke="#EBEBEB" strokeWidth={v % 10 === 0 ? 1.1 : 0.55} />
      ))}
      {violins.map((_, i) => (
        <line key={i} x1={m.l + slot * (i + 0.5)} x2={m.l + slot * (i + 0.5)} y1={m.t} y2={m.t + ph} stroke="#EBEBEB" strokeWidth={1.1} />
      ))}
      <line x1={m.l} x2={m.l + pw} y1={y(0)} y2={y(0)} stroke="#B3B3B3" strokeWidth={1.2} />
      {Array.from({ length: 11 }, (_, i) => -50 + i * 10).map((v) => (
        <g key={v}>
          <line x1={m.l - 4} x2={m.l} y1={y(v)} y2={y(v)} stroke="#333" strokeWidth={0.8} />
          <text x={m.l - 7} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#4D4D4D">
            {v}
          </text>
        </g>
      ))}
      <text transform={`translate(18 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize={15} fill="#000">
        {yLabel}
      </text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize={15} fill="#000">
        {xLabel}
      </text>

      {violins.map((v, i) => {
        const cx = m.l + slot * (i + 0.5);
        const lo = v.points && v.points.length ? Math.min(...v.points) : -50;
        const hi = v.points && v.points.length ? Math.max(...v.points) : 50;
        let path = "";
        if (v.density) {
          // Trim to the observed range, as geom_violin(trim = TRUE) does.
          const idx = GRID.map((g, k) => k).filter((k) => !v.points || (GRID[k] >= lo - 1 && GRID[k] <= hi + 1));
          const right = idx.map((k) => `${cx + v.density![k] * half},${y(GRID[k])}`);
          const left = [...idx].reverse().map((k) => `${cx - v.density![k] * half},${y(GRID[k])}`);
          path = `M${right.join("L")}L${left.join("L")}Z`;
        }
        const widthAt = (val: number) => {
          if (!v.density) return half * 0.5;
          const k = Math.min(GRID.length - 1, Math.max(0, Math.round((val + 50) / 2)));
          return v.density[k] * half;
        };
        return (
          <g key={v.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={cx - slot / 2} y={m.t} width={slot} height={ph} fill="transparent" />
            {v.density && <path d={path} fill={v.fill} stroke="#333" strokeWidth={1.2} />}
            {v.density &&
              v.q.map((qv, k) => (
                <line
                  key={k}
                  x1={cx - widthAt(qv)}
                  x2={cx + widthAt(qv)}
                  y1={y(qv)}
                  y2={y(qv)}
                  stroke="#4D4D4D"
                  strokeWidth={1.4}
                  strokeDasharray="1.5 4"
                />
              ))}
            {v.points &&
              v.points.map((p, k) => (
                <circle
                  key={k}
                  cx={cx + ((((k * 7919) % 97) / 97) - 0.5) * 1.5 * widthAt(p)}
                  cy={y(p)}
                  r={2.6}
                  fill={v.density ? "rgba(255,255,255,0.75)" : v.fill}
                  stroke="#333"
                  strokeWidth={0.6}
                />
              ))}
            {v.refMean !== undefined && (
              <rect
                x={cx - 6}
                y={y(v.refMean) - 6}
                width={12}
                height={12}
                transform={`rotate(45 ${cx} ${y(v.refMean)})`}
                fill="none"
                stroke="#777"
                strokeWidth={1.3}
                strokeDasharray="2 2"
              />
            )}
            {Number.isFinite(v.mean) && (
              <rect
                x={cx - 7}
                y={y(v.mean) - 7}
                width={14}
                height={14}
                transform={`rotate(45 ${cx} ${y(v.mean)})`}
                fill="#FFF"
                stroke="#333"
                strokeWidth={1.2}
              />
            )}
            <line x1={cx} x2={cx} y1={m.t + ph} y2={m.t + ph + 4} stroke="#333" strokeWidth={0.8} />
            <text x={cx} y={m.t + ph + 19} textAnchor="middle" fontSize={13} fill="#4D4D4D">
              {v.label}
            </text>
            <text x={cx} y={m.t + ph + 34} textAnchor="middle" fontSize={11} fill="#888">
              n = {v.n}
            </text>
            {hover === i && Number.isFinite(v.mean) && (
              <g>
                <rect x={cx - 62} y={m.t + 6} width={124} height={38} fill="#FFF" stroke="#999" />
                <text x={cx} y={m.t + 21} textAnchor="middle" fontSize={11} fill="#000">
                  mean {v.mean.toFixed(2)}
                </text>
                {v.q.length === 3 && (
                  <text x={cx} y={m.t + 36} textAnchor="middle" fontSize={11} fill="#555">
                    Q1 {v.q[0].toFixed(1)} · Md {v.q[1].toFixed(1)} · Q3 {v.q[2].toFixed(1)}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- board ------------------------------ */

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const fmt = (v: number) => (Number.isFinite(v) ? (v > 0 ? "+" : "") + v.toFixed(1) : "—");

export default function Board() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [newSessionId, setNewSessionId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [term, setTerm] = useState<Term>("queer");
  const [showQr, setShowQr] = useState(true);
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  const load = useCallback(async (s: string) => {
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/${SLUG}/submissions${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Signed out — reload and sign in." : "Load failed.");
      const data = await r.json();
      setSubmissions((data.submissions || []) as Submission[]);
      if (!s) setSessions(data.sessions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(session);
    if (!live) return;
    const id = setInterval(() => load(session), 5000);
    return () => clearInterval(id);
  }, [session, live, load]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const today = new Date().toISOString().slice(0, 10);
  const joinId = (newSessionId || session || today).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = `${origin}/teaching/experiments/${SLUG}?session=${encodeURIComponent(joinId)}`;

  useEffect(() => {
    if (showQr && qrRef.current && origin) {
      QRCode.toCanvas(qrRef.current, joinUrl, { width: 180, margin: 1, color: { dark: "#1C1917", light: "#FFFFFF" } }).catch(
        () => {},
      );
    }
  }, [joinUrl, showQr, origin]);

  const stats = useMemo(() => {
    const out = {} as Record<
      Term,
      { comp: number[]; byMeasure: Record<Measure, number[]>; alpha: number | null }
    >;
    for (const t of TERMS) {
      const byMeasure = Object.fromEntries(
        MEASURES.map((mm) => [mm, submissions.map((s) => s.ratings[t][mm])]),
      ) as Record<Measure, number[]>;
      out[t] = {
        comp: submissions.map((s) => composite(s.ratings[t])),
        byMeasure,
        alpha: cronbach(submissions.map((s) => MEASURES.map((mm) => s.ratings[t][mm]))),
      };
    }
    return out;
  }, [submissions]);

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "durationMs",
      "age",
      "blockOrder",
      ...TERMS.flatMap((t) => [...MEASURES.map((mm) => `${mm}_${t}`), `composite_${t}`]),
    ];
    const lines = [header.join(",")];
    for (const s of submissions) {
      lines.push(
        [
          s.session,
          s.submittedAt,
          Math.round(s.durationMs),
          s.age ?? "",
          s.blockOrder.join(" "),
          ...TERMS.flatMap((t) => [...MEASURES.map((mm) => s.ratings[t][mm]), composite(s.ratings[t]).toFixed(2)]),
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${SLUG}-${session || "all"}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const n = submissions.length;
  const tStats = stats[term];
  const ref = pilot.terms[term];

  // Plain-words verdict: which pilot age group is the class mean nearer to?
  const verdict = (t: Term) => {
    const c = stats[t].comp;
    if (c.length < 3) return null;
    const cm = mean(c);
    const r = pilot.terms[t];
    const dU = Math.abs(cm - r.under30.mean);
    const dO = Math.abs(cm - r.over60.mean);
    const vsU = welch({ mean: cm, sd: sd(c), n: c.length }, r.under30);
    const vsO = welch({ mean: cm, sd: sd(c), n: c.length }, r.over60);
    return { cm, nearer: dU <= dO ? "under-30s" : "over-60s", vsU, vsO };
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "24px 16px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <div style={{ ...eyebrow, marginBottom: "6px" }}>Control board · Reclaiming slurs over apparent time</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "0 0 18px" }}>
          Four words, four questions — class results
        </h1>

        {/* ---------------------------- controls ---------------------------- */}
        <div style={{ ...panel, display: "flex", flexWrap: "wrap", gap: "28px", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <div style={{ ...eyebrow, marginBottom: "8px" }}>Session</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                style={{ padding: "8px 10px", fontSize: "16px", fontFamily: "inherit", border: `1px solid ${C.border}`, background: "#FFF" }}
              >
                <option value="">All sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button style={btnGhost} onClick={() => load(session)}>
                Refresh
              </button>
              <label style={{ ...eyebrow, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> live (5 s)
              </label>
              <button style={btnGhost} onClick={downloadCsv} disabled={!n}>
                CSV
              </button>
            </div>
            <div style={{ ...eyebrow, marginBottom: "8px" }}>Student link</div>
            <input
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              placeholder={session || today}
              style={{ padding: "8px 10px", fontSize: "16px", fontFamily: "inherit", border: `1px solid ${C.border}`, width: "100%", maxWidth: "320px", boxSizing: "border-box" }}
            />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: C.text, margin: "10px 0", wordBreak: "break-all" }}>
              {joinUrl}
            </div>
            <div style={{ fontSize: "15px", color: C.muted, lineHeight: 1.5 }}>
              Type a session name (e.g. <em>soc-lang-oct14</em>) to keep this class separate, then pick it in the
              session menu once responses arrive. Left blank, students land in today&apos;s date.
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            {showQr && <canvas ref={qrRef} style={{ border: `1px solid ${C.border}`, background: "#FFF", display: "block" }} />}
            <button style={{ ...btnGhost, marginTop: "8px", fontSize: "10px", padding: "6px 10px" }} onClick={() => setShowQr(!showQr)}>
              {showQr ? "Hide QR" : "Show QR"}
            </button>
          </div>
          <div style={{ minWidth: "140px" }}>
            <div style={eyebrow}>Responses</div>
            <div style={{ fontSize: "64px", lineHeight: 1, color: C.text }}>{loading ? "…" : n}</div>
            <div style={{ fontSize: "14px", color: C.muted }}>{session || "all sessions"}</div>
            {err && <div style={{ color: "#CC1A14", fontSize: "14px", marginTop: "6px" }}>{err}</div>}
          </div>
        </div>

        {/* ------------------- figure 1: apparent time ------------------- */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "6px" }}>Figure 1 · Composite pejorativeness: this class beside the pilot&apos;s age groups</div>
          <p style={{ fontSize: "16px", color: C.body, margin: "0 0 16px", lineHeight: 1.5 }}>
            Each score is the mean of a person&apos;s four ratings (−50 to +50; lower = more pejorative). Pilot = New
            Study 1, a demographically representative US Prolific sample (N = {pilot.n}); its under-30s (n ={" "}
            {pilot.terms.queer.under30.n}) and over-60s (n = {pilot.terms.queer.over60.n}). White diamonds are means; dotted
            lines are quartiles; violins are scaled to equal width, not by count.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: "18px 24px" }}>
            {TERMS.map((t) => {
              const v = verdict(t);
              return (
                <div key={t}>
                  <ViolinFigure
                    yLabel={`pejorativeness of ‘${t}’`}
                    xLabel="respondent group"
                    violins={[
                      summarize("this class", PLASMA.class, stats[t].comp),
                      fromPilot("under-30s", PLASMA.under30, pilot.terms[t].under30),
                      fromPilot("over-60s", PLASMA.over60, pilot.terms[t].over60),
                    ]}
                  />
                  <div style={{ fontSize: "15px", color: C.body, lineHeight: 1.5, margin: "6px 4px 0" }}>
                    {v ? (
                      <>
                        Class mean <strong>{fmt(v.cm)}</strong>; pilot under-30s {fmt(pilot.terms[t].under30.mean)}, over-60s{" "}
                        {fmt(pilot.terms[t].over60.mean)}. Closer to the <strong>{v.nearer}</strong>. Welch vs under-30s{" "}
                        <em>p</em> = {v.vsU.p.toFixed(3)}; vs over-60s <em>p</em> = {v.vsO.p.toFixed(3)}.
                      </>
                    ) : (
                      <span style={{ color: C.muted }}>Verdict appears once three or more students have submitted.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------- figure 2: question types ------------------- */}
        <div style={panel}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={eyebrow}>Figure 2 · Does the question matter? Class ratings by question type</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {TERMS.map((t) => (
                <button key={t} style={t === term ? btn : btnGhost} onClick={() => setTerm(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: "18px 28px", alignItems: "start" }}>
            <ViolinFigure
              yLabel={`ratings for ‘${term}’`}
              xLabel="question type"
              violins={(["bad1", "bad2", "offense", "valence"] as Measure[]).map((mm) =>
                summarize(MEASURE_SPECS[mm].label, PLASMA.measures[mm], tStats.byMeasure[mm], ref.measures[mm].mean),
              )}
            />
            <div>
              <p style={{ fontSize: "16px", color: C.body, lineHeight: 1.55, marginTop: 0 }}>
                The pilot found the four questions answered almost interchangeably (Cronbach&apos;s α &gt; .8 for every
                term, &gt; .9 for ‘queer’ and ‘slutty’), which is what licenses averaging them. Dashed hollow diamonds
                mark the pilot&apos;s mean for each question.
              </p>
              <div style={{ fontSize: "17px", color: C.text, marginBottom: "16px" }}>
                Class α for ‘{term}’:{" "}
                <strong style={{ fontFamily: "'Space Mono', monospace" }}>
                  {tStats.alpha === null ? "—" : tStats.alpha.toFixed(2)}
                </strong>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Question</th>
                      <th style={th}>Class</th>
                      <th style={th}>Pilot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEASURES.map((mm) => (
                      <tr key={mm}>
                        <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "15px" }}>
                          {MEASURE_SPECS[mm].question(term)}
                        </td>
                        <td style={td}>{tStats.byMeasure[mm].length ? fmt(mean(tStats.byMeasure[mm])) : "—"}</td>
                        <td style={td}>{fmt(ref.measures[mm].mean)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------- summary table ------------------------- */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "12px" }}>All terms · composite means</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Term</th>
                  <th style={th}>Class (SD)</th>
                  <th style={th}>Pilot under-30s</th>
                  <th style={th}>Pilot over-60s</th>
                  <th style={th}>Pilot r(age)</th>
                  <th style={th}>Class alpha</th>
                </tr>
              </thead>
              <tbody>
                {TERMS.map((t) => (
                  <tr key={t}>
                    <td style={{ ...td, textAlign: "left" }}>‘{t}’</td>
                    <td style={td}>
                      {stats[t].comp.length ? `${fmt(mean(stats[t].comp))} (${sd(stats[t].comp).toFixed(1)})` : "—"}
                    </td>
                    <td style={td}>{fmt(pilot.terms[t].under30.mean)}</td>
                    <td style={td}>{fmt(pilot.terms[t].over60.mean)}</td>
                    <td style={td}>{pilot.terms[t].ageFit.r.toFixed(2)}</td>
                    <td style={td}>{stats[t].alpha === null ? "—" : stats[t].alpha.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "14px", color: C.muted, lineHeight: 1.5, marginBottom: 0 }}>
            Negative r(age) = older respondents rate the word as more pejorative, the apparent-time signature of
            reclamation (‘queer’, ‘slutty’); positive = the reverse (‘autistic’, ‘basic’).
          </p>
        </div>
      </div>
    </div>
  );
}
