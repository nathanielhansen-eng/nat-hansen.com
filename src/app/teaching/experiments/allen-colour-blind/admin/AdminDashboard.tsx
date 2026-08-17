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
  favc: "#2F5D8C",
  unfavc: "#8C5A2E",
  err: "#8C3A2E",
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
const note: React.CSSProperties = {
  fontSize: "14px",
  color: C.muted,
  marginTop: "14px",
  lineHeight: 1.6,
};

type Condition = "favourable" | "unfavourable";
type ViewKey = "standard" | "alien" | "revised" | "common";
type NewColours = "reds" | "greens" | "pinks-purples" | "blues" | "yellows";
type SelfReportCVD = "yes" | "no" | "unsure";

const VIEW_KEYS: ViewKey[] = ["standard", "alien", "revised", "common"];
const VIEW_LABEL: Record<ViewKey, string> = {
  standard: "Standard (grey)",
  alien: "Alien colour",
  revised: "Revised reduction",
  common: "Common colour",
};

/** Fixed presentation order of the six swatches; `namings` is parallel to this,
 *  and the key is also the original hue's name (the scoring key). */
const SWATCH_KEYS = ["red", "yellow", "purple", "green", "blue", "orange"] as const;
const SWATCH_AXIS: Record<string, "rg" | "yb"> = {
  red: "rg",
  yellow: "yb",
  purple: "rg",
  green: "rg",
  blue: "yb",
  orange: "rg",
};

const NEW_COLOUR_KEYS: NewColours[] = ["reds", "greens", "pinks-purples", "blues", "yellows"];
const NEW_COLOUR_LABEL: Record<NewColours, string> = {
  reds: "Reds",
  greens: "Greens",
  "pinks-purples": "Pinks and purples",
  blues: "Blues",
  yellows: "Yellows",
};

/** Published values from Allen, Quinlan, Andow & Fischer (2021),
 *  doi:10.1111/mila.12370. Page numbers are the open-access PDF's own 1–26
 *  pagination (add 813 for the journal's continuous numbering). */
const ORIGINAL = {
  n: 17,
  comparisonN: 20,
  /** "The majority of participants (12, 71%) did not report seeing any colours
   *  that they had not seen before." (p. 17) */
  noNewColours: 12,
  noNewColoursPct: 71,
  /** "Thirteen participants either reported difficulties with, or made mistakes
   *  involving, purple." (p. 14) */
  purpleTrouble: 13,
  /** All participants identified due west as green and the red apex as red
   *  (p. 12); only #11 sorted mid-red with mid-green (p. 10). */
  conclusion: "common colour view",
};

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  study: 1;
  condition: Condition;
  viewChoice: ViewKey;
  viewOrder: string;
  confidence: number;
  viewRtMs: number;
  choseStandard: boolean;
  choseAlien: boolean;
  choseRevised: boolean;
  choseCommon: boolean;
  namings: string[];
  namingScore: number;
  rgScore: number;
  ybScore: number;
  newColours: NewColours;
  choseNewPinksPurples: boolean;
  selfReportCVD: SelfReportCVD | null;
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

/** One-df goodness-of-fit of a binary split against an expected proportion —
 *  here, "standard view" vs. the other three against the 25% a uniform guess
 *  would give. df = 1, so erfc suffices; no incomplete gamma needed. */
function chiGof2(hits: number, misses: number, pExpected: number): Chi | null {
  const n = hits + misses;
  if (!n) return null;
  const exp = [n * pExpected, n * (1 - pExpected)];
  if (exp[0] <= 0 || exp[1] <= 0) return null;
  const obs = [hits, misses];
  let x2 = 0;
  for (let i = 0; i < 2; i++) x2 += (obs[i] - exp[i]) ** 2 / exp[i];
  return { x2, p: erfc(Math.sqrt(x2 / 2)), w: Math.sqrt(x2 / n), n, minExp: Math.min(...exp) };
}

