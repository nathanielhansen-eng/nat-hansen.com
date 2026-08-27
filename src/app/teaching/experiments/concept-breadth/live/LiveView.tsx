"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { MDD_LADDER, PUBLISHED, TRAUMA_VIGNETTES } from "../stimuli";

// Projector view: polls the public aggregate endpoint and draws the room's
// distribution filling in live, next to the public pool and the published
// anchors. Aggregate-only data; the page carries nothing worth gating.

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  vert: "#8C3A2E",
  horiz: "#4A6B4F",
  pool: "#A8A29E",
  well: "#FAFAF9",
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const eyebrow: React.CSSProperties = {
  ...mono,
  fontSize: "12px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: C.muted,
};

interface Agg {
  n: number;
  ladderYes: number[];
  ladderScoreHist: number[];
  traumaScoreHist: number[];
  trauma: Record<string, number[]>;
}

function traumaMean(agg: Agg | null, id: string): number | null {
  const counts = agg?.trauma?.[id];
  if (!counts) return null;
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n) return null;
  return counts.reduce((a, c, i) => a + c * (i + 1), 0) / n;
}

function meanLadderDepth(agg: Agg | null): number | null {
  if (!agg || !agg.n) return null;
  return agg.ladderScoreHist.reduce((a, c, i) => a + c * i, 0) / agg.n;
}

/** Rung labels: the design's severity gradient, mildest wording last. */
const RUNG_LABELS = ["Rung 1 — most severe", "Rung 2", "Rung 3", "Rung 4", "Rung 5 — least severe"];

