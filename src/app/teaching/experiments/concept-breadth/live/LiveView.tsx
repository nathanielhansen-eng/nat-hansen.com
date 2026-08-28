"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { MDD_LADDER, PUBLISHED, TRAUMA_VIGNETTES } from "../stimuli";

// Projector view: polls the public aggregate endpoint and draws this
// group's distribution filling in live against the published anchors —
// each measure twice, as published (bare) and with "severe" inserted.
// One group per session id; comparisons BETWEEN groups happen from the
// admin dashboard's session picker, not here. Aggregate-only data; the
// page carries nothing worth gating.

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  vert: "#8C3A2E",
  vertSevere: "#3E1E18",
  horiz: "#4A6B4F",
  horizSevere: "#20301F",
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

interface VariantAgg {
  ladderYes: number[];
  ladderScoreHist: number[];
  traumaScoreHist: number[];
  trauma: Record<string, number[]>;
}

interface Agg {
  n: number;
  bare: VariantAgg;
  severe: VariantAgg;
  ladderShift: { up: number; same: number; down: number };
  traumaDeltaSum: number;
}

function traumaMean(agg: VariantAgg | undefined, id: string): number | null {
  const counts = agg?.trauma?.[id];
  if (!counts) return null;
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n) return null;
  return counts.reduce((a, c, i) => a + c * (i + 1), 0) / n;
}

function meanLadderDepth(agg: VariantAgg | undefined, n: number): number | null {
  if (!agg || !n) return null;
  return agg.ladderScoreHist.reduce((a, c, i) => a + c * i, 0) / n;
}

/** Axis labels: the design's severity gradient, mildest wording last. */
const RUNG_LABELS = [
  "Degree 1 — most severe",
  "Degree 2",
  "Degree 3",
  "Degree 4",
  "Degree 5 — least severe",
];

