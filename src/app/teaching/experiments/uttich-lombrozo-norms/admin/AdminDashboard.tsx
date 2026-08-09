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
  violate: "#8C3A2E",
  conform: "#4A6B4F",
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

type NormType = "moral" | "conventional";
type NormStatus = "conforming" | "violating";

/** Published values from Uttich & Lombrozo (2010), Experiment 1. */
const ORIGINAL = {
  n: 300,
  status: { f: "12.828", df: "1, 288", p: "< .01" },
  interaction: { f: "2.269", df: "1, 288", p: ".133" },
};

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1 | 2;
  normType: NormType;
  normStatus: NormStatus;
  rating: number;
  ratingRtMs: number;
  priorPhilosophy: "none" | "some" | "extensive" | null;
}

/* ---- Self-contained statistics (Numerical Recipes style) --------- */

// ln Γ(x), Lanczos approximation.
function gammaln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Continued fraction for the incomplete beta function.
function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-30;
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

// Regularized incomplete beta I_x(a, b).
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-tailed p-value for Student's t with df degrees of freedom.
function studentP(t: number, df: number): number {
  if (df <= 0 || !Number.isFinite(t)) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}

function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Stat {
  n: number;
  mean: number | null;
  sd: number | null;
  ss: number; // sum of squared deviations
}

function summarize(ratings: number[]): Stat {
  const n = ratings.length;
  if (!n) return { n: 0, mean: null, sd: null, ss: 0 };
  const mean = ratings.reduce((a, r) => a + r, 0) / n;
  const ss = ratings.reduce((a, r) => a + (r - mean) ** 2, 0);
  const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : null;
  return { n, mean, sd, ss };
}