function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
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
  const [excludeCvd, setExcludeCvd] = useState(false);

  const load = useCallback(async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/allen-colour-blind/submissions${q}`, {
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

  const rows = useMemo(
    () => (excludeCvd ? submissions.filter((s) => s.selfReportCVD !== "yes") : submissions),
    [submissions, excludeCvd]
  );

  const cvdCount = submissions.filter((s) => s.selfReportCVD === "yes").length;

  /* --- Primary DV: which view, overall and by viewing condition --- */
  const viewCounts = useMemo(() => {
    const out: Record<ViewKey, { fav: number; unfav: number; all: number }> = {
      standard: { fav: 0, unfav: 0, all: 0 },
      alien: { fav: 0, unfav: 0, all: 0 },
      revised: { fav: 0, unfav: 0, all: 0 },
      common: { fav: 0, unfav: 0, all: 0 },
    };
    for (const r of rows) {
      const cell = out[r.viewChoice];
      if (!cell) continue;
      cell.all += 1;
      if (r.condition === "favourable") cell.fav += 1;
      else cell.unfav += 1;
    }
    return out;
  }, [rows]);

  const nFav = rows.filter((r) => r.condition === "favourable").length;
  const nUnfav = rows.filter((r) => r.condition === "unfavourable").length;

  const stdFav = viewCounts.standard.fav;
  const stdUnfav = viewCounts.standard.unfav;
  const manipChi = chiSquare2x2(stdFav, nFav - stdFav, stdUnfav, nUnfav - stdUnfav);

  const stdAll = viewCounts.standard.all;
  const modalChi = chiGof2(stdAll, rows.length - stdAll, 0.25);

  /* --- Task 2: naming the simulated swatches --- */
  const perSwatch = useMemo(
    () =>
      SWATCH_KEYS.map((key, i) => {
        const answered = rows.filter((r) => Array.isArray(r.namings) && r.namings.length > i);
        const hits = answered.filter((r) => r.namings[i] === key).length;
        // Most frequent name given, for the discussion ("what did they call it?")
        const tally = new Map<string, number>();
        for (const r of answered) {
          const v = r.namings[i];
          if (typeof v === "string") tally.set(v, (tally.get(v) ?? 0) + 1);
        }
        let modal: string | null = null;
        let modalN = 0;
        for (const [k, v] of tally) {
          if (v > modalN) {
            modal = k;
            modalN = v;
          }
        }
        return { key, axis: SWATCH_AXIS[key], n: answered.length, hits, modal, modalN };
      }),
    [rows]
  );

  const meanNaming = mean(rows.map((r) => r.namingScore));
  const meanRg = mean(rows.map((r) => r.rgScore));
  const meanYb = mean(rows.map((r) => r.ybScore));
  const meanConf = mean(rows.map((r) => r.confidence));

  /* --- Task 3: the new-colours prediction --- */
  const newCounts = useMemo(() => {
    const out = new Map<NewColours, number>();
    for (const k of NEW_COLOUR_KEYS) out.set(k, 0);
    for (const r of rows) out.set(r.newColours, (out.get(r.newColours) ?? 0) + 1);
    return out;
  }, [rows]);

  const downloadCsv = () => {
    const header = [
      "session",
      "submittedAt",
      "study",
      "condition",
      "viewChoice",
      "viewOrder",
      "confidence",
      "viewRtMs",
      ...SWATCH_KEYS.map((k) => `named_${k}`),
      "namingScore",
      "rgScore",
      "ybScore",
      "newColours",
      "selfReportCVD",
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
          s.viewChoice,
          s.viewOrder,
          s.confidence,
          Math.round(s.viewRtMs),
          ...SWATCH_KEYS.map((_, i) => (Array.isArray(s.namings) ? s.namings[i] ?? "" : "")),
          s.namingScore,
          s.rgScore,
          s.ybScore,
          s.newColours,
          s.selfReportCVD ?? "",
          Math.round(s.durationMs),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `allen-colour-blind-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/allen-colour-blind?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 8px" }}>
          Allen et al. (2021) — what is it like to be colour-blind?
        </h1>
        <p style={{ fontSize: "16px", color: C.muted, lineHeight: 1.6, marginBottom: "24px" }}>
          An <strong style={{ color: C.body }}>original</strong>{" "}classroom design built on the
          paper&rsquo;s question, not a replication of its method. The paper interviewed{" "}
          {ORIGINAL.n}{" "}colour-blind participants about their own experience; this asks a mostly
          sighted class to predict it. See{" "}
          <code style={{ ...mono, fontSize: "13px" }}>docs/cold-experiments/allen-colour-blind-spec.md</code>.
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
          <button
            style={{
              ...btn,
              background: excludeCvd ? C.accent : "transparent",
              color: excludeCvd ? C.bg : C.text,
              border: `1px solid ${excludeCvd ? C.accent : C.border}`,
              opacity: cvdCount ? 1 : 0.35,
            }}
            onClick={() => setExcludeCvd((v) => !v)}
            disabled={!cvdCount}
            aria-pressed={excludeCvd}
          >
            {excludeCvd ? "Colour-blind excluded" : `Exclude colour-blind (${cvdCount})`}
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
          <div style={note}>
            Each visitor is assigned to the favourable or unfavourable viewing scenario at random,
            so send everyone the same link. Give each class its own session id to keep cohorts
            separate.
          </div>
        </div>

        {err && <div style={{ ...mono, fontSize: "13px", color: C.err, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && rows.length === 0 && (
          <div style={{ ...panel, ...mono, fontSize: "13px", color: C.muted }}>
            No responses yet
            {session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* KEY CHART — the four views */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "6px" }}>
                {(session || "All sessions").toUpperCase()} · PRIMARY MEASURE
              </div>
              <div style={{ fontSize: "18px", color: C.text, marginBottom: "16px" }}>
                What does a red/green colour-blind person see?
              </div>
              <div style={{ marginBottom: "14px" }}>
                {VIEW_KEYS.map((k) => {
                  const c = viewCounts[k];
                  const pct = rows.length ? Math.round((c.all / rows.length) * 100) : 0;
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                      <span style={{ ...mono, fontSize: "11px", color: C.muted, width: "150px", flexShrink: 0 }}>
                        {VIEW_LABEL[k]}
                      </span>
                      <span style={{ flex: 1, height: "12px", background: "#EDE6D8", display: "block" }}>
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${pct}%`,
                            background: k === "standard" ? C.unfavc : C.favc,
                          }}
                        />
                      </span>
                      <span style={{ ...mono, fontSize: "14px", color: C.text, width: "74px", textAlign: "right" }}>
                        {pct}% ({c.all})
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={note}>
                Allen et al. conclude the evidence tells against the standard, alien, and revised
                reduction views, and supports the{" "}
                <strong style={{ color: C.body }}>{ORIGINAL.conclusion}</strong>{" "}(the last bar).
                The paper asserts that the standard view is what the phrase &lsquo;colour
                blindness&rsquo; suggests and that it is widely accepted, but never measures that.
                This bar chart does.
              </div>
            </div>

            {/* the between-subjects manipulation */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>By viewing condition</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>View chosen</th>
                      <th style={th}>Favourable</th>
                      <th style={th}>Unfavourable</th>
                      <th style={th}>Fav %</th>
                      <th style={th}>Unfav %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VIEW_KEYS.map((k) => {
                      const c = viewCounts[k];
                      return (
                        <tr key={k}>
                          <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                            {VIEW_LABEL[k]}
                          </td>
                          <td style={td}>{c.fav}</td>
                          <td style={td}>{c.unfav}</td>
                          <td style={{ ...td, color: C.favc }}>
                            {nFav ? `${Math.round((c.fav / nFav) * 100)}%` : "—"}
                          </td>
                          <td style={{ ...td, color: C.unfavc }}>
                            {nUnfav ? `${Math.round((c.unfav / nUnfav) * 100)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ ...td, textAlign: "left", color: C.muted }}>N</td>
                      <td style={{ ...td, color: C.muted }}>{nFav}</td>
                      <td style={{ ...td, color: C.muted }}>{nUnfav}</td>
                      <td style={td} />
                      <td style={td} />
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={note}>
                The favourable scenario is a large red door in daylight; the unfavourable one is a
                small red chip glimpsed in dim light. Allen et al. report that how well a
                colour-blind perceiver sees a colour depends heavily on exactly these factors. The
                question is whether third-person judgements track that. A flat table &mdash; no
                movement between the columns &mdash; is itself the finding worth discussing.
              </div>
            </div>

            {/* statistics */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Tests</div>
              <div style={{ marginBottom: "18px" }}>
                <div style={{ ...eyebrow, fontSize: "10px", marginBottom: "8px" }}>
                  Does the viewing context move standard-view endorsement?
                </div>
                {!manipChi ? (
                  <div style={{ ...mono, fontSize: "13px", color: C.muted }}>
                    Need responses in both conditions before a test can be computed.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                    {[
                      ["N", String(manipChi.n)],
                      ["χ²(1)", manipChi.x2.toFixed(2)],
                      ["p", fmtP(manipChi.p)],
                      ["Cohen’s w", manipChi.w.toFixed(2)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                        <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ ...eyebrow, fontSize: "10px", marginBottom: "8px" }}>
                  Is the standard view picked more than chance (25% of four options)?
                </div>
                {!modalChi ? (
                  <div style={{ ...mono, fontSize: "13px", color: C.muted }}>Not enough data.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
                    {[
                      ["N", String(modalChi.n)],
                      ["Standard %", `${Math.round((stdAll / rows.length) * 100)}%`],
                      ["χ²(1)", modalChi.x2.toFixed(2)],
                      ["p", fmtP(modalChi.p)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                        <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={note}>
                Both are Pearson χ², uncorrected, df&nbsp;=&nbsp;1: the first a 2×2 test of
                association (standard vs. the other three, by condition), the second a
                goodness-of-fit against a 25% baseline. R&rsquo;s <code>chisq.test</code> applies
                Yates&rsquo;s continuity correction to 2×2 tables by default and will report
                slightly smaller values. The 25% baseline treats the four options as equally
                attractive a priori, which they are not &mdash; treat it as a descriptive
                benchmark, not a serious null.
                {manipChi && manipChi.minExp < 5 && (
                  <>
                    {" "}
                    <strong style={{ color: C.err }}>
                      Smallest expected count in the 2×2 is {manipChi.minExp.toFixed(1)} &mdash;
                      below 5, so prefer Fisher&rsquo;s exact test.
                    </strong>
                  </>
                )}
              </div>
            </div>

            {/* naming task */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Naming the simulated patches</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", marginBottom: "18px" }}>
                {[
                  ["Mean score /6", meanNaming === null ? "—" : meanNaming.toFixed(2)],
                  ["Collapsing hues /4", meanRg === null ? "—" : meanRg.toFixed(2)],
                  ["Preserved hues /2", meanYb === null ? "—" : meanYb.toFixed(2)],
                  ["Mean confidence /5", meanConf === null ? "—" : meanConf.toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ ...eyebrow, fontSize: "10px" }}>{k}</span>
                    <span style={{ ...mono, fontSize: "17px", color: C.text }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "480px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Original hue</th>
                      <th style={{ ...th, textAlign: "left" }}>Axis</th>
                      <th style={th}>Named correctly</th>
                      <th style={th}>%</th>
                      <th style={{ ...th, textAlign: "left" }}>Most common answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perSwatch.map((s) => (
                      <tr key={s.key}>
                        <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                          {s.key}
                        </td>
                        <td style={{ ...td, textAlign: "left", fontSize: "12px", color: s.axis === "rg" ? C.unfavc : C.favc }}>
                          {s.axis === "rg" ? "collapses" : "preserved"}
                        </td>
                        <td style={td}>
                          {s.hits}/{s.n}
                        </td>
                        <td style={{ ...td, color: C.text, fontWeight: 700 }}>
                          {s.n ? `${Math.round((s.hits / s.n) * 100)}%` : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "left", fontSize: "13px" }}>
                          {s.modal ? `${s.modal} (${s.modalN})` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={note}>
                Patches were rendered with the Vi&eacute;not, Brettel &amp; Mollon (1999)
                deuteranopia transform. The contrast to draw out: the simulation strips red, green,
                purple and orange, but every one of Allen et al.&rsquo;s{" "}
                {ORIGINAL.n}{" "}colour-blind participants identified the real green patch as green
                and the real red apex as red. The simulation shows what a dichromat cannot{" "}
                <em>discriminate</em>; it is not a picture of what they{" "}
                <em>experience</em>, and its output is close to the standard view the paper
                rejects. Purple is worth dwelling on &mdash; it goes blue here, and{" "}
                {ORIGINAL.purpleTrouble}{" "}of {ORIGINAL.n} of the paper&rsquo;s participants had
                trouble with purple too. Screens are uncalibrated, so cross-class comparison of the
                absolute percentages is weak; the collapsing-vs-preserved gap is the robust part.
              </div>
            </div>

            {/* new colours */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>
                Predicted new colours with enhancement glasses
              </div>
              <div style={{ marginBottom: "14px" }}>
                {NEW_COLOUR_KEYS.map((k) => {
                  const c = newCounts.get(k) ?? 0;
                  const pct = rows.length ? Math.round((c / rows.length) * 100) : 0;
                  const isAnswer = k === "pinks-purples";
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                      <span style={{ ...mono, fontSize: "11px", color: isAnswer ? C.text : C.muted, width: "150px", flexShrink: 0 }}>
                        {NEW_COLOUR_LABEL[k]}
                        {isAnswer ? " ★" : ""}
                      </span>
                      <span style={{ flex: 1, height: "12px", background: "#EDE6D8", display: "block" }}>
                        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: isAnswer ? C.favc : C.muted }} />
                      </span>
                      <span style={{ ...mono, fontSize: "14px", color: C.text, width: "74px", textAlign: "right" }}>
                        {pct}% ({c})
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={note}>
                ★ is what actually happened. {ORIGINAL.noNewColours}{" "}of {ORIGINAL.n} participants
                ({ORIGINAL.noNewColoursPct}%) reported no new colours at all in EnChroma glasses,
                and among those who thought they might have,{" "}
                <strong style={{ color: C.body }}>no one</strong>{" "}claimed to see red or green for
                the first time &mdash; every candidate was a pink or a purple. That is the
                paper&rsquo;s strongest argument against the standard view: if reds and greens were
                genuinely absent, enhancement should have delivered reds and greens first.
              </div>
            </div>

            {/* self-reported colour vision */}
            <div style={panel}>
              <div style={{ ...eyebrow, marginBottom: "14px" }}>Self-reported colour vision</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Colour-blind?</th>
                      <th style={th}>N</th>
                      <th style={th}>% standard view</th>
                      <th style={th}>Mean naming /6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["no", "yes", "unsure", null] as (SelfReportCVD | null)[]).map((k) => {
                      const sub = rows.filter((r) => r.selfReportCVD === k);
                      if (!sub.length) return null;
                      const std = sub.filter((r) => r.viewChoice === "standard").length;
                      const m = mean(sub.map((r) => r.namingScore));
                      return (
                        <tr key={k ?? "not given"}>
                          <td style={{ ...td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                            {k ?? "not given"}
                          </td>
                          <td style={td}>{sub.length}</td>
                          <td style={td}>{Math.round((std / sub.length) * 100)}%</td>
                          <td style={td}>{m === null ? "—" : m.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={note}>
                Cell counts here get small fast &mdash; around 8% of men and 0.5% of women in
                European populations are colour-blind, so a class of thirty may contain one or two.
                Treat this as a discussion prompt, not a test. It is also the most interesting row
                in the room: these are the only participants answering the first question about
                themselves rather than about someone else.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
