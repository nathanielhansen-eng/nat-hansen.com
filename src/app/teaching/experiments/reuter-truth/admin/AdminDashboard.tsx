"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  corr: "#8C3A2E",
  coh: "#4A6B4F",
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
const panel: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  padding: "24px 26px",
  marginBottom: "20px",
};

/** Published values from Reuter & Brun (2022) for side-by-side comparison.
 *  part1/part2 are % answering "true"; part3 percentages are from Study 3
 *  (Rolex, coherent version only). */
const ORIGINAL = {
  part1: { party: 59.6, rolex: 56.8 },
  part2: { party: 65.2, rolex: 35.4 },
  part3: { direct: 71.1, afterControl: 51.1, correctYes: 44.7 },
};

type Scenario = "party" | "rolex";
type Answer = "true" | "false" | "notsure";
type YesNo = "yes" | "no";

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  order: "party-first" | "rolex-first";
  part1Scenario: Scenario;
  part1Answer: Answer;
  part1RtMs: number;
  part2Scenario: Scenario;
  part2Answer: Answer;
  part2RtMs: number;
  part3BestKnowledge: YesNo;
  part3Correct: YesNo;
  part3Explanation: string;
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

/** The paper's test: goodness-of-fit of true vs false against the 50% mark,
 *  df = 1, "not sure" responses excluded. */
function chiVs50(t: number, f: number): { x2: number; p: number; n: number } | null {
  const n = t + f;
  if (!n) return null;
  const x2 = (t - f) ** 2 / n;
  return { x2, p: erfc(Math.sqrt(x2 / 2)), n };
}