export default function LiveView({ session }: { session: string }) {
  const [room, setRoom] = useState<Agg | null>(null);
  const [pool, setPool] = useState<Agg | null>(null);
  const [err, setErr] = useState(false);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/teaching/experiments/concept-breadth?session=${encodeURIComponent(session)}`;
    setJoinUrl(url);
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, url, { width: 148, margin: 1, color: { dark: "#1C1917", light: "#FFFFFF" } }).catch(
        () => {}
      );
    }
  }, [session]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(
          `/api/experiments/concept-breadth/summary?session=${encodeURIComponent(session)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (stop || !d?.ok) return;
        setPool(d.pool as Agg);
        setRoom((d.sessionAgg as Agg) ?? null);
        setErr(false);
      } catch {
        if (!stop) setErr(true);
      }
    };
    void tick();
    const h = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(h);
    };
  }, [session]);

  const roomN = room?.n ?? 0;
  const poolN = pool?.n ?? 0;
  const roomDepth = meanLadderDepth(room);
  const poolDepth = meanLadderDepth(pool);

  // Trauma rows ordered by the pool's mean (falling back to the room's,
  // then to the instrument's own numbering) so the core→periphery gradient
  // is data-driven, not editorial.
  const rows = TRAUMA_VIGNETTES.map((v) => ({
    v,
    roomM: traumaMean(room, v.id),
    poolM: traumaMean(pool, v.id),
  })).sort((a, b) => (b.poolM ?? b.roomM ?? 0) - (a.poolM ?? a.roomM ?? 0));

  const pct = (agg: Agg | null, rung: number): number | null => {
    if (!agg || !agg.n) return null;
    return (agg.ladderYes[rung] / agg.n) * 100;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Crimson Pro', Georgia, serif",
        padding: "36px 44px",
      }}
    >
      <style>{FONTS}</style>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px", marginBottom: "28px" }}>
        <div style={{ flex: 1 }}>
          <div style={eyebrow}>Live &middot; session {session}</div>
          <h1 style={{ fontSize: "40px", fontWeight: 400, color: C.text, margin: "6px 0 10px" }}>
            Where do the concepts stop?
          </h1>
          <div style={{ ...mono, fontSize: "16px", color: C.body, wordBreak: "break-all" }}>{joinUrl}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <canvas ref={qrRef} style={{ border: `1px solid ${C.border}`, background: "#FFF" }} />
        </div>
        <div style={{ textAlign: "center", minWidth: "150px" }}>
          <div style={{ ...mono, fontSize: "64px", color: C.text, lineHeight: 1 }}>{roomN}</div>
          <div style={{ ...eyebrow, marginTop: "8px" }}>responses in the room</div>
          <div style={{ ...mono, fontSize: "13px", color: C.muted, marginTop: "10px" }}>
            {poolN} everyone, ever
          </div>
        </div>
      </div>

      {err && (
        <div style={{ ...mono, fontSize: "13px", color: C.vert, marginBottom: "16px" }}>
          Connection hiccup — retrying…
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Part 1 — the ladder */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px 30px" }}>
          <div style={{ ...eyebrow, color: C.vert, marginBottom: "6px" }}>
            Part 1 &middot; Vertical — the depression ladder
          </div>
          <div style={{ fontSize: "17px", color: C.muted, marginBottom: "20px" }}>
            Percent saying &ldquo;mental disorder&rdquo;, by severity rung
          </div>
          {MDD_LADDER.map((_, i) => {
            const r = pct(room, i);
            const p = pct(pool, i);
            return (
              <div key={i} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ ...mono, fontSize: "12px", color: C.muted }}>{RUNG_LABELS[i]}</span>
                  <span style={{ ...mono, fontSize: "15px", color: C.text }}>
                    {r === null ? "—" : `${Math.round(r)}%`}
                  </span>
                </div>
                <div style={{ position: "relative", height: "26px", background: "#E7E5E4" }}>
                  {/* pool ghost */}
                  {p !== null && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: `${p}%`,
                        background: C.pool,
                        opacity: 0.45,
                        transition: "width 0.8s ease",
                      }}
                    />
                  )}
                  {/* room */}
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      left: 0,
                      height: "16px",
                      width: `${r ?? 0}%`,
                      background: C.vert,
                      transition: "width 0.8s ease",
                    }}
                  />
                  {/* published rung-4 anchor */}
                  {i === 3 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-4px",
                        bottom: "-4px",
                        left: `${PUBLISHED.mddRung4Yes * 100}%`,
                        width: "2px",
                        background: C.text,
                      }}
                      title="Published: 53% (Tse & Haslam 2023)"
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: "15px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
            Every rung is the same condition, graded down in severity. Room in{" "}
            <strong style={{ color: C.vert }}>red</strong>, everyone in{" "}
            <strong style={{ color: C.pool }}>gray</strong>; the black tick is the published 53%
            for rung 4 alone (N&nbsp;=&nbsp;502). Mean depth: room{" "}
            <strong style={{ color: C.text }}>{roomDepth === null ? "—" : roomDepth.toFixed(2)}</strong>, everyone{" "}
            <strong style={{ color: C.text }}>{poolDepth === null ? "—" : poolDepth.toFixed(2)}</strong>, published{" "}
            <strong style={{ color: C.text }}>{PUBLISHED.mddDepth.toFixed(2)}</strong>{" "}of 5.
          </div>
        </div>

        {/* Part 2 — trauma */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px 30px" }}>
          <div style={{ ...eyebrow, color: C.horiz, marginBottom: "6px" }}>
            Part 2 &middot; Horizontal — the trauma scenarios
          </div>
          <div style={{ fontSize: "17px", color: C.muted, marginBottom: "20px" }}>
            Mean agreement that the event was traumatic (1&ndash;6)
          </div>
          {rows.map(({ v, roomM, poolM }) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span
                style={{
                  ...mono,
                  fontSize: "11px",
                  color: C.muted,
                  width: "190px",
                  flexShrink: 0,
                  lineHeight: 1.3,
                }}
              >
                {v.label}
              </span>
              <div style={{ position: "relative", flex: 1, height: "22px", background: "#E7E5E4" }}>
                {/* published overall mean */}
                <div
                  style={{
                    position: "absolute",
                    top: "-3px",
                    bottom: "-3px",
                    left: `${((PUBLISHED.traumaItemMean - 1) / 5) * 100}%`,
                    width: "2px",
                    background: C.text,
                    opacity: 0.35,
                  }}
                />
                {poolM !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      height: "100%",
                      left: 0,
                      width: `${((poolM - 1) / 5) * 100}%`,
                      background: C.pool,
                      opacity: 0.45,
                      transition: "width 0.8s ease",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    height: "14px",
                    left: 0,
                    width: `${roomM === null ? 0 : ((roomM - 1) / 5) * 100}%`,
                    background: C.horiz,
                    transition: "width 0.8s ease",
                  }}
                />
              </div>
              <span style={{ ...mono, fontSize: "14px", color: C.text, width: "42px", textAlign: "right" }}>
                {roomM === null ? "—" : roomM.toFixed(1)}
              </span>
            </div>
          ))}
          <div style={{ fontSize: "15px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
            Ten qualitatively different events, ordered by how traumatic everyone has rated them.
            Room in{" "}<strong style={{ color: C.horiz }}>green</strong>, everyone in{" "}
            <strong style={{ color: C.pool }}>gray</strong>; the faint tick is the published
            per-scenario mean of {PUBLISHED.traumaItemMean} (N&nbsp;=&nbsp;301).
          </div>
        </div>
      </div>
    </div>
  );
}
