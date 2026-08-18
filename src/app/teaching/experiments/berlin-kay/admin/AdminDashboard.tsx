"use client";

import { useEffect, useMemo, useState } from "react";
import ChipGrid from "../ChipGrid";
import { byCnum, type Chip } from "../chips";

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

interface TermMap {
  term: string;
  focal: number;
  chips: number[];
}

interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  language: string;
  native: boolean | null;
  colorVision: "typical" | "atypical" | "unsure" | null;
  terms: TermMap[];
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    padding: "40px 24px",
  },
  inner: { maxWidth: "1100px", margin: "0 auto" },
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

const gridRef = (cnum: number) => {
  const c = byCnum[cnum];
  return c ? `${c.row}${c.col}` : String(cnum);
};

/** Normalised language key: charts of "English" and "english " aggregate. */
const langKey = (s: string) => s.trim().toLowerCase();

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function AdminDashboard() {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("__all__");
  const [error, setError] = useState<string | null>(null);

  const [focalLang, setFocalLang] = useState<string>("__all__");
  const [consensusA, setConsensusA] = useState<{ lang: string; term: string }>({ lang: "", term: "" });
  const [consensusB, setConsensusB] = useState<{ lang: string; term: string }>({ lang: "", term: "" });
  const [openSub, setOpenSub] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/experiments/berlin-kay/submissions");
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

  /** language display name -> submissions (first-seen casing wins). */
  const byLanguage = useMemo(() => {
    const m = new Map<string, { name: string; subs: Submission[] }>();
    for (const s of filtered) {
      const k = langKey(s.language);
      if (!m.has(k)) m.set(k, { name: s.language.trim(), subs: [] });
      m.get(k)!.subs.push(s);
    }
    return m;
  }, [filtered]);

  const languages = useMemo(
    () => Array.from(byLanguage.values()).sort((a, b) => b.subs.length - a.subs.length),
    [byLanguage]
  );

  /** Focal overlay data: cnum -> [{language, term}] over the focal filter. */
  const focalMap = useMemo(() => {
    const m = new Map<number, { language: string; term: string }[]>();
    for (const s of filtered) {
      if (focalLang !== "__all__" && langKey(s.language) !== focalLang) continue;
      for (const t of s.terms) {
        if (!m.has(t.focal)) m.set(t.focal, []);
        m.get(t.focal)!.push({ language: s.language.trim(), term: t.term });
      }
    }
    return m;
  }, [filtered, focalLang]);

  const focalRows = useMemo(() => {
    return Array.from(focalMap.entries())
      .map(([cnum, hits]) => ({ cnum, hits }))
      .sort((a, b) => b.hits.length - a.hits.length);
  }, [focalMap]);

  /** Terms available for a language key, most common first. */
  const termsFor = (lk: string): string[] => {
    const entry = byLanguage.get(lk);
    if (!entry) return [];
    const counts = new Map<string, { name: string; n: number }>();
    for (const s of entry.subs) {
      for (const t of s.terms) {
        const k = t.term.toLowerCase();
        if (!counts.has(k)) counts.set(k, { name: t.term, n: 0 });
        counts.get(k)!.n += 1;
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.n - a.n)
      .map((x) => x.name);
  };

  /** Consensus map for (language, term): cnum -> proportion of that
   * language's charts including the chip under that term; plus focal counts. */
  const consensusData = (lang: string, term: string) => {
    const entry = byLanguage.get(lang);
    if (!entry || !term) return null;
    const tk = term.toLowerCase();
    const relevant = entry.subs.filter((s) => s.terms.some((t) => t.term.toLowerCase() === tk));
    if (relevant.length === 0) return null;
    const chipCount = new Map<number, number>();
    const focalCount = new Map<number, number>();
    for (const s of relevant) {
      for (const t of s.terms) {
        if (t.term.toLowerCase() !== tk) continue;
        for (const c of t.chips) chipCount.set(c, (chipCount.get(c) ?? 0) + 1);
        focalCount.set(t.focal, (focalCount.get(t.focal) ?? 0) + 1);
      }
    }
    return { n: relevant.length, chipCount, focalCount, name: entry.name };
  };

  const downloadCsv = () => {
    const rows: string[] = [
      "session,submittedAt,language,native,colorVision,term,focalChip,focalGridRef,chipCount,chips",
    ];
    filtered.forEach((s) => {
      for (const t of s.terms) {
        rows.push(
          [
            csvEscape(s.session),
            csvEscape(s.submittedAt),
            csvEscape(s.language.trim()),
            s.native === null ? "" : String(s.native),
            s.colorVision ?? "",
            csvEscape(t.term),
            String(t.focal),
            gridRef(t.focal),
            String(t.chips.length),
            csvEscape(t.chips.map(gridRef).join(" ")),
          ].join(",")
        );
      }
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `berlin-kay-${session === "__all__" ? "all" : session}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const consensusPanel = (
    which: "A" | "B",
    sel: { lang: string; term: string },
    setSel: (v: { lang: string; term: string }) => void
  ) => {
    const data = sel.lang && sel.term ? consensusData(sel.lang, sel.term) : null;
    return (
      <div style={{ flex: "1 1 480px", minWidth: 0 }}>
        <div style={{ marginBottom: "6px" }}>
          <select
            style={S.select}
            value={sel.lang}
            onChange={(e) => setSel({ lang: e.target.value, term: "" })}
          >
            <option value="">language {which}…</option>
            {languages.map((l) => (
              <option key={langKey(l.name)} value={langKey(l.name)}>
                {l.name} ({l.subs.length})
              </option>
            ))}
          </select>
          <select
            style={S.select}
            value={sel.term}
            disabled={!sel.lang}
            onChange={(e) => setSel({ ...sel, term: e.target.value })}
          >
            <option value="">term…</option>
            {sel.lang &&
              termsFor(sel.lang).map((t) => (
                <option key={t.toLowerCase()} value={t}>
                  {t}
                </option>
              ))}
          </select>
        </div>
        {data ? (
          <>
            <div style={{ ...S.mono, fontSize: "11px", color: C.muted, marginBottom: "8px" }}>
              &ldquo;{sel.term}&rdquo; in {data.name} — {data.n} chart{data.n === 1 ? "" : "s"}.
              Chip strength = share of charts including it; circles = best examples (count badged
              when &gt;1).
            </div>
            <ChipGrid
              decorate={(chip: Chip) => {
                const n = data.chipCount.get(chip.cnum) ?? 0;
                const f = data.focalCount.get(chip.cnum) ?? 0;
                if (n === 0 && f === 0) return { dim: true };
                return {
                  strength: n / data.n,
                  focal: f > 0,
                  badge: f > 1 ? String(f) : undefined,
                };
              }}
            />
          </>
        ) : (
          <div style={{ ...S.small, marginTop: "8px" }}>
            Pick a language and a term to see the class&rsquo;s consensus region.
          </div>
        )}
      </div>
    );
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

  return (
    <div style={S.page}>
      <style>{FONTS}</style>
      <div style={S.inner}>
        <div style={S.eyebrow}>Berlin &amp; Kay 1969 — instructor dashboard</div>
        <h1 style={S.h1}>Color words across the class</h1>
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
            {filtered.length} chart{filtered.length === 1 ? "" : "s"} ·{" "}
            {languages.length} language{languages.length === 1 ? "" : "s"}
          </span>
          <button style={S.btn} onClick={downloadCsv} disabled={filtered.length === 0}>
            Download CSV
          </button>
        </div>

        {/* Languages */}
        <div style={S.card}>
          <h2 style={S.h2}>Languages in the room</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={S.th}>Language</th>
                <th style={S.th}>Charts</th>
                <th style={S.th}>Terms per chart</th>
                <th style={S.th}>Most common terms</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((l) => {
                const mean =
                  l.subs.reduce((acc, s) => acc + s.terms.length, 0) / l.subs.length;
                return (
                  <tr key={langKey(l.name)}>
                    <td style={S.td}>{l.name}</td>
                    <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{l.subs.length}</td>
                    <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{mean.toFixed(1)}</td>
                    <td style={{ ...S.td, fontSize: "15px" }}>
                      {termsFor(langKey(l.name)).slice(0, 12).join(", ")}
                    </td>
                  </tr>
                );
              })}
              {languages.length === 0 && (
                <tr>
                  <td style={S.td} colSpan={4}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Focal overlay */}
        <div style={S.card}>
          <h2 style={S.h2}>Where the best examples land</h2>
          <p style={S.small}>
            Every best-example chip across the class, laid on one chart. The Berlin &amp; Kay
            prediction: foci pile up in the same spots whatever the language. Badges count charts;
            hover a listed chip below for who put it there.
          </p>
          <select style={S.select} value={focalLang} onChange={(e) => setFocalLang(e.target.value)}>
            <option value="__all__">All languages</option>
            {languages.map((l) => (
              <option key={langKey(l.name)} value={langKey(l.name)}>
                {l.name} ({l.subs.length})
              </option>
            ))}
          </select>
          <ChipGrid
            decorate={(chip: Chip) => {
              const hits = focalMap.get(chip.cnum);
              if (!hits) return { dim: true };
              return {
                focal: true,
                badge: hits.length > 1 ? String(hits.length) : undefined,
              };
            }}
          />
          {focalRows.length > 0 && (
            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "16px" }}>
              <thead>
                <tr>
                  <th style={S.th}>Chip</th>
                  <th style={S.th}>Munsell</th>
                  <th style={S.th}>Charts</th>
                  <th style={S.th}>Named as</th>
                </tr>
              </thead>
              <tbody>
                {focalRows.slice(0, 25).map((r) => (
                  <tr key={r.cnum}>
                    <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          background: byCnum[r.cnum]?.hex,
                          border: `1px solid ${C.border}`,
                          marginRight: "8px",
                          verticalAlign: "-2px",
                        }}
                      />
                      {gridRef(r.cnum)}
                    </td>
                    <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                      {byCnum[r.cnum]?.munsell}
                    </td>
                    <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{r.hits.length}</td>
                    <td style={{ ...S.td, fontSize: "15px" }}>
                      {r.hits.map((h) => `${h.term} (${h.language})`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {focalRows.length > 25 && (
            <div style={{ ...S.mono, fontSize: "11px", color: C.muted, marginTop: "8px" }}>
              Showing the 25 most-chosen focal chips of {focalRows.length}; the rest are in the
              CSV.
            </div>
          )}
        </div>

        {/* Consensus comparison */}
        <div style={S.card}>
          <h2 style={S.h2}>Term regions, side by side</h2>
          <p style={S.small}>
            The class&rsquo;s consensus extension for one term in one language, against another —
            the cross-language boundary comparison the 2017 hand-drawn charts did on paper.
          </p>
          <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
            {consensusPanel("A", consensusA, setConsensusA)}
            {consensusPanel("B", consensusB, setConsensusB)}
          </div>
        </div>

        {/* Individual charts */}
        <div style={S.card}>
          <h2 style={S.h2}>Individual charts</h2>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Submitted</th>
                <th style={S.th}>Language</th>
                <th style={S.th}>Terms</th>
                <th style={S.th}>Vision</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={`${s.submittedAt}-${i}`}>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>{i + 1}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                    {s.submittedAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td style={S.td}>
                    {s.language.trim()}
                    {s.native === false ? " (learned later)" : ""}
                  </td>
                  <td style={{ ...S.td, fontSize: "15px" }}>
                    {s.terms.map((t) => `${t.term} ★${gridRef(t.focal)}`).join(", ")}
                  </td>
                  <td style={{ ...S.td, ...S.mono, fontSize: "13px" }}>
                    {s.colorVision ?? "—"}
                  </td>
                  <td style={S.td}>
                    <button
                      style={{ ...S.btn, padding: "6px 14px" }}
                      onClick={() => setOpenSub(openSub === i ? null : i)}
                    >
                      {openSub === i ? "Hide" : "Map"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {openSub !== null && filtered[openSub] && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ ...S.mono, fontSize: "11px", color: C.muted, marginBottom: "8px" }}>
                {filtered[openSub].language.trim()} — greyed chips uncovered, circles are best
                examples, badges count overlapping terms.
              </div>
              <ChipGrid
                decorate={(chip: Chip) => {
                  const sub = filtered[openSub];
                  const n = sub.terms.filter((t) => t.chips.includes(chip.cnum)).length;
                  return {
                    dim: n === 0,
                    focal: sub.terms.some((t) => t.focal === chip.cnum),
                    badge: n > 1 ? String(n) : undefined,
                  };
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
