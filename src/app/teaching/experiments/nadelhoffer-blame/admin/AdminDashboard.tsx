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
  c1: "#8C3A2E",
  c2: "#4A6B4F",
  well: "#FAFAF9",
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

/** Published values from Nadelhoffer (2006), Smith study (N = 126), for
 *  side-by-side comparison. C1 = thief kills officer; C2 = driver kills carjacker. */
const ORIGINAL = {
  n: 126,
  C1: { knowingly: 75, intentionally: 37, blame: 5.11 },
  C2: { knowingly: 51, intentionally: 10, blame: 2.01 },
  chiKnow: { chi: "7.62", p: "< .01" },
  chiInt: { chi: "12.94", p: "< .001" },
};

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: "C1" | "C2";
  knowingly: boolean;
  intentional: boolean;
  rating: number;
  knowinglyRtMs: number;
  intentRtMs: number;
  ratingRtMs: number;
  priorPhilosophy: "none" | "some" | "extensive" | null;
}

/* Numerical Recipes complementary error function; |err| < 1.2e-7.
   For df = 1, the chi-square upper-tail p equals erfc(sqrt(x2/2)). */
function erfc(x: number): number {
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-11, -6.886027e-12,
    -1.0104e-12, 3.849e-13,
  ];
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

interface Chi {
  x2: number;
  p: number;
  w: number;
  n: number;
  minExp: number;
}

function chiSquare2x2(a: number, b: number, c: number, d: number): Chi | null {
  const n = a + b + c + d;
  if (!n) return null;
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const c2 = b + d;
  if (!r1 || !r2 || !c1 || !c2) return null;
  const obs = [a, b, c, d];
  const exp = [(r1 * c1) / n, (r1 * c2) / n, (r2 * c1) / n, (r2 * c2) / n];
  let x2 = 0;
  for (let i = 0; i < 4; i++) x2 += (obs[i] - exp[i]) ** 2 / exp[i];
  return { x2, p: erfc(Math.sqrt(x2 / 2)), w: Math.sqrt(x2 / n), n, minExp: Math.min(...exp) };
}