export default function LiveView({ session }: { session: string }) {
  const [group, setGroup] = useState<Agg | null>(null);
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
        setGroup((d.agg as Agg) ?? null);
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

  const n = group?.n ?? 0;
  const bareDepth = meanLadderDepth(group?.bare, n);
  const severeDepth = meanLadderDepth(group?.severe, n);
  const shiftedUp = group?.ladderShift?.up ?? 0;
  const traumaDelta = n ? (group?.traumaDeltaSum ?? 0) / n : null;

  // Trauma rows ordered by this group's own bare-pass means (instrument
  // order until data arrives) so the gradient the group draws is the one
  // on screen.
  const rows = TRAUMA_VIGNETTES.map((v) => ({
    v,
    bareM: traumaMean(group?.bare, v.id),
    severeM: traumaMean(group?.severe, v.id),
  })).sort((a, b) => (b.bareM ?? 0) - (a.bareM ?? 0));

  const pct = (agg: VariantAgg | undefined, rung: number): number | null => {
    if (!agg || !n) return null;
    return (agg.ladderYes[rung] / n) * 100;
  };

  const pairBar = (
    topPct: number | null,
    bottomPct: number | null,
    topColor: string,
    bottomColor: string,
    tick: number | null
  ) => (
    <div style={{ position: "relative", height: "30px", background: "#E7E5E4" }}>
      <div
        style={{
          position: "absolute",
          top: "4px",
          left: 0,
          height: "10px",
          width: `${topPct ?? 0}%`,
          background: topColor,
          transition: "width 0.8s ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "17px",
          left: 0,
          height: "10px",
          width: `${bottomPct ?? 0}%`,
          background: bottomColor,
          transition: "width 0.8s ease",
        }}
      />
      {tick !== null && (
        <div
          style={{
            position: "absolute",
            top: "-4px",
            bottom: "-4px",
            left: `${tick}%`,
            width: "2px",
            background: C.text,
          }}
        />
      )}
    </div>
  );

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
      <div style={{ display: "flex", alignItems: "center", gap: "32px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <div style={eyebrow}>Live &middot; session {session}</div>
          <h1 style={{ fontSize: "40px", fontWeight: 400, color: C.text, margin: "6px 0 10px" }}>
            How far do concepts extend?
          </h1>
          <div style={{ ...mono, fontSize: "16px", color: C.body, wordBreak: "break-all" }}>{joinUrl}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <canvas ref={qrRef} style={{ border: `1px solid ${C.border}`, background: "#FFF" }} />
        </div>
        <div style={{ textAlign: "center", minWidth: "150px" }}>
          <div style={{ ...mono, fontSize: "64px", color: C.text, lineHeight: 1 }}>{n}</div>
          <div style={{ ...eyebrow, marginTop: "8px" }}>responses in this group</div>
        </div>
      </div>

      {/* the one-word banner */}
      {n > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.text}`,
            padding: "16px 24px",
            marginBottom: "24px",
            fontSize: "22px",
            lineHeight: 1.5,
            color: C.body,
          }}
        >
          The effect of adding one modifier:{" "}
          <strong style={{ color: C.vert }}>
            {shiftedUp} of {n}
          </strong>{" "}
          moved their &ldquo;mental disorder&rdquo; threshold up the severity scale when the
          question said <strong>&ldquo;severe&rdquo;</strong>
          {traumaDelta !== null && (
            <>
              ; mean &ldquo;traumatic&rdquo; ratings shifted{" "}
              <strong style={{ color: C.horiz }}>
                {traumaDelta >= 0 ? "−" : "+"}
                {Math.abs(traumaDelta).toFixed(1)}
              </strong>{" "}
              points under &ldquo;severely&rdquo;
            </>
          )}
          .
        </div>
      )}

      {err && (
        <div style={{ ...mono, fontSize: "13px", color: C.vert, marginBottom: "16px" }}>
          Connection hiccup — retrying…
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Part 1 — the ladder */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px 30px" }}>
          <div style={{ ...eyebrow, color: C.vert, marginBottom: "6px" }}>
            Part 1 &middot; Vertical — the depression scale
          </div>
          <div style={{ fontSize: "17px", color: C.muted, marginBottom: "20px" }}>
            Percent saying &ldquo;mental disorder&rdquo; (upper bar) vs &ldquo;severe mental
            disorder&rdquo; (lower bar), by degree of severity
          </div>
          {MDD_LADDER.map((_, i) => {
            const b = pct(group?.bare, i);
            const s = pct(group?.severe, i);
            return (
              <div key={i} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ ...mono, fontSize: "12px", color: C.muted }}>{RUNG_LABELS[i]}</span>
                  <span style={{ ...mono, fontSize: "15px", color: C.text }}>
                    {b === null ? "—" : `${Math.round(b)}%`}
                    {" / "}
                    {s === null ? "—" : `${Math.round(s)}%`}
                  </span>
                </div>
                {pairBar(b, s, C.vert, C.vertSevere, i === 3 ? PUBLISHED.mddRung4Yes * 100 : null)}
              </div>
            );
          })}
          <div style={{ fontSize: "15px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
            Every degree is supposed to be the same condition, in decreasing severity. Upper bar in{" "}
            <strong style={{ color: C.vert }}>red</strong>{" "}= the question as published; lower bar
            in{" "}<strong style={{ color: C.vertSevere }}>dark red</strong>{" "}= with
            &ldquo;severe&rdquo; added. The black tick is the published result of 53% for degree 4
            alone (N&nbsp;=&nbsp;502). Mean depth: this group{" "}
            <strong style={{ color: C.text }}>{bareDepth === null ? "—" : bareDepth.toFixed(2)}</strong>{" "}as published,{" "}
            <strong style={{ color: C.text }}>{severeDepth === null ? "—" : severeDepth.toFixed(2)}</strong>{" "}with
            &ldquo;severe&rdquo;, published{" "}
            <strong style={{ color: C.text }}>{PUBLISHED.mddDepth.toFixed(2)}</strong>{" "}of 5.
          </div>
        </div>

        {/* Part 2 — trauma */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px 30px" }}>
          <div style={{ ...eyebrow, color: C.horiz, marginBottom: "6px" }}>
            Part 2 &middot; Horizontal — the trauma scenarios
          </div>
          <div style={{ fontSize: "17px", color: C.muted, marginBottom: "20px" }}>
            Mean agreement: &ldquo;traumatic&rdquo; (upper bar) vs &ldquo;severely
            traumatic&rdquo; (lower bar), 1&ndash;6
          </div>
          {rows.map(({ v, bareM, severeM }) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span
                style={{
                  ...mono,
                  fontSize: "11px",
                  color: C.muted,
                  width: "180px",
                  flexShrink: 0,
                  lineHeight: 1.3,
                }}
              >
                {v.label}
              </span>
              <div style={{ flex: 1 }}>
                {pairBar(
                  bareM === null ? null : ((bareM - 1) / 5) * 100,
                  severeM === null ? null : ((severeM - 1) / 5) * 100,
                  C.horiz,
                  C.horizSevere,
                  ((PUBLISHED.traumaItemMean - 1) / 5) * 100
                )}
              </div>
              <span style={{ ...mono, fontSize: "13px", color: C.text, width: "72px", textAlign: "right" }}>
                {bareM === null ? "—" : bareM.toFixed(1)}
                {" / "}
                {severeM === null ? "—" : severeM.toFixed(1)}
              </span>
            </div>
          ))}
          <div style={{ fontSize: "15px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
            Ten qualitatively different events, ordered by how traumatic this group rated them
            under the published question. Upper bar in{" "}
            <strong style={{ color: C.horiz }}>green</strong>{" "}= &ldquo;traumatic&rdquo;; lower
            bar in{" "}<strong style={{ color: C.horizSevere }}>dark green</strong>{" "}=
            &ldquo;severely traumatic&rdquo;. The tick is the published per-scenario mean of{" "}
            {PUBLISHED.traumaItemMean} (N&nbsp;=&nbsp;301).
          </div>
        </div>
      </div>
    </div>
  );
}