/** Welch's two-sample t comparing violating vs. conforming ratings. */
function welch(vio: Stat, con: Stat) {
  if (vio.n < 2 || con.n < 2 || vio.mean === null || con.mean === null) return null;
  const s1 = vio.ss / (vio.n - 1);
  const s2 = con.ss / (con.n - 1);
  const se = Math.sqrt(s1 / vio.n + s2 / con.n);
  if (se === 0) return null;
  const t = (vio.mean - con.mean) / se;
  const df =
    (s1 / vio.n + s2 / con.n) ** 2 /
    ((s1 / vio.n) ** 2 / (vio.n - 1) + (s2 / con.n) ** 2 / (con.n - 1));
  // Cohen's d on the pooled SD.
  const pooledSd = Math.sqrt((vio.ss + con.ss) / (vio.n + con.n - 2));
  const d = pooledSd ? (vio.mean - con.mean) / pooledSd : NaN;
  return { t, df, p: studentP(t, df), d, diff: vio.mean - con.mean };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | NormType>("all");
  const [newSessionId, setNewSessionId] = useState<string>("");

  const load = useCallback(async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/uttich-lombrozo-norms/submissions${q}`, {
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

  // Rows respecting the norm-type filter, used for the collapsed status test.
  const rows = useMemo(
    () => submissions.filter((r) => typeFilter === "all" || r.normType === typeFilter),
    [submissions, typeFilter]
  );

  const ratingsOf = useCallback(
    (t: NormType | "all", s: NormStatus) =>
      submissions
        .filter((r) => (t === "all" || r.normType === t) && r.normStatus === s)
        .map((r) => r.rating),
    [submissions]
  );

  // 2×2 cell means table (always all four cells, independent of the filter).
  const cells = useMemo(() => {
    const combos: { type: NormType; status: NormStatus }[] = [
      { type: "moral", status: "conforming" },
      { type: "moral", status: "violating" },
      { type: "conventional", status: "conforming" },
      { type: "conventional", status: "violating" },
    ];
    return combos.map((c) => ({ ...c, stat: summarize(ratingsOf(c.type, c.status)) }));
  }, [ratingsOf]);

  // Main effect of norm status, collapsed across type (respecting the filter).
  const vio = useMemo(() => summarize(ratingsOf(typeFilter, "violating")), [ratingsOf, typeFilter]);
  const con = useMemo(() => summarize(ratingsOf(typeFilter, "conforming")), [ratingsOf, typeFilter]);
  const test = welch(vio, con);

  const byPrior = useMemo(() => {
    const keys: (Submission["priorPhilosophy"])[] = ["none", "some", "extensive", null];
    return keys
      .map((k) => {
        const sub = rows.filter((r) => r.priorPhilosophy === k);
        return {
          key: k ?? "not given",
          v: summarize(sub.filter((r) => r.normStatus === "violating").map((r) => r.rating)),
          c: summarize(sub.filter((r) => r.normStatus === "conforming").map((r) => r.rating)),
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
      "normType",
      "normStatus",
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
          s.normType,
          s.normStatus,
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
    a.download = `uttich-lombrozo-norms-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/uttich-lombrozo-norms?session=${encodeURIComponent(effectiveId)}`
    : "";

  const filterLabel =
    typeFilter === "all" ? "both norm types" : typeFilter === "moral" ? "moral norm only" : "conventional norm only";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          Uttich &amp; Lombrozo (2010) — norms and intentional action
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
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | NormType)}
            style={{ ...mono, fontSize: "12px", padding: "9px 12px", background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          >
            <option value="all">Both norm types</option>
            <option value="moral">Moral norm only</option>
            <option value="conventional">Conventional norm only</option>
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
            Each visitor is assigned at random to one of the four cells — moral vs. conventional norm,
            crossed with conforming vs. violating — so send everyone the same link. Give each class its
            own session id to keep cohorts separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.violate, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && submissions.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px", ...mono, fontSize: "13px", color: C.muted }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <>
            {/* cell means table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                {(session || "All sessions").toUpperCase()} · CELL MEANS (1–7)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "460px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Norm type</th>
                      <th style={{ ...th, textAlign: "left" }}>Status</th>
                      <th style={th}>N</th>
                      <th style={th}>Mean</th>
                      <th style={th}>SD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cells.map((c) => {
                      const col = c.status === "violating" ? C.violate : C.conform;
                      return (
                        <tr key={`${c.type}-${c.status}`}>
                          <td style={{ ...td, textAlign: "left", color: C.body }}>{c.type}</td>
                          <td style={{ ...td, textAlign: "left", color: col }}>{c.status}</td>
                          <td style={td}>{c.stat.n}</td>
                          <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                            {c.stat.mean === null ? "—" : c.stat.mean.toFixed(2)}
                          </td>
                          <td style={td}>{c.stat.sd === null ? "—" : c.stat.sd.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                Higher = more appropriate to call the side effect &lsquo;intentional&rsquo;. The
                prediction is that within each norm type the <strong style={{ color: C.violate }}>violating</strong>{" "}mean
                exceeds the <strong style={{ color: C.conform }}>conforming</strong>{" "}mean, and that the size of that gap is
                similar for the moral and the conventional norm.
              </div>
            </div>

            {/* main effect of norm status */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                Main effect of norm status &middot; {filterLabel}
              </div>
              {!test ? (
                <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                  Need at least two responses in each of the violating and conforming conditions before a
                  test can be computed.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                    {[
                      ["Violating M", vio.mean === null ? "—" : vio.mean.toFixed(2)],
                      ["Conforming M", con.mean === null ? "—" : con.mean.toFixed(2)],
                      ["Difference", test.diff.toFixed(2)],
                      ["t", test.t.toFixed(2)],
                      ["df", test.df.toFixed(1)],
                      ["p", fmtP(test.p)],
                      ["Cohen’s d", Number.isFinite(test.d) ? test.d.toFixed(2) : "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                        <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ ...eyebrow, fontSize: "10px" }}>Uttich &amp; Lombrozo</span>
                      <span style={{ ...mono, fontSize: "17px", color: C.muted }}>
                        F({ORIGINAL.status.df}) {ORIGINAL.status.f}, p {ORIGINAL.status.p}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", color: C.muted, marginTop: "16px", lineHeight: 1.6 }}>
                    Welch two-sample t comparing violating vs. conforming ratings, collapsed across the
                    selected norm type(s). The original analysis was a three-way between-subjects ANOVA;
                    this t is the classroom stand-in for its main effect of norm status. The published
                    effects are modest, so expect a small gap.
                  </div>
                </>
              )}
            </div>

            {/* interaction note */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>The key question: status × type interaction</div>
              <div style={{ fontSize: "15px", color: C.body, lineHeight: 1.65 }}>
                The headline result is a <strong style={{ color: C.text }}>non-result</strong>: Uttich &amp;
                Lombrozo found <strong style={{ color: C.text }}>no norm-status × norm-type interaction</strong>,
                F({ORIGINAL.interaction.df})&nbsp;=&nbsp;{ORIGINAL.interaction.f}, p&nbsp;=&nbsp;{ORIGINAL.interaction.p} —
                the violating-minus-conforming gap was comparable for the moral and the conventional
                norm. Use the norm-type filter above to read off your class&rsquo;s two gaps from the cell
                means and compare them; if they are close, the effect is riding on norm status, not on
                moral content. With classroom N the cells get small fast, so treat this as a discussion
                prompt rather than a formal interaction test.
              </div>
            </div>

            {/* by prior philosophy */}
            {byPrior.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px" }}>
                <div style={{ ...eyebrow, marginBottom: "14px" }}>By philosophical training &middot; {filterLabel}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: "left" }}>Training</th>
                        <th style={th}>N</th>
                        <th style={th}>Violating M</th>
                        <th style={th}>Conforming M</th>
                        <th style={th}>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPrior.map((r) => {
                        const vm = r.v.mean;
                        const cm = r.c.mean;
                        return (
                          <tr key={r.key}>
                            <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                              {r.key}
                            </td>
                            <td style={td}>{r.n}</td>
                            <td style={td}>{vm === null ? "—" : vm.toFixed(2)}</td>
                            <td style={td}>{cm === null ? "—" : cm.toFixed(2)}</td>
                            <td style={{ ...td, color: C.text }}>
                              {vm === null || cm === null ? "—" : (vm - cm).toFixed(2)}
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
