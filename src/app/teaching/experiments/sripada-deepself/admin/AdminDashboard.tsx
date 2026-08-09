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
  rifle: "#7A6A52",
  policeman: "#3E5C74",
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

/** Published original figures for side-by-side comparison. NOTE: the two cells
 *  come from DIFFERENT response measures — Rifle Contest is Knobe's (2006)
 *  binary intentional/not; Policeman is Sripada's (2010) 6-point agreement
 *  scale (N = 40, mean 2.0, % agreeing to the left of the midline). Not
 *  like-for-like; shown only as reference points. The class's own data below
 *  runs both arms on the single 6-point scale, so its two cells ARE comparable. */
const ORIGINAL = {
  rifle: { pct: 23 },
  policeman: { pct: 90, mean: 2.0, n: 40 },
};

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: "rifle" | "policeman";
  /** 1–6 agreement: 1 = Agree … 6 = Disagree. */
  rating: number;
  /** Derived: agrees the hit was intentional (rating <= 3, left of the midline). */
  intentional: boolean;
  responseRtMs: number;
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

function agg(rows: Submission[], cond: "rifle" | "policeman") {
  const s = rows.filter((r) => r.condition === cond);
  const yes = s.filter((r) => r.intentional).length;
  const mean = s.length ? s.reduce((a, r) => a + r.rating, 0) / s.length : null;
  return { yes, no: s.length - yes, n: s.length, mean };
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
      const r = await fetch(`/api/experiments/sripada-deepself/submissions${q}`, {
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

  const rifle = agg(rows, "rifle");
  const policeman = agg(rows, "policeman");
  const chi = chiSquare2x2(rifle.yes, rifle.no, policeman.yes, policeman.no);

  const byPrior = useMemo(() => {
    const keys: (Submission["priorPhilosophy"])[] = ["none", "some", "extensive", null];
    return keys
      .map((k) => {
        const sub = rows.filter((r) => r.priorPhilosophy === k);
        return {
          key: k ?? "not given",
          r: agg(sub, "rifle"),
          p: agg(sub, "policeman"),
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
      "intentional",
      "responseRtMs",
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
          s.intentional ? "agree" : "disagree",
          Math.round(s.responseRtMs),
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
    a.download = `sripada-deepself-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/sripada-deepself?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          Sripada (2010) — the Deep Self and intentional action
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
            Each visitor is assigned to the Rifle Contest or the Policeman Rifle Contest at random, so
            send everyone the same link. Give each class its own session id to keep cohorts separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.rifle, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px", ...mono, fontSize: "13px", color: C.muted }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* contingency table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                {(session || "All sessions").toUpperCase()} · SINGLE 6-POINT SCALE
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Condition</th>
                      <th style={th}>Agree int.</th>
                      <th style={th}>Disagree</th>
                      <th style={th}>N</th>
                      <th style={th}>% intentional</th>
                      <th style={th}>Mean (1–6)</th>
                      <th style={th}>Original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["Rifle Contest", rifle, C.rifle, ORIGINAL.rifle.pct],
                        ["Policeman", policeman, C.policeman, ORIGINAL.policeman.pct],
                      ] as const
                    ).map((r) => (
                      <tr key={r[0]}>
                        <td style={{ ...td, textAlign: "left", color: r[2] }}>{r[0]}</td>
                        <td style={td}>{r[1].yes}</td>
                        <td style={td}>{r[1].no}</td>
                        <td style={td}>{r[1].n}</td>
                        <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                          {r[1].n ? `${Math.round((r[1].yes / r[1].n) * 100)}%` : "—"}
                        </td>
                        <td style={td}>{r[1].mean === null ? "—" : r[1].mean.toFixed(2)}</td>
                        <td style={{ ...td, color: C.muted }}>{r[3]}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                &ldquo;% intentional&rdquo; = agreement left of the 1&ndash;6 midline (rating ≤ 3).
                The &ldquo;Original&rdquo; column mixes measures: Rifle Contest {ORIGINAL.rifle.pct}%
                is Knobe&rsquo;s (2006) binary question; Policeman {ORIGINAL.policeman.pct}% (mean{" "}
                {ORIGINAL.policeman.mean.toFixed(1)}, N&nbsp;=&nbsp;{ORIGINAL.policeman.n}) is
                Sripada&rsquo;s 6-point scale. Your class&rsquo;s two cells run on one identical scale
                and are directly comparable.
              </div>
            </div>

            {/* statistics */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px", marginBottom: "20px" }}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Test of association</div>
              {!chi ? (
                <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                  Need responses in both conditions before a test can be computed.
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
                  </div>
                  <div style={{ fontSize: "14px", color: C.muted, marginTop: "16px", lineHeight: 1.6 }}>
                    Pearson χ² on intentional (agree left of midline) vs. condition, uncorrected,
                    df&nbsp;=&nbsp;1. R&rsquo;s <code>chisq.test</code> applies Yates&rsquo;s continuity
                    correction to 2×2 tables by default and will report a slightly smaller value.
                    {chi.minExp < 5 && (
                      <>
                        {" "}
                        <strong style={{ color: C.rifle }}>
                          Smallest expected count is {chi.minExp.toFixed(1)} — below 5, so prefer
                          Fisher&rsquo;s exact test.
                        </strong>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* by prior philosophy */}
            {byPrior.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px 26px" }}>
                <div style={{ ...eyebrow, marginBottom: "14px" }}>By philosophical training</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "460px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, textAlign: "left" }}>Training</th>
                        <th style={th}>N</th>
                        <th style={th}>Rifle % int.</th>
                        <th style={th}>Policeman % int.</th>
                        <th style={th}>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPrior.map((r) => {
                        const rp = r.r.n ? Math.round((r.r.yes / r.r.n) * 100) : null;
                        const pp = r.p.n ? Math.round((r.p.yes / r.p.n) * 100) : null;
                        return (
                          <tr key={r.key}>
                            <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                              {r.key}
                            </td>
                            <td style={td}>{r.n}</td>
                            <td style={td}>{rp === null ? "—" : `${rp}%`}</td>
                            <td style={td}>{pp === null ? "—" : `${pp}%`}</td>
                            <td style={{ ...td, color: C.text }}>
                              {rp === null || pp === null ? "—" : `${pp - rp} pts`}
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
