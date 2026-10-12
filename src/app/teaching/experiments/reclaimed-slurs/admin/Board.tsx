"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  INGROUP_QUESTIONS,
  MEASURES,
  MEASURE_SPECS,
  MIN_CELL,
  SELF_QUESTION,
  SLUG,
  TERMS,
  composite,
  type IngroupKey,
  type Measure,
  type PilotSubmission,
  type Submission,
  type Term,
} from "@/lib/reclaimed-slurs";
import pilot from "../pilot-reference.json";
import {
  FONT_IMPORT,
  HS,
  INK,
  MUTED,
  PAPER,
  PLASMA_OVER60,
  PLASMA_UNDER30,
  SANS,
  SERIF,
  TIGHT,
  TIGHTER,
} from "../design";
import { cronbach, mean, pairedT, sd, welch } from "./stats";
import { DumbbellFigure, ViolinFigure, fromPilot, summarize, type DumbbellRow } from "./figures";

// The pilot's figures are ggplot2 theme_bw() with viridis "plasma" fills;
// the age groups and question types keep those colours so the board matches
// the slides. The class takes the Hydrosemantics deep blue, outside plasma,
// so it never reads as one of the pilot's groups.
const CLASS_COLOR = HS.blue[3];
const MEASURE_FILL: Record<Measure, string> = {
  bad1: "#CC4778",
  bad2: "#E56B5D",
  offense: "#F89441",
  valence: "#FDC328",
};

const CSS = `
${FONT_IMPORT}
.b-btn { background: ${INK}; color: ${PAPER}; border: 2px solid ${INK}; padding: 9px 16px; font-family: ${SANS}; font-weight: 700; font-size: 15px; letter-spacing: ${TIGHT}; cursor: pointer; }
.b-btn.ghost { background: ${PAPER}; color: ${INK}; }
.b-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.b-tab { background: none; border: none; padding: 0 0 6px; margin-right: 28px; font-family: ${SANS}; font-weight: 700; font-size: clamp(22px, 4vw, 30px); letter-spacing: ${TIGHTER}; color: ${MUTED}; cursor: pointer; border-bottom: 4px solid transparent; }
.b-tab[aria-selected="true"] { color: ${INK}; border-bottom-color: ${INK}; }
`;

const label: React.CSSProperties = { fontFamily: SANS, fontWeight: 700, fontSize: "14px", letterSpacing: TIGHT, margin: "0 0 8px" };
const section: React.CSSProperties = { borderTop: `2px solid ${INK}`, padding: "18px 0 34px" };
const figTitle: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: "clamp(20px, 3vw, 26px)",
  letterSpacing: TIGHTER,
  lineHeight: 1.1,
  margin: "0 0 8px",
};
const prose: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: "18px",
  lineHeight: 1.45,
  color: INK,
  margin: "0 0 16px",
  maxWidth: "820px",
};
const small: React.CSSProperties = { ...prose, fontSize: "16px", color: MUTED };
const th: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: TIGHT,
  padding: "8px 10px",
  borderBottom: `2px solid ${INK}`,
  textAlign: "right",
  verticalAlign: "bottom",
};
const td: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: "15px",
  letterSpacing: "-0.01em",
  fontVariantNumeric: "tabular-nums",
  padding: "7px 10px",
  borderBottom: "1px solid #DDD",
  textAlign: "right",
};
const input: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: "16px",
  fontFamily: SANS,
  border: `2px solid ${INK}`,
  background: PAPER,
  borderRadius: 0,
};
const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))",
  gap: "22px 32px",
  alignItems: "start",
};

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const fmt = (v: number) => (Number.isFinite(v) ? (v > 0 ? "+" : "") + v.toFixed(1) : "—");
const fmtP = (p: number) => (p < 0.001 ? "p < .001" : `p = ${p.toFixed(3).replace(/^0/, "")}`);

type Tab = "replication" | "pilot";

