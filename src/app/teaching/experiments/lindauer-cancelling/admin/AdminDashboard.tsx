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
  cancel: "#A6772E",
  well: "#FDFAF5",
};

type Condition = "helping" | "harming" | "cancelling";

const COND: Record<Condition, { label: string; colour: string }> = {
  helping: { label: "Helping", colour: C.help },
  harming: { label: "Harming", colour: C.harm },
  cancelling: { label: "Cancelling", colour: C.cancel },
};
const ORDER: Condition[] = ["helping", "harming", "cancelling"];

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

/** Published values from Lindauer & Southwood (2021), p. 184, for comparison. */
const ORIGINAL: Record<Condition, { n: number; mean: number; sd: number }> = {
  helping: { n: 101, mean: 5.29, sd: 1.17 },
  harming: { n: 105, mean: 0.57, sd: 1.21 },
  cancelling: { n: 102, mean: 5.16, sd: 1.38 },
};
const ORIG_ANOVA = { f: "475.86", df1: 2, df2: 305, p: "< .001", eta2: ".76" };
const ORIG_TUKEY: { pair: string; p: string; d: string }[] = [
  { pair: "helping − harming", p: "< .001", d: "3.97" },
  { pair: "cancelling − harming", p: "< .001", d: "3.54" },
  { pair: "helping − cancelling", p: "= .74", d: "0.10" },
];

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: Condition;
  /** 0–6 agreement rating for this condition's "didn't intentionally …" statement. */
  rating: number;
  ratingRtMs: number;
  priorPhilosophy: "none" | "some" | "extensive" | null;
}

/* --- Incomplete beta function (Numerical Recipes) for t- and F-distribution p-values. --- */
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

interface Group {
  n: number;
  mean: number | null;
  variance: number | null;
  sd: number | null;
}

interface TTest {
  t: number;
  df: number;
  p: number;
  d: number;
  n: number;
}

/** Pooled (Student's) two-sample t-test; df = n1 + n2 − 2, matching the original report. */
function ttest2(a: Group, b: Group): TTest | null {
  if (a.n < 2 || b.n < 2) return null;
  if (a.mean === null || b.mean === null || a.variance === null || b.variance === null) return null;
  const df = a.n + b.n - 2;
  const sp2 = ((a.n - 1) * a.variance + (b.n - 1) * b.variance) / df;
  const se = Math.sqrt(sp2 * (1 / a.n + 1 / b.n));
  if (se === 0) return null;
  const t = (a.mean - b.mean) / se;
  const pval = betai(0.5 * df, 0.5, df / (df + t * t));
  const d = sp2 > 0 ? (a.mean - b.mean) / Math.sqrt(sp2) : 0;
  return { t, df, p: pval, d, n: a.n + b.n };
}

interface Anova {
  f: number;
  df1: number;
  df2: number;
  p: number;
  eta2: number;
  n: number;
}

/** One-way (between-subjects) ANOVA over the supplied groups; matches the design
 *  of the original report, which used a one-way ANOVA across the three conditions. */
function anovaOneWay(groups: Group[]): Anova | null {
  const valid = groups.filter((g) => g.n > 0 && g.mean !== null);
  const k = valid.length;
  const N = valid.reduce((a, g) => a + g.n, 0);
  if (k < 2 || N - k < 1) return null;
  const grand = valid.reduce((a, g) => a + (g.mean as number) * g.n, 0) / N;
  const ssb = valid.reduce((a, g) => a + g.n * ((g.mean as number) - grand) ** 2, 0);
  const ssw = valid.reduce((a, g) => a + (g.variance ?? 0) * (g.n - 1), 0);
  const sst = ssb + ssw;
  const df1 = k - 1;
  const df2 = N - k;
  if (ssw <= 0) return null;
  const f = ssb / df1 / (ssw / df2);
  const p = betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
  const eta2 = sst > 0 ? ssb / sst : 0;
  return { f, df1, df2, p, eta2, n: N };
}

