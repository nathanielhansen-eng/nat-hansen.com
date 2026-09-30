"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CHIPS, ROWS, byCnum } from "../chips";
import { loadYourChart, type YourChart } from "../yourChart";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  well: "#FAFAF9",
};
/** Same neutral surround as ChipGrid: the mount is part of the viewing condition. */
const MOUNT = "#9C9C9C";
const MOUNT_RGB = [0x9c, 0x9c, 0x9c];

/** A word counts as one of a language's main colour words if it is the most
 * common name for at least this many chips. */
const MAJOR = 3;
/** Berlin & Kay's one speaker per language named only part of the chart, so
 * there any chip won counts. */
const threshold = (ds: Board["ds"]) => (ds === "wcs" ? MAJOR : 1);

/* ------------------------------ data shapes ------------------------------ */

type RawLang = {
  id: number;
  name: string;
  place: string;
  n: number;
  /** [abbr, transcription, total uses, chips won, swatch cnum] */
  terms: [string, string, number, number, number][];
  /** indexed by cnum: flat [termIndex, count, ...], most votes first */
  grid: number[][];
  /** per term: [cnum, weight] best-example picks */
  foci: [number, number][][];
};

/** One chart on the Munsell array, whoever drew it. */
interface Board {
  key: string;
  name: string;
  meta: string;
  n: number;
  terms: { label: string; swatch: number; won: number; uses: number }[];
  grid: number[][];
  foci: [number, number][][];
  major: number;
  ds: "wcs" | "bk" | "you";
}

function fromRaw(l: RawLang, ds: "wcs" | "bk"): Board {
  const major = l.terms.filter((t) => t[3] >= threshold(ds)).length;
  const src = ds === "bk" ? "Berlin & Kay 1969 · 1 speaker" : `${l.place ? l.place + " · " : ""}${l.n} speakers`;
  return {
    key: `${ds}:${l.id}`,
    name: l.name,
    meta: `${src} · ${major} main colour words`,
    n: l.n,
    terms: l.terms.map((t) => ({ label: t[1] || t[0], swatch: t[4], won: t[3], uses: t[2] })),
    grid: l.grid,
    foci: l.foci,
    major,
    ds,
  };
}

/** Turn the participant's chart into the same shape as a one-speaker language.
 * Where two of their words claim a chip, it is painted with the word whose best
 * example lies nearest (hue columns wrap around). */
function fromYours(y: YourChart): Board {
  const terms = y.terms.filter((t) => t.chips.length);
  const dist = (a: number, b: number) => {
    const A = byCnum[a], B = byCnum[b];
    const dr = ROWS.indexOf(A.row as (typeof ROWS)[number]) - ROWS.indexOf(B.row as (typeof ROWS)[number]);
    let dc = Math.abs(A.col - B.col);
    if (A.col && B.col) dc = Math.min(dc, 40 - dc);
    else dc = A.col || B.col ? 3 : 0; // neutral vs chromatic: a fixed step
    return dr * dr + dc * dc;
  };
  const grid: number[][] = Array.from({ length: 331 }, () => []);
  for (let c = 1; c <= 330; c++) {
    const claim = terms.map((t, i) => i).filter((i) => terms[i].chips.includes(c));
    claim.sort((a, b) => dist(c, terms[a].focal ?? c) - dist(c, terms[b].focal ?? c));
    grid[c] = claim.flatMap((i) => [i, 1]);
  }
  const won = terms.map((_, i) => grid.filter((g) => g[0] === i).length);
  return {
    key: "you",
    name: `Your chart · ${y.language}`,
    meta: `You · ${terms.length} colour word${terms.length === 1 ? "" : "s"}`,
    n: 1,
    terms: terms.map((t, i) => ({ label: t.term, swatch: t.focal ?? t.chips[0], won: won[i], uses: t.chips.length })),
    grid,
    foci: terms.map((t) => (t.focal ? [[t.focal, 1] as [number, number]] : [])),
    major: terms.length,
    ds: "you",
  };
}

