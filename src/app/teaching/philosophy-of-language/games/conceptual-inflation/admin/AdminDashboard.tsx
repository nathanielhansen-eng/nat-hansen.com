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
  ext: "#1548A8",
  int: "#B01568",
  ref: "#9A8866",
};

type QType = "extension" | "intensity";

interface ResponseRow {
  questionType: QType;
  term: string;
  value: number;
  rtMs: number;
}

interface Demographics {
  age: number | null;
  ageDeclined: boolean;
  gender: string | null;
  genderDeclined: boolean;
  race: string[];
  raceOther: string | null;
  raceDeclined: boolean;
}

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  blockOrder: string[];
  responses: ResponseRow[];
  demographics: Demographics;
}

const TERMS = [
  "racist",
  "disagreeable",
  "terrible",
  "worthless",
  "slightly racist",
  "moderately racist",
  "extremely racist",
  "racially ignorant",
  "racially insensitive",
  "racially unjust",
] as const;

// Hansen & Liao Ergo Study 1 reference means/SDs.
const REFERENCE: Record<string, { ext: { m: number; sd: number }; int: { m: number; sd: number } }> = {
  racist: { ext: { m: 32.33, sd: 21.44 }, int: { m: 72.71, sd: 25.87 } },
  disagreeable: { ext: { m: 40.98, sd: 20.31 }, int: { m: 29.93, sd: 22.52 } },
  terrible: { ext: { m: 22.06, sd: 17.83 }, int: { m: 55.45, sd: 27.76 } },
  worthless: { ext: { m: 12.69, sd: 16.89 }, int: { m: 69.97, sd: 27.47 } },
  "slightly racist": { ext: { m: 39.58, sd: 25.09 }, int: { m: 51.61, sd: 29.97 } },
  "moderately racist": { ext: { m: 30.23, sd: 20.08 }, int: { m: 64.88, sd: 26.27 } },
  "extremely racist": { ext: { m: 19.48, sd: 20.72 }, int: { m: 81.44, sd: 24.00 } },
  "racially ignorant": { ext: { m: 45.30, sd: 25.50 }, int: { m: 49.69, sd: 27.23 } },
  "racially insensitive": { ext: { m: 43.00, sd: 24.29 }, int: { m: 44.50, sd: 28.46 } },
  "racially unjust": { ext: { m: 33.09, sd: 22.99 }, int: { m: 56.20, sd: 28.36 } },
};

function meanSd(xs: number[]): { m: number; sd: number; n: number } {
  const n = xs.length;
  if (n === 0) return { m: 0, sd: 0, n: 0 };
  const m = xs.reduce((s, x) => s + x, 0) / n;
  const v = n > 1 ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1) : 0;
  return { m, sd: Math.sqrt(v), n };
}

