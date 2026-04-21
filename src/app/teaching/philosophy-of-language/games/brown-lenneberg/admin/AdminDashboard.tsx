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
  boundary: "#B01568",
};

interface NamingRow {
  id: number;
  hex: string;
  type: "focal" | "boundary";
  name: string;
  time: number;
  words: number;
  exposed: boolean;
  selected: boolean;
  correct: boolean;
}
interface Submission {
  session: string;
  submittedAt: string;
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
      const r = await fetch(`/api/experiments/brown-lenneberg/submissions${q}`, { cache: "no-store" });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const stats = useMemo(() => {
    const n = submissions.length;
    const exposedRows: NamingRow[] = [];
    for (const s of submissions) for (const r of s.naming) if (r.exposed) exposedRows.push(r);
    const focalExp = exposedRows.filter((r) => r.type === "focal");
    const boundaryExp = exposedRows.filter((r) => r.type === "boundary");
    const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    const focalAcc = mean(focalExp.map((r) => (r.correct ? 1 : 0)));
    const boundaryAcc = mean(boundaryExp.map((r) => (r.correct ? 1 : 0)));
    const focalTime = mean(focalExp.map((r) => r.time));
    const boundaryTime = mean(boundaryExp.map((r) => r.time));

    const perSwatch = new Map<number, { hex: string; type: "focal" | "boundary"; names: string[]; times: number[]; exposures: NamingRow[] }>();
    for (const s of submissions) {
      for (const r of s.naming) {
        if (!perSwatch.has(r.id)) perSwatch.set(r.id, { hex: r.hex, type: r.type, names: [], times: [], exposures: [] });
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
        const acc = exp.length ? exp.filter((e) => e.correct).length / exp.length : null;
        return {
          id,
          hex: v.hex,
          type: v.type,
          meanTime: mean(v.times),
          top,
          exposureCount: exp.length,
          accuracy: acc,
        };
      })
      .sort((a, b) => a.id - b.id);

    return { n, exposedRows, focalAcc, boundaryAcc, focalTime, boundaryTime, swatches };
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

  // SVG layout for the combined report
  const W = 1100,
    H = 1070;
  const pad = 28;
  const scatterBox = { x: pad, y: 200, w: 540, h: 260 };
  const barBox = { x: scatterBox.x + scatterBox.w + 40, y: 200, w: W - scatterBox.x - scatterBox.w - 40 - pad, h: 260 };
  const swatchesY = 500;

  const maxTime = Math.max(6, ...stats.exposedRows.map((r) => r.time));
  const xS = (t: number) => scatterBox.x + 40 + (t / maxTime) * (scatterBox.w - 60);
  const yS = (correct: boolean) =>
    correct ? scatterBox.y + 50 : scatterBox.y + scatterBox.h - 50;

  const barVals = [
    { label: "Focal", acc: stats.focalAcc, color: C.focal, time: stats.focalTime },
    { label: "Boundary", acc: stats.boundaryAcc, color: C.boundary, time: stats.boundaryTime },
  ];
  const barMax = Math.max(0.5, ...barVals.map((b) => b.acc), 1);
  const barW = 90;
  const barGap = 60;
  const barBaseY = barBox.y + barBox.h - 40;
  const barTopY = barBox.y + 40;
  const barHfull = barBaseY - barTopY;

  // Add small jitter for visibility on scatter
  const jitter = (i: number) => ((i * 37) % 31) - 15;

  return (
    <div style={outer}>
      <style>{FONTS}</style>
      {!presenting && (
        <div style={{ maxWidth: "1100px", margin: "0 auto 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={eyebrow}>Brown &amp; Lenneberg</div>
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
                  const fn = `brown-lenneberg-${session || "all"}-${new Date()
                    .toISOString()
                    .slice(0, 10)}.png`;
                  downloadSvgAsPng(svgRef.current, fn);
                }
              }}
            >
              Download PNG
            </button>
          </div>
        </div>
      )}

      {!presenting && (() => {
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
        const effectiveId = sanitize(newSessionId || session || "");
        const origin =
          typeof window !== "undefined" ? window.location.origin : "https://nat-hansen.com";
        const url = effectiveId
          ? `${origin}/teaching/philosophy-of-language/games/brown-lenneberg?session=${encodeURIComponent(effectiveId)}`
          : `${origin}/teaching/philosophy-of-language/games/brown-lenneberg`;
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
        {!loading && !err && stats.n > 0 && (() => {
          const diff = stats.focalAcc - stats.boundaryAcc;
          const timeDiff = stats.boundaryTime - stats.focalTime;
          let verdict: "supports" | "mixed" | "inverts";
          if (diff > 0.08) verdict = "supports";
          else if (diff < -0.08) verdict = "inverts";
          else verdict = "mixed";
          const commentary = (
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ ...eyebrow, marginBottom: "10px" }}>How does this compare to Brown &amp; Lenneberg?</div>
              <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body, marginBottom: "10px" }}>
                Brown &amp; Lenneberg predicted that <em>codability</em> — the speed and
                agreement with which a colour can be named — should predict how well it is
                remembered. If they were right, this class should recognise focal colours
                (the ones named quickly and consistently) more accurately than boundary
                colours (the ones that take longer or invite hedging phrases).
              </p>
              {verdict === "supports" && (
                <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                  That is broadly what this class shows: focal recognition is{" "}
                  <strong>{(diff * 100).toFixed(0)} percentage points</strong> higher than
                  boundary recognition, and focal colours were named on average{" "}
                  <strong>{timeDiff.toFixed(1)}s faster</strong>. In other words, easier-to-name
                  colours were easier to hold in memory across the 30-second delay — the
                  codability–memory link that Brown &amp; Lenneberg reported in 1954.
                </p>
              )}
              {verdict === "mixed" && (
                <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                  This class shows a <strong>flatter pattern</strong> than Brown &amp;
                  Lenneberg reported: focal and boundary recognition came out within a few
                  points of each other ({(stats.focalAcc * 100).toFixed(0)}% vs{" "}
                  {(stats.boundaryAcc * 100).toFixed(0)}%). Worth discussing why — sample
                  size, the small 4-item memory load, English vocabulary for these specific
                  hues, or genuinely weaker codability effects for this colour set.
                </p>
              )}
              {verdict === "inverts" && (
                <p style={{ fontSize: "16px", lineHeight: "1.65", color: C.body }}>
                  This class <strong>inverts</strong> Brown &amp; Lenneberg&apos;s prediction:
                  boundary colours were recognised more accurately than focal ones by{" "}
                  {(-diff * 100).toFixed(0)} points. With a small sample this can easily be
                  noise, but it is a useful prompt for the seminar — which of the 4 test
                  colours drew the hit, and is there a story about their perceptual
                  distinctiveness that outweighs codability?
                </p>
              )}
              <p style={{ fontSize: "14px", color: C.muted, fontStyle: "italic", marginTop: "10px" }}>
                Caveats: N = {stats.n}. The original 1954 study used 24 Munsell chips and a
                recognition set of 4–120 items; this replication uses 12 hex colours and a
                fixed 4-item set, so the effect size is not directly comparable.
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
            {/* Header */}
            <text x={pad} y={40} fontSize="22" fontFamily="'Crimson Pro', Georgia, serif" fill={C.text}>
              Brown &amp; Lenneberg — Class Results
            </text>
            <text
              x={pad}
              y={64}
              fontSize="12"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
              letterSpacing="1.5"
            >
              {(session || "ALL SESSIONS").toUpperCase()} · N = {stats.n} {stats.n === 1 ? "student" : "students"}
            </text>

            {/* Topline numbers */}
            <g transform={`translate(${pad}, 84)`}>
              <text x={0} y={0} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                FOCAL RECOGNITION
              </text>
              <text x={0} y={30} fontSize="28" fontFamily="'Crimson Pro', Georgia, serif" fill={C.focal}>
                {(stats.focalAcc * 100).toFixed(0)}%
              </text>
              <text x={0} y={50} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted}>
                mean naming {stats.focalTime.toFixed(1)}s
              </text>
            </g>
            <g transform={`translate(${pad + 260}, 84)`}>
              <text x={0} y={0} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                BOUNDARY RECOGNITION
              </text>
              <text x={0} y={30} fontSize="28" fontFamily="'Crimson Pro', Georgia, serif" fill={C.boundary}>
                {(stats.boundaryAcc * 100).toFixed(0)}%
              </text>
              <text x={0} y={50} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted}>
                mean naming {stats.boundaryTime.toFixed(1)}s
              </text>
            </g>
            <g transform={`translate(${pad + 520}, 84)`}>
              <text x={0} y={0} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted} letterSpacing="1.2">
                FOCAL − BOUNDARY (acc.)
              </text>
              <text
                x={0}
                y={30}
                fontSize="28"
                fontFamily="'Crimson Pro', Georgia, serif"
                fill={stats.focalAcc >= stats.boundaryAcc ? C.focal : C.boundary}
              >
                {stats.focalAcc - stats.boundaryAcc >= 0 ? "+" : ""}
                {((stats.focalAcc - stats.boundaryAcc) * 100).toFixed(0)} pp
              </text>
              <text x={0} y={50} fontSize="11" fontFamily="'Space Mono', monospace" fill={C.muted}>
                {stats.focalAcc >= stats.boundaryAcc
                  ? "codability advantage"
                  : "boundary wins (unusual)"}
              </text>
            </g>

            {/* Scatter title + axes */}
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
            <line
              x1={scatterBox.x + 40}
              y1={scatterBox.y + scatterBox.h - 30}
              x2={scatterBox.x + scatterBox.w - 20}
              y2={scatterBox.y + scatterBox.h - 30}
              stroke="#CCC3B0"
            />
            <line
              x1={scatterBox.x + 40}
              y1={scatterBox.y + 20}
              x2={scatterBox.x + 40}
              y2={scatterBox.y + scatterBox.h - 30}
              stroke="#CCC3B0"
            />
            <text
              x={scatterBox.x + 34}
              y={yS(true) + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              recognized
            </text>
            <text
              x={scatterBox.x + 34}
              y={yS(false) + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
            >
              missed
            </text>
            {[1, 2, 3, 4, 5, 6, 8, 10, 15].map(
              (v) =>
                v <= maxTime && (
                  <g key={v}>
                    <line
                      x1={xS(v)}
                      y1={scatterBox.y + scatterBox.h - 30}
                      x2={xS(v)}
                      y2={scatterBox.y + scatterBox.h - 26}
                      stroke="#CCC3B0"
                    />
                    <text
                      x={xS(v)}
                      y={scatterBox.y + scatterBox.h - 14}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="'Space Mono', monospace"
                      fill={C.muted}
                    >
                      {v}s
                    </text>
                  </g>
                )
            )}
            {stats.exposedRows.map((r, i) => (
              <circle
                key={i}
                cx={xS(r.time)}
                cy={yS(r.correct) + jitter(i) * 0.6}
                r="7"
                fill={r.hex}
                stroke={r.correct ? C.focal : C.boundary}
                strokeWidth="1.5"
                opacity={0.85}
              />
            ))}

            {/* Bar chart */}
            <text
              x={barBox.x}
              y={barBox.y - 10}
              fontSize="11"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
              letterSpacing="1.2"
            >
              RECOGNITION RATE BY TYPE
            </text>
            <line
              x1={barBox.x + 20}
              y1={barBaseY}
              x2={barBox.x + barBox.w - 10}
              y2={barBaseY}
              stroke="#CCC3B0"
            />
            {barVals.map((b, i) => {
              const x = barBox.x + 40 + i * (barW + barGap);
              const h = (b.acc / barMax) * barHfull;
              return (
                <g key={b.label}>
                  <rect x={x} y={barBaseY - h} width={barW} height={h} fill={b.color} opacity={0.85} />
                  <text
                    x={x + barW / 2}
                    y={barBaseY - h - 8}
                    textAnchor="middle"
                    fontSize="18"
                    fontFamily="'Crimson Pro', Georgia, serif"
                    fill={C.text}
                  >
                    {(b.acc * 100).toFixed(0)}%
                  </text>
                  <text
                    x={x + barW / 2}
                    y={barBaseY + 20}
                    textAnchor="middle"
                    fontSize="12"
                    fontFamily="'Space Mono', monospace"
                    fill={C.text}
                  >
                    {b.label}
                  </text>
                  <text
                    x={x + barW / 2}
                    y={barBaseY + 34}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="'Space Mono', monospace"
                    fill={C.muted}
                  >
                    {b.time.toFixed(1)}s to name
                  </text>
                </g>
              );
            })}

            {/* Swatches */}
            <text
              x={pad}
              y={swatchesY - 10}
              fontSize="11"
              fontFamily="'Space Mono', monospace"
              fill={C.muted}
              letterSpacing="1.2"
            >
              MOST COMMON NAMES &amp; MEAN NAMING TIME — PER COLOUR
            </text>
            {stats.swatches.map((sw, i) => {
              const col = i % 6;
              const row = Math.floor(i / 6);
              const sx = pad + col * ((W - pad * 2) / 6);
              const sy = swatchesY + row * 150;
              const cellW = (W - pad * 2) / 6 - 12;
              return (
                <g key={sw.id} transform={`translate(${sx}, ${sy})`}>
                  <rect x={0} y={0} width={cellW} height={50} fill={sw.hex} stroke={C.border} />
                  <rect
                    x={0}
                    y={50}
                    width={cellW}
                    height={3}
                    fill={sw.type === "focal" ? C.focal : C.boundary}
                  />
                  <text x={4} y={68} fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                    {sw.type.toUpperCase()} · {sw.meanTime.toFixed(1)}s
                  </text>
                  {sw.accuracy !== null && (
                    <text x={4} y={82} fontSize="10" fontFamily="'Space Mono', monospace" fill={C.muted}>
                      {(sw.accuracy * 100).toFixed(0)}% recognised when tested
                    </text>
                  )}
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
                      <tspan
                        fontFamily="'Space Mono', monospace"
                        fontStyle="normal"
                        fontSize="10"
                        fill={C.muted}
                      >
                        {"  "}×{t[1]}
                      </tspan>
                    </text>
                  ))}
                </g>
              );
            })}

            {/* Commentary block for PNG export */}
            {(() => {
              const commentaryY = 830;
              const intro =
                "Brown & Lenneberg predicted that codability — the speed and agreement with which a colour can be named — should predict how well it is remembered. If they were right, focal colours (named quickly and consistently) should be recognised more accurately than boundary colours (those that take longer or invite hedging phrases).";
              let verdictText = "";
              if (verdict === "supports") {
                verdictText = `That is broadly what this class shows: focal recognition is ${(diff * 100).toFixed(0)} percentage points higher than boundary recognition, and focal colours were named on average ${timeDiff.toFixed(1)}s faster. Easier-to-name colours were easier to hold in memory across the 30-second delay — the codability–memory link Brown & Lenneberg reported in 1954.`;
              } else if (verdict === "mixed") {
                verdictText = `This class shows a flatter pattern than Brown & Lenneberg reported: focal and boundary recognition came out within a few points of each other (${(stats.focalAcc * 100).toFixed(0)}% vs ${(stats.boundaryAcc * 100).toFixed(0)}%). Worth discussing why — sample size, the small 4-item memory load, English vocabulary for these specific hues, or genuinely weaker codability effects for this colour set.`;
              } else {
                verdictText = `This class inverts Brown & Lenneberg's prediction: boundary colours were recognised more accurately than focal ones by ${(-diff * 100).toFixed(0)} points. With a small sample this can easily be noise, but it is a useful prompt for the seminar — which of the 4 test colours drew the hit, and is there a story about their perceptual distinctiveness that outweighs codability?`;
              }
              const caveat = `Caveats: N = ${stats.n}. The original 1954 study used 24 Munsell chips and a recognition set of 4–120 items; this replication uses 12 hex colours and a fixed 4-item set, so the effect size is not directly comparable.`;
              const WRAP = 120;
              const introLines = wrapText(intro, WRAP);
              const verdictLines = wrapText(verdictText, WRAP);
              const caveatLines = wrapText(caveat, WRAP);
              const lineH = 20;
              let y = commentaryY;
              return (
                <g>
                  <text
                    x={pad}
                    y={y}
                    fontSize="11"
                    fontFamily="'Space Mono', monospace"
                    fill={C.muted}
                    letterSpacing="1.2"
                  >
                    HOW DOES THIS COMPARE TO BROWN &amp; LENNEBERG?
                  </text>
                  {(() => {
                    y += 28;
                    const out: React.ReactNode[] = [];
                    introLines.forEach((line, i) => {
                      out.push(
                        <text
                          key={`intro-${i}`}
                          x={pad}
                          y={y + i * lineH}
                          fontSize="14"
                          fontFamily="'Crimson Pro', Georgia, serif"
                          fill={C.body}
                        >
                          {line}
                        </text>
                      );
                    });
                    y += introLines.length * lineH + 14;
                    verdictLines.forEach((line, i) => {
                      out.push(
                        <text
                          key={`verdict-${i}`}
                          x={pad}
                          y={y + i * lineH}
                          fontSize="14"
                          fontFamily="'Crimson Pro', Georgia, serif"
                          fill={C.body}
                        >
                          {line}
                        </text>
                      );
                    });
                    y += verdictLines.length * lineH + 14;
                    caveatLines.forEach((line, i) => {
                      out.push(
                        <text
                          key={`caveat-${i}`}
                          x={pad}
                          y={y + i * lineH}
                          fontSize="12"
                          fontFamily="'Crimson Pro', Georgia, serif"
                          fontStyle="italic"
                          fill={C.muted}
                        >
                          {line}
                        </text>
                      );
                    });
                    return out;
                  })()}
                </g>
              );
            })()}
          </svg>
              {commentary}
            </>
          );
        })()}
      </div>
    </div>
  );
}