/* -------------------------------- drawing -------------------------------- */

const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (a: number[]) => `rgb(${a.join(",")})`;
const mix = (a: number[], t: number) => a.map((v, k) => Math.round(v * t + MOUNT_RGB[k] * (1 - t)));

function geom(W: number) {
  const gutter = W * 0.012;
  const cell = (W - gutter) / 41;
  return { cell, gutter, H: cell * 10 };
}
type Geom = ReturnType<typeof geom>;
function cellXY(g: Geom, row: string, col: number) {
  return [col === 0 ? 0 : g.gutter + col * g.cell, ROWS.indexOf(row as (typeof ROWS)[number]) * g.cell];
}
function chipAt(g: Geom, x: number, y: number): number | null {
  if (y < 0 || y >= g.H || x < 0) return null;
  const row = ROWS[Math.floor(y / g.cell)];
  let col: number;
  if (x < g.cell) col = 0;
  else if (x < g.gutter + g.cell) return null;
  else col = Math.floor((x - g.gutter) / g.cell);
  const chip = CHIPS.find((c) => c.row === row && c.col === col);
  return chip ? chip.cnum : null;
}

interface DrawOpts {
  mode: "named" | "chips";
  fade: boolean;
  sel: number;
  hover: number | null;
  gapFrac: number;
}

function draw(cv: HTMLCanvasElement, b: Board, o: DrawOpts): Geom {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth;
  const g = geom(W);
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(g.H * dpr);
  cv.style.height = `${g.H}px`;
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, g.H);
  const gap = Math.max(0.5, g.cell * o.gapFrac);
  for (const chip of CHIPS) {
    const [x, y] = cellXY(g, chip.row, chip.col);
    const v = b.grid[chip.cnum] ?? [];
    let col: number[] | null;
    if (o.sel >= 0) {
      const k = v.findIndex((t, i) => i % 2 === 0 && t === o.sel);
      const share = k >= 0 ? v[k + 1] / b.n : 0;
      col = mix(hexRGB(chip.hex), share ? 0.25 + 0.75 * share : 0);
    } else if (o.mode === "chips") col = hexRGB(chip.hex);
    else if (!v.length) col = null;
    else {
      col = hexRGB(byCnum[b.terms[v[0]].swatch].hex);
      if (o.fade && b.n > 1) col = mix(col, Math.min(1, 0.15 + (v[1] / b.n) * 1.05));
    }
    ctx.fillStyle = col ? rgb(col) : "rgba(0,0,0,0.1)";
    ctx.fillRect(x + gap / 2, y + gap / 2, g.cell - gap, g.cell - gap);
  }
  if (o.sel >= 0) {
    const f = b.foci[o.sel] ?? [];
    const mx = Math.max(1, ...f.map((p) => p[1]));
    ctx.fillStyle = C.text;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    for (const [cn, w] of f) {
      const ch = byCnum[cn];
      const [x, y] = cellXY(g, ch.row, ch.col);
      ctx.beginPath();
      ctx.arc(x + g.cell / 2, y + g.cell / 2, Math.max(2.5, (g.cell / 2 - 1.5) * Math.sqrt(w / mx)), 0, 7);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (o.hover != null) {
    const ch = byCnum[o.hover];
    const [x, y] = cellXY(g, ch.row, ch.col);
    ctx.strokeStyle = C.text;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, g.cell - 2, g.cell - 2);
  }
  return g;
}