function pearson(xs: number[], ys: number[]): { r: number; slope: number; intercept: number; n: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { r: NaN, slope: NaN, intercept: NaN, n };
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return { r: NaN, slope: NaN, intercept: NaN, n };
  const r = sxy / Math.sqrt(sxx * syy);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return { r, slope, intercept, n };
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [newSessionId, setNewSessionId] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/conceptual-inflation/submissions${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSubmissions((data.submissions || []) as Submission[]);
      if (!s) setSessions(data.sessions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (session !== "") load(session);
    else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const stats = useMemo(() => {
    const n = submissions.length;
    const perTerm = new Map<string, { ext: number[]; int: number[] }>();
    for (const t of TERMS) perTerm.set(t, { ext: [], int: [] });
    for (const s of submissions) {
      for (const r of s.responses) {
        const rec = perTerm.get(r.term);
        if (!rec) continue;
        if (r.questionType === "extension") rec.ext.push(r.value);
        else rec.int.push(r.value);
      }
    }
    const rows = TERMS.map((term) => {
      const rec = perTerm.get(term)!;
      return {
        term,
        ext: meanSd(rec.ext),
        int: meanSd(rec.int),
        extValues: rec.ext,
        intValues: rec.int,
      };
    });

    // Apparent-time: per-participant (age, racist-ext, racist-int)
    const ageExt: { age: number; v: number }[] = [];
    const ageInt: { age: number; v: number }[] = [];
    for (const sub of submissions) {
      if (sub.demographics.ageDeclined) continue;
      const age = sub.demographics.age;
      if (age === null || age === undefined) continue;
      let ext: number | null = null;
      let int: number | null = null;
      for (const r of sub.responses) {
        if (r.term !== "racist") continue;
        if (r.questionType === "extension") ext = r.value;
        else int = r.value;
      }
      if (ext !== null) ageExt.push({ age, v: ext });
      if (int !== null) ageInt.push({ age, v: int });
    }
    const extFit = pearson(ageExt.map((p) => p.age), ageExt.map((p) => p.v));
    const intFit = pearson(ageInt.map((p) => p.age), ageInt.map((p) => p.v));

    return { n, rows, ageExt, ageInt, extFit, intFit };
  }, [submissions]);

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "durationMs",
      "term",
      "questionType",
      "value",
      "rtMs",
      "age",
      "ageDeclined",
      "gender",
      "genderDeclined",
      "race",
      "raceOther",
      "raceDeclined",
    ];
    const lines: string[] = [header.join(",")];
    for (const s of submissions) {
      const d = s.demographics;
      for (const r of s.responses) {
        const row = [
          s.session,
          s.submittedAt,
          s.durationMs,
          r.term,
          r.questionType,
          r.value,
          r.rtMs,
          d.age ?? "",
          d.ageDeclined,
          d.gender ?? "",
          d.genderDeclined,
          d.race.join("|"),
          d.raceOther ?? "",
          d.raceDeclined,
        ];
        lines.push(row.map(csvEscape).join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conceptual-inflation-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const outer: React.CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    padding: "28px",
  };
  const card: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "28px 32px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
    maxWidth: "1100px",
    margin: "0 auto",
  };
  const eyebrow: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
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
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  };

  // Bar layout — one row per term, two bars (ext + int)
  const ROW_H = 60;
  const BAR_W = 320;
  const LABEL_W = 170;
  const ROW_GAP = 12;

  return (
    <div style={outer}>
      <style>{FONTS}</style>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={eyebrow}>Hansen &amp; Liao · Conceptual Inflation</div>
          <h1 style={{ fontSize: "26px", fontWeight: 400, marginTop: "4px", color: C.text }}>
            Class results
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ ...eyebrow, marginRight: "6px" }}>Session:</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              background: "#FDFAF5",
            }}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s} ({s === session ? stats.n : "…"})
              </option>
            ))}
          </select>
          <button style={btn} onClick={() => load(session || undefined)}>
            Refresh
          </button>
          <button style={btn} onClick={downloadCsv} disabled={submissions.length === 0}>
            Download CSV
          </button>
        </div>
      </div>

      {/* Student URL helper */}
      {(() => {
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
        const effectiveId = sanitize(newSessionId || session || "");
        const origin =
          typeof window !== "undefined" ? window.location.origin : "https://nat-hansen.com";
        const url = effectiveId
          ? `${origin}/teaching/philosophy-of-language/games/conceptual-inflation?session=${encodeURIComponent(effectiveId)}`
          : `${origin}/teaching/philosophy-of-language/games/conceptual-inflation`;
        return (
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto 16px",
              padding: "16px 20px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div style={{ ...eyebrow, whiteSpace: "nowrap" }}>Student URL</div>
            <input
              value={newSessionId}
              onChange={(e) => {
                setNewSessionId(e.target.value);
                setCopied(false);
              }}
              placeholder={session || "e.g. Edinburgh-Meaning-Sciences-2026"}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "12px",
                padding: "8px 10px",
                border: `1px solid ${C.border}`,
                background: "#FDFAF5",
                minWidth: "240px",
              }}
            />
            <code
              style={{
                flex: 1,
                minWidth: "260px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: C.body,
                background: C.bg,
                padding: "8px 10px",
                border: `1px solid ${C.border}`,
                wordBreak: "break-all",
              }}
            >
              {url}
            </code>
            <button
              style={btn}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // ignore
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        );
      })()}

      <div style={card}>
        {loading && <p style={{ color: C.muted }}>Loading…</p>}
        {err && <p style={{ color: "#CC1A14" }}>Error: {err}</p>}
        {!loading && !err && stats.n === 0 && (
          <p style={{ color: C.muted, fontStyle: "italic" }}>
            No submissions yet{session ? ` for session "${session}"` : ""}.
          </p>
        )}
        {!loading && !err && stats.n > 0 && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <div style={eyebrow}>{(session || "All sessions").toUpperCase()}</div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 400,
                  marginTop: "4px",
                  color: C.text,
                }}
              >
                N = {stats.n} {stats.n === 1 ? "participant" : "participants"}
              </h2>
              <div style={{ marginTop: "10px", display: "flex", gap: "18px", flexWrap: "wrap" }}>
                <Legend swatch={C.ext} label="Extension (% who can be called X)" />
                <Legend swatch={C.int} label="Intensity (how bad to be called X)" />
                <Legend swatch={C.ref} label="Hansen & Liao reference (mean ± SD)" dashed />
              </div>
            </div>

            {/* Two-column layout: extension on left, intensity on right */}
            {(["extension", "intensity"] as const).map((qt) => {
              const color = qt === "extension" ? C.ext : C.int;
              const titleText =
                qt === "extension"
                  ? "EXTENSION — \"What % of people can be reasonably called X?\""
                  : "INTENSITY — \"How bad is it to be called X?\"";
              return (
                <div key={qt} style={{ marginTop: "24px" }}>
                  <div style={{ ...eyebrow, marginBottom: "12px" }}>{titleText}</div>
                  <div>
                    {stats.rows.map((row) => {
                      const live = qt === "extension" ? row.ext : row.int;
                      const ref = REFERENCE[row.term][qt === "extension" ? "ext" : "int"];
                      const W = LABEL_W + BAR_W + 240;
                      const barX = LABEL_W;
                      const liveW = (live.m / 100) * BAR_W;
                      const refX = barX + (ref.m / 100) * BAR_W;
                      const refSdLeft = barX + Math.max(0, (ref.m - ref.sd) / 100) * BAR_W;
                      const refSdRight = barX + Math.min(100, (ref.m + ref.sd) / 100) * BAR_W;
                      return (
                        <svg
                          key={row.term + qt}
                          width="100%"
                          viewBox={`0 0 ${W} ${ROW_H}`}
                          style={{ display: "block", marginBottom: ROW_GAP }}
                        >
                          {/* term label */}
                          <text
                            x={0}
                            y={ROW_H / 2 + 5}
                            fontSize="14"
                            fontFamily="'Crimson Pro', Georgia, serif"
                            fontStyle="italic"
                            fill={C.text}
                          >
                            {row.term}
                          </text>
                          {/* track */}
                          <rect
                            x={barX}
                            y={ROW_H / 2 - 11}
                            width={BAR_W}
                            height={22}
                            fill="#EDE8DF"
                          />
                          {/* live mean bar */}
                          <rect
                            x={barX}
                            y={ROW_H / 2 - 11}
                            width={liveW}
                            height={22}
                            fill={color}
                            opacity={0.85}
                          />
                          {/* live SD whisker */}
                          {live.n > 1 && (
                            <line
                              x1={barX + Math.max(0, (live.m - live.sd) / 100) * BAR_W}
                              y1={ROW_H / 2}
                              x2={barX + Math.min(100, (live.m + live.sd) / 100) * BAR_W}
                              y2={ROW_H / 2}
                              stroke={C.text}
                              strokeWidth="1.5"
                            />
                          )}
                          {/* reference SD bracket */}
                          <line
                            x1={refSdLeft}
                            y1={ROW_H / 2 - 16}
                            x2={refSdRight}
                            y2={ROW_H / 2 - 16}
                            stroke={C.ref}
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          {/* reference mean tick */}
                          <line
                            x1={refX}
                            y1={ROW_H / 2 - 19}
                            x2={refX}
                            y2={ROW_H / 2 + 13}
                            stroke={C.ref}
                            strokeWidth="2"
                            strokeDasharray="3 2"
                          />
                          {/* axis ticks 0/50/100 */}
                          {[0, 50, 100].map((v) => (
                            <text
                              key={v}
                              x={barX + (v / 100) * BAR_W}
                              y={ROW_H - 2}
                              fontSize="9"
                              textAnchor="middle"
                              fontFamily="'Space Mono', monospace"
                              fill={C.muted}
                            >
                              {v}
                            </text>
                          ))}
                          {/* numeric summary */}
                          <text
                            x={barX + BAR_W + 14}
                            y={ROW_H / 2 - 2}
                            fontSize="12"
                            fontFamily="'Space Mono', monospace"
                            fill={C.text}
                          >
                            M={live.m.toFixed(1)} SD={live.sd.toFixed(1)} (n={live.n})
                          </text>
                          <text
                            x={barX + BAR_W + 14}
                            y={ROW_H / 2 + 14}
                            fontSize="11"
                            fontFamily="'Space Mono', monospace"
                            fill={C.ref}
                          >
                            ref M={ref.m.toFixed(1)} SD={ref.sd.toFixed(1)}
                          </text>
                        </svg>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: "36px", paddingTop: "24px" }}>
              <div style={eyebrow}>Apparent time — age × &lsquo;racist&rsquo;</div>
              <p style={{ fontSize: "14px", lineHeight: "1.55", color: C.body, marginTop: "8px", marginBottom: "16px" }}>
                Each dot is one participant. Solid line is this session&apos;s least-squares fit; r is shown
                below each panel. Hansen &amp; Liao Study 1 reported r = −0.05 (extension, p = .463) and r = 0.04
                (intensity, p = .556) — neither statistically significant.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "20px",
                }}
              >
                <Scatter
                  title='EXTENSION × AGE'
                  data={stats.ageExt}
                  fit={stats.extFit}
                  refR={-0.05}
                  refP={0.463}
                  yLabel="What % can be called 'racist'?"
                  color={C.ext}
                />
                <Scatter
                  title='INTENSITY × AGE'
                  data={stats.ageInt}
                  fit={stats.intFit}
                  refR={0.04}
                  refP={0.556}
                  yLabel="How bad to be called 'racist'?"
                  color={C.int}
                />
              </div>
              {(stats.ageExt.length === 0 && stats.ageInt.length === 0) && (
                <p style={{ fontSize: "13px", color: C.muted, fontStyle: "italic", marginTop: "10px" }}>
                  No age data yet — apparent-time scatter will appear once participants submit ages.
                </p>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: "32px", paddingTop: "20px" }}>
              <div style={eyebrow}>About the reference values</div>
              <p style={{ fontSize: "15px", lineHeight: "1.6", color: C.body, marginTop: "8px" }}>
                The dashed grey markers show the per-term means (with ±1 SD) reported in Hansen &amp; Liao,
                &ldquo;Measuring Conceptual Inflation: The Case of &lsquo;Racist&rsquo;&rdquo; (forthcoming in{" "}
                <em>Ergo</em>), Study 1 — a demographically representative US sample. The solid coloured bars
                are this session&apos;s live means. Treat the comparison as a teaching prompt, not a formal
                replication: this audience is not a representative US sample.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Scatter({
  title,
  data,
  fit,
  refR,
  refP,
  yLabel,
  color,
}: {
  title: string;
  data: { age: number; v: number }[];
  fit: { r: number; slope: number; intercept: number; n: number };
  refR: number;
  refP: number;
  yLabel: string;
  color: string;
}) {
  const W = 380;
  const H = 260;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 14;
  const PAD_B = 36;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Axes: age 18..90, value 0..100
  const xMin = 18;
  const xMax = 90;
  const yMin = 0;
  const yMax = 100;
  const sx = (a: number) => PAD_L + ((a - xMin) / (xMax - xMin)) * plotW;
  const sy = (v: number) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const xTicks = [20, 30, 40, 50, 60, 70, 80, 90];
  const yTicks = [0, 25, 50, 75, 100];

  const fitX1 = xMin;
  const fitX2 = xMax;
  const fitY1 = fit.intercept + fit.slope * fitX1;
  const fitY2 = fit.intercept + fit.slope * fitX2;
  const fitOk = Number.isFinite(fit.r) && data.length >= 2;

  return (
    <div>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.12em",
          color: C.muted,
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "#FDFAF5", border: `1px solid ${C.border}` }}>
        {/* y gridlines + labels */}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={sy(v)}
              y2={sy(v)}
              stroke="#EDE8DF"
              strokeWidth="1"
            />
            <text
              x={PAD_L - 6}
              y={sy(v) + 4}
              fontSize="10"
              textAnchor="end"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              {v}
            </text>
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((a) => (
          <g key={`x${a}`}>
            <line
              x1={sx(a)}
              x2={sx(a)}
              y1={PAD_T + plotH}
              y2={PAD_T + plotH + 4}
              stroke={C.muted}
              strokeWidth="1"
            />
            <text
              x={sx(a)}
              y={PAD_T + plotH + 16}
              fontSize="10"
              textAnchor="middle"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              {a}
            </text>
          </g>
        ))}
        {/* axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke={C.text} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke={C.text} strokeWidth="1" />
        {/* axis labels */}
        <text
          x={PAD_L + plotW / 2}
          y={H - 6}
          fontSize="11"
          textAnchor="middle"
          fontFamily="'Crimson Pro', Georgia, serif"
          fill={C.body}
        >
          age (years)
        </text>
        <text
          x={10}
          y={PAD_T + plotH / 2}
          fontSize="10"
          textAnchor="middle"
          fontFamily="'Crimson Pro', Georgia, serif"
          fill={C.body}
          transform={`rotate(-90 10 ${PAD_T + plotH / 2})`}
        >
          {yLabel}
        </text>
        {/* fit line */}
        {fitOk && (
          <line
            x1={sx(fitX1)}
            y1={sy(Math.max(yMin, Math.min(yMax, fitY1)))}
            x2={sx(fitX2)}
            y2={sy(Math.max(yMin, Math.min(yMax, fitY2)))}
            stroke={color}
            strokeWidth="1.5"
            opacity={0.7}
          />
        )}
        {/* points */}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={sx(Math.max(xMin, Math.min(xMax, p.age)))}
            cy={sy(p.v)}
            r="4"
            fill={color}
            fillOpacity="0.55"
            stroke={color}
            strokeWidth="0.5"
          />
        ))}
      </svg>
      <div
        style={{
          marginTop: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          color: C.body,
        }}
      >
        <span>
          n = {data.length}
          {fitOk && <> · r = {fit.r.toFixed(3)} · slope = {fit.slope.toFixed(2)}</>}
        </span>
        <span style={{ color: C.ref }}>
          ref: r = {refR.toFixed(2)}, p = {refP.toFixed(3)}
        </span>
      </div>
    </div>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          display: "inline-block",
          width: "20px",
          height: "10px",
          background: dashed ? "transparent" : swatch,
          borderTop: dashed ? `2px dashed ${swatch}` : "none",
        }}
      />
      <span style={{ fontSize: "12px", color: C.body }}>{label}</span>
    </div>
  );
}
