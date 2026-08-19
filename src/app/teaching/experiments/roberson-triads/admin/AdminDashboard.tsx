"use client";

import { useEffect, useMemo, useState } from "react";
import { TRIADS, REPS, PUBLISHED, SETS, type SetId } from "../stimuli";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  well: "#FDFAF5",
  red: "#CC1A14",
};

interface TrialResult {
  set: SetId;
  triad: number;
  rep: number;
  pair: [number, number];
  predicted: boolean;
  rtMs: number;
}

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  firstLanguage: string;
  colorVision: "typical" | "atypical" | "unsure" | null;
  setOrder: [SetId, SetId];
  trials: TrialResult[];
  scores: { gb: number; nw: number };
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    padding: "40px 24px",
  },
  inner: { maxWidth: "1000px", margin: "0 auto" },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: "10px",
  },
  h1: { fontSize: "32px", fontWeight: 400, color: C.text, marginBottom: "10px" },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "28px 32px",
    marginBottom: "24px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.05)",
  },
  h2: { fontSize: "22px", fontWeight: 400, color: C.text, marginBottom: "14px" },
  mono: { fontFamily: "'Space Mono', monospace" },
  small: { fontSize: "15px", lineHeight: 1.6, color: C.muted, marginBottom: "14px" },
  select: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    padding: "8px 10px",
    border: `1px solid ${C.border}`,
    background: C.well,
    color: C.text,
    marginRight: "10px",
    marginBottom: "10px",
  },
  th: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: C.muted,
    textAlign: "left" as const,
    padding: "8px 12px 8px 0",
    borderBottom: `1px solid ${C.border}`,
  },
  td: {
    fontSize: "16px",
    color: C.body,
    padding: "8px 12px 8px 0",
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "top" as const,
  },
  btn: {
    background: C.text,
    color: C.bg,
    border: "none",
    padding: "10px 22px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
};

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const se = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1) / a.length);
};
const r2 = (x: number) => Math.round(x * 100) / 100;

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Loose English-arm classifier for the headline comparison; the full
 * language list is in the table below, so nothing hides behind this. */
const isEnglish = (s: string) => s.trim().toLowerCase().startsWith("english");