/** Redraw a canvas whenever its inputs or its width change. */
function useCanvas(drawFn: (cv: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fn = useRef(drawFn);
  fn.current = drawFn;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    fn.current(cv);
    const ro = new ResizeObserver(() => fn.current(cv));
    ro.observe(cv);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/* -------------------------------- tooltip -------------------------------- */

type Tip = { x: number; y: number; cnum: number; board: Board } | null;

function Tooltip({ tip }: { tip: Tip }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!tip || !ref.current) return;
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    setPos({
      left: Math.min(window.innerWidth - w - 8, tip.x + 14),
      top: tip.y + 14 + h > window.innerHeight ? tip.y - h - 10 : tip.y + 14,
    });
  }, [tip]);
  if (!tip) return null;
  const { board: b, cnum } = tip;
  const chip = byCnum[cnum];
  const v = b.grid[cnum] ?? [];
  const rows: [number, number][] = [];
  for (let k = 0; k < v.length && k < 12; k += 2) rows.push([v[k], v[k + 1]]);
  const [hue, val] = chip.munsell.split(" ");
  const notation = chip.col === 0 ? `N ${val}` : `${hue.replace(".00", "").replace(".50", ".5")} ${val}`;
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 20,
        pointerEvents: "none",
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
        padding: "10px 12px",
        minWidth: "200px",
        maxWidth: "270px",
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: "15px",
        color: C.text,
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: rows.length ? "8px" : 0 }}>
        <span style={{ width: 28, height: 28, background: chip.hex, flex: "none" }} />
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>
            {chip.row}
            {chip.col} · {notation}
          </div>
          <div style={{ fontSize: "13px", color: C.muted }}>
            {b.ds === "you"
              ? rows.length
                ? "your words for this chip"
                : "none of your words"
              : !rows.length
                ? "not named in this source"
                : b.n > 1
                  ? `${b.n} speakers`
                  : "1 speaker"}
          </div>
        </div>
      </div>
      {rows.map(([ti, n]) => (
        <div
          key={ti}
          style={{ display: "grid", gridTemplateColumns: "12px minmax(0,1fr) 64px 26px", gap: "6px", alignItems: "center", marginTop: "3px" }}
        >
          <span style={{ width: 12, height: 12, background: byCnum[b.terms[ti].swatch].hex }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.terms[ti].label}</span>
          <span style={{ height: 6, background: C.border, display: "block" }}>
            <i style={{ display: "block", height: "100%", width: `${(100 * n) / b.n}%`, background: C.body }} />
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: C.muted, textAlign: "right" }}>
            {b.ds === "you" ? "" : n}
          </span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- panels --------------------------------- */

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const eyebrow: React.CSSProperties = { ...mono, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted };
const small: React.CSSProperties = { fontSize: "15px", lineHeight: 1.6, color: C.muted, margin: 0 };
const body: React.CSSProperties = { fontSize: "18px", lineHeight: 1.65, color: C.body, margin: 0, maxWidth: "66ch" };
const h2: React.CSSProperties = { fontSize: "26px", fontWeight: 400, lineHeight: 1.2, margin: 0, color: C.text, textWrap: "balance" };
const seg = (on: boolean): React.CSSProperties => ({
  ...mono,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "8px 14px",
  border: `1px solid ${on ? C.text : C.border}`,
  background: on ? C.text : "transparent",
  color: on ? C.bg : C.text,
  cursor: "pointer",
});

function BoardPanel({
  board,
  mode,
  fade,
  setTip,
  children,
}: {
  board: Board;
  mode: "named" | "chips";
  fade: boolean;
  setTip: (t: Tip) => void;
  children?: React.ReactNode;
}) {
  const [sel, setSel] = useState(-1);
  const [hover, setHover] = useState<number | null>(null);
  const [allTerms, setAllTerms] = useState(false);
  const g = useRef<Geom | null>(null);
  const ref = useCanvas(
    (cv) => {
      g.current = draw(cv, board, { mode, fade, sel, hover, gapFrac: 0.08 });
    },
    [board, mode, fade, sel, hover],
  );
  const at = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return g.current ? chipAt(g.current, e.clientX - r.left, e.clientY - r.top) : null;
  };
  const min = threshold(board.ds);
  const minor = board.terms.filter((t) => t.won < min).length;
  return (
    <div style={{ display: "grid", gap: "10px", alignContent: "start", minWidth: 0 }}>
      <div style={{ display: "grid", gap: "2px" }}>
        <h3 style={{ ...h2, fontSize: "24px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{board.name}</h3>
        <span style={{ ...mono, fontSize: "11px", color: C.muted }}>{board.meta}</span>
      </div>
      {children}
      <div style={{ background: MOUNT, padding: "8px" }}>
        <canvas
          ref={ref}
          style={{ display: "block", width: "100%", cursor: "crosshair" }}
          aria-label={`Munsell chart coloured by the colour words of ${board.name}`}
          onPointerMove={(e) => {
            const c = at(e);
            setHover(c);
            setTip(c == null ? null : { x: e.clientX, y: e.clientY, cnum: c, board });
          }}
          onPointerLeave={() => {
            setHover(null);
            setTip(null);
          }}
          onClick={(e) => {
            const c = at(e);
            const v = c == null ? [] : board.grid[c];
            if (!v.length) return;
            setSel(sel === v[0] ? -1 : v[0]);
            if (board.terms[v[0]].won < min) setAllTerms(true);
          }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {board.terms.map((t, i) =>
          !allTerms && t.won < min ? null : (
            <button
              key={i}
              onClick={() => setSel(sel === i ? -1 : i)}
              aria-pressed={sel === i}
              title={board.ds === "you" ? `${t.label}: ${t.uses} chips` : `${t.label}: most common name for ${t.won} chips`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "4px 9px 4px 4px",
                border: `1px solid ${sel === i ? C.text : C.border}`,
                background: sel === i ? C.well : C.surface,
                cursor: "pointer",
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: "16px",
                color: C.text,
              }}
            >
              <span style={{ width: 18, height: 18, background: byCnum[t.swatch].hex, flex: "none" }} />
              {t.label}
              <span style={{ ...mono, fontSize: "10px", color: C.muted }}>{board.ds === "you" ? t.uses : t.won}</span>
            </button>
          ),
        )}
        {minor > 0 && (
          <button
            onClick={() => setAllTerms(!allTerms)}
            style={{ ...small, fontSize: "14px", background: "none", border: 0, cursor: "pointer", textDecoration: "underline", padding: "4px" }}
          >
            {allTerms ? "main words only" : `+ ${minor} rarer`}
          </button>
        )}
      </div>
    </div>
  );
}

function Mini({ board, onPick, highlight }: { board: Board; onPick: () => void; highlight?: boolean }) {
  const ref = useCanvas((cv) => draw(cv, board, { mode: "named", fade: true, sel: -1, hover: null, gapFrac: 0.1 }), [board]);
  return (
    <button
      onClick={onPick}
      style={{ display: "grid", gap: "4px", background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: C.text, minWidth: 0 }}
    >
      <div style={{ background: MOUNT, padding: "3px", outline: highlight ? `2px solid ${C.text}` : undefined, outlineOffset: "2px" }}>
        <canvas ref={ref} style={{ display: "block", width: "100%" }} />
      </div>
      <span style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "15px" }}>
        <b style={{ fontWeight: highlight ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {highlight ? "Your chart" : board.name}
        </b>
        <span style={{ ...mono, fontSize: "10px", color: C.muted, flex: "none", alignSelf: "center" }}>
          {board.ds === "wcs" ? board.meta.split(" · ")[0].replace(/\d+ speakers/, "") : ""}
        </span>
      </span>
    </button>
  );
}

function FociPanel({ wcs, rings }: { wcs: Board[]; rings: { label: string; board: Board } }) {
  const dens = useMemo(() => {
    const d = new Float64Array(331);
    for (const l of wcs) for (const f of l.foci) for (const [c, w] of f) d[c] += w / l.n;
    return d;
  }, [wcs]);
  const dmax = Math.max(...dens);
  const g = useRef<Geom | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [info, setInfo] = useState<string>("");
  const ref = useCanvas(
    (cv) => {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth;
      const gg = geom(W);
      g.current = gg;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(gg.H * dpr);
      cv.style.height = `${gg.H}px`;
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = Math.max(0.5, gg.cell * 0.07);
      for (const ch of CHIPS) {
        const [x, y] = cellXY(gg, ch.row, ch.col);
        ctx.fillStyle = rgb(mix(hexRGB(ch.hex), 0.55));
        ctx.fillRect(x + gap / 2, y + gap / 2, gg.cell - gap, gg.cell - gap);
      }
      ctx.fillStyle = C.text;
      for (const ch of CHIPS) {
        const d = dens[ch.cnum];
        if (d < dmax * 0.01) continue;
        const [x, y] = cellXY(gg, ch.row, ch.col);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x + gg.cell / 2, y + gg.cell / 2, Math.max(1.2, (gg.cell / 2 - 1) * Math.sqrt(d / dmax)), 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 2;
      for (const f of rings.board.foci) {
        if (!f.length) continue;
        const xs = f.map(([c]) => cellXY(gg, byCnum[c].row, byCnum[c].col));
        const x0 = Math.min(...xs.map((p) => p[0])), y0 = Math.min(...xs.map((p) => p[1]));
        const x1 = Math.max(...xs.map((p) => p[0])) + gg.cell, y1 = Math.max(...xs.map((p) => p[1])) + gg.cell;
        ctx.beginPath();
        ctx.roundRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, gg.cell / 2);
        ctx.stroke();
      }
      if (hover != null) {
        const [x, y] = cellXY(gg, byCnum[hover].row, byCnum[hover].col);
        ctx.strokeRect(x + 1, y + 1, gg.cell - 2, gg.cell - 2);
      }
    },
    [dens, rings, hover],
  );
  const ringsAt = (c: number) =>
    rings.board.foci.flatMap((f, i) => (f.some(([x]) => x === c) ? [rings.board.terms[i].label] : []));
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ background: MOUNT, padding: "8px" }}>
        <canvas
          ref={ref}
          style={{ display: "block", width: "100%", cursor: "crosshair" }}
          aria-label="Density of best-example choices across the World Color Survey"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const c = g.current ? chipAt(g.current, e.clientX - r.left, e.clientY - r.top) : null;
            setHover(c);
            if (c == null) return setInfo("");
            const ch = byCnum[c];
            const own = ringsAt(c);
            setInfo(
              `${ch.row}${ch.col}: ${(dens[c] / wcs.length).toFixed(2)} best-example picks per language` +
                (own.length ? ` · ${rings.label}: ${own.join(", ")}` : ""),
            );
          }}
          onPointerLeave={() => {
            setHover(null);
            setInfo("");
          }}
        />
      </div>
      <p style={{ ...mono, fontSize: "11px", color: C.muted, margin: 0, minHeight: "1.6em" }}>
        {info || "Hover a chip for its count."}
      </p>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Atlas() {
  const [raw, setRaw] = useState<{ wcs: RawLang[]; bk: RawLang[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [yours, setYours] = useState<YourChart | null>(null);
  const [compareKey, setCompareKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"named" | "chips">("named");
  const [fade, setFade] = useState(true);
  const [dataset, setDataset] = useState<"wcs" | "bk">("wcs");
  const [ringsOf, setRingsOf] = useState<"english" | "you">("english");
  const [tip, setTip] = useState<Tip>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/teaching/experiments/wcs-atlas.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setYours(loadYourChart());
        setRaw(d);
      })
      .catch(() => setFailed(true));
  }, []);

  const boards = useMemo(
    () => (raw ? [...raw.wcs.map((l) => fromRaw(l, "wcs")), ...raw.bk.map((l) => fromRaw(l, "bk"))] : []),
    [raw],
  );
  const you = useMemo(() => (yours ? fromYours(yours) : null), [yours]);
  const english = boards.find((b) => b.ds === "bk" && b.name.startsWith("English"));

  // Default comparison: the respondent's own language if the survey has it,
  // otherwise English 1969 beside a chart, or a three-word language alone.
  const defaultKey = useMemo(() => {
    if (!boards.length) return null;
    const lang = yours?.language.trim().toLowerCase() ?? "";
    const match = lang && boards.find((b) => b.name.toLowerCase().startsWith(lang));
    const fallback = yours ? english : boards.find((b) => b.name === "Nafaanra");
    return (match || fallback || boards[0]).key;
  }, [boards, yours, english]);
  const compare = boards.find((b) => b.key === (compareKey ?? defaultKey));
  const multiples = useMemo(() => {
    const list = boards.filter((b) => b.ds === dataset);
    if (you) list.push(you);
    return list.sort((a, b) => a.major - b.major || (a.ds === "you" ? -1 : b.ds === "you" ? 1 : a.name.localeCompare(b.name)));
  }, [boards, dataset, you]);
  const groups = useMemo(() => {
    const m = new Map<number, Board[]>();
    for (const b of multiples) m.set(b.major, [...(m.get(b.major) ?? []), b]);
    return [...m.entries()];
  }, [multiples]);

  const card: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
    maxWidth: "1160px",
    width: "100%",
    padding: "clamp(16px, 3vw, 40px) clamp(14px, 3.5vw, 44px)",
    display: "grid",
    gap: "16px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Crimson Pro', Georgia, serif",
        color: C.text,
        padding: "clamp(10px, 3vw, 24px)",
        display: "grid",
        justifyItems: "center",
        gap: "20px",
        alignContent: "start",
      }}
    >
      <style>{FONTS}</style>
      <Tooltip tip={tip} />

      <div style={card} ref={top}>
        <div style={eyebrow}>Berlin &amp; Kay 1969 · World Color Survey 1976–80</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 400, lineHeight: 1.1, margin: 0 }}>World Color Survey Atlas</h1>
        <p style={body}>
          Fieldworkers showed speakers of 110 mostly unwritten languages the same 330 Munsell chips you just
          worked with, one at a time, and asked what each was called. Then they asked for the best example
          of each word. Berlin and Kay had done the same with one speaker each of twenty languages.
          {you ? " Your chart is on the left; pick any language to set beside it." : ""}
        </p>
        {!you && (
          <p style={small}>
            No chart of yours is saved in this browser.{" "}
            <Link href="/teaching/experiments/berlin-kay" style={{ color: C.text }}>
              Map your own colour words
            </Link>{" "}
            and it will appear here beside the survey.
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", alignItems: "center" }}>
          <select
            id="atlas-lang"
            value={compare?.key ?? ""}
            onChange={(e) => setCompareKey(e.target.value)}
            aria-label="Language to compare"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "17px", padding: "6px 10px", border: `1px solid ${C.border}`, background: C.well, maxWidth: "100%" }}
          >
            {(["wcs", "bk"] as const).map((ds) => (
              <optgroup key={ds} label={ds === "wcs" ? "World Color Survey" : "Berlin & Kay 1969"}>
                {boards
                  .filter((b) => b.ds === ds)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name} ({b.major})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <div style={{ display: "inline-flex" }}>
            <button style={seg(mode === "named")} onClick={() => setMode("named")}>
              Named
            </button>
            <button style={seg(mode === "chips")} onClick={() => setMode("chips")}>
              Actual chips
            </button>
          </div>
          <label style={{ ...small, display: "inline-flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
            <input id="atlas-fade" type="checkbox" checked={fade} onChange={(e) => setFade(e.target.checked)} /> Fade where speakers
            disagree
          </label>
        </div>

        {failed && <p style={{ ...small, color: "#B42318" }}>The survey data did not load. Reload the page to try again.</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: you ? "repeat(auto-fit, minmax(min(100%, 460px), 1fr))" : "minmax(0, 1fr)",
            gap: "28px",
          }}
        >
          {you && <BoardPanel board={you} mode={mode} fade={fade} setTip={setTip} />}
          {compare && <BoardPanel key={compare.key} board={compare} mode={mode} fade={fade} setTip={setTip} />}
        </div>
        <p style={small}>
          Each chip is painted with the best-example colour of the word most speakers used for it. Hover a chip to
          see how the answers split; click a chip or a word to see everywhere that word reaches, with dark discs on
          its best examples. The left column runs white to black; the 40 hue columns run red, yellow, green, blue,
          purple and back to red.
        </p>
      </div>

      <div style={card}>
        <div style={eyebrow}>Small multiples</div>
        <h2 style={h2}>Every language, sorted by how many colour words it has</h2>
        <p style={body}>
          A word counts here if it is the most common name for at least three chips (for Berlin and Kay&rsquo;s
          one-speaker charts, at least one). Languages with three words
          split the chart into light-warm, dark-cool and (usually) red. As words are added, the new boundaries tend
          to fall in the same places. That regularity is the core of Berlin and Kay&rsquo;s claim.
          {you ? " Your chart sits in the group matching the number of words you listed." : ""} Click any chart to
          set it beside yours.
        </p>
        <div style={{ display: "inline-flex", flexWrap: "wrap" }}>
          <button style={seg(dataset === "wcs")} onClick={() => setDataset("wcs")}>
            World Color Survey (110)
          </button>
          <button style={seg(dataset === "bk")} onClick={() => setDataset("bk")}>
            Berlin &amp; Kay 1969 (20)
          </button>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {groups.map(([k, list]) => (
            <div key={k} style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "baseline", borderBottom: `1px solid ${C.border}`, padding: "10px 0 4px" }}>
                <b style={{ fontWeight: 400, fontSize: "21px" }}>{k} words</b>
                <span style={{ ...small, fontSize: "14px" }}>
                  {list.filter((b) => b.ds !== "you").length} language{list.filter((b) => b.ds !== "you").length === 1 ? "" : "s"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "16px 14px" }}>
                {list.map((b) => (
                  <Mini
                    key={b.key}
                    board={b}
                    highlight={b.ds === "you"}
                    onPick={() => {
                      if (b.ds !== "you") setCompareKey(b.key);
                      top.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={eyebrow}>Best examples</div>
        <h2 style={h2}>Where the best examples land</h2>
        <p style={body}>
          Stack every best-example pick from every World Color Survey speaker and you get the dark discs below
          (each language weighted equally; bigger discs mean more picks). The rings mark{" "}
          {ringsOf === "you" && you ? "your own best examples" : "the best examples one American English speaker gave Berlin and Kay in 1969"}.
          Regier, Kay and Cook (2005) showed that the picks cluster far more tightly than chance would allow.
        </p>
        {you && (
          <div style={{ display: "inline-flex", flexWrap: "wrap" }}>
            <button style={seg(ringsOf === "english")} onClick={() => setRingsOf("english")}>
              Rings: English 1969
            </button>
            <button style={seg(ringsOf === "you")} onClick={() => setRingsOf("you")}>
              Rings: yours
            </button>
          </div>
        )}
        {english && (
          <FociPanel
            wcs={boards.filter((b) => b.ds === "wcs")}
            rings={ringsOf === "you" && you ? { label: "your word", board: you } : { label: "English 1969", board: english }}
          />
        )}
      </div>

      <div style={{ ...card, gap: "10px" }}>
        <div style={eyebrow}>Data &amp; method</div>
        <p style={small}>
          Data: the World Color Survey archive (Kay, Berlin, Maffi, Merrifield &amp; Cook; linguistics.berkeley.edu/wcs),
          including the digitised naming data from Appendix 1 of Berlin &amp; Kay&rsquo;s <em>Basic Color Terms</em>{" "}
          (1969). Survey languages have about 25 speakers each; the Berlin &amp; Kay languages have one speaker each,
          who named only some chips. Chip colours are the same screen approximations used in the experiment.
        </p>
        <p style={small}>
          A word&rsquo;s swatch is the chip speakers most often chose as its best example. On your chart, a chip that
          two of your words share is painted with the word whose best example is nearest. Your chart is stored only in
          this browser. Transcriptions follow the archive&rsquo;s dictionary files.
        </p>
        <p style={small}>
          <Link href="/teaching/experiments/berlin-kay" style={{ color: C.text }}>
            ← Back to the experiment
          </Link>
        </p>
      </div>
    </div>
  );
}
