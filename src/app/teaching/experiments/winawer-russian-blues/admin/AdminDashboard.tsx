"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  cross: "#8C3A2E",
  within: "#4A6B4F",
  well: "#FAFAF9",
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const eyebrow: React.CSSProperties = {
  ...mono,
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: "12px",
};
const btn: React.CSSProperties = {
  background: C.accent,
  color: C.bg,
  border: "none",
  padding: "10px 22px",
  ...mono,
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  ...btn,
  background: "transparent",
  color: C.text,
  border: `1px solid ${C.border}`,
};
const th: React.CSSProperties = {
  ...mono,
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: C.muted,
  fontWeight: 400,
  textAlign: "right",
  padding: "8px 10px",
  borderBottom: `1px solid ${C.border}`,
};
const td: React.CSSProperties = {
  ...mono,
  fontSize: "13px",
  color: C.text,
  textAlign: "right",
  padding: "9px 10px",
  borderBottom: `1px solid ${C.border}`,
};

/* --------------- the paper's own numbers, for comparison -------------- *
 * Winawer et al. (2007), PNAS 104(19), 7780–7785, doi:10.1073/pnas.0701644104.
 * Near-color cells from Table 1, p. 7783. English speakers are the arm this
 * classroom build replicates.
 * --------------------------------------------------------------------- */
const ORIGINAL = {
  russianNear: {
    none: { cross: 1164, within: 1288 },
    spatial: { cross: 1162, within: 1270 },
    verbal: { cross: 1325, within: 1260 },
  },
  englishNear: {
    none: { cross: 900, within: 914 },
    spatial: { cross: 911, within: 922 },
    verbal: { cross: 952, within: 955 },
  },
  englishBoundary: 8.6,
  russianBoundary: 8.7,
  englishAccuracy: 96.5,
  exclusionRate: 12,
};

/* ------------------------------ statistics ---------------------------- */
// Student's t two-tailed p via the regularized incomplete beta function
// (Numerical Recipes betacf/betai), matching the in-file-stats convention
// used by the other experiment dashboards in this repo.

function gammln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** One-sample two-tailed t test against zero. */
function tTest(values: number[]): { t: number; df: number; p: number; n: number; mean: number; sd: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const m = values.reduce((s, x) => s + x, 0) / n;
  const varr = values.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1);
  const sd = Math.sqrt(varr);
  if (sd === 0) return { t: 0, df: n - 1, p: 1, n, mean: m, sd };
  const t = m / (sd / Math.sqrt(n));
  const df = n - 1;
  const p = betai(df / 2, 0.5, df / (df + t * t));
  return { t, df, p, n, mean: m, sd };
}