export default function AdminDashboard() {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("__all__");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/experiments/roberson-triads/submissions");
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "load failed");
        setSubs(j.submissions as Submission[]);
        setSessions(j.sessions as string[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!subs) return [];
    const f = session === "__all__" ? subs : subs.filter((s) => s.session === session);
    return [...f].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  }, [subs, session]);

  const english = useMemo(() => filtered.filter((s) => isEnglish(s.firstLanguage)), [filtered]);
  const other = useMemo(() => filtered.filter((s) => !isEnglish(s.firstLanguage)), [filtered]);

  const triadRates = useMemo(() => {
    return (["gb", "nw"] as const).map((set) =>
      TRIADS.map((def, ti) => {
        const rows = filtered.flatMap((s) =>
          s.trials.filter((t) => t.set === set && t.triad === ti),
        );
        return {
          set,
          triad: ti,
          kind: def.kind,
          chips: def.chips,
          n: rows.length,
          predicted: rows.filter((t) => t.predicted).length,
        };
      }),
    );
  }, [filtered]);

  const downloadCsv = () => {
    const rows = [
      "session,submittedAt,firstLanguage,colorVision,setOrder,gbScore,nwScore,durationMs",
    ];
    for (const s of filtered) {
      rows.push(
        [
          csvEscape(s.session),
          csvEscape(s.submittedAt),
          csvEscape(s.firstLanguage),
          s.colorVision ?? "",
          s.setOrder.join(">"),
          String(s.scores.gb),
          String(s.scores.nw),
          String(s.durationMs),
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roberson-triads-${session === "__all__" ? "all" : session}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div style={S.page}>
        <style>{FONTS}</style>
        <div style={S.inner}>
          <div style={{ ...S.mono, color: C.red }}>Failed to load submissions: {error}</div>
        </div>
      </div>
    );
  }
  if (!subs) {
    return (
      <div style={S.page}>
        <style>{FONTS}</style>
        <div style={S.inner}>
          <div style={S.mono}>Loading…</div>
        </div>
      </div>
    );
  }

  const groupRow = (label: string, group: Submission[], highlight = false) => (
    <tr key={label}>
      <td style={{ ...S.td, fontWeight: highlight ? 600 : 400 }}>{label}</td>
      <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{group.length}</td>
      <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
        {group.length ? `${r2(mean(group.map((s) => s.scores.gb)))} (±${r2(se(group.map((s) => s.scores.gb)))})` : "—"}
      </td>
      <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
        {group.length ? `${r2(mean(group.map((s) => s.scores.nw)))} (±${r2(se(group.map((s) => s.scores.nw)))})` : "—"}
      </td>
    </tr>
  );

  return (
    <div style={S.page}>
      <style>{FONTS}</style>
      <div style={S.inner}>
        <div style={S.eyebrow}>Roberson, Davies &amp; Davidoff 2000 — instructor dashboard</div>
        <h1 style={S.h1}>Triad judgments across two boundaries</h1>
        <div style={{ marginBottom: "20px" }}>
          <select style={S.select} value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="__all__">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span style={{ ...S.mono, fontSize: "12px", color: C.muted, marginRight: "16px" }}>
            {filtered.length} participant{filtered.length === 1 ? "" : "s"}
          </span>
          <button style={S.btn} onClick={downloadCsv} disabled={filtered.length === 0}>
            Download CSV
          </button>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Predicted choices out of 32 — the 2 × 2</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={S.th}>Group</th>
                <th style={S.th}>n</th>
                <th style={S.th}>Green–blue (±SE)</th>
                <th style={S.th}>Nol–wor (±SE)</th>
              </tr>
            </thead>
            <tbody>
              {groupRow("This class — English first language", english, true)}
              {groupRow("This class — other first languages", other)}
              <tr>
                <td style={S.td}>Published — English speakers</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>8</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{PUBLISHED.english.gb} (±0.57)</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{PUBLISHED.english.nw} (±1.48)</td>
              </tr>
              <tr>
                <td style={S.td}>Published — Berinmo speakers</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>8</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{PUBLISHED.berinmo.gb} (±1.80)</td>
                <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{PUBLISHED.berinmo.nw} (±0.93)</td>
              </tr>
            </tbody>
          </table>
          <p style={{ ...S.mono, fontSize: "11px", color: C.muted, marginTop: "10px" }}>
            The paper treats 16/32 as chance. The published rows are Table 10 (p. 389); the
            class replicates the English arm, so the prediction is high on green–blue, chance on
            nol–wor.
          </p>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Per-triad rates</h2>
          {triadRates.map((rows, si) => (
            <div key={si} style={{ marginBottom: si === 0 ? "20px" : 0 }}>
              <p style={{ ...S.mono, fontSize: "11px", color: C.muted, marginBottom: "6px" }}>
                {SETS[rows[0].set].label}
              </p>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={S.th}>Triad (series indices)</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Chips</th>
                    <th style={S.th}>Predicted %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.triad}>
                      <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                        {r.chips.join("–")}
                      </td>
                      <td style={{ ...S.td, fontSize: "14px" }}>{r.kind}</td>
                      <td style={S.td}>
                        {r.chips.map((i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              width: "16px",
                              height: "16px",
                              background: SETS[r.set].chips[i - 1].hex,
                              border: `1px solid ${C.border}`,
                              marginRight: "4px",
                              verticalAlign: "-3px",
                            }}
                            title={SETS[r.set].chips[i - 1].munsell}
                          />
                        ))}
                      </td>
                      <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                        {r.n ? `${Math.round((100 * r.predicted) / r.n)}% (${r.predicted}/${r.n})` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Participants</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Submitted</th>
                <th style={S.th}>First language</th>
                <th style={S.th}>Vision</th>
                <th style={S.th}>Order</th>
                <th style={S.th}>GB</th>
                <th style={S.th}>NW</th>
                <th style={S.th}>Trials</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={`${s.submittedAt}-${i}`}>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{i + 1}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                    {s.submittedAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td style={S.td}>{s.firstLanguage}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{s.colorVision ?? "—"}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{s.setOrder.join("→")}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{s.scores.gb}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{s.scores.nw}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                    {s.trials.length}/{TRIADS.length * REPS * 2}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