export default function Board() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pilotRecs, setPilotRecs] = useState<PilotSubmission[]>([]);
  const [allMain, setAllMain] = useState<Submission[] | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [newSessionId, setNewSessionId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState<Tab>("replication");
  const [term, setTerm] = useState<Term>("queer");
  const [showQr, setShowQr] = useState(true);
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  const load = useCallback(async (s: string) => {
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/${SLUG}/submissions${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Signed out — reload and sign in." : "Load failed.");
      const data = await r.json();
      setSubmissions((data.submissions || []) as Submission[]);
      setPilotRecs((data.pilot || []) as PilotSubmission[]);
      if (!s) {
        setSessions(data.sessions || []);
        setAllMain((data.submissions || []) as Submission[]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(session);
    if (!live) return;
    const id = setInterval(() => load(session), 5000);
    return () => clearInterval(id);
  }, [session, live, load]);

  // Real-time comparison needs every session, whatever is selected.
  useEffect(() => {
    if (tab !== "pilot" || !session) return;
    fetch(`/api/experiments/${SLUG}/submissions`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setAllMain((d.submissions || []) as Submission[]);
      })
      .catch(() => {});
  }, [tab, session]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const today = new Date().toISOString().slice(0, 10);
  const joinId = (newSessionId || session || today).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = `${origin}/teaching/experiments/${SLUG}?session=${encodeURIComponent(joinId)}`;

  useEffect(() => {
    if (showQr && qrRef.current && origin) {
      QRCode.toCanvas(qrRef.current, joinUrl, { width: 168, margin: 0, color: { dark: INK, light: PAPER } }).catch(
        () => {},
      );
    }
  }, [joinUrl, showQr, origin]);

  /* ---------------------------- replication ---------------------------- */

  const stats = useMemo(() => {
    const out = {} as Record<Term, { comp: number[]; byMeasure: Record<Measure, number[]>; alpha: number | null }>;
    for (const t of TERMS) {
      out[t] = {
        comp: submissions.map((s) => composite(s.ratings[t])),
        byMeasure: Object.fromEntries(MEASURES.map((mm) => [mm, submissions.map((s) => s.ratings[t][mm])])) as Record<
          Measure,
          number[]
        >,
        alpha: cronbach(submissions.map((s) => MEASURES.map((mm) => s.ratings[t][mm]))),
      };
    }
    return out;
  }, [submissions]);

  const verdict = (t: Term) => {
    const c = stats[t].comp;
    if (c.length < 3) return null;
    const cm = mean(c);
    const r = pilot.terms[t];
    const x = { mean: cm, sd: sd(c), n: c.length };
    return {
      cm,
      nearer: Math.abs(cm - r.under30.mean) <= Math.abs(cm - r.over60.mean) ? "under-30s" : "over-60s",
      vsU: welch(x, r.under30),
      vsO: welch(x, r.over60),
    };
  };

  /* ------------------------------- pilot ------------------------------- */

  // Each pilot record joined to the same person's replication record by rid.
  const linked = useMemo(() => {
    const byRid = new Map(submissions.filter((s) => s.rid).map((s) => [s.rid!, s]));
    return pilotRecs.map((p) => ({ p, main: byRid.get(p.rid) ?? null }));
  }, [submissions, pilotRecs]);

  const selfRows: DumbbellRow[] = TERMS.map((t) => {
    const pairs = linked.filter((l) => l.main).map((l) => [l.main!.ratings[t].bad1, l.p.self[t]] as const);
    if (!pairs.length) return { term: t, a: null, b: null };
    const diffs = pairs.map(([a, b]) => b - a);
    const test = pairedT(diffs);
    return {
      term: t,
      a: mean(pairs.map(([a]) => a)),
      b: mean(pairs.map(([, b]) => b)),
      note: `Δ ${fmt(mean(diffs))}${test ? ` · ${fmtP(test.p)}` : ""} · n ${pairs.length}`,
    };
  });

  // In-group breakdown. Both the yes and no groups must reach MIN_CELL, or
  // neither is shown: a lone small group could be recovered from the class
  // mean and the other group's mean.
  const ingroupTable = (k: IngroupKey) => {
    const t = INGROUP_QUESTIONS[k].term;
    const groups = (["yes", "no"] as const).map((ans) => {
      const rows = linked.filter((l) => l.p.ingroup[k] === ans);
      const comp = rows.filter((l) => l.main).map((l) => composite(l.main!.ratings[t]));
      return {
        ans,
        n: rows.length,
        comp: comp.length ? mean(comp) : NaN,
        self: rows.length ? mean(rows.map((l) => l.p.self[t])) : NaN,
      };
    });
    const declined = linked.filter((l) => l.p.ingroup[k] === "na").length;
    return { t, groups, declined, ok: groups.every((g) => g.n >= MIN_CELL) };
  };

  const realTime = useMemo(() => {
    const by = new Map<string, Submission[]>();
    for (const s of allMain ?? []) by.set(s.session, [...(by.get(s.session) ?? []), s]);
    return [...by.entries()]
      .filter(([, rows]) => rows.length >= 3)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => ({
        name,
        n: rows.length,
        means: Object.fromEntries(TERMS.map((t) => [t, mean(rows.map((r) => composite(r.ratings[t])))])) as Record<
          Term,
          number
        >,
      }));
  }, [allMain]);

  const downloadCsv = () => {
    const pBy = new Map(pilotRecs.map((p) => [p.rid, p]));
    const header = [
      "session",
      "rid",
      "submittedAt",
      "durationMs",
      "age",
      "blockOrder",
      ...TERMS.flatMap((t) => [...MEASURES.map((mm) => `${mm}_${t}`), `composite_${t}`]),
      ...TERMS.map((t) => `self_${t}`),
      "ingroup_lgbtq",
      "ingroup_autistic",
    ];
    const lines = [header.join(",")];
    for (const s of submissions) {
      const p = s.rid ? pBy.get(s.rid) : undefined;
      lines.push(
        [
          s.session,
          s.rid ?? "",
          s.submittedAt,
          Math.round(s.durationMs),
          s.age ?? "",
          s.blockOrder.join(" "),
          ...TERMS.flatMap((t) => [...MEASURES.map((mm) => s.ratings[t][mm]), composite(s.ratings[t]).toFixed(2)]),
          ...TERMS.map((t) => (p ? p.self[t] : "")),
          p?.ingroup.lgbtq ?? "",
          p?.ingroup.autistic ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${SLUG}-${session || "all"}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const n = submissions.length;
  const tStats = stats[term];
  const ref = pilot.terms[term];

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: SERIF }}>
      <style>{CSS}</style>

      {/* ------------------------------ masthead ------------------------------ */}
      <div style={{ background: INK, color: PAPER }}>
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "22px 16px 26px",
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <p style={{ ...label, color: HS.grey[1] }}>Control board · Reclaiming slurs over apparent time</p>
            <h1
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: "clamp(34px, 6vw, 58px)",
                letterSpacing: TIGHTER,
                lineHeight: 0.95,
                margin: 0,
              }}
            >
              Four words,
              <br />
              four questions
            </h1>
          </div>
          <svg viewBox="0 0 220 80" style={{ width: "200px", maxWidth: "45vw" }} aria-hidden>
            {[HS.orange[2], HS.pink[2], HS.green[2], HS.blue[2]].map((c, i) => (
              <circle key={c} cx={40 + i * 46} cy={40} r={38} fill={c} opacity={0.92} />
            ))}
          </svg>
        </div>
      </div>

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "0 16px 60px" }}>
        {/* ------------------------------ controls ------------------------------ */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "28px 40px", padding: "24px 0 28px", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <p style={label}>Session</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
              <select value={session} onChange={(e) => setSession(e.target.value)} style={input} aria-label="Session">
                <option value="">All sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="b-btn ghost" onClick={() => load(session)}>
                Refresh
              </button>
              <label style={{ ...label, margin: 0, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Live
              </label>
              <button className="b-btn ghost" onClick={downloadCsv} disabled={!n}>
                CSV
              </button>
            </div>
            <p style={label}>Student link</p>
            <input
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              placeholder={session || today}
              aria-label="New session name"
              style={{ ...input, width: "100%", maxWidth: "340px", boxSizing: "border-box" }}
            />
            <p style={{ fontFamily: SANS, fontSize: "15px", letterSpacing: "-0.01em", margin: "10px 0", wordBreak: "break-all" }}>
              {joinUrl}
            </p>
            <p style={small}>
              Name the session per class and year (e.g. <em>soc-lang-2026</em>) so later cohorts can be compared, then
              pick it in the menu once responses arrive. Left blank, students land in today&apos;s date.
            </p>
          </div>
          <div>
            {showQr && <canvas ref={qrRef} style={{ display: "block" }} />}
            <button
              className="b-btn ghost"
              style={{ marginTop: "8px", fontSize: "13px", padding: "5px 10px" }}
              onClick={() => setShowQr(!showQr)}
            >
              {showQr ? "Hide QR" : "Show QR"}
            </button>
          </div>
          <div style={{ minWidth: "150px" }}>
            <p style={label}>Responses</p>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: "84px", lineHeight: 0.85, letterSpacing: TIGHTER }}>
              {loading ? "…" : n}
            </div>
            <p style={{ ...small, margin: "8px 0 0" }}>
              {pilotRecs.length} in part two · {session || "all sessions"}
            </p>
            {err && <p style={{ ...small, color: HS.orange[3] }}>{err}</p>}
          </div>
        </div>

        {/* -------------------------------- tabs -------------------------------- */}
        <div role="tablist" style={{ marginBottom: "18px" }}>
          <button role="tab" className="b-tab" aria-selected={tab === "replication"} onClick={() => setTab("replication")}>
            Replication
          </button>
          <button role="tab" className="b-tab" aria-selected={tab === "pilot"} onClick={() => setTab("pilot")}>
            Pilot
          </button>
        </div>

        {tab === "replication" && (
          <>
            <div style={section}>
              <h2 style={figTitle}>1 · This class beside the study&apos;s age groups</h2>
              <p style={prose}>
                Composite pejorativeness: the mean of a person&apos;s four ratings, −50 to +50, lower = more pejorative.
                Study = New Study 1, a demographically representative US Prolific sample (N = {pilot.n}); its under-30s
                (n = {pilot.terms.queer.under30.n}) and over-60s (n = {pilot.terms.queer.over60.n}). White diamonds are
                means, dotted lines quartiles; violins are scaled to equal width, not by count.
              </p>
              <div style={grid2}>
                {TERMS.map((t) => {
                  const v = verdict(t);
                  return (
                    <div key={t}>
                      <ViolinFigure
                        yLabel={`pejorativeness of ‘${t}’`}
                        xLabel="respondent group"
                        violins={[
                          summarize("this class", CLASS_COLOR, stats[t].comp),
                          fromPilot("under-30s", PLASMA_UNDER30, pilot.terms[t].under30),
                          fromPilot("over-60s", PLASMA_OVER60, pilot.terms[t].over60),
                        ]}
                      />
                      <p style={{ ...small, color: INK, margin: "6px 4px 0" }}>
                        {v ? (
                          <>
                            Class <strong>{fmt(v.cm)}</strong>; under-30s {fmt(pilot.terms[t].under30.mean)}, over-60s{" "}
                            {fmt(pilot.terms[t].over60.mean)}. Closer to the <strong>{v.nearer}</strong>. Welch vs
                            under-30s {fmtP(v.vsU.p)}; vs over-60s {fmtP(v.vsO.p)}.
                          </>
                        ) : (
                          <span style={{ color: MUTED }}>Verdict appears once three or more students have submitted.</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={section}>
              <div
                style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}
              >
                <h2 style={figTitle}>2 · Does the question matter?</h2>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {TERMS.map((t) => (
                    <button key={t} className={`b-btn${t === term ? "" : " ghost"}`} onClick={() => setTerm(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...grid2, marginTop: "12px" }}>
                <ViolinFigure
                  yLabel={`ratings for ‘${term}’`}
                  xLabel="question type"
                  violins={(["bad1", "bad2", "offense", "valence"] as Measure[]).map((mm) =>
                    summarize(MEASURE_SPECS[mm].label, MEASURE_FILL[mm], tStats.byMeasure[mm], ref.measures[mm].mean),
                  )}
                />
                <div>
                  <p style={prose}>
                    The study found the four questions answered almost interchangeably (Cronbach&apos;s α &gt; .8 for
                    every term, &gt; .9 for ‘queer’ and ‘slutty’), which is what licenses averaging them. Dashed hollow
                    diamonds mark the study&apos;s mean for each question.
                  </p>
                  <p style={{ ...prose, fontFamily: SANS, fontWeight: 700, letterSpacing: TIGHT }}>
                    Class α for ‘{term}’: {tStats.alpha === null ? "—" : tStats.alpha.toFixed(2)}
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, textAlign: "left" }}>Question</th>
                          <th style={th}>Class</th>
                          <th style={th}>Study</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MEASURES.map((mm) => (
                          <tr key={mm}>
                            <td style={{ ...td, textAlign: "left", fontFamily: SERIF, fontSize: "16px" }}>
                              {MEASURE_SPECS[mm].question(term)}
                            </td>
                            <td style={td}>{tStats.byMeasure[mm].length ? fmt(mean(tStats.byMeasure[mm])) : "—"}</td>
                            <td style={td}>{fmt(ref.measures[mm].mean)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div style={section}>
              <h2 style={figTitle}>All four words</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "560px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Word</th>
                      <th style={th}>Class (SD)</th>
                      <th style={th}>Under-30s</th>
                      <th style={th}>Over-60s</th>
                      <th style={th}>Study r(age)</th>
                      <th style={th}>Class alpha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TERMS.map((t) => (
                      <tr key={t}>
                        <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{t}</td>
                        <td style={td}>
                          {stats[t].comp.length ? `${fmt(mean(stats[t].comp))} (${sd(stats[t].comp).toFixed(1)})` : "—"}
                        </td>
                        <td style={td}>{fmt(pilot.terms[t].under30.mean)}</td>
                        <td style={td}>{fmt(pilot.terms[t].over60.mean)}</td>
                        <td style={td}>{pilot.terms[t].ageFit.r.toFixed(2)}</td>
                        <td style={td}>{stats[t].alpha === null ? "—" : stats[t].alpha.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={small}>
                Negative r(age) = older respondents rate the word as more pejorative, the apparent-time signature of
                reclamation (‘queer’, ‘slutty’); positive = the reverse (‘autistic’, ‘basic’).
              </p>
            </div>
          </>
        )}

        {tab === "pilot" && (
          <>
            <div style={{ background: HS.blue[0], padding: "18px 20px", borderTop: `4px solid ${INK}`, marginBottom: "28px" }}>
              <h2 style={{ ...figTitle, margin: 0 }}>Part two runs on the same link</h2>
              <p style={{ ...small, color: INK, margin: "6px 0 0" }}>
                After part one, each student&apos;s results page ends with a “Continue to part two” button and a line asking
                them to wait for your go-ahead. Their part-two answers are linked to their part-one answers by a random
                id, never by name.
              </p>
            </div>

            <div style={section}>
              <h2 style={figTitle}>Self-ascription · Calling yourself vs calling someone else</h2>
              <p style={prose}>
                Each student&apos;s “{SELF_QUESTION("____")}” beside their own answer to the replication&apos;s “How bad or
                good is it to call a person ‘____’?”, matched person by person. A rightward shift means self-application is
                judged better than other-application, as reclamation accounts predict.
              </p>
              <DumbbellFigure
                rows={selfRows}
                aLabel="call a person"
                bLabel="call yourself"
                aColor={HS.grey[1]}
                bColor={HS.blue[2]}
              />
            </div>

            <div style={section}>
              <h2 style={figTitle}>Self-identification · Inside and outside the group</h2>
              <p style={prose}>
                Optional self-identification, shown only when both the “yes” and the “no” group have at least {MIN_CELL}{" "}
                people, so no one can be identified, not even by subtraction.
              </p>
              <div style={grid2}>
                {(Object.keys(INGROUP_QUESTIONS) as IngroupKey[]).map((k) => {
                  const tb = ingroupTable(k);
                  return (
                    <div key={k} style={{ overflowX: "auto" }}>
                      <p style={label}>
                        {INGROUP_QUESTIONS[k].question} · ratings of ‘{tb.t}’
                      </p>
                      {tb.ok ? (
                        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "340px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...th, textAlign: "left" }}>Group</th>
                              <th style={th}>n</th>
                              <th style={th}>Composite</th>
                              <th style={th}>Call yourself</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tb.groups.map((g) => (
                              <tr key={g.ans}>
                                <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>
                                  {g.ans === "yes" ? INGROUP_QUESTIONS[k].label : "not"}
                                </td>
                                <td style={td}>{g.n}</td>
                                <td style={td}>{fmt(g.comp)}</td>
                                <td style={td}>{fmt(g.self)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ ...small, borderLeft: `4px solid ${HS.pink[1]}`, paddingLeft: "12px" }}>
                          Hidden until both groups reach {MIN_CELL}.
                        </p>
                      )}
                      <p style={{ ...small, fontSize: "14px" }}>{tb.declined} preferred not to say.</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={section}>
              <h2 style={figTitle}>C · Real time, one cohort at a time</h2>
              <p style={prose}>
                The study infers change from age differences at a single moment (apparent time). Run this each year with
                the same kind of class and the sessions below become repeated samples of the same age group: the real-time
                comparison that apparent time stands in for. Sessions with three or more responses.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "560px" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Session</th>
                      <th style={th}>n</th>
                      {TERMS.map((t) => (
                        <th key={t} style={th}>
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {realTime.map((r) => (
                      <tr key={r.name} style={r.name === session ? { background: HS.blue[0] } : undefined}>
                        <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{r.name}</td>
                        <td style={td}>{r.n}</td>
                        {TERMS.map((t) => (
                          <td key={t} style={td}>
                            {fmt(r.means[t])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...td, textAlign: "left", color: MUTED }}>Study under-30s</td>
                      <td style={{ ...td, color: MUTED }}>{pilot.terms.queer.under30.n}</td>
                      {TERMS.map((t) => (
                        <td key={t} style={{ ...td, color: MUTED }}>
                          {fmt(pilot.terms[t].under30.mean)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