function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function agg(rows: Submission[], cond: Condition): Group {
  const s = rows.filter((r) => r.condition === cond);
  const n = s.length;
  const mean = n ? s.reduce((a, r) => a + r.rating, 0) / n : null;
  let variance: number | null = null;
  let sd: number | null = null;
  if (n > 1 && mean !== null) {
    variance = s.reduce((a, r) => a + (r.rating - mean) ** 2, 0) / (n - 1);
    sd = Math.sqrt(variance);
  }
  return { n, mean, variance, sd };
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
      const r = await fetch(`/api/experiments/lindauer-cancelling/submissions${q}`, {
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

  const groups = useMemo(() => {
    const g = {} as Record<Condition, Group>;
    for (const c of ORDER) g[c] = agg(rows, c);
    return g;
  }, [rows]);

  const anova = anovaOneWay(ORDER.map((c) => groups[c]));

  const pairs: { key: string; a: Condition; b: Condition; orig: (typeof ORIG_TUKEY)[number] }[] = [
    { key: "helping − harming", a: "helping", b: "harming", orig: ORIG_TUKEY[0] },
    { key: "cancelling − harming", a: "cancelling", b: "harming", orig: ORIG_TUKEY[1] },
    { key: "helping − cancelling", a: "helping", b: "cancelling", orig: ORIG_TUKEY[2] },
  ];

  const byPrior = useMemo(() => {
    const keys: (Submission["priorPhilosophy"])[] = ["none", "some", "extensive", null];
    return keys
      .map((k) => {
        const sub = rows.filter((r) => r.priorPhilosophy === k);
        return {
          key: k ?? "not given",
          groups: {
            helping: agg(sub, "helping"),
            harming: agg(sub, "harming"),
            cancelling: agg(sub, "cancelling"),
          } as Record<Condition, Group>,
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
      "rating",
      "ratingRtMs",
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
          s.rating,
          Math.round(s.ratingRtMs),
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
    a.download = `lindauer-cancelling-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/lindauer-cancelling?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          Lindauer &amp; Southwood (2021) — cancelling the Knobe effect
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
            Each visitor is assigned to helping, harming, or cancelling at random, so send everyone the
            same link. Give each class its own session id to keep cohorts separate.
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
            {/* means table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                {(session || "All sessions").toUpperCase()} · MEAN AGREEMENT (0–6)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Condition</th>
                      <th style={th}>N</th>
                      <th style={th}>Mean</th>
                      <th style={th}>SD</th>
                      <th style={th}>Lindauer &amp; Southwood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORDER.map((c) => {
                      const g = groups[c];
                      const o = ORIGINAL[c];
                      return (
                        <tr key={c}>
                          <td style={{ ...td, textAlign: "left", color: COND[c].colour }}>{COND[c].label}</td>
                          <td style={td}>{g.n}</td>
                          <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                            {g.mean === null ? "—" : g.mean.toFixed(2)}
                          </td>
                          <td style={td}>{g.sd === null ? "—" : g.sd.toFixed(2)}</td>
                          <td style={{ ...td, color: C.muted }}>
                            {o.mean.toFixed(2)} ({o.sd.toFixed(2)})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* one-way ANOVA */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>One-way ANOVA (three conditions)</div>
              {!anova ? (
                <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                  Need responses in at least two conditions (and some within-condition variation) before
                  an ANOVA can be computed.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                    {[
                      ["N", String(anova.n)],
                      [`F(${anova.df1}, ${anova.df2})`, anova.f.toFixed(2)],
                      ["p", fmtP(anova.p)],
                      ["η²", anova.eta2.toFixed(2).replace(/^0/, "")],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                        <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ ...eyebrow, fontSize: "10px" }}>Lindauer &amp; Southwood</span>
                      <span style={{ ...mono, fontSize: "17px", color: C.muted }}>
                        F({ORIG_ANOVA.df1}, {ORIG_ANOVA.df2}) {ORIG_ANOVA.f}, p {ORIG_ANOVA.p}, η² {ORIG_ANOVA.eta2}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", color: C.muted, marginTop: "16px", lineHeight: 1.6 }}>
                    Between-subjects one-way ANOVA, df&nbsp;=&nbsp;(k&nbsp;−&nbsp;1,&nbsp;N&nbsp;−&nbsp;k).
                    η²&nbsp;=&nbsp;SS<sub>between</sub>&nbsp;/&nbsp;SS<sub>total</sub>. R&rsquo;s{" "}
                    <code>aov</code> reports the same F when group variances are pooled this way.
                  </div>
                </>
              )}
            </div>

            {/* pairwise t-tests */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Pairwise comparisons</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Comparison</th>
                      <th style={th}>t (df)</th>
                      <th style={th}>p</th>
                      <th style={th}>Cohen&rsquo;s d</th>
                      <th style={th}>Lindauer &amp; Southwood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((pr) => {
                      const tt = ttest2(groups[pr.a], groups[pr.b]);
                      return (
                        <tr key={pr.key}>
                          <td style={{ ...td, textAlign: "left", fontSize: "13px" }}>{pr.key}</td>
                          <td style={td}>{tt ? `${tt.t.toFixed(2)} (${tt.df})` : "—"}</td>
                          <td style={{ ...td, color: C.text }}>{tt ? fmtP(tt.p) : "—"}</td>
                          <td style={td}>{tt ? tt.d.toFixed(2) : "—"}</td>
                          <td style={{ ...td, color: C.muted }}>
                            p {pr.orig.p}, d {pr.orig.d}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                Pooled (Student&rsquo;s) two-sample t-tests, two-tailed, df&nbsp;=&nbsp;n₁&nbsp;+&nbsp;n₂&nbsp;−&nbsp;2.
                The original used Tukey&rsquo;s HSD, which corrects for multiple comparisons; these
                uncorrected t-tests will read as slightly more significant. The published pattern was
                helping&nbsp;&gt;&nbsp;harming and cancelling&nbsp;&gt;&nbsp;harming, with helping and
                cancelling statistically indistinguishable.
              </div>
            </div>

            {/* by prior philosophy */}
            {byPrior.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px" }}>
                <div style={{ ...eyebrow, marginBottom: "14px" }}>By philosophical training</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: "left" }}>Training</th>
                        <th style={th}>N</th>
                        <th style={th}>Helping</th>
                        <th style={th}>Harming</th>
                        <th style={th}>Cancelling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPrior.map((r) => (
                        <tr key={r.key}>
                          <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                            {r.key}
                          </td>
                          <td style={td}>{r.n}</td>
                          {ORDER.map((c) => {
                            const m = r.groups[c].mean;
                            return (
                              <td key={c} style={{ ...td, color: COND[c].colour }}>
                                {m === null ? "—" : m.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                  Condition means by training. Cell counts here get small fast. Treat this as a
                  discussion prompt about the expertise objection, not as a test.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
