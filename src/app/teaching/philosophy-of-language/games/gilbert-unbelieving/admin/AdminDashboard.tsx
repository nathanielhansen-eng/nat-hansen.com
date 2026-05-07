"use client";

import { useEffect, useMemo, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
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

            <details style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
              <summary style={{ cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>
                Per-submission breakdown ({submissions.length})
              </summary>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Submitted</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Session</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Trials</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Missed tones</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px" }}>{s.submittedAt}</td>
                      <td style={{ padding: "8px" }}>{s.session}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{s.responses.length}</td>
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
