"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MDD_LADDER, PUBLISHED, TRAUMA_VIGNETTES } from "../stimuli";
import type { Submission } from "../stimuli";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  vert: "#8C3A2E",
  horiz: "#4A6B4F",
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
const panel: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  padding: "24px 26px",
  marginBottom: "20px",
};

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
function sd(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
function fmt(x: number | null, digits = 2): string {
  return x === null ? "—" : x.toFixed(digits);
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
      const r = await fetch(`/api/experiments/concept-breadth/submissions${q}`, {
        cache: "no-store",
      });
      if (!r.ok)
        throw new Error(r.status === 401 ? "Session expired — reload and sign in." : "Load failed.");
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

  const ladder = useMemo(() => {
    const perRung = MDD_LADDER.map((_, i) => rows.filter((r) => r.ladderYes?.[i]).length);
    const depths = rows.map((r) => r.ladderScore).filter((x) => typeof x === "number");
    // A response pattern is monotonic when no Yes appears below a No —
    // the instrument's intended reading of the severity gradient.
    const nonMonotonic = rows.filter((r) => {
      const ys = r.ladderYes ?? [];
      let sawNo = false;
      for (const v of ys) {
        if (!v) sawNo = true;
        else if (sawNo) return true;
      }
      return false;
    }).length;
    return { perRung, meanDepth: mean(depths), sdDepth: sd(depths), nonMonotonic };
  }, [rows]);

  const trauma = useMemo(() => {
    return TRAUMA_VIGNETTES.map((v) => {
      const ratings = rows
        .map((r) => r.trauma?.find((t) => t.id === v.id)?.rating)
        .filter((x): x is number => typeof x === "number");
      return { v, n: ratings.length, mean: mean(ratings), sd: sd(ratings) };
    }).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  }, [rows]);

  const traumaTotals = useMemo(() => {
    const totals = rows.map((r) => r.traumaScore).filter((x) => typeof x === "number");
    return { mean: mean(totals), sd: sd(totals) };
  }, [rows]);

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "durationMs",
      "ladderRtMs",
      ...MDD_LADDER.map((_, i) => `rung${i + 1}Yes`),
      "ladderScore",
      ...TRAUMA_VIGNETTES.map((v) => `${v.id}Rating`),
      ...TRAUMA_VIGNETTES.map((v) => `${v.id}Position`),
      ...TRAUMA_VIGNETTES.map((v) => `${v.id}RtMs`),
      "traumaScore",
    ];
    const lines = [header.join(",")];
    for (const s of submissions) {
      const byId = new Map((s.trauma ?? []).map((t) => [t.id, t]));
      lines.push(
        [
          s.session,
          s.submittedAt,
          Math.round(s.durationMs),
          Math.round(s.ladderRtMs),
          ...MDD_LADDER.map((_, i) => (s.ladderYes?.[i] ? 1 : 0)),
          s.ladderScore,
          ...TRAUMA_VIGNETTES.map((v) => byId.get(v.id)?.rating ?? ""),
          ...TRAUMA_VIGNETTES.map((v) => byId.get(v.id)?.position ?? ""),
          ...TRAUMA_VIGNETTES.map((v) => {
            const rt = byId.get(v.id)?.rtMs;
            return rt === undefined ? "" : Math.round(rt);
          }),
          s.traumaScore,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `concept-breadth-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/concept-breadth?session=${encodeURIComponent(effectiveId)}`
    : "";
  const liveUrl = effectiveId
    ? `${origin}/teaching/experiments/concept-breadth/live?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ ...eyebrow, marginBottom: "8px" }}>Instructor dashboard</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, marginBottom: "24px" }}>
          Where do the concepts stop? — class data
        </h1>

        {/* session controls */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px" }}>Session</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              style={{
                ...mono,
                fontSize: "13px",
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                background: C.well,
                color: C.text,
              }}
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              placeholder="new session id (e.g. warsaw-2026)"
              style={{
                ...mono,
                fontSize: "13px",
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                background: C.well,
                color: C.text,
                minWidth: "260px",
              }}
            />
            <button style={btn} onClick={() => load(session || undefined)}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button style={{ ...btn, background: "transparent", color: C.text, border: `1px solid ${C.border}` }} onClick={downloadCsv}>
              Download CSV
            </button>
          </div>
          {joinUrl && (
            <div style={{ marginTop: "14px", fontSize: "14px", color: C.muted, lineHeight: 1.8 }}>
              <div>
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.12em" }}>JOIN</span>{" "}
                <a href={joinUrl} style={{ color: C.text, wordBreak: "break-all" }}>{joinUrl}</a>
              </div>
              <div>
                <span style={{ ...mono, fontSize: "11px", letterSpacing: "0.12em" }}>LIVE</span>{" "}
                <a href={liveUrl} style={{ color: C.text, wordBreak: "break-all" }}>{liveUrl}</a>
                {" "}&mdash; put this on the projector; it updates itself as responses arrive.
              </div>
            </div>
          )}
        </div>

        {err && (
          <div style={{ ...panel, color: C.vert, ...mono, fontSize: "13px" }}>{err}</div>
        )}

        {/* Part 1 */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px", color: C.vert }}>
            Part 1 · Vertical — the depression ladder (N = {rows.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Rung</th>
                  <th style={th}>Yes</th>
                  <th style={th}>% Yes</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {ladder.perRung.map((yes, i) => {
                  const p = rows.length ? (yes / rows.length) * 100 : null;
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                        {i + 1}{i === 0 ? " (most severe)" : i === 4 ? " (least severe)" : ""}
                      </td>
                      <td style={td}>{yes}</td>
                      <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                        {p === null ? "—" : `${Math.round(p)}%`}
                      </td>
                      <td style={{ ...td, width: "40%" }}>
                        <div style={{ position: "relative", height: "12px", background: "#E7E5E4" }}>
                          <div
                            style={{
                              position: "absolute",
                              inset: "0 auto 0 0",
                              width: `${p ?? 0}%`,
                              background: C.vert,
                            }}
                          />
                          {i === 3 && (
                            <div
                              style={{
                                position: "absolute",
                                top: "-3px",
                                bottom: "-3px",
                                left: `${PUBLISHED.mddRung4Yes * 100}%`,
                                width: "2px",
                                background: C.text,
                              }}
                              title="Published: 53%"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
            Mean depth {fmt(ladder.meanDepth)} (SD {fmt(ladder.sdDepth)}) of 5; published{" "}
            {PUBLISHED.mddDepth} (SD {PUBLISHED.mddDepthSd}), Tse &amp; Haslam (2023) Study 1,
            N&nbsp;=&nbsp;502. The tick on rung 4 is the published 53% for that vignette presented
            alone. Non-monotonic patterns (a Yes below a No): {ladder.nonMonotonic} of {rows.length}.
          </div>
        </div>

        {/* Part 2 */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px", color: C.horiz }}>
            Part 2 · Horizontal — the trauma scenarios
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Scenario</th>
                  <th style={th}>N</th>
                  <th style={th}>Mean</th>
                  <th style={th}>SD</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {trauma.map(({ v, n, mean: m, sd: s }) => (
                  <tr key={v.id}>
                    <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                      {v.label}
                    </td>
                    <td style={td}>{n}</td>
                    <td style={{ ...td, color: C.text, fontWeight: 700 }}>{fmt(m, 2)}</td>
                    <td style={td}>{fmt(s, 2)}</td>
                    <td style={{ ...td, width: "34%" }}>
                      <div style={{ position: "relative", height: "12px", background: "#E7E5E4" }}>
                        <div
                          style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            width: `${m === null ? 0 : ((m - 1) / 5) * 100}%`,
                            background: C.horiz,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "-3px",
                            bottom: "-3px",
                            left: `${((PUBLISHED.traumaItemMean - 1) / 5) * 100}%`,
                            width: "2px",
                            background: C.text,
                            opacity: 0.4,
                          }}
                          title="Published subscale mean: 4.16"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
            Rows ordered by this dataset&rsquo;s means. Total score mean {fmt(traumaTotals.mean, 1)}{" "}
            (SD {fmt(traumaTotals.sd, 1)}) of 60; the published per-item subscale mean is{" "}
            {PUBLISHED.traumaItemMean} (SD {PUBLISHED.traumaItemSd}), McGrath &amp; Haslam (2020)
            Study 2, N&nbsp;=&nbsp;301 — equivalent to {(PUBLISHED.traumaItemMean * 10).toFixed(0)}{" "}
            of 60. Per-item published means were not reported.
          </div>
        </div>
      </div>
    </div>
  );
}
