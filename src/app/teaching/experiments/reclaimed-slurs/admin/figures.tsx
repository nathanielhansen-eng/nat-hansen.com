"use client";

import { useState } from "react";
import { TERMS, type Term } from "@/lib/reclaimed-slurs";
import pilot from "../pilot-reference.json";
import { INK, MUTED, SANS, TIGHT } from "../design";
import { density, mean, quantile, sd } from "./stats";

export const FIG_FONT = SANS;

export interface ViolinData {
  label: string;
  fill: string;
  n: number;
  mean: number;
  q: number[];
  /** Normalized density on GRID (max 1); null draws points only. */
  density: number[] | null;
  points?: number[];
  /** Hollow reference diamond (e.g. the pilot mean for the same question). */
  refMean?: number;
}

const GRID: number[] = pilot.grid;

export function summarize(label: string, fill: string, v: number[], refMean?: number): ViolinData {
  return {
    label,
    fill,
    n: v.length,
    mean: v.length ? mean(v) : NaN,
    q: v.length ? [0.25, 0.5, 0.75].map((p) => quantile(v, p)) : [],
    density: v.length >= 4 && sd(v) > 0 ? density(v, GRID) : null,
    points: v,
    refMean,
  };
}

export function fromPilot(label: string, fill: string, s: { n: number; mean: number; q: number[]; density: number[] }): ViolinData {
  return { label, fill, n: s.n, mean: s.mean, q: s.q, density: s.density };
}