function fmtP(p: number): string {
  if (p < 0.001) return "P < .001";
  return `P = ${p.toFixed(3).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* -------------------------- record shapes ---------------------------- */

type Interference = "none" | "verbal" | "spatial";
const INTERFERENCES: Interference[] = ["none", "spatial", "verbal"];

interface Trial {
  block: number;
  interference: Interference;
  target: number;
  distractor: number;
  distance: number;
  matchSide: string;
  correct: boolean;
  rtMs: number;
  inputMode: string;
  probeCorrect: boolean | null;
}

interface Participant {
  tag: string | null;
  submittedAt: string;
  durationMs: number;
  blockOrder: Interference[];
  trials: Trial[];
  boundary: number;
  boundaryAmbiguous: boolean;
  colorVision: string | null;
  naming: { id: number; dark: boolean; rtMs: number }[];
  probes: { interference: string; correct: boolean }[];
}

const RT_CEILING_MS = 3000; // Winawer p. 7782

function isCross(a: number, b: number, boundary: number): boolean {
  if (a === boundary || b === boundary) return true;
  return a < boundary !== b < boundary;
}

function keepTrial(t: Trial): boolean {
  if (!t.correct) return false;
  if (t.rtMs > RT_CEILING_MS) return false;
  if (t.interference !== "none" && t.probeCorrect === false) return false;
  return true;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

function parse(raw: Record<string, unknown>): Participant | null {
  if (!Array.isArray(raw.trials) || !Array.isArray(raw.naming)) return null;
  if (typeof raw.boundary !== "number") return null;
  const trials: Trial[] = [];
  for (const x of raw.trials as Record<string, unknown>[]) {
    if (!x || typeof x !== "object") continue;
    if (typeof x.target !== "number" || typeof x.distractor !== "number") continue;
    if (typeof x.rtMs !== "number" || typeof x.correct !== "boolean") continue;
    trials.push({
      block: typeof x.block === "number" ? x.block : 0,
      interference: (x.interference as Interference) ?? "none",
      target: x.target,
      distractor: x.distractor,
      distance: typeof x.distance === "number" ? x.distance : 0,
      matchSide: typeof x.matchSide === "string" ? x.matchSide : "",
      correct: x.correct,
      rtMs: x.rtMs,
      inputMode: typeof x.inputMode === "string" ? x.inputMode : "",
      probeCorrect: typeof x.probeCorrect === "boolean" ? x.probeCorrect : null,
    });
  }
  if (!trials.length) return null;
  return {
    tag: typeof raw.tag === "string" ? raw.tag : null,
    submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : "",
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : 0,
    blockOrder: Array.isArray(raw.blockOrder) ? (raw.blockOrder as Interference[]) : [],
    trials,
    boundary: raw.boundary,
    boundaryAmbiguous: raw.boundaryAmbiguous === true,
    colorVision: typeof raw.colorVision === "string" ? raw.colorVision : null,
    naming: (raw.naming as { id: number; dark: boolean; rtMs: number }[]) ?? [],
    probes: Array.isArray(raw.probes)
      ? (raw.probes as { interference: string; correct: boolean }[])
      : [],
  };
}

/** Per-participant mean RT for one design cell, on kept trials only. */
function cellMean(p: Participant, interference: Interference, distance: number, cross: boolean): number {
  return mean(
    p.trials
      .filter(
        (t) =>
          t.interference === interference &&
          t.distance === distance &&
          isCross(t.target, t.distractor, p.boundary) === cross &&
          keepTrial(t)
      )
      .map((t) => t.rtMs)
  );
}

export default function AdminDashboard() {
  const [session, setSession] = useState("");
  const [newSessionId, setNewSessionId] = useState("");
  const [sessions, setSessions] = useState<string[]>([]);
  const [raws, setRaws] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownBoundary, setOwnBoundary] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  // The fetch lives inside the effect and touches state only after the first
  // await, so nothing is set synchronously in the effect body. `loading` is
  // raised by whichever control triggered the reload.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const q = session ? `?session=${encodeURIComponent(session)}` : "";
        const r = await fetch(`/api/experiments/winawer-russian-blues/submissions${q}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (r.status === 401) {
          setError("Session expired — reload and sign in.");
          setLoading(false);
          return;
        }
        const data = await r.json();
        if (cancelled) return;
        setError(null);
        setRaws(Array.isArray(data.submissions) ? data.submissions : []);
        if (!session) setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      } catch {
        if (!cancelled) setError("Could not load submissions.");
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const people = useMemo(
    () => raws.map(parse).filter((p): p is Participant => p !== null),
    [raws]
  );

  // Nominal-boundary view recomputes categories against 8.5 for every
  // participant, so the instructor can see how much the own-boundary
  // classification is doing.
  const view = useMemo(
    () => (ownBoundary ? people : people.map((p) => ({ ...p, boundary: 8.5 }))),
    [people, ownBoundary]
  );

  const allTrials = useMemo(() => view.flatMap((p) => p.trials), [view]);
  const keptTrials = useMemo(() => allTrials.filter(keepTrial), [allTrials]);
  const accuracy = allTrials.length
    ? allTrials.filter((t) => t.correct).length / allTrials.length
    : 0;
  const exclusionRate = allTrials.length ? 1 - keptTrials.length / allTrials.length : 0;

  /** Pooled cell mean across every kept trial in the class. */
  const pooled = (interference: Interference, distance: number, cross: boolean) =>
    mean(
      view
        .flatMap((p) =>
          p.trials
            .filter(
              (t) =>
                t.interference === interference &&
                t.distance === distance &&
                isCross(t.target, t.distractor, p.boundary) === cross &&
                keepTrial(t)
            )
            .map((t) => t.rtMs)
        )
    );

  /** Per-participant category advantage (within − cross), then a one-sample
   * t test across participants — the same quantity Winawer plots in Fig. 3. */
  const advantage = (interference: Interference, distance: number) => {
    const vals: number[] = [];
    for (const p of view) {
      const cross = cellMean(p, interference, distance, true);
      const within = cellMean(p, interference, distance, false);
      if (Number.isFinite(cross) && Number.isFinite(within)) vals.push(within - cross);
    }
    return tTest(vals);
  };

  const boundaryStats = useMemo(() => {
    const vals = people.map((p) => p.boundary).filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    const m = vals.reduce((s, x) => s + x, 0) / vals.length;
    const sd =
      vals.length > 1
        ? Math.sqrt(vals.reduce((s, x) => s + (x - m) * (x - m), 0) / (vals.length - 1))
        : 0;
    const hist = new Map<number, number>();
    for (const v of vals) hist.set(v, (hist.get(v) ?? 0) + 1);
    return { mean: m, sd, n: vals.length, hist, ambiguous: people.filter((p) => p.boundaryAmbiguous).length };
  }, [people]);

  const probeAccuracy = (kind: string) => {
    const rows = people.flatMap((p) => p.probes.filter((x) => x.interference === kind));
    return rows.length ? rows.filter((x) => x.correct).length / rows.length : NaN;
  };

  const num = (v: number, digits = 0) => (Number.isFinite(v) ? v.toFixed(digits) : "—");

  const downloadCsv = () => {
    const head = [
      "participant", "tag", "submittedAt", "boundary", "boundaryAmbiguous", "colorVision",
      "block", "interference", "target", "distractor", "distance", "category",
      "matchSide", "correct", "rtMs", "inputMode", "probeCorrect", "kept",
    ];
    const lines = [head.join(",")];
    people.forEach((p, i) => {
      for (const t of p.trials) {
        lines.push(
          [
            `P${i + 1}`, p.tag ?? "", p.submittedAt, p.boundary, p.boundaryAmbiguous,
            p.colorVision ?? "", t.block, t.interference, t.target, t.distractor, t.distance,
            isCross(t.target, t.distractor, p.boundary) ? "cross" : "within",
            t.matchSide, t.correct, t.rtMs, t.inputMode,
            t.probeCorrect === null ? "" : t.probeCorrect, keepTrial(t),
          ].map(csvEscape).join(",")
        );
      }
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `winawer-russian-blues-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl =
    typeof window !== "undefined" && effectiveId
      ? `${window.location.origin}/teaching/experiments/winawer-russian-blues?session=${encodeURIComponent(effectiveId)}`
      : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "940px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor dashboard</div>
        <h1 style={{ fontSize: "34px", fontWeight: 400, marginBottom: "8px", color: C.text }}>
          Russian Blues — class data
        </h1>
        <p style={{ fontSize: "16px", color: C.muted, marginBottom: "28px", lineHeight: 1.6 }}>
          Winawer et al. (2007), PNAS 104(19), 7780&ndash;7785.{" "}
          <a href="https://doi.org/10.1073/pnas.0701644104" style={{ color: C.body }}>
            doi:10.1073/pnas.0701644104
          </a>
          . The class runs the paper&rsquo;s English-speaker arm, so the expected result is{" "}
          <em>no</em>{" "}category advantage in any condition.
        </p>

        {/* controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "26px" }}>
          <select
            value={session}
            onChange={(e) => {
              setLoading(true);
              setSession(e.target.value);
            }}
            style={{ ...mono, fontSize: "12px", padding: "9px 12px", border: `1px solid ${C.border}`, background: C.surface, color: C.text }}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button style={btnGhost} onClick={reload}>Refresh</button>
          <button style={btnGhost} onClick={downloadCsv} disabled={!people.length}>Download CSV</button>
          <button style={btnGhost} onClick={() => setOwnBoundary((v) => !v)}>
            {ownBoundary ? "Own boundary" : "Nominal 8.5"}
          </button>
          <input
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            placeholder="new session id"
            style={{ ...mono, fontSize: "12px", padding: "9px 12px", border: `1px solid ${C.border}`, background: C.surface, color: C.text, width: "160px" }}
          />
        </div>

        {joinUrl && (
          <div style={{ ...mono, fontSize: "12px", color: C.muted, background: C.well, border: `1px solid ${C.border}`, padding: "12px 14px", marginBottom: "26px", wordBreak: "break-all" }}>
            {joinUrl}
          </div>
        )}

        {error && <p style={{ color: C.cross, ...mono, fontSize: "13px" }}>{error}</p>}
        {loading && <p style={{ color: C.muted, ...mono, fontSize: "13px" }}>Loading…</p>}

        {!loading && !people.length && (
          <p style={{ fontSize: "18px", color: C.muted }}>No submissions yet for this session.</p>
        )}

        {!!people.length && (
          <>
            {/* headline numbers */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "30px" }}>
              {(
                [
                  ["Participants", String(people.length)],
                  ["Trials", String(allTrials.length)],
                  ["Accuracy", `${(accuracy * 100).toFixed(1)}%`],
                  ["Excluded", `${(exclusionRate * 100).toFixed(1)}%`],
                  ["Boundary", boundaryStats ? `${boundaryStats.mean.toFixed(1)} ± ${boundaryStats.sd.toFixed(1)}` : "—"],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px 20px", minWidth: "130px", flex: "1 1 130px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>
                    {label}
                  </div>
                  <div style={{ ...mono, fontSize: "22px", color: C.text }}>{value}</div>
                </div>
              ))}
            </div>

            {/* the key contrast */}
            <h2 style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px", color: C.text }}>
              Mean RT, within vs cross category, by interference
            </h2>
            <p style={{ fontSize: "15px", color: C.muted, marginBottom: "18px", lineHeight: 1.6 }}>
              Kept trials only (correct, RT &le; {RT_CEILING_MS} ms, interference probe answered
              correctly — Winawer p. 7782). Categories are computed against{" "}
              {ownBoundary ? "each participant's own elicited boundary" : "the nominal boundary of 8.5"}.
              The advantage column is the mean of per-participant (within &minus; cross), with a
              one-sample t test against zero.
            </p>

            {([2, 4] as const).map((distance) => (
              <div key={distance} style={{ marginBottom: "28px" }}>
                <div style={{ ...mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>
                  {distance === 2 ? "Near colours — 2 steps apart (the paper's effect lives here)" : "Far colours — 4 steps apart"}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Interference</th>
                      <th style={th}>Cross</th>
                      <th style={th}>Within</th>
                      <th style={th}>Advantage</th>
                      <th style={th}>t</th>
                      <th style={th}>p</th>
                      <th style={th}>n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INTERFERENCES.map((i) => {
                      const adv = advantage(i, distance);
                      return (
                        <tr key={i}>
                          <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px", color: C.body }}>
                            {i}
                          </td>
                          <td style={td}>{num(pooled(i, distance, true))}</td>
                          <td style={td}>{num(pooled(i, distance, false))}</td>
                          <td style={{ ...td, color: adv && adv.mean > 0 ? C.within : C.cross }}>
                            {adv ? `${adv.mean > 0 ? "+" : ""}${adv.mean.toFixed(0)}` : "—"}
                          </td>
                          <td style={td}>{adv ? adv.t.toFixed(2) : "—"}</td>
                          <td style={{ ...td, color: adv && adv.p < 0.05 ? C.text : C.muted }}>
                            {adv ? fmtP(adv.p) : "—"}
                          </td>
                          <td style={{ ...td, color: C.muted }}>{adv ? adv.n : 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {/* comparison with the published cells */}
            <h2 style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px", color: C.text }}>
              Against the published near-colour cells
            </h2>
            <p style={{ fontSize: "15px", color: C.muted, marginBottom: "18px", lineHeight: 1.6 }}>
              Table 1, p. 7783. The class should track the English column (no advantage anywhere),
              not the Russian one. Absolute times are not comparable — different hardware, shorter
              blocks, uncalibrated screens.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}`, marginBottom: "30px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Interference</th>
                  <th style={th}>This class</th>
                  <th style={th}>English 2007</th>
                  <th style={th}>Russian 2007</th>
                </tr>
              </thead>
              <tbody>
                {INTERFERENCES.map((i) => {
                  const adv = advantage(i, 2);
                  const e = ORIGINAL.englishNear[i];
                  const r = ORIGINAL.russianNear[i];
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px", color: C.body }}>
                        {i}
                      </td>
                      <td style={td}>{adv ? `${adv.mean > 0 ? "+" : ""}${adv.mean.toFixed(0)} ms` : "—"}</td>
                      <td style={{ ...td, color: C.muted }}>
                        {e.within - e.cross > 0 ? "+" : ""}{e.within - e.cross} ms
                      </td>
                      <td style={{ ...td, color: C.muted }}>
                        {r.within - r.cross > 0 ? "+" : ""}{r.within - r.cross} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* boundary distribution */}
            {boundaryStats && (
              <>
                <h2 style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px", color: C.text }}>
                  Where the class drew the light/dark line
                </h2>
                <p style={{ fontSize: "15px", color: C.muted, marginBottom: "18px", lineHeight: 1.6 }}>
                  Class mean {boundaryStats.mean.toFixed(1)} ± {boundaryStats.sd.toFixed(1)} (SD),
                  n = {boundaryStats.n}. Winawer&rsquo;s English speakers: {ORIGINAL.englishBoundary}{" "}
                  ± 2.5; Russian speakers&rsquo; goluboy/siniy line: {ORIGINAL.russianBoundary} ± 2.2.{" "}
                  {boundaryStats.ambiguous} of {boundaryStats.n} gave non-monotonic naming
                  responses, so those boundaries are fitted rather than read off.
                </p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", background: C.surface, border: `1px solid ${C.border}`, padding: "16px", marginBottom: "30px" }}>
                  {Array.from({ length: 20 }, (_, k) => {
                    const cut = k + 0.5;
                    const count = boundaryStats.hist.get(cut) ?? 0;
                    const max = Math.max(1, ...boundaryStats.hist.values());
                    return (
                      <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{ ...mono, fontSize: "9px", color: count ? C.text : "transparent" }}>{count}</span>
                        <span style={{ display: "block", width: "100%", height: `${8 + (count / max) * 56}px`, background: count ? C.accent : "#E7E5E4" }} />
                        <span style={{ display: "block", width: "100%", height: "14px", background: STIMULI_HEX[k] }} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* interference check */}
            <h2 style={{ fontSize: "22px", fontWeight: 400, marginBottom: "6px", color: C.text }}>
              Interference probes
            </h2>
            <p style={{ fontSize: "15px", color: C.muted, marginBottom: "26px", lineHeight: 1.6 }}>
              Digits {Number.isFinite(probeAccuracy("verbal")) ? `${(probeAccuracy("verbal") * 100).toFixed(0)}%` : "—"}{" "}
              correct, grids {Number.isFinite(probeAccuracy("spatial")) ? `${(probeAccuracy("spatial") * 100).toFixed(0)}%` : "—"}{" "}
              correct. Winawer pretested the two at matched difficulty (numbers 96 ± 1%, grids 95 ±
              1%, p. 7785); if the class figures diverge sharply, the two interference conditions
              are not equally loading and the comparison between them is weakened.
            </p>

            {/* per-participant */}
            <h2 style={{ fontSize: "22px", fontWeight: 400, marginBottom: "14px", color: C.text }}>
              Per participant
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "left" }}>#</th>
                    <th style={{ ...th, textAlign: "left" }}>Tag</th>
                    <th style={th}>Boundary</th>
                    <th style={th}>Acc</th>
                    <th style={th}>Kept</th>
                    <th style={th}>Near adv (none)</th>
                    <th style={th}>Near adv (verbal)</th>
                    <th style={th}>Mins</th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((p, i) => {
                    const acc = p.trials.filter((t) => t.correct).length / p.trials.length;
                    const keptN = p.trials.filter(keepTrial).length;
                    const advOf = (k: Interference) => {
                      const c = cellMean(p, k, 2, true);
                      const w = cellMean(p, k, 2, false);
                      return Number.isFinite(c) && Number.isFinite(w) ? w - c : NaN;
                    };
                    const a0 = advOf("none");
                    const a1 = advOf("verbal");
                    const lossy = keptN / p.trials.length < 0.75;
                    return (
                      <tr key={i}>
                        <td style={{ ...td, textAlign: "left", color: C.muted }}>P{i + 1}</td>
                        <td style={{ ...td, textAlign: "left", color: C.muted }}>{p.tag ?? "—"}</td>
                        <td style={td}>{p.boundary.toFixed(1)}{p.boundaryAmbiguous ? "*" : ""}</td>
                        <td style={td}>{(acc * 100).toFixed(0)}%</td>
                        <td style={{ ...td, color: lossy ? C.cross : C.text }}>
                          {keptN}/{p.trials.length}
                        </td>
                        <td style={{ ...td, color: a0 > 0 ? C.within : C.cross }}>{num(a0)}</td>
                        <td style={{ ...td, color: a1 > 0 ? C.within : C.cross }}>{num(a1)}</td>
                        <td style={{ ...td, color: C.muted }}>{(p.durationMs / 60000).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
              * boundary fitted from non-monotonic naming responses. Winawer dropped participants
              losing 25% or more of their trials (p. 7782); rows in red are below that threshold
              but are <em>not</em>{" "}auto-excluded here — decide by eye.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* Same reconstructed ramp as the experiment; see the header comment in
 * Experiment.tsx and docs/cold-experiments/winawer-russian-blues-spec.md §6. */
const STIMULI_HEX = [
  "#4BC6FF", "#46BCFB", "#41B3F7", "#3CAAF3", "#37A1EE",
  "#3298E9", "#2C90E4", "#2787DF", "#227ED9", "#1C76D4",
  "#166DCE", "#1065C7", "#085DC1", "#0154BA", "#004CB4",
  "#0044AD", "#003CA5", "#00349E", "#002C96", "#00248E",
];
