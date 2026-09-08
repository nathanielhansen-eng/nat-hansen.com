"use client";

import { useMemo, useState } from "react";

// Gilbert, Krull & Malone (1990) Figure 2, redrawn in the journal's monochrome
// idiom, with the class data on identical axes beside it.

type SignalKind = "true" | "false" | "blank";
type TestResponse = "true" | "false" | "noinfo" | "neverseen";

export interface FigResponse {
  signal: SignalKind;
  interrupted: boolean;
  isFoil: boolean;
  response: TestResponse;
}
export interface FigSubmission {
  missedTones: number;
  responses: FigResponse[];
}

type CellKey = "TT" | "FF" | "TF" | "FT";
type Cells = Record<CellKey, [number, number]>; // [uninterrupted, interrupted], percent

// Read from the text of Study 1, pp. 604–605 (n = 33).
const GILBERT: Cells = { TT: [55, 58], FF: [55, 35], TF: [22, 17], FT: [21, 33] };

const CATS: Array<{ k: CellKey; label: string; diag?: boolean }> = [
  { k: "TT", label: "T as T" },
  { k: "FF", label: "F as F" },
  { k: "TF", label: "T as F" },
  { k: "FT", label: "F as T", diag: true },
];

const SERIF = "'Times New Roman', Times, Tinos, 'Liberation Serif', serif";

export function classCells(subjects: FigSubmission[]): Cells {
  const cell = (sig: "true" | "false", intr: boolean, resp: TestResponse) => {
    let n = 0;
    let k = 0;
    for (const s of subjects)
      for (const r of s.responses) {
        if (r.isFoil) continue;
        if (r.signal === sig && r.interrupted === intr) {
          n++;
          if (r.response === resp) k++;
        }
      }
    return n ? Math.round((100 * k) / n) : 0;
  };
  return {
    TT: [cell("true", false, "true"), cell("true", true, "true")],
    FF: [cell("false", false, "false"), cell("false", true, "false")],
    TF: [cell("true", false, "false"), cell("true", true, "false")],
    FT: [cell("false", false, "true"), cell("false", true, "true")],
  };
}