// One panel in the idiom of the pilot's ggplot figures: theme_bw grid,
// grey zero line, violins trimmed to the data range with dotted quartiles
// and a white diamond at the mean.
export function ViolinFigure({ violins, yLabel, xLabel }: { violins: ViolinData[]; yLabel: string; xLabel: string }) {
  const W = 600;
  const H = 400;
  const m = { l: 62, r: 12, t: 12, b: 56 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const y = (v: number) => m.t + ((55 - v) / 110) * ph;
  const slot = pw / violins.length;
  const half = slot * 0.36;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", fontFamily: FIG_FONT }}>
      <rect x={m.l} y={m.t} width={pw} height={ph} fill="#FFF" stroke="#333" strokeWidth={0.8} />
      {Array.from({ length: 21 }, (_, i) => -50 + i * 5).map((v) => (
        <line key={v} x1={m.l} x2={m.l + pw} y1={y(v)} y2={y(v)} stroke="#EBEBEB" strokeWidth={v % 10 === 0 ? 1.1 : 0.55} />
      ))}
      {violins.map((_, i) => (
        <line key={i} x1={m.l + slot * (i + 0.5)} x2={m.l + slot * (i + 0.5)} y1={m.t} y2={m.t + ph} stroke="#EBEBEB" strokeWidth={1.1} />
      ))}
      <line x1={m.l} x2={m.l + pw} y1={y(0)} y2={y(0)} stroke="#B3B3B3" strokeWidth={1.2} />
      {Array.from({ length: 11 }, (_, i) => -50 + i * 10).map((v) => (
        <g key={v}>
          <line x1={m.l - 4} x2={m.l} y1={y(v)} y2={y(v)} stroke="#333" strokeWidth={0.8} />
          <text x={m.l - 7} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#4D4D4D">
            {v}
          </text>
        </g>
      ))}
      <text transform={`translate(18 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize={15} fill="#000">
        {yLabel}
      </text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize={15} fill="#000">
        {xLabel}
      </text>

      {violins.map((v, i) => {
        const cx = m.l + slot * (i + 0.5);
        const lo = v.points && v.points.length ? Math.min(...v.points) : -50;
        const hi = v.points && v.points.length ? Math.max(...v.points) : 50;
        let path = "";
        if (v.density) {
          // Trim to the observed range, as geom_violin(trim = TRUE) does.
          const idx = GRID.map((g, k) => k).filter((k) => !v.points || (GRID[k] >= lo - 1 && GRID[k] <= hi + 1));
          const right = idx.map((k) => `${cx + v.density![k] * half},${y(GRID[k])}`);
          const left = [...idx].reverse().map((k) => `${cx - v.density![k] * half},${y(GRID[k])}`);
          path = `M${right.join("L")}L${left.join("L")}Z`;
        }
        const widthAt = (val: number) => {
          if (!v.density) return half * 0.5;
          const k = Math.min(GRID.length - 1, Math.max(0, Math.round((val + 50) / 2)));
          return v.density[k] * half;
        };
        return (
          <g key={v.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={cx - slot / 2} y={m.t} width={slot} height={ph} fill="transparent" />
            {v.density && <path d={path} fill={v.fill} stroke="#333" strokeWidth={1.2} />}
            {v.density &&
              v.q.map((qv, k) => (
                <line
                  key={k}
                  x1={cx - widthAt(qv)}
                  x2={cx + widthAt(qv)}
                  y1={y(qv)}
                  y2={y(qv)}
                  stroke="#4D4D4D"
                  strokeWidth={1.4}
                  strokeDasharray="1.5 4"
                />
              ))}
            {v.points &&
              v.points.map((p, k) => (
                <circle
                  key={k}
                  cx={cx + ((((k * 7919) % 97) / 97) - 0.5) * 1.5 * widthAt(p)}
                  cy={y(p)}
                  r={2.6}
                  fill={v.density ? "rgba(255,255,255,0.75)" : v.fill}
                  stroke="#333"
                  strokeWidth={0.6}
                />
              ))}
            {v.refMean !== undefined && (
              <rect
                x={cx - 6}
                y={y(v.refMean) - 6}
                width={12}
                height={12}
                transform={`rotate(45 ${cx} ${y(v.refMean)})`}
                fill="none"
                stroke="#777"
                strokeWidth={1.3}
                strokeDasharray="2 2"
              />
            )}
            {Number.isFinite(v.mean) && (
              <rect
                x={cx - 7}
                y={y(v.mean) - 7}
                width={14}
                height={14}
                transform={`rotate(45 ${cx} ${y(v.mean)})`}
                fill="#FFF"
                stroke="#333"
                strokeWidth={1.2}
              />
            )}
            <line x1={cx} x2={cx} y1={m.t + ph} y2={m.t + ph + 4} stroke="#333" strokeWidth={0.8} />
            <text x={cx} y={m.t + ph + 19} textAnchor="middle" fontSize={13} fill="#4D4D4D">
              {v.label}
            </text>
            <text x={cx} y={m.t + ph + 34} textAnchor="middle" fontSize={11} fill="#888">
              n = {v.n}
            </text>
            {hover === i && Number.isFinite(v.mean) && (
              <g>
                <rect x={cx - 62} y={m.t + 6} width={124} height={38} fill="#FFF" stroke="#999" />
                <text x={cx} y={m.t + 21} textAnchor="middle" fontSize={11} fill="#000">
                  mean {v.mean.toFixed(2)}
                </text>
                {v.q.length === 3 && (
                  <text x={cx} y={m.t + 36} textAnchor="middle" fontSize={11} fill="#555">
                    Q1 {v.q[0].toFixed(1)} · Md {v.q[1].toFixed(1)} · Q3 {v.q[2].toFixed(1)}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface DumbbellRow {
  term: Term;
  a: number | null;
  b: number | null;
  /** Right-margin annotation, e.g. "Δ +12.4 · p = .003". */
  note?: string;
}

// One row per term on the shared -50..50 axis: two means joined by a rule, in
// the Hydrosemantics manner (multiplied circles, black rules, close-set type).
export function DumbbellFigure({
  rows,
  aLabel,
  bLabel,
  aColor,
  bColor,
}: {
  rows: DumbbellRow[];
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
}) {
  const W = 640;
  const rowH = 54;
  const m = { l: 92, r: 170, t: 44, b: 34 };
  const pw = W - m.l - m.r;
  const H = m.t + rows.length * rowH + m.b;
  const x = (v: number) => m.l + ((v + 50) / 100) * pw;
  const ticks = [-50, -25, 0, 25, 50];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: "760px", height: "auto", display: "block", fontFamily: SANS }}
    >
      <g fontSize={13} fontWeight={700} letterSpacing={TIGHT}>
        <circle cx={m.l + 8} cy={16} r={8} fill={aColor} style={{ mixBlendMode: "multiply" }} />
        <text x={m.l + 22} y={21} fill={INK}>{aLabel}</text>
        <circle cx={m.l + 230} cy={16} r={8} fill={bColor} style={{ mixBlendMode: "multiply" }} />
        <text x={m.l + 244} y={21} fill={INK}>{bLabel}</text>
      </g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={m.t - 6} y2={H - m.b} stroke={t === 0 ? INK : "#DDD"} strokeWidth={t === 0 ? 2 : 1} />
          <text x={x(t)} y={H - m.b + 18} textAnchor="middle" fontSize={12} fill={MUTED}>
            {t > 0 ? `+${t}` : t}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cy = m.t + i * rowH + rowH / 2;
        return (
          <g key={r.term}>
            <line x1={m.l} x2={m.l + pw} y1={cy + rowH / 2} y2={cy + rowH / 2} stroke="#EEE" />
            <text x={m.l - 12} y={cy + 6} textAnchor="end" fontSize={17} fontWeight={700} letterSpacing={TIGHT} fill={INK}>
              {r.term}
            </text>
            {r.a !== null && r.b !== null && (
              <line x1={x(r.a)} x2={x(r.b)} y1={cy} y2={cy} stroke={INK} strokeWidth={3} />
            )}
            {r.a !== null && <circle cx={x(r.a)} cy={cy} r={13} fill={aColor} style={{ mixBlendMode: "multiply" }} />}
            {r.b !== null && <circle cx={x(r.b)} cy={cy} r={13} fill={bColor} style={{ mixBlendMode: "multiply" }} />}
            <text x={m.l + pw + 14} y={cy + 5} fontSize={13} fill={INK} letterSpacing="-0.01em">
              {r.note ?? (r.a === null ? "—" : "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const ALL_TERMS = TERMS;
