"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const eyebrow: React.CSSProperties = {
  ...mono,
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: C.muted,
};
const btn: React.CSSProperties = {
  background: C.accent,
  color: C.bg,
  border: "none",
  padding: "10px 20px",
  ...mono,
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const th: React.CSSProperties = {
  ...eyebrow,
  fontSize: "10px",
  fontWeight: 400,
  textAlign: "right",
  borderBottom: `1px solid ${C.border}`,
  padding: "8px 10px",
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${C.border}`,
  textAlign: "right",
  ...mono,
  fontSize: "14px",
  color: C.body,
};

/** Published Study 4a values from Phillips, Luguri & Knobe (2015), p. 38, for
 *  side-by-side comparison. Relevance means are reverse-coded (relevance, not
 *  agreement-with-Alex), matching the field we compute below. */
const ORIGINAL = {
  n: 401,
  intentional: { harmMean: 6.0, helpMean: 1.87, t: "32.10", df: 399, p: "< .001" },
  relevance: { harmMean: 5.54, helpMean: 3.41, t: "12.10", df: 399, p: "< .001" },
};

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: "harm" | "help";
  /** 1–7 agreement "The chairman intentionally harmed/helped the environment." */
  intentional: number;
  /** 1–7 RAW agreement with Alex that the alternative is irrelevant. */
  relevanceAgree: number;
  intentionalRtMs: number;
  relevanceRtMs: number;
  priorPhilosophy: "none" | "some" | "extensive" | null;
}

/* --- Incomplete beta function (Numerical Recipes) for the t-distribution p-value. --- */
function gammln(xx: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = xx;
  let y = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
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
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

interface TTest {
  t: number;
  df: number;
  p: number;
  d: number;
  n: number;
}

/** Pooled (Student's) two-sample t-test; df = n1 + n2 − 2, matching the original report. */
function ttest2(
  h: { mean: number | null; variance: number | null; n: number },
  p: { mean: number | null; variance: number | null; n: number }
): TTest | null {
  if (h.n < 2 || p.n < 2) return null;
  if (h.mean === null || p.mean === null || h.variance === null || p.variance === null) return null;
  const df = h.n + p.n - 2;
  const sp2 = ((h.n - 1) * h.variance + (p.n - 1) * p.variance) / df;
  const se = Math.sqrt(sp2 * (1 / h.n + 1 / p.n));
  if (se === 0) return null;
  const t = (h.mean - p.mean) / se;
  const pval = betai(0.5 * df, 0.5, df / (df + t * t));
  const d = sp2 > 0 ? (h.mean - p.mean) / Math.sqrt(sp2) : 0;
  return { t, df, p: pval, d, n: h.n + p.n };
}

function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Reverse-code the raw agreement-with-Alex into a relevance score (Phillips et al.
// 2015, p. 38): relevance = 8 − relevanceAgree.
const relevanceOf = (r: Submission) => 8 - r.relevanceAgree;

function agg(rows: Submission[], cond: "harm" | "help", sel: (r: Submission) => number) {
  const s = rows.filter((r) => r.condition === cond);
  const n = s.length;
  const mean = n ? s.reduce((a, r) => a + sel(r), 0) / n : null;
  let variance: number | null = null;
  let sd: number | null = null;
  if (n > 1 && mean !== null) {
    variance = s.reduce((a, r) => a + (sel(r) - mean) ** 2, 0) / (n - 1);
    sd = Math.sqrt(variance);
  }
  return { n, mean, variance, sd };
}

interface OrigPair {
  harmMean: number;
  helpMean: number;
  t: string;
  df: number;
  p: string;
}

function MeasureBlock({
  title,
  scaleNote,
  harm,
  help,
  tt,
  orig,
  origLabel,
}: {
  title: string;
  scaleNote: string;
  harm: { n: number; mean: number | null; sd: number | null };
  help: { n: number; mean: number | null; sd: number | null };
  tt: TTest | null;
  orig: OrigPair;
  origLabel: string;
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
      <div style={{ ...eyebrow, marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: C.muted, marginBottom: "14px" }}>{scaleNote}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "460px" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Condition</th>
              <th style={th}>N</th>
              <th style={th}>Mean</th>
              <th style={th}>SD</th>
              <th style={th}>{origLabel}</th>
            </tr>
          </thead>
          <tbody>
            {([["Harm", harm, C.harm, orig.harmMean], ["Help", help, C.help, orig.helpMean]] as const).map(
              (r) => (
                <tr key={r[0]}>
                  <td style={{ ...td, textAlign: "left", color: r[2] }}>{r[0]}</td>
                  <td style={td}>{r[1].n}</td>
                  <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                    {r[1].mean === null ? "—" : r[1].mean.toFixed(2)}
                  </td>
                  <td style={td}>{r[1].sd === null ? "—" : r[1].sd.toFixed(2)}</td>
                  <td style={{ ...td, color: C.muted }}>{r[3].toFixed(2)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <div style={{ ...eyebrow, margin: "18px 0 12px" }}>Two-sample t-test (harm − help)</div>
      {!tt ? (
        <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
          Need at least two responses in each condition before a t-test can be computed.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
          {[
            ["N", String(tt.n)],
            [`t(${tt.df})`, tt.t.toFixed(2)],
            ["p", fmtP(tt.p)],
            ["Cohen’s d", tt.d.toFixed(2)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
              <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ ...eyebrow, fontSize: "10px" }}>{origLabel}</span>
            <span style={{ ...mono, fontSize: "17px", color: C.muted }}>
              t({orig.df}) {orig.t}, p {orig.p}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [newSessionId, setNewSessionId] = useState<string>("");

  const load = useCallback(async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/phillips-alternatives/submissions${q}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(r.status === 401 ? "Session expired — reload and sign in." : "Load failed.");
      const data = await r.json();
      setSubmissions((data.submissions || []) as Submission[]);
      if (!s) setSessions(data.sessions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(session || undefined);
  }, [session, load]);

  const rows = submissions;

  // Primary DV: intentional-action rating. Secondary: reverse-coded relevance.
  const intHarm = agg(rows, "harm", (r) => r.intentional);
  const intHelp = agg(rows, "help", (r) => r.intentional);
  const intTt = ttest2(intHarm, intHelp);

  const relHarm = agg(rows, "harm", relevanceOf);
  const relHelp = agg(rows, "help", relevanceOf);
  const relTt = ttest2(relHarm, relHelp);

  const byPrior = useMemo(() => {
    const keys: (Submission["priorPhilosophy"])[] = ["none", "some", "extensive", null];
    return keys
      .map((k) => {
        const sub = rows.filter((r) => r.priorPhilosophy === k);
        return {
          key: k ?? "not given",
          h: agg(sub, "harm", (r) => r.intentional),
          p: agg(sub, "help", (r) => r.intentional),
          n: sub.length,
        };
      })
      .filter((x) => x.n > 0);
  }, [rows]);

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "study",
      "condition",
      "intentional",
      "relevanceAgree",
      "relevance",
      "intentionalRtMs",
      "relevanceRtMs",
      "priorPhilosophy",
      "durationMs",
    ];
    const lines = [header.join(",")];
    for (const s of submissions) {
      lines.push(
        [
          s.session,
          s.submittedAt,
          s.study,
          s.condition,
          s.intentional,
          s.relevanceAgree,
          8 - s.relevanceAgree,
          Math.round(s.intentionalRtMs),
          Math.round(s.relevanceRtMs),
          s.priorPhilosophy ?? "",
          Math.round(s.durationMs),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `phillips-alternatives-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/phillips-alternatives?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          Phillips, Luguri &amp; Knobe (2015) — relevance of alternatives (Study 4a)
        </h1>

        {/* controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "24px" }}>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            style={{ ...mono, fontSize: "12px", padding: "9px 12px", background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button style={btn} onClick={() => load(session || undefined)}>
            Refresh
          </button>
          <button
            style={{ ...btn, opacity: submissions.length ? 1 : 0.35 }}
            onClick={downloadCsv}
            disabled={!submissions.length}
          >
            Download CSV
          </button>
        </div>

        {/* share link */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ ...eyebrow, marginBottom: "10px" }}>Participant link</div>
          <input
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            placeholder={session || "e.g. Reading-PP3LANG-2026"}
            style={{
              border: `1px solid ${C.border}`,
              padding: "10px 14px",
              fontSize: "17px",
              fontFamily: "'Crimson Pro', Georgia, serif",
              width: "100%",
              outline: "none",
              background: C.well,
              boxSizing: "border-box",
            }}
          />
          {joinUrl && (
            <div style={{ ...mono, fontSize: "12px", color: C.body, marginTop: "12px", wordBreak: "break-all" }}>
              {joinUrl}
            </div>
          )}
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "10px", lineHeight: 1.55 }}>
            Each visitor is assigned to harm or help at random, so send everyone the same link. Give
            each class its own session id to keep cohorts separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.harm, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px", ...mono, fontSize: "13px", color: C.muted }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div style={{ ...eyebrow, marginBottom: "10px" }}>
              {(session || "All sessions").toUpperCase()} · N = {rows.length}
            </div>

            {/* primary DV: intentional action */}
            <MeasureBlock
              title="Intentional action (primary DV) · 1–7 agreement"
              scaleNote="“The chairman intentionally harmed / helped the environment.” 1 = strongly disagree, 7 = strongly agree."
              harm={intHarm}
              help={intHelp}
              tt={intTt}
              orig={ORIGINAL.intentional}
              origLabel="Phillips"
            />

            {/* mediator: reverse-coded relevance */}
            <MeasureBlock
              title="Relevance of alternatives (mediator) · reverse-coded 1–7"
              scaleNote="How relevant it is to consider that the chairman could have wanted to avoid the side effect. Reverse-coded from agreement with Alex: relevance = 8 − response."
              harm={relHarm}
              help={relHelp}
              tt={relTt}
              orig={ORIGINAL.relevance}
              origLabel="Phillips"
            />

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "18px 26px", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", color: C.muted, lineHeight: 1.6 }}>
                Pooled (Student&rsquo;s) two-sample t-tests, two-tailed, df&nbsp;=&nbsp;n₁&nbsp;+&nbsp;n₂&nbsp;−&nbsp;2.
                R&rsquo;s <code>t.test</code> defaults to Welch&rsquo;s unequal-variance test and will
                report slightly different degrees of freedom. In the original study the moral swap
                moved <em>both</em> measures, and the relevance judgment statistically mediated
                morality&rsquo;s effect on the intentional-action rating.
              </div>
            </div>

            {/* by prior philosophy — on the primary DV */}
            {byPrior.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px" }}>
                <div style={{ ...eyebrow, marginBottom: "14px" }}>
                  Intentional-action rating by philosophical training
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: "left" }}>Training</th>
                        <th style={th}>N</th>
                        <th style={th}>Harm mean</th>
                        <th style={th}>Help mean</th>
                        <th style={th}>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPrior.map((r) => {
                        const hm = r.h.mean;
                        const pm = r.p.mean;
                        return (
                          <tr key={r.key}>
                            <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                              {r.key}
                            </td>
                            <td style={td}>{r.n}</td>
                            <td style={td}>{hm === null ? "—" : hm.toFixed(2)}</td>
                            <td style={td}>{pm === null ? "—" : pm.toFixed(2)}</td>
                            <td style={{ ...td, color: C.text }}>
                              {hm === null || pm === null ? "—" : (hm - pm).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                  Cell counts here get small fast. Treat this as a discussion prompt about the
                  expertise objection, not as a test.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