function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function agg(rows: Submission[], cond: "C1" | "C2") {
  const s = rows.filter((r) => r.condition === cond);
  const know = s.filter((r) => r.knowingly).length;
  const intent = s.filter((r) => r.intentional).length;
  const mean = s.length ? s.reduce((a, r) => a + r.rating, 0) / s.length : null;
  return { know, intent, n: s.length, mean };
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
      const r = await fetch(`/api/experiments/nadelhoffer-blame/submissions${q}`, {
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

  const c1 = agg(rows, "C1");
  const c2 = agg(rows, "C2");
  const chiKnow = chiSquare2x2(c1.know, c1.n - c1.know, c2.know, c2.n - c2.know);
  const chiInt = chiSquare2x2(c1.intent, c1.n - c1.intent, c2.intent, c2.n - c2.intent);

  const byPrior = useMemo(() => {
    const keys: (Submission["priorPhilosophy"])[] = ["none", "some", "extensive", null];
    return keys
      .map((k) => {
        const sub = rows.filter((r) => r.priorPhilosophy === k);
        return {
          key: k ?? "not given",
          a: agg(sub, "C1"),
          b: agg(sub, "C2"),
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
      "knowingly",
      "intentional",
      "rating",
      "knowinglyRtMs",
      "intentRtMs",
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
          s.knowingly ? "Yes" : "No",
          s.intentional ? "Yes" : "No",
          s.rating,
          Math.round(s.knowinglyRtMs),
          Math.round(s.intentRtMs),
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
    a.download = `nadelhoffer-blame-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/nadelhoffer-blame?session=${encodeURIComponent(effectiveId)}`
    : "";

  const LABEL: Record<"C1" | "C2", string> = {
    C1: "C1 — thief kills officer",
    C2: "C2 — driver kills carjacker",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 8px" }}>
          Nadelhoffer (2006) — bad acts, blameworthy agents
        </h1>
        <p style={{ fontSize: "15px", color: C.muted, lineHeight: 1.6, margin: "0 0 24px" }}>
          The between-subjects Smith study. Note that C1 and C2 differ in more than one variable at
          once (agent <em>and</em>{" "}victim), so any effect here is confounded — treat these tables as
          a teaching case in design, not as a clean single-factor manipulation.
        </p>

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
            Each visitor is assigned to C1 or C2 at random, so send everyone the same link. Give each
            class its own session id to keep cohorts separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.c1, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px", ...mono, fontSize: "13px", color: C.muted }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* summary table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                {(session || "All sessions").toUpperCase()}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "560px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Condition</th>
                      <th style={th}>N</th>
                      <th style={th}>% knowingly</th>
                      <th style={th}>% intentional</th>
                      <th style={th}>Mean blame</th>
                      <th style={th}>Nadelhoffer (know / int / blame)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([["C1", c1, C.c1], ["C2", c2, C.c2]] as const).map((r) => {
                      const o = ORIGINAL[r[0]];
                      return (
                        <tr key={r[0]}>
                          <td style={{ ...td, textAlign: "left", color: r[2] }}>{LABEL[r[0]]}</td>
                          <td style={td}>{r[1].n}</td>
                          <td style={td}>
                            {r[1].n ? `${Math.round((r[1].know / r[1].n) * 100)}%` : "—"}
                          </td>
                          <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                            {r[1].n ? `${Math.round((r[1].intent / r[1].n) * 100)}%` : "—"}
                          </td>
                          <td style={td}>{r[1].mean === null ? "—" : r[1].mean.toFixed(2)}</td>
                          <td style={{ ...td, color: C.muted }}>
                            {o.knowingly}% / {o.intentionally}% / {o.blame.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* statistics */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Tests of association (C1 vs C2)</div>
              {!chiKnow && !chiInt ? (
                <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                  Need responses in both conditions before a test can be computed.
                </div>
              ) : (
                <>
                  {([
                    ["Knowingly", chiKnow, ORIGINAL.chiKnow],
                    ["Intentionally", chiInt, ORIGINAL.chiInt],
                  ] as const).map(([name, chi, orig]) => (
                    <div key={name} style={{ marginBottom: "18px" }}>
                      <div style={{ ...eyebrow, fontSize: "10px", color: C.text, marginBottom: "8px" }}>{name}</div>
                      {!chi ? (
                        <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                          Need responses in both conditions.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                            {[
                              ["N", String(chi.n)],
                              ["χ²(1)", chi.x2.toFixed(2)],
                              ["p", fmtP(chi.p)],
                              ["Cohen’s w", chi.w.toFixed(2)],
                            ].map(([k, v]) => (
                              <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                                <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                              </div>
                            ))}
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ ...eyebrow, fontSize: "10px" }}>Nadelhoffer</span>
                              <span style={{ ...mono, fontSize: "17px", color: C.muted }}>
                                χ² {orig.chi}, p {orig.p}
                              </span>
                            </div>
                          </div>
                          {chi.minExp < 5 && (
                            <div style={{ fontSize: "14px", color: C.c1, marginTop: "10px", lineHeight: 1.6 }}>
                              <strong>
                                Smallest expected count is {chi.minExp.toFixed(1)} — below 5, so prefer
                                Fisher’s exact test.
                              </strong>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  <div style={{ fontSize: "14px", color: C.muted, marginTop: "4px", lineHeight: 1.6 }}>
                    Pearson χ², uncorrected, df&nbsp;=&nbsp;1. R&rsquo;s <code>chisq.test</code> applies
                    Yates&rsquo;s continuity correction to 2×2 tables by default and will report a
                    slightly smaller value. Remember the design is confounded: a significant result
                    cannot be attributed to any single factor.
                  </div>
                </>
              )}
            </div>

            {/* by prior philosophy */}
            {byPrior.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px" }}>
                <div style={{ ...eyebrow, marginBottom: "14px" }}>By philosophical training</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: "left" }}>Training</th>
                        <th style={th}>N</th>
                        <th style={th}>C1 % intentional</th>
                        <th style={th}>C2 % intentional</th>
                        <th style={th}>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPrior.map((r) => {
                        const ap = r.a.n ? Math.round((r.a.intent / r.a.n) * 100) : null;
                        const bp = r.b.n ? Math.round((r.b.intent / r.b.n) * 100) : null;
                        return (
                          <tr key={r.key}>
                            <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                              {r.key}
                            </td>
                            <td style={td}>{r.n}</td>
                            <td style={td}>{ap === null ? "—" : `${ap}%`}</td>
                            <td style={td}>{bp === null ? "—" : `${bp}%`}</td>
                            <td style={{ ...td, color: C.text }}>
                              {ap === null || bp === null ? "—" : `${ap - bp} pts`}
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
