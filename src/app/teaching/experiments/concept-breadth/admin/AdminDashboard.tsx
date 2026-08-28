"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MDD_LADDER, PUBLISHED, TRAUMA_VIGNETTES } from "../stimuli";
import type { PassData, Submission } from "../stimuli";

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
  vertSevere: "#3E1E18",
  horiz: "#4A6B4F",
  horizSevere: "#20301F",
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

function isPass(p: unknown): p is PassData {
  if (!p || typeof p !== "object") return false;
  const b = p as Record<string, unknown>;
  return (
    Array.isArray(b.ladderYes) &&
    b.ladderYes.length === 5 &&
    Array.isArray(b.trauma) &&
    typeof b.ladderScore === "number" &&
    typeof b.traumaScore === "number"
  );
}

/** A response pattern is monotonic when no Yes appears below a No. */
function nonMonotonic(p: PassData): boolean {
  let sawNo = false;
  for (const v of p.ladderYes) {
    if (!v) sawNo = true;
    else if (sawNo) return true;
  }
  return false;
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

  // Two-pass records only; pre-two-pass test records are skipped.
  const rows = useMemo(
    () => submissions.filter((r) => isPass(r.bare) && isPass(r.severe)),
    [submissions]
  );

  const ladder = useMemo(() => {
    const per = (pick: (r: Submission) => PassData) => ({
      perRung: MDD_LADDER.map((_, i) => rows.filter((r) => pick(r).ladderYes[i]).length),
      meanDepth: mean(rows.map((r) => pick(r).ladderScore)),
      sdDepth: sd(rows.map((r) => pick(r).ladderScore)),
      nonMono: rows.filter((r) => nonMonotonic(pick(r))).length,
    });
    return { bare: per((r) => r.bare), severe: per((r) => r.severe) };
  }, [rows]);

  const trauma = useMemo(() => {
    const itemMean = (pick: (r: Submission) => PassData, id: string) => {
      const ratings = rows
        .map((r) => pick(r).trauma.find((t) => t.id === id)?.rating)
        .filter((x): x is number => typeof x === "number");
      return { n: ratings.length, mean: mean(ratings), sd: sd(ratings) };
    };
    return TRAUMA_VIGNETTES.map((v) => ({
      v,
      bare: itemMean((r) => r.bare, v.id),
      severe: itemMean((r) => r.severe, v.id),
    })).sort((a, b) => (b.bare.mean ?? 0) - (a.bare.mean ?? 0));
  }, [rows]);

  const shift = useMemo(() => {
    const of = (rs: Submission[]) => {
      const ladderDeltas = rs.map((r) => r.bare.ladderScore - r.severe.ladderScore);
      const traumaDeltas = rs.map((r) => (r.bare.traumaScore - r.severe.traumaScore) / TRAUMA_VIGNETTES.length);
      return {
        n: rs.length,
        up: ladderDeltas.filter((d) => d > 0).length,
        same: ladderDeltas.filter((d) => d === 0).length,
        down: ladderDeltas.filter((d) => d < 0).length,
        meanLadderDelta: mean(ladderDeltas),
        meanTraumaDelta: mean(traumaDeltas),
      };
    };
    return {
      all: of(rows),
      bareFirst: of(rows.filter((r) => r.passOrder === "bare-first")),
      severeFirst: of(rows.filter((r) => r.passOrder === "severe-first")),
    };
  }, [rows]);

  const downloadCsv = () => {
    const passCols = (prefix: string) => [
      ...MDD_LADDER.map((_, i) => `${prefix}Rung${i + 1}Yes`),
      `${prefix}LadderScore`,
      `${prefix}LadderRtMs`,
      ...TRAUMA_VIGNETTES.map((v) => `${prefix}${v.id}Rating`),
      ...TRAUMA_VIGNETTES.map((v) => `${prefix}${v.id}Position`),
      ...TRAUMA_VIGNETTES.map((v) => `${prefix}${v.id}RtMs`),
      `${prefix}TraumaScore`,
    ];
    const header = ["session", "submittedAt", "durationMs", "passOrder", ...passCols("bare"), ...passCols("severe")];
    const passVals = (p: PassData) => {
      const byId = new Map(p.trauma.map((t) => [t.id, t]));
      return [
        ...MDD_LADDER.map((_, i) => (p.ladderYes[i] ? 1 : 0)),
        p.ladderScore,
        Math.round(p.ladderRtMs),
        ...TRAUMA_VIGNETTES.map((v) => byId.get(v.id)?.rating ?? ""),
        ...TRAUMA_VIGNETTES.map((v) => byId.get(v.id)?.position ?? ""),
        ...TRAUMA_VIGNETTES.map((v) => {
          const rt = byId.get(v.id)?.rtMs;
          return rt === undefined ? "" : Math.round(rt);
        }),
        p.traumaScore,
      ];
    };
    const lines = [header.join(",")];
    for (const s of rows) {
      lines.push(
        [s.session, s.submittedAt, Math.round(s.durationMs), s.passOrder, ...passVals(s.bare), ...passVals(s.severe)]
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

  const shiftRow = (label: string, s: typeof shift.all) => (
    <tr key={label}>
      <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>{label}</td>
      <td style={td}>{s.n}</td>
      <td style={{ ...td, color: C.text, fontWeight: 700 }}>{s.up}</td>
      <td style={td}>{s.same}</td>
      <td style={td}>{s.down}</td>
      <td style={td}>{fmt(s.meanLadderDelta)}</td>
      <td style={td}>{fmt(s.meanTraumaDelta)}</td>
    </tr>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ ...eyebrow, marginBottom: "8px" }}>Instructor dashboard</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, marginBottom: "24px" }}>
          How far do concepts extend? — class data
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

        {/* Shift summary */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px" }}>
            The effect of &ldquo;severe&rdquo; (N = {rows.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "600px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Group</th>
                  <th style={th}>N</th>
                  <th style={th}>Threshold up</th>
                  <th style={th}>Same</th>
                  <th style={th}>Down</th>
                  <th style={th}>Δ rungs</th>
                  <th style={th}>Δ trauma</th>
                </tr>
              </thead>
              <tbody>
                {shiftRow("All", shift.all)}
                {shiftRow("Saw bare first", shift.bareFirst)}
                {shiftRow("Saw severe first", shift.severeFirst)}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
            &ldquo;Threshold up&rdquo; = fewer Yes rungs with &ldquo;severe&rdquo; in the question.
            Δ rungs = mean (bare − severe) ladder score; Δ trauma = mean per-item (bare − severe)
            rating. Pass order was randomized per person — compare the two order rows to eyeball
            order effects.
          </div>
        </div>

        {/* Part 1 */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px", color: C.vert }}>
            Part 1 · Vertical — the depression scale
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "560px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Rung</th>
                  <th style={th}>% Yes bare</th>
                  <th style={th}>% Yes severe</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {MDD_LADDER.map((_, i) => {
                  const bp = rows.length ? (ladder.bare.perRung[i] / rows.length) * 100 : null;
                  const sp = rows.length ? (ladder.severe.perRung[i] / rows.length) * 100 : null;
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                        {i + 1}{i === 0 ? " (most severe)" : i === 4 ? " (least severe)" : ""}
                      </td>
                      <td style={{ ...td, color: C.vert, fontWeight: 700 }}>
                        {bp === null ? "—" : `${Math.round(bp)}%`}
                      </td>
                      <td style={{ ...td, color: C.vertSevere, fontWeight: 700 }}>
                        {sp === null ? "—" : `${Math.round(sp)}%`}
                      </td>
                      <td style={{ ...td, width: "36%" }}>
                        <div style={{ position: "relative", height: "18px", background: "#E7E5E4" }}>
                          <div style={{ position: "absolute", top: "2px", height: "6px", left: 0, width: `${bp ?? 0}%`, background: C.vert }} />
                          <div style={{ position: "absolute", top: "10px", height: "6px", left: 0, width: `${sp ?? 0}%`, background: C.vertSevere }} />
                          {i === 3 && (
                            <div
                              style={{ position: "absolute", top: "-3px", bottom: "-3px", left: `${PUBLISHED.mddRung4Yes * 100}%`, width: "2px", background: C.text }}
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
            Mean depth bare {fmt(ladder.bare.meanDepth)} (SD {fmt(ladder.bare.sdDepth)}), severe{" "}
            {fmt(ladder.severe.meanDepth)} (SD {fmt(ladder.severe.sdDepth)}) of 5; published{" "}
            {PUBLISHED.mddDepth} (SD {PUBLISHED.mddDepthSd}), Tse &amp; Haslam (2023) Study 1,
            N&nbsp;=&nbsp;502 — the published sample answered the unmodified question. The tick on
            rung 4 is the published 53% for that vignette presented alone. Non-monotonic patterns
            (a Yes below a No): bare {ladder.bare.nonMono}, severe {ladder.severe.nonMono} of{" "}
            {rows.length}.
          </div>
        </div>

        {/* Part 2 */}
        <div style={panel}>
          <div style={{ ...eyebrow, marginBottom: "14px", color: C.horiz }}>
            Part 2 · Horizontal — the trauma scenarios
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "620px" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Scenario</th>
                  <th style={th}>Bare M</th>
                  <th style={th}>SD</th>
                  <th style={th}>Severe M</th>
                  <th style={th}>SD</th>
                  <th style={th}>Δ</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {trauma.map(({ v, bare, severe }) => {
                  const delta =
                    bare.mean !== null && severe.mean !== null ? bare.mean - severe.mean : null;
                  return (
                    <tr key={v.id}>
                      <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                        {v.label}
                      </td>
                      <td style={{ ...td, color: C.horiz, fontWeight: 700 }}>{fmt(bare.mean, 2)}</td>
                      <td style={td}>{fmt(bare.sd, 2)}</td>
                      <td style={{ ...td, color: C.horizSevere, fontWeight: 700 }}>{fmt(severe.mean, 2)}</td>
                      <td style={td}>{fmt(severe.sd, 2)}</td>
                      <td style={{ ...td, color: C.text }}>{delta === null ? "—" : fmt(delta, 2)}</td>
                      <td style={{ ...td, width: "24%" }}>
                        <div style={{ position: "relative", height: "18px", background: "#E7E5E4" }}>
                          <div
                            style={{
                              position: "absolute",
                              top: "2px",
                              height: "6px",
                              left: 0,
                              width: `${bare.mean === null ? 0 : ((bare.mean - 1) / 5) * 100}%`,
                              background: C.horiz,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: "10px",
                              height: "6px",
                              left: 0,
                              width: `${severe.mean === null ? 0 : ((severe.mean - 1) / 5) * 100}%`,
                              background: C.horizSevere,
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
            Rows ordered by this dataset&rsquo;s bare-pass means. Δ = bare − severe. The published
            per-item subscale mean is {PUBLISHED.traumaItemMean} (SD {PUBLISHED.traumaItemSd}),
            McGrath &amp; Haslam (2020) Study 2, N&nbsp;=&nbsp;301 — that sample answered the
            unmodified statement; per-item published means were not reported.
          </div>
        </div>
      </div>
    </div>
  );
}
