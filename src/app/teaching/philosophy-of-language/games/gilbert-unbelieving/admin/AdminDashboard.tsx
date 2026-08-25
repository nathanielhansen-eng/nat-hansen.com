"use client";

import { useEffect, useMemo, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  green: "#1A7840",
  red: "#CC1A14",
};

type SignalKind = "true" | "false" | "blank";
type TestResponse = "true" | "false" | "noinfo" | "neverseen";

interface ResponseRow {
  x: string;
  y: string;
  signal: SignalKind;
  interrupted: boolean;
  isFoil: boolean;
  response: TestResponse;
}
interface Submission {
  session: string;
  submittedAt: string;
  missedTones: number;
  responses: ResponseRow[];
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");

  const load = async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const url = s
        ? `/api/experiments/gilbert-unbelieving/submissions?session=${encodeURIComponent(s)}`
        : `/api/experiments/gilbert-unbelieving/submissions`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setSubmissions(j.submissions ?? []);
      setSessions(j.sessions ?? []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Aggregate: for each cell (signal × interrupted × response), count and total
  const agg = useMemo(() => {
    const all = submissions.flatMap((s) => s.responses);
    const crit = all.filter((r) => !r.isFoil);
    const cell = (sig: SignalKind, intr: boolean, resp: TestResponse) =>
      crit.filter((r) => r.signal === sig && r.interrupted === intr && r.response === resp).length;
    const total = (sig: SignalKind, intr: boolean) =>
      crit.filter((r) => r.signal === sig && r.interrupted === intr).length;
    const pct = (n: number, d: number) => (d === 0 ? 0 : (100 * n) / d);

    const rows = [
      { label: "TRUE · uninterrupted", sig: "true" as SignalKind, intr: false },
      { label: "TRUE · interrupted", sig: "true" as SignalKind, intr: true },
      { label: "FALSE · uninterrupted", sig: "false" as SignalKind, intr: false },
      { label: "FALSE · interrupted", sig: "false" as SignalKind, intr: true },
    ];
    return { rows, cell, total, pct, n: submissions.length };
  }, [submissions]);

  // Comparison with Gilbert et al. (1990) Study 1 published rates (n=33)
  const comparison = useMemo(() => {
    if (submissions.length === 0) return null;
    const correctPct = (sig: "true" | "false", intr: boolean) =>
      agg.pct(agg.cell(sig, intr, sig as TestResponse), agg.total(sig, intr));
    const reversalPct = (sig: "true" | "false", intr: boolean) => {
      const opp: TestResponse = sig === "true" ? "false" : "true";
      return agg.pct(agg.cell(sig, intr, opp), agg.total(sig, intr));
    };

    const tCorrUn = correctPct("true", false);
    const tCorrIn = correctPct("true", true);
    const fCorrUn = correctPct("false", false);
    const fCorrIn = correctPct("false", true);
    const tAsFUn = reversalPct("true", false);
    const tAsFIn = reversalPct("true", true);
    const fAsTUn = reversalPct("false", false);
    const fAsTIn = reversalPct("false", true);

    // Diagnostic deltas (Spinozan signature)
    const interruptionCostFalse = fCorrUn - fCorrIn; // Gilbert ≈ 20 pts
    const interruptionCostTrue = tCorrUn - tCorrIn;  // Gilbert ≈ -3 pts (slight reverse / null)
    const reversalAsymmetry = fAsTIn - tAsFIn;       // Gilbert ≈ 16 pts (33 - 17)

    // Gilbert reference values
    const gilbert = {
      tCorrUn: 55,
      tCorrIn: 58,
      fCorrUn: 55,
      fCorrIn: 35,
      tAsFUn: 22,
      tAsFIn: 17,
      fAsTUn: 21,
      fAsTIn: 33,
      interruptionCostFalse: 20,
      interruptionCostTrue: -3,
      reversalAsymmetry: 16,
    };

    // Verdict
    let verdictLabel = "";
    let verdictColor = "";
    let verdictText = "";
    if (reversalAsymmetry >= 10 && interruptionCostFalse >= 10 && interruptionCostTrue < interruptionCostFalse) {
      verdictLabel = "Strong Spinozan pattern";
      verdictColor = C.green;
      verdictText =
        "This session shows the diagnostic asymmetry: interruption hurts identification of FALSE propositions much more than TRUE, and false-as-true errors outpace true-as-false errors under interruption. Aligns with Gilbert et al.'s Study 1.";
    } else if (reversalAsymmetry >= 5 || interruptionCostFalse >= 8) {
      verdictLabel = "Weak Spinozan pattern";
      verdictColor = "#C68A1F";
      verdictText =
        "The Spinozan signature is partly present but muted. The class is in the right direction, but smaller-than-published. Often a sample-size issue (Gilbert had 33 subjects).";
    } else if (reversalAsymmetry <= -5 || interruptionCostTrue > interruptionCostFalse + 5) {
      verdictLabel = "Reversed / Cartesian-leaning";
      verdictColor = C.red;
      verdictText =
        "This session does not reproduce Spinoza's predicted asymmetry — and may show the opposite pattern. Worth discussing whether the manipulation actually interrupted comprehension here, or whether students figured out the structure.";
    } else {
      verdictLabel = "No clear effect";
      verdictColor = C.muted;
      verdictText =
        "Interruption did not produce a clear asymmetry in this session. Could be sample size, weak interruption (look at missed-tone counts), or simply within-noise variance.";
    }

    return {
      session: { tCorrUn, tCorrIn, fCorrUn, fCorrIn, tAsFUn, tAsFIn, fAsTUn, fAsTIn, interruptionCostFalse, interruptionCostTrue, reversalAsymmetry },
      gilbert,
      verdictLabel,
      verdictColor,
      verdictText,
    };
  }, [submissions, agg]);

  // Per-submission stats for the breakdown
  const perSubmission = useMemo(() => {
    return submissions.map((s) => {
      const crit = s.responses.filter((r) => !r.isFoil);
      const correct = crit.filter((r) => {
        const want = r.signal === "true" ? "true" : r.signal === "false" ? "false" : "noinfo";
        return r.response === want;
      }).length;
      const fInt = crit.filter((r) => r.signal === "false" && r.interrupted);
      const fIntAsT = fInt.filter((r) => r.response === "true").length;
      return { ...s, correct, total: crit.length, fIntAsT, fIntTotal: fInt.length };
    });
  }, [submissions]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(submissions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gilbert-unbelieving-${session || "all"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 20px", fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: "12px",
          }}
        >
          Instructor view
        </div>
        <h1 style={{ fontSize: "34px", fontWeight: 400, color: C.text, marginBottom: "24px" }}>
          Unbelieving the Unbelievable — class data
        </h1>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
          <label
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Session:
          </label>
          <select
            value={session}
            onChange={(e) => {
              setSession(e.target.value);
              load(e.target.value || undefined);
            }}
            style={{
              border: `1px solid ${C.border}`,
              padding: "8px 12px",
              fontFamily: "'Crimson Pro', serif",
              fontSize: "16px",
              background: C.surface,
            }}
          >
            <option value="">— all sessions —</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(session || undefined)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              padding: "8px 16px",
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
          {submissions.length > 0 && (
            <button
              onClick={downloadJson}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                padding: "8px 16px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Download JSON
            </button>
          )}
          <span style={{ color: C.muted, fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>
            n = {submissions.length}
          </span>
        </div>

        {loading && <p style={{ color: C.muted }}>Loading…</p>}
        {err && <p style={{ color: C.red }}>{err}</p>}

        {!loading && !err && submissions.length === 0 && (
          <p style={{ color: C.muted, fontStyle: "italic" }}>No submissions yet for this filter.</p>
        )}

        {!loading && submissions.length > 0 && (
          <>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                padding: "32px",
                marginBottom: "32px",
                boxShadow: "0 4px 40px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: "16px",
                }}
              >
                Aggregated 2 × 4 — counts (% of cell)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                      <th style={{ textAlign: "left", padding: "10px 8px" }}>Trial type</th>
                      <th style={{ textAlign: "right", padding: "10px 8px" }}>n</th>
                      <th style={{ textAlign: "right", padding: "10px 8px" }}>true</th>
                      <th style={{ textAlign: "right", padding: "10px 8px" }}>false</th>
                      <th style={{ textAlign: "right", padding: "10px 8px" }}>no info</th>
                      <th style={{ textAlign: "right", padding: "10px 8px" }}>never</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agg.rows.map((r) => {
                      const n = agg.total(r.sig, r.intr);
                      const fmt = (resp: TestResponse) => {
                        const c = agg.cell(r.sig, r.intr, resp);
                        return `${c} (${agg.pct(c, n).toFixed(0)}%)`;
                      };
                      const diagnostic = r.sig === "false" && r.intr;
                      return (
                        <tr
                          key={r.label}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            background: diagnostic ? "#FFF5F0" : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 8px", color: C.text, fontFamily: "'Crimson Pro', serif", fontSize: "15px" }}>
                            {r.label}
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 8px", color: C.muted }}>{n}</td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "10px 8px",
                              color: diagnostic ? C.red : C.text,
                              fontWeight: diagnostic ? 700 : 400,
                            }}
                          >
                            {fmt("true")}
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 8px" }}>{fmt("false")}</td>
                          <td style={{ textAlign: "right", padding: "10px 8px" }}>{fmt("noinfo")}</td>
                          <td style={{ textAlign: "right", padding: "10px 8px" }}>{fmt("neverseen")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "13px", color: C.muted, fontStyle: "italic", marginTop: "16px" }}>
                The pink cell — false propositions misidentified as true after interruption — is the
                Spinozan signature. Gilbert et al. (1990) reported 33% in this cell vs. 17% for the
                symmetric true-as-false cell.
              </p>
            </div>

            {comparison && (
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  padding: "32px",
                  marginBottom: "32px",
                  boxShadow: "0 4px 40px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: "8px",
                  }}
                >
                  Session assessment vs. Gilbert et al. (1990)
                </div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: comparison.verdictColor,
                    color: "#fff",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "16px",
                  }}
                >
                  {comparison.verdictLabel}
                </div>
                <p style={{ fontSize: "16px", color: C.body, lineHeight: 1.6, marginBottom: "24px" }}>
                  {comparison.verdictText}
                </p>

                <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `2px solid ${C.border}`,
                          color: C.muted,
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        <th style={{ textAlign: "left", padding: "10px 8px" }}>Measure</th>
                        <th style={{ textAlign: "right", padding: "10px 8px" }}>This session</th>
                        <th style={{ textAlign: "right", padding: "10px 8px" }}>Gilbert (1990)</th>
                        <th style={{ textAlign: "right", padding: "10px 8px" }}>Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { k: "% correct · TRUE uninterrupted", s: comparison.session.tCorrUn, g: comparison.gilbert.tCorrUn },
                        { k: "% correct · TRUE interrupted ♪", s: comparison.session.tCorrIn, g: comparison.gilbert.tCorrIn },
                        { k: "% correct · FALSE uninterrupted", s: comparison.session.fCorrUn, g: comparison.gilbert.fCorrUn },
                        { k: "% correct · FALSE interrupted ♪", s: comparison.session.fCorrIn, g: comparison.gilbert.fCorrIn, hi: true },
                        { k: "% T-as-F · uninterrupted", s: comparison.session.tAsFUn, g: comparison.gilbert.tAsFUn, sub: true },
                        { k: "% T-as-F · interrupted ♪", s: comparison.session.tAsFIn, g: comparison.gilbert.tAsFIn, sub: true },
                        { k: "% F-as-T · uninterrupted", s: comparison.session.fAsTUn, g: comparison.gilbert.fAsTUn, sub: true },
                        { k: "% F-as-T · interrupted ♪", s: comparison.session.fAsTIn, g: comparison.gilbert.fAsTIn, sub: true, hi: true },
                      ].map((row) => {
                        const delta = row.s - row.g;
                        return (
                          <tr
                            key={row.k}
                            style={{
                              borderBottom: `1px solid ${C.border}`,
                              background: row.hi ? "#FFF5F0" : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "10px 8px",
                                fontFamily: "'Crimson Pro', serif",
                                fontSize: row.sub ? "14px" : "16px",
                                color: row.sub ? C.muted : C.text,
                                fontStyle: row.sub ? "italic" : "normal",
                              }}
                            >
                              {row.k}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                padding: "10px 8px",
                                fontWeight: row.hi ? 700 : 400,
                                color: row.hi ? C.red : C.text,
                              }}
                            >
                              {row.s.toFixed(0)}%
                            </td>
                            <td style={{ textAlign: "right", padding: "10px 8px", color: C.muted }}>
                              {row.g.toFixed(0)}%
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                padding: "10px 8px",
                                color: Math.abs(delta) < 5 ? C.muted : delta > 0 ? C.green : C.red,
                              }}
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta.toFixed(0)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ borderTop: `2px solid ${C.border}`, background: "#FAFAF9" }}>
                        <td
                          colSpan={4}
                          style={{
                            padding: "10px 8px 4px",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "11px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.muted,
                          }}
                        >
                          Diagnostic deltas
                        </td>
                      </tr>
                      {[
                        {
                          k: "Interruption cost · FALSE",
                          s: comparison.session.interruptionCostFalse,
                          g: comparison.gilbert.interruptionCostFalse,
                          tip: "% correct uninterrupted − interrupted. Should be large.",
                        },
                        {
                          k: "Interruption cost · TRUE",
                          s: comparison.session.interruptionCostTrue,
                          g: comparison.gilbert.interruptionCostTrue,
                          tip: "Same, for true items. Should be near zero.",
                        },
                        {
                          k: "Reversal asymmetry (F-as-T − T-as-F, interrupted)",
                          s: comparison.session.reversalAsymmetry,
                          g: comparison.gilbert.reversalAsymmetry,
                          tip: "The Spinozan signature. >0 = false-as-true errors outpace true-as-false.",
                        },
                      ].map((row) => {
                        const delta = row.s - row.g;
                        return (
                          <tr key={row.k} style={{ borderBottom: `1px solid ${C.border}`, background: "#FAFAF9" }}>
                            <td
                              style={{
                                padding: "10px 8px",
                                fontFamily: "'Crimson Pro', serif",
                                fontSize: "16px",
                                color: C.text,
                              }}
                            >
                              {row.k}
                              <div style={{ fontSize: "12px", color: C.muted, fontStyle: "italic", marginTop: "2px" }}>
                                {row.tip}
                              </div>
                            </td>
                            <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700, fontSize: "16px" }}>
                              {row.s >= 0 ? "+" : ""}
                              {row.s.toFixed(0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "10px 8px", color: C.muted, fontSize: "16px" }}>
                              {row.g >= 0 ? "+" : ""}
                              {row.g.toFixed(0)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                padding: "10px 8px",
                                color: Math.abs(delta) < 5 ? C.muted : delta > 0 ? C.green : C.red,
                              }}
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta.toFixed(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>
                  Δ shows points above (+) or below (−) the published Gilbert rate; |Δ| &lt; 5 is
                  greyed as essentially matching. Gilbert had n=33 subjects; class samples are
                  noisier, so the verdict is heuristic. The decisive cells are the two pink rows
                  and the three diagnostic deltas at the bottom.
                </p>
              </div>
            )}

            <details style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
              <summary style={{ cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>
                Per-submission breakdown ({submissions.length})
              </summary>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Submitted</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Session</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Correct</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>F-int as T</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Missed tones</th>
                  </tr>
                </thead>
                <tbody>
                  {perSubmission.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px" }}>{s.submittedAt}</td>
                      <td style={{ padding: "8px" }}>{s.session}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        {s.correct}/{s.total}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", color: s.fIntAsT > 0 ? C.red : C.muted, fontWeight: s.fIntAsT > 0 ? 700 : 400 }}>
                        {s.fIntAsT}/{s.fIntTotal}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{s.missedTones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