function Panel({
  data,
  source,
  showVals,
  patternId,
}: {
  data: Cells;
  source: string;
  showVals: boolean;
  patternId: string;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const W = 400;
  const H = 250;
  const mL = 34;
  const mR = 8;
  const mT = 22;
  const mB = 48;
  const pw = W - mL - mR;
  const ph = H - mT - mB;
  const yMax = 70;
  const y = (v: number) => mT + ph - (v / yMax) * ph;
  const slot = pw / 4;
  const bw = 20;
  const gap = 2;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${source}: identifications and misidentifications`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(135)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#000" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={mL + 3 * slot} y={mT} width={slot} height={ph} fill="#ececec" />
        {[0, 20, 40, 60].map((v) => (
          <g key={v}>
            <line x1={mL} x2={W - mR} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#000" : "#c9c9c9"} strokeWidth={1} />
            <text x={mL - 6} y={y(v) + 3.5} textAnchor="end" fontSize={11} fill="#5a5a5a" fontFamily={SERIF}>
              {v}%
            </text>
          </g>
        ))}
        {CATS.map((c, i) => {
          const cx = mL + slot * i + slot / 2;
          return (
            <g key={c.k}>
              {[0, 1].map((j) => {
                const x = cx - bw - gap / 2 + j * (bw + gap);
                const v = data[c.k][j];
                const top = y(v);
                const cond = j ? "interrupted" : "uninterrupted";
                return (
                  <g
                    key={j}
                    onMouseMove={(e) => {
                      const host = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement) ?? null;
                      const rect = host?.getBoundingClientRect();
                      setTip({
                        x: e.clientX - (rect?.left ?? 0) + 12,
                        y: e.clientY - (rect?.top ?? 0) + 12,
                        text: `${c.label}, ${cond}: ${v}% (${source})`,
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={x - 3} y={mT} width={bw + 6} height={ph} fill="transparent" />
                    <rect x={x} y={top} width={bw} height={y(0) - top} fill={j ? "#000" : `url(#${patternId})`} stroke="#000" strokeWidth={j ? 0 : 1} />
                    {showVals && (
                      <text x={x + bw / 2} y={top - 4} textAnchor="middle" fontSize={11} fill="#333" fontFamily={SERIF}>
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={cx} y={y(0) + 15} textAnchor="middle" fontSize={11.5} fill="#000" fontFamily={SERIF}>
                {c.label}
              </text>
            </g>
          );
        })}
        <text x={mL + slot} y={H - 8} textAnchor="middle" fontSize={11} fill="#000" fontFamily={SERIF} letterSpacing="0.08em">
          IDENTIFICATIONS
        </text>
        <text x={mL + 3 * slot} y={H - 8} textAnchor="middle" fontSize={11} fill="#000" fontFamily={SERIF} letterSpacing="0.08em">
          MISIDENTIFICATIONS
        </text>
      </svg>
      {tip && (
        <div
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y,
            pointerEvents: "none",
            background: "#fcfcfc",
            border: "1px solid #000",
            padding: "5px 8px",
            fontSize: "12.5px",
            fontFamily: SERIF,
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

export default function Figure2({ submissions, sessionLabel }: { submissions: FigSubmission[]; sessionLabel: string }) {
  const [excl, setExcl] = useState(false);
  const [showVals, setShowVals] = useState(true);
  const subjects = useMemo(() => (excl ? submissions.filter((s) => s.missedTones === 0) : submissions), [submissions, excl]);
  const cls = useMemo(() => classCells(subjects), [subjects]);
  const missedAny = submissions.filter((s) => s.missedTones > 0).length;

  const asym = cls.FT[1] - cls.TF[1];
  const cost = cls.FF[0] - cls.FF[1];
  let verdict: string;
  if (cost >= 10 && asym >= 10) verdict = "That reproduces the Spinozan asymmetry.";
  else if (cost <= -5 || asym <= -5)
    verdict = "That runs against the Spinozan prediction: in this sample, interruption if anything made false propositions easier to reject.";
  else verdict = "No clear asymmetry either way.";

  const sw: React.CSSProperties = { width: 22, height: 12, border: "1px solid #000", display: "inline-block" };

  return (
    <figure style={{ margin: 0, fontFamily: SERIF, color: "#000" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 24px", fontSize: "14px", marginBottom: "12px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
          <input type="checkbox" checked={excl} onChange={(e) => setExcl(e.target.checked)} style={{ accentColor: "#000" }} />
          Apply Gilbert&rsquo;s rule: drop subjects who missed a tone ({missedAny} of {submissions.length})
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
          <input type="checkbox" checked={showVals} onChange={(e) => setShowVals(e.target.checked)} style={{ accentColor: "#000" }} />
          Show values
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" }}>
        <div>
          <div style={{ fontSize: "13.5px", textAlign: "center", marginBottom: 4 }}>
            <b>Gilbert et al. (1990), Study 1</b> &middot; <em>n</em> = 33
          </div>
          <Panel data={GILBERT} source="Gilbert et al. 1990" showVals={showVals} patternId="hatch-g" />
        </div>
        <div>
          <div style={{ fontSize: "13.5px", textAlign: "center", marginBottom: 4 }}>
            <b>{sessionLabel}</b> &middot; <em>n</em> = {subjects.length}
          </div>
          <Panel data={cls} source={sessionLabel} showVals={showVals} patternId="hatch-c" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 10, fontSize: "12.5px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <i style={{ ...sw, background: "repeating-linear-gradient(135deg,#000 0 1px,transparent 1px 4px)" }} />
          Uninterrupted
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <i style={{ ...sw, background: "#000" }} />
          Interrupted
        </span>
      </div>
      <figcaption style={{ fontSize: "13.5px", lineHeight: 1.4, margin: "14px auto 0", maxWidth: 620, textAlign: "justify" }}>
        <em>Figure 2.</em>{" "}Identifications and misidentifications of propositions. (T-as-T denotes true propositions identified as true, T-as-F true propositions identified as false, and so on.) Published percentages are read from Gilbert et al.&rsquo;s text (pp. 604&ndash;605). The shaded band marks the diagnostic cell, false propositions misidentified as true.
      </figcaption>
      <p style={{ fontSize: "15px", lineHeight: 1.45, margin: "14px 0 0", textAlign: "justify", textIndent: "1.5em" }}>
        <em>What this session found.</em> Correct identification of true propositions ran at {cls.TT[0]}% uninterrupted and {cls.TT[1]}% interrupted; of false propositions, {cls.FF[0]}% and {cls.FF[1]}%. Under interruption, false propositions were called true {cls.FT[1]}% of the time and true propositions called false {cls.TF[1]}% of the time. {verdict} Each participant sees only two interrupted items of each kind, so each interrupted cell rests on {2 * subjects.length} responses.
      </p>
    </figure>
  );
}
