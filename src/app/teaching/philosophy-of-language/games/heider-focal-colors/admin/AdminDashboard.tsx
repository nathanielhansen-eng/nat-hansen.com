"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  focal: "#1A7840",
  internominal: "#C08A18",
  boundary: "#B01568",
};

type ColorType = "focal" | "internominal" | "boundary";
interface NamingRow {
  id: number;
  hex: string;
  munsell: string;
  type: ColorType;
  name: string;
  time: number;
  words: number;
  letters: number;
  exposed: boolean;
  recognized: boolean;
  chosenGridHex: string | null;
}
interface WarmupRow {
  basicName: string;
  chosenHex: string;
  chosenSaturationLevel: number;
  maxSaturationLevel: number;
}
interface Submission {
  session: string;
  submittedAt: string;
  warmup: WarmupRow[];
  naming: NamingRow[];
}

function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const w = svg.viewBox.baseVal.width || svg.clientWidth || 1000;
  const h = svg.viewBox.baseVal.height || svg.clientHeight || 700;
  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const src = `data:image/svg+xml;base64,${svg64}`;
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = src;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [presenting, setPresenting] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const load = async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = s ? `?session=${encodeURIComponent(s)}` : "";
      const r = await fetch(`/api/experiments/heider-focal-colors/submissions${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSubmissions(data.submissions || []);
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
  }, [session]);

  const stats = useMemo(() => {
    const n = submissions.length;
    const allNaming: NamingRow[] = [];
    const exposedRows: NamingRow[] = [];
    for (const s of submissions) {
      for (const r of s.naming) {
        allNaming.push(r);
        if (r.exposed) exposedRows.push(r);
      }
    }

    const byTypeNamed = (t: ColorType) => allNaming.filter((r) => r.type === t);
    const byTypeExposed = (t: ColorType) => exposedRows.filter((r) => r.type === t);

    const categories = (["focal", "internominal", "boundary"] as ColorType[]).map((t) => {
      const named = byTypeNamed(t);
      const exp = byTypeExposed(t);
      return {
        type: t,
        meanTime: mean(named.map((r) => r.time)),
        meanLetters: mean(named.map((r) => r.letters)),
        meanWords: mean(named.map((r) => r.words)),
        exposureN: exp.length,
        acc: exp.length ? exp.filter((r) => r.recognized).length / exp.length : 0,
      };
    });

    const perSwatch = new Map<
      number,
      { hex: string; munsell: string; type: ColorType; names: string[]; times: number[]; exposures: NamingRow[] }
    >();
    for (const s of submissions) {
      for (const r of s.naming) {
        if (!perSwatch.has(r.id))
          perSwatch.set(r.id, { hex: r.hex, munsell: r.munsell, type: r.type, names: [], times: [], exposures: [] });
        const rec = perSwatch.get(r.id)!;
        rec.names.push(r.name.toLowerCase().trim());
        rec.times.push(r.time);
        if (r.exposed) rec.exposures.push(r);
      }
    }
    const swatches = Array.from(perSwatch.entries())
      .map(([id, v]) => {
        const counts = new Map<string, number>();
        for (const name of v.names) counts.set(name, (counts.get(name) ?? 0) + 1);
        const top = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        const exp = v.exposures;
        const acc = exp.length ? exp.filter((e) => e.recognized).length / exp.length : null;
        return {
          id,
          hex: v.hex,
          munsell: v.munsell,
          type: v.type,
          meanTime: mean(v.times),
          meanLetters: mean(v.names.map((s) => s.replace(/\s+/g, "").length)),
          top,
          exposureCount: exp.length,
          accuracy: acc,
        };
      })
      .sort((a, b) => {
        const order: Record<ColorType, number> = { focal: 0, internominal: 1, boundary: 2 };
        if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
        return a.id - b.id;
      });

    // warmup aggregate: how often did students pick the max-saturation chip?
    const warmupAll: WarmupRow[] = [];
    for (const s of submissions) for (const w of s.warmup || []) warmupAll.push(w);
    const warmupByName = new Map<string, { maxCount: number; topTwoCount: number; total: number }>();
    for (const w of warmupAll) {
      if (!warmupByName.has(w.basicName))
        warmupByName.set(w.basicName, { maxCount: 0, topTwoCount: 0, total: 0 });
      const rec = warmupByName.get(w.basicName)!;
      rec.total += 1;
      if (w.chosenSaturationLevel === w.maxSaturationLevel) rec.maxCount += 1;
      if (w.chosenSaturationLevel >= w.maxSaturationLevel - 1) rec.topTwoCount += 1;
    }

    return { n, allNaming, exposedRows, categories, swatches, warmupByName };
  }, [submissions]);

  const outer: React.CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    padding: presenting ? "12px" : "28px",
  };
  const card: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "28px 32px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
    maxWidth: presenting ? "100%" : "1100px",
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

  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = (cur + " " + w).trim();
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  // SVG layout
  const W = 1100;
  const H = 1260;
  const pad = 28;
  const scatterBox = { x: pad, y: 200, w: 540, h: 260 };
  const barBox = { x: scatterBox.x + scatterBox.w + 40, y: 200, w: W - scatterBox.x - scatterBox.w - 40 - pad, h: 260 };
  const swatchesY = 500;

  const maxTime = Math.max(6, ...stats.exposedRows.map((r) => r.time));
  const xS = (t: number) => scatterBox.x + 40 + (t / maxTime) * (scatterBox.w - 60);
  const yS = (correct: boolean) => (correct ? scatterBox.y + 50 : scatterBox.y + scatterBox.h - 50);
  const jitter = (i: number) => ((i * 37) % 31) - 15;

  const barVals = stats.categories.map((c) => ({
    label: c.type[0].toUpperCase() + c.type.slice(1),
    acc: c.acc,
    time: c.meanTime,
    letters: c.meanLetters,
    color: c.type === "focal" ? C.focal : c.type === "internominal" ? C.internominal : C.boundary,
  }));
  const barMax = 1;
  const barW = 70;
  const barGap = 30;
  const barBaseY = barBox.y + barBox.h - 40;
  const barTopY = barBox.y + 40;
  const barHfull = barBaseY - barTopY;

  const focalAcc = stats.categories[0].acc;
  const internomAcc = stats.categories[1].acc;
  const boundaryAcc = stats.categories[2].acc;
  const focalTime = stats.categories[0].meanTime;
  const nonFocalTime = mean([stats.categories[1].meanTime, stats.categories[2].meanTime]);
  const focalLetters = stats.categories[0].meanLetters;
  const nonFocalLetters = mean([stats.categories[1].meanLetters, stats.categories[2].meanLetters]);

  const focalVsRest = focalAcc - (internomAcc + boundaryAcc) / 2;

  return (
    <div style={outer}>
      <style>{FONTS}</style>
      {!presenting && (
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
            <div style={eyebrow}>Heider 1972</div>
            <h1 style={{ fontSize: "26px", fontWeight: 400, marginTop: "4px", color: C.text }}>
              Class results — focal colours
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
                  {s}
                </option>
              ))}
            </select>
            <button style={btn} onClick={() => load(session || undefined)}>
              Refresh
            </button>
            <button style={btn} onClick={() => setPresenting((p) => !p)}>
              {presenting ? "Exit present" : "Present"}
            </button>
            <button
              style={btn}
              onClick={() => {
                if (svgRef.current) {
                  const fn = `heider-${session || "all"}-${new Date().toISOString().slice(0, 10)}.png`;
                  downloadSvgAsPng(svgRef.current, fn);
                }
              }}
            >
              Download PNG
            </button>
          </div>
        </div>
      )}

      {!presenting &&
        (() => {
          const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
          const effectiveId = sanitize(newSessionId || session || "");
          const origin =
            typeof window !== "undefined" ? window.location.origin : "https://nat-hansen.com";
          const url = effectiveId
            ? `${origin}/teaching/philosophy-of-language/games/heider-focal-colors?session=${encodeURIComponent(effectiveId)}`
            : `${origin}/teaching/philosophy-of-language/games/heider-focal-colors`;
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
                placeholder={session || "e.g. pp3lang-spring-2026"}
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
        {!loading && !err && stats.n > 0 &&
          (() => {
            let verdict: "supports" | "mixed" | "inverts";
            if (focalVsRest > 0.08) verdict = "supports";
            else if (focalVsRest < -0.08) verdict = "inverts";
            else verdict = "mixed";

            const commentary = (
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ ...eyebrow, marginBottom: "10px" }}>How does this compare to Heider (1972)?</div>
                <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body, marginBottom: "10px" }}>
                  Heider made three predictions: focal colours should be (1) named with shorter
                  names, (2) named faster, and (3) recognised more accurately than internominal
                  or boundary colours — the last holding even for speakers of languages without
                  basic chromatic colour terms.
                </p>
                <ul style={{ fontSize: "16px", lineHeight: "1.65", color: C.body, marginBottom: "10px", paddingLeft: "22px" }}>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Name length.</strong> Focal mean{" "}
                    <strong>{focalLetters.toFixed(1)}</strong> letters vs. non-focal{" "}
                    <strong>{nonFocalLetters.toFixed(1)}</strong> (Heider: 8.1 vs. 12.4).
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Naming time.</strong> Focal <strong>{focalTime.toFixed(1)}s</strong>{" "}
                    vs. non-focal <strong>{nonFocalTime.toFixed(1)}s</strong> (Heider: 9.9 vs.
                    14.0).
                  </li>
                  <li>
                    <strong>Recognition.</strong> Focal{" "}
                    <strong>{(focalAcc * 100).toFixed(0)}%</strong> vs. internominal{" "}
                    <strong>{(internomAcc * 100).toFixed(0)}%</strong> vs. boundary{" "}
                    <strong>{(boundaryAcc * 100).toFixed(0)}%</strong>.
                  </li>
                </ul>
                {verdict === "supports" && (
                  <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                    The class pattern broadly <strong>supports Heider</strong>: focal recognition
                    exceeds the non-focal average by{" "}
                    <strong>{(focalVsRest * 100).toFixed(0)} pp</strong>. Discussion point: in
                    Heider&apos;s design the Dani showed the same pattern despite lacking hue
                    terms — which is what made the finding fatal for the Brown &amp; Lenneberg
                    causal interpretation.
                  </p>
                )}
                {verdict === "mixed" && (
                  <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                    The class shows a <strong>flatter pattern</strong> than Heider reported —
                    focal, internominal, and boundary recognition are within ~8 points of each
                    other. Worth discussing: small N, the gap between these approximate hex
                    swatches and Heider&apos;s actual Munsell chips, or the replication&apos;s
                    small 4-item memory load compared to her 24-trial design.
                  </p>
                )}
                {verdict === "inverts" && (
                  <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                    The class <strong>inverts</strong> Heider&apos;s third prediction: focal
                    recognition came in <em>below</em> non-focal. With small N this can easily be
                    noise, but a useful seminar prompt — are the internominal/boundary test chips
                    unusually distinctive against the grid distractors?
                  </p>
                )}
                <p style={{ fontSize: "14px", color: C.muted, fontStyle: "italic", marginTop: "10px" }}>
                  Caveats: N = {stats.n}. The chips are approximate hex renderings of Heider&apos;s
                  Munsell designations; the grid is 80 sRGB chips rather than her 160 Munsell
                  chips. Effect sizes are not directly comparable.
                </p>
              </div>
            );

            return (
              <>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${W} ${H}`}
                  width="100%"
                  style={{ display: "block", background: C.surface }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <text x={pad} y={40} fontSize="22" fontFamily="'Crimson Pro', Georgia, serif" fill={C.text}>
                    Heider 1972 — Class Results
                  </text>
                  <text
                    x={pad}
                    y={64}
                    fontSize="12"
                    fontFamily="'Space Mono', monospace"
                    fill={C.muted}
                    letterSpacing="1.5"
                  >
                    {(session || "ALL SESSIONS").toUpperCase()} · N = {stats.n}{" "}
                    {stats.n === 1 ? "student" : "students"}
                  </text>

                  {/* Topline per category */}
                  {stats.categories.map((c, i) => {
                    const col = c.type === "focal" ? C.focal : c.type === "internominal" ? C.internominal : C.boundary;
                    return (
                      <g key={c.type} transform={`translate(${pad + i * 340}, 84)`}>
                        <text x={0} y={0} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                          {c.type.toUpperCase()} · RECOGNITION
                        </text>
                        <text x={0} y={30} fontSize="28" fontFamily="'Crimson Pro', Georgia, serif" fill={col}>
                          {(c.acc * 100).toFixed(0)}%
                        </text>
                        <text x={0} y={50} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted}>
                          {c.meanTime.toFixed(1)}s naming · {c.meanLetters.toFixed(1)} letters
                        </text>
                      </g>
                    );
                  })}

                  {/* Scatter */}
                  <text
                    x={scatterBox.x}
                    y={scatterBox.y - 10}
                    fontSize="11"
                    fontFamily="'Space Mono', monospace"
                    fill={C.muted}
                    letterSpacing="1.2"
                  >
                    NAMING TIME VS. RECOGNITION
                  </text>
                  <line x1={scatterBox.x + 40} y1={scatterBox.y + scatterBox.h - 30} x2={scatterBox.x + scatterBox.w - 20} y2={scatterBox.y + scatterBox.h - 30} stroke="#CCC3B0" />
                  <line x1={scatterBox.x + 40} y1={scatterBox.y + 20} x2={scatterBox.x + 40} y2={scatterBox.y + scatterBox.h - 30} stroke="#CCC3B0" />
                  <text x={scatterBox.x + 34} y={yS(true) + 4} textAnchor="end" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                    recognised
                  </text>
                  <text x={scatterBox.x + 34} y={yS(false) + 4} textAnchor="end" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                    missed
                  </text>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 15].map(
                    (v) =>
                      v <= maxTime && (
                        <g key={v}>
                          <line x1={xS(v)} y1={scatterBox.y + scatterBox.h - 30} x2={xS(v)} y2={scatterBox.y + scatterBox.h - 26} stroke="#CCC3B0" />
                          <text x={xS(v)} y={scatterBox.y + scatterBox.h - 14} textAnchor="middle" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                            {v}s
                          </text>
                        </g>
                      )
                  )}
                  {stats.exposedRows.map((r, i) => {
                    const col = r.type === "focal" ? C.focal : r.type === "internominal" ? C.internominal : C.boundary;
                    return (
                      <circle
                        key={i}
                        cx={xS(r.time)}
                        cy={yS(r.recognized) + jitter(i) * 0.6}
                        r="7"
                        fill={r.hex}
                        stroke={col}
                        strokeWidth="1.5"
                        opacity={0.9}
                      />
                    );
                  })}

                  {/* Bars */}
                  <text x={barBox.x} y={barBox.y - 10} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                    RECOGNITION RATE BY CATEGORY
                  </text>
                  <line x1={barBox.x + 20} y1={barBaseY} x2={barBox.x + barBox.w - 10} y2={barBaseY} stroke="#CCC3B0" />
                  {barVals.map((b, i) => {
                    const x = barBox.x + 40 + i * (barW + barGap);
                    const h = (b.acc / barMax) * barHfull;
                    return (
                      <g key={b.label}>
                        <rect x={x} y={barBaseY - h} width={barW} height={h} fill={b.color} opacity={0.85} />
                        <text x={x + barW / 2} y={barBaseY - h - 8} textAnchor="middle" fontSize="16" fontFamily="'Crimson Pro', Georgia, serif" fill={C.text}>
                          {(b.acc * 100).toFixed(0)}%
                        </text>
                        <text x={x + barW / 2} y={barBaseY + 18} textAnchor="middle" fontSize="11" fontFamily="'Space Mono', monospace" fill={C.text}>
                          {b.label}
                        </text>
                        <text x={x + barW / 2} y={barBaseY + 32} textAnchor="middle" fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                          {b.time.toFixed(1)}s · {b.letters.toFixed(0)}L
                        </text>
                      </g>
                    );
                  })}

                  {/* Swatches */}
                  <text x={pad} y={swatchesY - 10} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                    PER-CHIP NAMES &amp; NAMING TIMES
                  </text>
                  {stats.swatches.map((sw, i) => {
                    const col = i % 6;
                    const row = Math.floor(i / 6);
                    const sx = pad + col * ((W - pad * 2) / 6);
                    const sy = swatchesY + row * 160;
                    const cellW = (W - pad * 2) / 6 - 12;
                    const stroke = sw.type === "focal" ? C.focal : sw.type === "internominal" ? C.internominal : C.boundary;
                    return (
                      <g key={sw.id} transform={`translate(${sx}, ${sy})`}>
                        <rect x={0} y={0} width={cellW} height={50} fill={sw.hex} stroke={C.border} />
                        <rect x={0} y={50} width={cellW} height={3} fill={stroke} />
                        <text x={4} y={68} fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                          {sw.type.toUpperCase()} · {sw.munsell}
                        </text>
                        <text x={4} y={82} fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                          {sw.meanTime.toFixed(1)}s avg{sw.accuracy !== null ? ` · ${(sw.accuracy * 100).toFixed(0)}% recognised` : ""}
                        </text>
                        {sw.top.slice(0, 3).map((t, j) => (
                          <text
                            key={j}
                            x={4}
                            y={100 + j * 14}
                            fontSize="12"
                            fontFamily="'Crimson Pro', Georgia, serif"
                            fontStyle="italic"
                            fill={C.text}
                          >
                            &ldquo;{t[0] || "—"}&rdquo;
                            <tspan fontFamily="'Space Mono', monospace" fontStyle="normal" fontSize="10" fill={C.muted}>
                              {"  "}×{t[1]}
                            </tspan>
                          </text>
                        ))}
                      </g>
                    );
                  })}

                  {/* Commentary block for PNG export */}
                  {(() => {
                    const commentaryY = 1020;
                    const intro =
                      "Heider's three predictions: focal colours are given shorter names, named faster, and recognised more accurately than internominal or boundary colours — the recognition advantage holding even for speakers of languages without basic chromatic hue terms (her key evidence against Brown & Lenneberg's linguistic-causation interpretation).";
                    let verdictText = "";
                    if (verdict === "supports") {
                      verdictText = `This class broadly supports Heider: focal recognition exceeds the non-focal average by ${(focalVsRest * 100).toFixed(0)} pp. Focal mean naming ${focalTime.toFixed(1)}s vs. non-focal ${nonFocalTime.toFixed(1)}s; focal mean ${focalLetters.toFixed(1)} letters vs. non-focal ${nonFocalLetters.toFixed(1)}.`;
                    } else if (verdict === "mixed") {
                      verdictText = `This class shows a flatter pattern — focal ${(focalAcc * 100).toFixed(0)}%, internominal ${(internomAcc * 100).toFixed(0)}%, boundary ${(boundaryAcc * 100).toFixed(0)}%. Possible explanations to discuss: small N, the hex-to-Munsell approximation, or the 4-item memory load vs. Heider's 24-trial design.`;
                    } else {
                      verdictText = `This class inverts the recognition prediction: focal ${(focalAcc * 100).toFixed(0)}% vs. non-focal average ${((internomAcc + boundaryAcc) / 2 * 100).toFixed(0)}%. Small N can produce this; also a seminar prompt about which specific chips drew the hits.`;
                    }
                    const caveat = `Caveats: N = ${stats.n}. Chips are approximate sRGB renderings of Heider's Munsell designations; the recognition grid is 80 chips (not her 160). Effect sizes are not directly comparable.`;
                    const WRAP = 120;
                    const introLines = wrapText(intro, WRAP);
                    const verdictLines = wrapText(verdictText, WRAP);
                    const caveatLines = wrapText(caveat, WRAP);
                    const lineH = 20;
                    let y = commentaryY;
                    const out: React.ReactNode[] = [];
                    out.push(
                      <text
                        key="heading"
                        x={pad}
                        y={y}
                        fontSize="11"
                        fontFamily="'Space Mono', monospace"
                        fill={C.muted}
                        letterSpacing="1.2"
                      >
                        HOW DOES THIS COMPARE TO HEIDER (1972)?
                      </text>
                    );
                    y += 28;
                    introLines.forEach((line, i) => {
                      out.push(
                        <text key={`intro-${i}`} x={pad} y={y + i * lineH} fontSize="14" fontFamily="'Crimson Pro', Georgia, serif" fill={C.body}>
                          {line}
                        </text>
                      );
                    });
                    y += introLines.length * lineH + 14;
                    verdictLines.forEach((line, i) => {
                      out.push(
                        <text key={`verdict-${i}`} x={pad} y={y + i * lineH} fontSize="14" fontFamily="'Crimson Pro', Georgia, serif" fill={C.body}>
                          {line}
                        </text>
                      );
                    });
                    y += verdictLines.length * lineH + 14;
                    caveatLines.forEach((line, i) => {
                      out.push(
                        <text key={`caveat-${i}`} x={pad} y={y + i * lineH} fontSize="12" fontFamily="'Crimson Pro', Georgia, serif" fontStyle="italic" fill={C.muted}>
                          {line}
                        </text>
                      );
                    });
                    return <g>{out}</g>;
                  })()}
                </svg>

                {/* Warmup summary (in-page only, not in PNG) */}
                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ ...eyebrow, marginBottom: "10px" }}>Warm-up (Exp I) — best-example saturation choices</div>
                  <p style={{ fontSize: "14px", color: C.muted, fontStyle: "italic", marginBottom: "12px" }}>
                    Heider found ~93% of best-example choices land on the two most saturated chips.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
                    {Array.from(stats.warmupByName.entries()).map(([name, v]) => (
                      <div key={name} style={{ borderTop: `2px solid ${C.border}`, paddingTop: "10px" }}>
                        <div style={{ fontSize: "15px", color: C.text, fontStyle: "italic", marginBottom: "4px" }}>
                          {name}
                        </div>
                        <div style={{ fontSize: "22px", fontWeight: 300, color: C.text }}>
                          {v.total > 0 ? Math.round((v.topTwoCount / v.total) * 100) : 0}%
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: C.muted }}>
                          picked top-2 saturation · n={v.total}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {commentary}
              </>
            );
          })()}
      </div>
    </div>
  );
}