function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function counts(rows: Submission[], part: 1 | 2, scenario: Scenario) {
  const s = rows.filter((r) => (part === 1 ? r.part1Scenario : r.part2Scenario) === scenario);
  const a = (v: Answer) =>
    s.filter((r) => (part === 1 ? r.part1Answer : r.part2Answer) === v).length;
  return { t: a("true"), f: a("false"), ns: a("notsure"), n: s.length };
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
      const r = await fetch(`/api/experiments/reuter-truth/submissions${q}`, {
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

  const part3 = useMemo(() => {
    const bkYes = rows.filter((r) => r.part3BestKnowledge === "yes").length;
    const corrYes = rows.filter((r) => r.part3Correct === "yes").length;
    // 2×2 of the Part 1 truth answer (excluding "not sure") against the
    // Part 3 correctness answer — the wedge between "true" and "correct".
    const cell = (a: Answer, c: YesNo) =>
      rows.filter((r) => r.part1Answer === a && r.part3Correct === c).length;
    return {
      bkYes,
      corrYes,
      n: rows.length,
      trueCorrect: cell("true", "yes"),
      trueNotCorrect: cell("true", "no"),
      falseCorrect: cell("false", "yes"),
      falseNotCorrect: cell("false", "no"),
    };
  }, [rows]);

  const explanations = useMemo(
    () => rows.filter((r) => r.part3Explanation && r.part3Explanation.trim()),
    [rows]
  );

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "order",
      "part1Scenario",
      "part1Answer",
      "part1RtMs",
      "part2Scenario",
      "part2Answer",
      "part2RtMs",
      "part3BestKnowledge",
      "part3Correct",
      "part3Explanation",
      "durationMs",
    ];
    const lines = [header.join(",")];
    for (const s of submissions) {
      lines.push(
        [
          s.session,
          s.submittedAt,
          s.order,
          s.part1Scenario,
          s.part1Answer,
          Math.round(s.part1RtMs),
          s.part2Scenario,
          s.part2Answer,
          Math.round(s.part2RtMs),
          s.part3BestKnowledge,
          s.part3Correct,
          s.part3Explanation,
          Math.round(s.durationMs),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reuter-truth-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/reuter-truth?session=${encodeURIComponent(effectiveId)}`
    : "";

  const partTable = (part: 1 | 2) => {
    const label =
      part === 1
        ? "Part 1 · Study 1 — coherent, not corresponding"
        : "Part 2 · Study 2 — corresponding, not coherent";
    const orig = part === 1 ? ORIGINAL.part1 : ORIGINAL.part2;
    return (
      <div style={panel}>
        <div style={{ ...eyebrow, marginBottom: "14px" }}>{label}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Scenario</th>
                <th style={th}>True</th>
                <th style={th}>False</th>
                <th style={th}>Not sure</th>
                <th style={th}>N</th>
                <th style={th}>% true</th>
                <th style={th}>Paper</th>
                <th style={th}>χ² vs 50%</th>
              </tr>
            </thead>
            <tbody>
              {(["party", "rolex"] as const).map((sc) => {
                const c = counts(rows, part, sc);
                const chi = chiVs50(c.t, c.f);
                const excl = c.t + c.f;
                return (
                  <tr key={sc}>
                    <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                      {sc === "party" ? "The party" : "The Rolex"}
                    </td>
                    <td style={{ ...td, color: C.coh }}>{c.t}</td>
                    <td style={{ ...td, color: C.corr }}>{c.f}</td>
                    <td style={td}>{c.ns}</td>
                    <td style={td}>{c.n}</td>
                    <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                      {excl ? `${Math.round((c.t / excl) * 100)}%` : "—"}
                    </td>
                    <td style={{ ...td, color: C.muted }}>{orig[sc]}%</td>
                    <td style={{ ...td, color: C.muted }}>
                      {chi ? `${chi.x2.toFixed(2)}, p ${fmtP(chi.p)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
          {part === 1 ? (
            <>
              &lsquo;True&rsquo; is the coherentist answer here. The paper&rsquo;s test is a
              goodness-of-fit χ² of true vs false against the 50% mark, df&nbsp;=&nbsp;1,
              &lsquo;not sure&rsquo; excluded; neither of their scenarios differed significantly
              from 50/50.
            </>
          ) : (
            <>
              &lsquo;True&rsquo; is the correspondentist answer here. In the paper, Party showed a
              significant correspondentist majority (65.2% true) while Rolex reversed the pattern
              (54.2% false) — the between-scenario difference was itself significant.
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          Reuter &amp; Brun (2022) — is &lsquo;true&rsquo; ambiguous?
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
        <div style={{ ...panel, marginBottom: "24px" }}>
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
            Each visitor gets the two stories in a random order (which story is coherent and which
            is incoherent follows from the order), so send everyone the same link. Give each class
            its own session id to keep cohorts separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.corr, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ ...panel, ...mono, fontSize: "13px", color: C.muted, padding: "28px" }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div style={{ ...eyebrow, marginBottom: "14px" }}>
              {(session || "All sessions").toUpperCase()} · N = {rows.length}
            </div>

            {partTable(1)}
            {partTable(2)}

            {/* Part 3 */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                Part 3 · Study 3 — the substitution objection
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", marginBottom: "18px" }}>
                {[
                  [
                    "Best of knowledge: yes",
                    part3.n ? `${Math.round((part3.bkYes / part3.n) * 100)}%` : "—",
                    `${part3.bkYes}/${part3.n}`,
                  ],
                  [
                    "Answer was correct: yes",
                    part3.n ? `${Math.round((part3.corrYes / part3.n) * 100)}%` : "—",
                    `${part3.corrYes}/${part3.n}`,
                  ],
                  ["Paper: correct-yes", `${ORIGINAL.part3.correctYes}%`, "Rolex only"],
                ].map(([k, v, sub]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                    <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                    <span style={{ ...mono, fontSize: "11px", color: C.muted }}>{sub}</span>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Part 1 answer</th>
                      <th style={th}>Correct: yes</th>
                      <th style={th}>Correct: no</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...td, textAlign: "left", color: C.coh }}>True</td>
                      <td style={td}>{part3.trueCorrect}</td>
                      <td style={{ ...td, color: C.text, fontWeight: 700 }}>{part3.trueNotCorrect}</td>
                    </tr>
                    <tr>
                      <td style={{ ...td, textAlign: "left", color: C.corr }}>False</td>
                      <td style={td}>{part3.falseCorrect}</td>
                      <td style={td}>{part3.falseNotCorrect}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
                The bold cell — students who called the answer <em>true</em>{" "}in Part 1 but not{" "}
                <em>correct</em>{" "}in Part 3 — is the wedge between &lsquo;true&rsquo; and
                &lsquo;correct&rsquo; that Study 3 used against the true-for-her objection. Note
                the design difference: in the paper the control and correctness questions were
                between-subjects and came <em>before</em>{" "}(or instead of) the truth question; here
                they come after it, within-subject.
              </div>
            </div>

            {/* explanations */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                Explanations ({explanations.length})
              </div>
              {explanations.length === 0 ? (
                <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                  No written explanations yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {explanations.map((r, i) => (
                    <div key={i} style={{ borderLeft: `2px solid ${r.part1Answer === "true" ? C.coh : r.part1Answer === "false" ? C.corr : C.border}`, paddingLeft: "14px" }}>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: "4px" }}>
                        {r.part1Scenario} · said {r.part1Answer === "notsure" ? "not sure" : r.part1Answer} · correct: {r.part3Correct}
                      </div>
                      <div style={{ fontSize: "16px", lineHeight: 1.6, color: C.body }}>
                        {r.part3Explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
                Reuter and Brun coded explanations for substitution — look for &lsquo;lie&rsquo;,
                &lsquo;honest&rsquo;, &lsquo;deception&rsquo; (truthfulness readings) versus
                &lsquo;based on what she knew at the time&rsquo; (genuinely coherentist ones).
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
