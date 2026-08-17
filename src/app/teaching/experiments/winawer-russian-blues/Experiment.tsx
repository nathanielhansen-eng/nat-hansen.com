"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  cross: "#8C3A2E",
  within: "#4A6B4F",
  well: "#FDFAF5",
};

const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "52px 56px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
  },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: "12px",
  },
  h1: { fontSize: "34px", fontWeight: 400, lineHeight: 1.15, marginBottom: "28px", color: C.text },
  h2: { fontSize: "24px", fontWeight: 400, lineHeight: 1.2, marginBottom: "20px", color: C.text },
  body: { fontSize: "19px", lineHeight: 1.72, color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: 1.6, color: C.muted, marginBottom: "16px" },
  btn: {
    background: C.accent,
    color: C.bg,
    border: "none",
    padding: "13px 36px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "20px",
    display: "inline-block",
  },
  btnGhost: {
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: "13px 36px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "20px",
    display: "inline-block",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
  well: {
    fontSize: "17px",
    lineHeight: 1.7,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "22px 24px",
    marginBottom: "26px",
  },
  // Task screens run edge-to-edge on a plain field: no card chrome, nothing
  // that could cue the manipulation.
  stage: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
};

/* ------------------------------------------------------------------ *
 * Stimuli — reconstructed from Winawer, J., Witthoft, N., Frank, M. C.,
 * Wu, L., Wade, A. R., & Boroditsky, L. (2007), "Russian blues reveal
 * effects of language on color discrimination", PNAS 104(19), 7780–7785,
 * doi:10.1073/pnas.0701644104.
 *
 * The paper (p. 7784, "Color Stimuli") publishes only the two endpoints of
 * the 20-step continuum: "The Commission Internationale de l'Eclairage
 * (CIE) Yxy coordinates ranged from 84, 0.214, 0.255 (stimulus 1) to 5.3,
 * 0.154, 0.09 (stimulus 20)." The 18 intermediate chips and the display
 * white point are not published, so these sRGB values are a documented
 * RECONSTRUCTION, not the authors' own numbers:
 *
 *   1. (x, y) interpolated linearly across the 20 steps.
 *   2. Luminance rescaled so stimulus 1 sits on the sRGB gamut boundary
 *      (the published Y is evidently cd/m2, not relative luminance).
 *   3. Luminance interpolated linearly in CIE L*, not in Y — the design
 *      needs 2-step and 4-step comparisons to be comparably discriminable
 *      along the whole ramp. Cross-checked against the 20 swatch images
 *      embedded in the PDF of Fig. 1, whose channel values fall on a
 *      near-linear ramp, consistent with L*-linear and not with Y-linear.
 *   4. XYZ -> linear sRGB (D65) -> sRGB transfer function -> 8-bit.
 *
 * Full derivation, with the gamut and delta-E diagnostics, is in
 * docs/cold-experiments/winawer-russian-blues-spec.md, section 6.
 * ------------------------------------------------------------------ */
const STIMULI = [
  "#4BC6FF", "#46BCFB", "#41B3F7", "#3CAAF3", "#37A1EE",
  "#3298E9", "#2C90E4", "#2787DF", "#227ED9", "#1C76D4",
  "#166DCE", "#1065C7", "#085DC1", "#0154BA", "#004CB4",
  "#0044AD", "#003CA5", "#00349E", "#002C96", "#00248E",
] as const;

const hexOf = (id: number) => STIMULI[id - 1];

/** English-speaker group mean boundary in the paper was 8.6 (p. 7781), so the
 * fixed trial pool is centred between stimulus 8 and stimulus 9. Within- vs
 * cross-category is nevertheless RE-derived at analysis time against each
 * participant's own elicited boundary, as Winawer p. 7781 does. */
const NOMINAL_BOUNDARY = 8.5;

/** Near comparisons are 2 steps apart, far comparisons 4 steps (p. 7784). */
const NEAR_CROSS: [number, number][] = [[7, 9], [8, 10]];
const NEAR_WITHIN: [number, number][] = [[5, 7], [6, 8], [9, 11], [10, 12]];
const FAR_CROSS: [number, number][] = [[5, 9], [6, 10], [7, 11], [8, 12]];
const FAR_WITHIN: [number, number][] = [[3, 7], [4, 8], [9, 13], [10, 14]];

const TRIALS_PER_CELL = 6; // 4 cells x 6 = 24 trials per block, 72 in total
/** Which side the match sits on, per position within a design cell. Three left
 * and three right, in an order that does not line up with the match/distracter
 * role alternation for either the 2-pair or the 4-pair pools. */
const SIDE_PATTERN = [0, 1, 1, 0, 1, 0] as const;
const TRIALS_PER_PROBE = 8; // Winawer p. 7785: recall tested after eight trials
const PROBE_STUDY_MS = 3000; // "This series was presented for 3 sec" (p. 7785)
const ITI_MS = 400;
const RT_CEILING_MS = 3000; // p. 7782 exclusion criterion

type Interference = "none" | "verbal" | "spatial";
type Side = "left" | "right";
type InputMode = "key" | "pointer";
type ColorVision = "typical" | "atypical" | "unsure";

interface TrialSpec {
  block: number;
  interference: Interference;
  target: number;
  distractor: number;
  distance: 2 | 4;
  matchSide: Side;
  probeIndex: number;
}

interface VerbalProbe {
  kind: "verbal";
  digits: string;
  foil: string;
  foilFirst: boolean;
}
interface SpatialProbe {
  kind: "spatial";
  cells: number[];
  foil: number[];
  foilFirst: boolean;
}
type ProbeSpec = VerbalProbe | SpatialProbe;

type Step =
  | { kind: "blockIntro"; block: number; interference: Interference }
  | { kind: "probeStudy"; block: number; interference: "verbal" | "spatial"; probeIndex: number; probe: ProbeSpec }
  | { kind: "trial"; trial: TrialSpec }
  | { kind: "probeTest"; block: number; interference: "verbal" | "spatial"; probeIndex: number; probe: ProbeSpec };

interface RecordedTrial {
  block: number;
  interference: Interference;
  target: number;
  distractor: number;
  distance: 2 | 4;
  matchSide: Side;
  correct: boolean;
  rtMs: number;
  inputMode: InputMode;
  probeCorrect: boolean | null;
  probeIndex: number;
}

interface RecordedProbe {
  block: number;
  interference: "verbal" | "spatial";
  index: number;
  correct: boolean;
  rtMs: number;
}

interface NamingRow {
  id: number;
  dark: boolean;
  rtMs: number;
}

/* --------------------------- plan building --------------------------- */
// Everything below is called from click handlers only — never during render.

function shuffle<T>(a: T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildBlockTrials(block: number, interference: Interference): Omit<TrialSpec, "probeIndex">[] {
  const cells: { distance: 2 | 4; pool: [number, number][] }[] = [
    { distance: 2, pool: NEAR_CROSS },
    { distance: 2, pool: NEAR_WITHIN },
    { distance: 4, pool: FAR_CROSS },
    { distance: 4, pool: FAR_WITHIN },
  ];
  const out: Omit<TrialSpec, "probeIndex">[] = [];
  for (const cell of cells) {
    for (let i = 0; i < TRIALS_PER_CELL; i++) {
      const pair = cell.pool[i % cell.pool.length];
      // Winawer p. 7785: "Each color appeared equally often on the left and
      // right and equally often as the match and the distracter." Exact for
      // side (3 left / 3 right per cell, 12 / 12 per block) and for the
      // cross/within and near/far splits (6 each). Match-vs-distracter role is
      // alternated and decorrelated from side, but cannot be made exact:
      // drawing 6 trials from a 4-pair pool leaves stimuli 11 and 13 always in
      // the distracter role. See spec §7, D6.
      const role = (i + Math.floor(i / cell.pool.length)) % 2;
      const target = pair[role];
      const distractor = pair[1 - role];
      const matchSide: Side = SIDE_PATTERN[i] === 0 ? "left" : "right";
      out.push({ block, interference, target, distractor, distance: cell.distance, matchSide });
    }
  }
  return shuffle(out);
}

function makeVerbalProbe(): VerbalProbe {
  // "subjects were given an eight-digit number series to rehearse" (p. 7785)
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  // "a foil which differed by one digit" (p. 7785)
  const at = Math.floor(Math.random() * 8);
  let d = Math.floor(Math.random() * 10);
  while (String(d) === digits[at]) d = Math.floor(Math.random() * 10);
  const foil = digits.slice(0, at) + String(d) + digits.slice(at + 1);
  return { kind: "verbal", digits, foil, foilFirst: Math.random() < 0.5 };
}

function makeSpatialProbe(): SpatialProbe {
  // "a 4 x 4 square grid of which four random squares were shaded black"
  // ... "The incorrect grid differed in the location of one shaded square."
  const cells = shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, 4).sort((a, b) => a - b);
  const free = Array.from({ length: 16 }, (_, i) => i).filter((i) => !cells.includes(i));
  const drop = cells[Math.floor(Math.random() * cells.length)];
  const add = free[Math.floor(Math.random() * free.length)];
  const foil = cells.filter((c) => c !== drop).concat(add).sort((a, b) => a - b);
  return { kind: "spatial", cells, foil, foilFirst: Math.random() < 0.5 };
}

function buildPlan(): { steps: Step[]; order: Interference[] } {
  const order = shuffle<Interference>(["none", "verbal", "spatial"]);
  const steps: Step[] = [];
  let probeCounter = 0;
  order.forEach((interference, block) => {
    const trials = buildBlockTrials(block, interference);
    steps.push({ kind: "blockIntro", block, interference });
    if (interference === "none") {
      for (const t of trials) steps.push({ kind: "trial", trial: { ...t, probeIndex: -1 } });
      return;
    }
    for (let g = 0; g * TRIALS_PER_PROBE < trials.length; g++) {
      const probe = interference === "verbal" ? makeVerbalProbe() : makeSpatialProbe();
      const probeIndex = probeCounter++;
      steps.push({ kind: "probeStudy", block, interference, probeIndex, probe });
      for (const t of trials.slice(g * TRIALS_PER_PROBE, (g + 1) * TRIALS_PER_PROBE)) {
        steps.push({ kind: "trial", trial: { ...t, probeIndex } });
      }
      steps.push({ kind: "probeTest", block, interference, probeIndex, probe });
    }
  });
  return { steps, order };
}

/* ----------------------------- analysis ------------------------------ */

/** Winawer p. 7781: "Each subject's boundary was identified as the transition
 * point in these classification responses." Implemented as the cut that
 * misclassifies the fewest responses; ties resolved to the middle candidate.
 * The paper's RT-based tie-break for ambiguous transitions is not implemented
 * (see spec §7, D5) — instead the fit is flagged. */
function computeBoundary(naming: NamingRow[]): { boundary: number; ambiguous: boolean } {
  const dark = new Map<number, boolean>();
  for (const n of naming) dark.set(n.id, n.dark);
  let bestErr = Number.POSITIVE_INFINITY;
  let candidates: number[] = [];
  for (let c = 0.5; c <= 20.5; c += 1) {
    let err = 0;
    for (let id = 1; id <= 20; id++) {
      const d = dark.get(id);
      if (d === undefined) continue;
      if (id < c && d) err++;
      if (id > c && !d) err++;
    }
    if (err < bestErr) {
      bestErr = err;
      candidates = [c];
    } else if (err === bestErr) {
      candidates.push(c);
    }
  }
  const boundary = candidates.length ? candidates[(candidates.length - 1) >> 1] : NOMINAL_BOUNDARY;
  return { boundary, ambiguous: bestErr > 0 };
}

/** Winawer p. 7781–7782: cross-category if the two stimuli "fell on opposite
 * sides of the boundary or if one of the two stimuli was the boundary". */
function isCross(a: number, b: number, boundary: number): boolean {
  if (a === boundary || b === boundary) return true;
  return a < boundary !== b < boundary;
}

/** The paper's trial-level exclusions (p. 7782). */
function keepTrial(t: RecordedTrial): boolean {
  if (!t.correct) return false;
  if (t.rtMs > RT_CEILING_MS) return false;
  if (t.interference !== "none" && t.probeCorrect === false) return false;
  return true;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/* ------------------------------ practice ----------------------------- */
// Deliberately drawn from the ends of the continuum so the boundary region is
// not pre-exposed, and all four are far (4-step) comparisons.
const PRACTICE: { target: number; distractor: number; matchSide: Side }[] = [
  { target: 1, distractor: 5, matchSide: "left" },
  { target: 20, distractor: 16, matchSide: "right" },
  { target: 6, distractor: 2, matchSide: "right" },
  { target: 15, distractor: 19, matchSide: "left" },
];

const SQ = "clamp(62px, 19vw, 104px)";

function Swatch({ hex, size = SQ }: { hex: string; size?: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        background: hex,
        border: `1px solid ${C.border}`,
      }}
    />
  );
}

function Triad({
  target,
  left,
  right,
  dim,
  onPick,
}: {
  target: number;
  left: number;
  right: number;
  dim: boolean;
  onPick: (side: Side) => void;
}) {
  return (
    <div style={{ opacity: dim ? 0 : 1, transition: "opacity 90ms linear" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "38px" }}>
        <Swatch hex={hexOf(target)} />
      </div>
      <div style={{ display: "flex", gap: "clamp(24px, 8vw, 56px)", justifyContent: "center" }}>
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            onClick={() => onPick(side)}
            aria-label={side === "left" ? "Left square (F)" : "Right square (J)"}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "block",
            }}
          >
            <Swatch hex={hexOf(side === "left" ? left : right)} />
            <span
              style={{
                ...base.mono,
                display: "block",
                marginTop: "12px",
                fontSize: "12px",
                letterSpacing: "0.14em",
                color: C.muted,
                textAlign: "center",
              }}
            >
              {side === "left" ? "F" : "J"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Grid({ cells }: { cells: number[] }) {
  const on = new Set(cells);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, clamp(30px, 9vw, 44px))",
        gap: "3px",
        background: C.border,
        padding: "3px",
        border: `1px solid ${C.border}`,
      }}
    >
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          style={{
            display: "block",
            aspectRatio: "1 / 1",
            background: on.has(i) ? C.text : C.surface,
          }}
        />
      ))}
    </div>
  );
}

const perfNow = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

type Phase =
  | "intro"
  | "instructions"
  | "practice"
  | "ready"
  | "run"
  | "namingIntro"
  | "naming"
  | "background"
  | "debrief";

export default function Experiment({
  session,
  tag = null,
}: {
  session: string;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [plan, setPlan] = useState<Step[]>([]);
  const [blockOrder, setBlockOrder] = useState<Interference[]>([]);
  const [namingOrder, setNamingOrder] = useState<number[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [namingIdx, setNamingIdx] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "no" | null>(null);
  const [iti, setIti] = useState(false);

  const [trials, setTrials] = useState<RecordedTrial[]>([]);
  const [probes, setProbes] = useState<RecordedProbe[]>([]);
  const [naming, setNaming] = useState<NamingRow[]>([]);
  const [colorVision, setColorVision] = useState<ColorVision | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  const shownAtRef = useRef(0);
  const lockRef = useRef(false);

  const step: Step | undefined = phase === "run" ? plan[stepIdx] : undefined;

  // Restamp the response clock whenever a new response screen appears. Kept in
  // an effect (not render, not a useState initialiser) so nothing impure runs
  // during render.
  useEffect(() => {
    shownAtRef.current = perfNow();
    lockRef.current = false;
  }, [phase, stepIdx, practiceIdx, namingIdx]);

  // Interference stimulus is shown for a fixed 3 s (Winawer p. 7785).
  useEffect(() => {
    if (!step || step.kind !== "probeStudy") return;
    const id = window.setTimeout(() => setStepIdx((i) => i + 1), PROBE_STUDY_MS);
    return () => window.clearTimeout(id);
  }, [step]);

  // Advancing past the last step ends the run. Done here rather than in an
  // effect watching stepIdx, so the phase change is driven by the response
  // that caused it.
  const advance = useCallback(
    (next: number) => {
      if (next >= plan.length) setPhase("namingIntro");
      else setStepIdx(next);
    },
    [plan.length]
  );

  const respond = useCallback(
    (side: Side, mode: InputMode) => {
      if (lockRef.current) return;
      const rt = Math.round(perfNow() - shownAtRef.current);

      if (phase === "practice") {
        const p = PRACTICE[practiceIdx];
        if (!p) return;
        lockRef.current = true;
        setFeedback(side === p.matchSide ? "ok" : "no");
        window.setTimeout(() => {
          setFeedback(null);
          if (practiceIdx + 1 >= PRACTICE.length) setPhase("ready");
          else setPracticeIdx((i) => i + 1);
        }, 750);
        return;
      }

      if (phase === "naming") {
        const id = namingOrder[namingIdx];
        if (id === undefined) return;
        lockRef.current = true;
        setNaming((rows) => [...rows, { id, dark: side === "right", rtMs: rt }]);
        if (namingIdx + 1 >= namingOrder.length) setPhase("background");
        else setNamingIdx((i) => i + 1);
        return;
      }

      if (phase !== "run") return;
      const cur = plan[stepIdx];
      if (!cur) return;

      if (cur.kind === "trial") {
        lockRef.current = true;
        const t = cur.trial;
        setTrials((prev) => [
          ...prev,
          {
            block: t.block,
            interference: t.interference,
            target: t.target,
            distractor: t.distractor,
            distance: t.distance,
            matchSide: t.matchSide,
            correct: side === t.matchSide,
            rtMs: rt,
            inputMode: mode,
            probeCorrect: null,
            probeIndex: t.probeIndex,
          },
        ]);
        setIti(true);
        window.setTimeout(() => {
          setIti(false);
          advance(stepIdx + 1);
        }, ITI_MS);
        return;
      }

      if (cur.kind === "probeTest") {
        lockRef.current = true;
        const chosenFirst = side === "left";
        const correct = chosenFirst !== cur.probe.foilFirst;
        setProbes((prev) => [
          ...prev,
          {
            block: cur.block,
            interference: cur.interference,
            index: cur.probeIndex,
            correct,
            rtMs: rt,
          },
        ]);
        // Back-fill onto the eight trials this probe covered, so every trial
        // record carries the exclusion flag Winawer p. 7782 needs.
        setTrials((prev) =>
          prev.map((tr) => (tr.probeIndex === cur.probeIndex ? { ...tr, probeCorrect: correct } : tr))
        );
        advance(stepIdx + 1);
      }
    },
    [phase, practiceIdx, namingIdx, namingOrder, stepIdx, plan, advance]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k !== "f" && k !== "j") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      respond(k === "f" ? "left" : "right", "key");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [respond]);

  const begin = (now: number) => {
    const built = buildPlan();
    setPlan(built.steps);
    setBlockOrder(built.order);
    setNamingOrder(shuffle(Array.from({ length: 20 }, (_, i) => i + 1)));
    setStartedAt(now);
    setPhase("instructions");
  };

  const boundaryFit = useMemo(() => computeBoundary(naming), [naming]);

  const send = async (cv: ColorVision | null) => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      blockOrder,
      trials: trials.map(({ probeIndex, ...t }) => {
        void probeIndex;
        return t;
      }),
      probes,
      naming,
      boundary: boundaryFit.boundary,
      boundaryAmbiguous: boundaryFit.ambiguous,
      colorVision: cv,
    };
    try {
      const r = await fetch("/api/experiments/winawer-russian-blues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(r.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
    setPhase("debrief");
    setSubmitting(false);
  };

  /* ------------------------------ INTRO ------------------------------ */
  if (phase === "intro") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Winawer et al. 2007</div>
          <h1 style={base.h1}>Telling blues apart</h1>
          <p style={base.body}>
            You will see a coloured square with two squares beneath it. One of the two matches the
            one on top exactly. Your job is to say which, as quickly and accurately as you can.
          </p>
          <p style={base.body}>
            There are 72 of these, in three short stretches, and then twenty quick colour
            judgements. It takes about four or five minutes. Some stretches ask you to hold
            something in mind while you do the colour task.
          </p>
          <p style={base.small}>
            Your responses are recorded anonymously — no name, no login, nothing that identifies
            you. What is recorded is which square you picked and how long you took. Afterwards you
            will see what the original 2007 study found.
          </p>
          <p style={base.small}>
            Best on a laptop with a keyboard, in ordinary room light. If your screen has night
            mode or automatic brightness turned on, turning it off will make the colours truer.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button style={base.btn} onClick={() => begin(Date.now())}>
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- INSTRUCTIONS -------------------------- */
  if (phase === "instructions") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>How it works</div>
          <h2 style={base.h2}>Which one matches?</h2>
          <div style={{ ...base.well, textAlign: "center", padding: "34px 24px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "26px" }}>
              <Swatch hex={hexOf(9)} size="clamp(52px, 15vw, 76px)" />
            </div>
            <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
              <Swatch hex={hexOf(9)} size="clamp(52px, 15vw, 76px)" />
              <Swatch hex={hexOf(11)} size="clamp(52px, 15vw, 76px)" />
            </div>
          </div>
          <p style={base.body}>
            Press <strong>F</strong>{" "}for the left square, <strong>J</strong>{" "}for the right one.
            On a touchscreen, tap the square instead.
          </p>
          <p style={base.body}>
            Go as fast as you can while still getting it right. All three squares stay on screen
            until you answer, so there is nothing to memorise — just look and choose.
          </p>
          <p style={base.small}>Four practice rounds next, with feedback.</p>
          <button style={base.btn} onClick={() => setPhase("practice")}>
            Practice &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- PRACTICE ---------------------------- */
  if (phase === "practice") {
    const p = PRACTICE[practiceIdx];
    const left = p.matchSide === "left" ? p.target : p.distractor;
    const right = p.matchSide === "left" ? p.distractor : p.target;
    return (
      <div style={base.stage}>
        <style>{FONTS}</style>
        <div style={{ ...base.eyebrow, marginBottom: "34px" }}>
          Practice {practiceIdx + 1} / {PRACTICE.length}
        </div>
        <Triad
          target={p.target}
          left={left}
          right={right}
          dim={false}
          onPick={(side) => respond(side, "pointer")}
        />
        <div
          style={{
            ...base.mono,
            marginTop: "34px",
            height: "20px",
            fontSize: "13px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: feedback === "ok" ? C.within : C.cross,
          }}
        >
          {feedback === "ok" ? "Correct" : feedback === "no" ? "Not that one" : ""}
        </div>
      </div>
    );
  }

  /* ------------------------------ READY ------------------------------ */
  if (phase === "ready") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Ready</div>
          <h2 style={base.h2}>Here we go</h2>
          <p style={base.body}>
            Three stretches of 24 rounds each. Before two of them you will be given something to
            hold in mind while you work — you will be asked about it afterwards.
          </p>
          <p style={base.small}>
            Try not to pause between rounds. If you are unsure, pick the one that looks closest and
            keep going.
          </p>
          <button style={base.btn} onClick={() => setPhase("run")}>
            Start &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------- RUN ------------------------------- */
  if (phase === "run") {
    // The last response leaves stepIdx past the end for one commit, until the
    // effect above advances the phase. Render a blank stage, never the debrief.
    if (!step) {
      return (
        <div style={base.stage}>
          <style>{FONTS}</style>
        </div>
      );
    }
    if (step.kind === "blockIntro") {
      const label =
        step.interference === "none"
          ? "Just the colour task"
          : step.interference === "verbal"
            ? "Hold a number in mind"
            : "Hold a pattern in mind";
      const detail =
        step.interference === "none" ? (
          <p style={base.body}>
            This stretch is the colour task on its own. 24 rounds. Nothing else to remember.
          </p>
        ) : step.interference === "verbal" ? (
          <p style={base.body}>
            You will be shown an eight-digit number for three seconds. Keep repeating it silently
            to yourself while you do the next eight colour rounds, then you will be shown two
            numbers and asked which one you were given. This happens three times.
          </p>
        ) : (
          <p style={base.body}>
            You will be shown a grid with four shaded squares for three seconds. Hold a picture of
            it in your mind while you do the next eight colour rounds, then you will be shown two
            grids and asked which one you were given. This happens three times.
          </p>
        );
      return (
        <div style={base.wrap}>
          <style>{FONTS}</style>
          <div style={base.card}>
            <div style={base.eyebrow}>Stretch {step.block + 1} of 3</div>
            <h2 style={base.h2}>{label}</h2>
            {detail}
            <button style={base.btn} onClick={() => setStepIdx((i) => i + 1)}>
              Continue &rarr;
            </button>
          </div>
        </div>
      );
    }

    if (step.kind === "probeStudy") {
      return (
        <div style={base.stage}>
          <style>{FONTS}</style>
          <div style={{ ...base.eyebrow, marginBottom: "34px" }}>
            {step.probe.kind === "verbal" ? "Remember this number" : "Remember this pattern"}
          </div>
          {step.probe.kind === "verbal" ? (
            <div
              style={{
                ...base.mono,
                fontSize: "clamp(30px, 9vw, 46px)",
                letterSpacing: "0.22em",
                color: C.text,
              }}
            >
              {step.probe.digits}
            </div>
          ) : (
            <Grid cells={step.probe.cells} />
          )}
        </div>
      );
    }

    if (step.kind === "trial") {
      const t = step.trial;
      const left = t.matchSide === "left" ? t.target : t.distractor;
      const right = t.matchSide === "left" ? t.distractor : t.target;
      return (
        <div style={base.stage}>
          <style>{FONTS}</style>
          <div style={{ ...base.eyebrow, marginBottom: "34px" }}>
            {trials.length + 1} / {TRIALS_PER_CELL * 4 * 3}
          </div>
          <Triad
            target={t.target}
            left={left}
            right={right}
            dim={iti}
            onPick={(side) => respond(side, "pointer")}
          />
          <div style={{ height: "54px" }} />
        </div>
      );
    }

    // probeTest
    const first = step.probe.foilFirst;
    const optionFor = (side: Side) => {
      const isFirst = side === "left";
      if (step.probe.kind === "verbal") {
        return isFirst === first ? step.probe.foil : step.probe.digits;
      }
      return isFirst === first ? step.probe.foil : step.probe.cells;
    };
    return (
      <div style={base.stage}>
        <style>{FONTS}</style>
        <div style={{ ...base.eyebrow, marginBottom: "30px" }}>
          {step.probe.kind === "verbal" ? "Which number were you given?" : "Which pattern were you given?"}
        </div>
        <div
          style={{
            display: "flex",
            gap: "clamp(20px, 7vw, 48px)",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {(["left", "right"] as const).map((side) => {
            const val = optionFor(side);
            return (
              <button
                key={side}
                onClick={() => respond(side, "pointer")}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  padding: "20px 22px",
                  cursor: "pointer",
                  display: "block",
                }}
              >
                {typeof val === "string" ? (
                  <span
                    style={{
                      ...base.mono,
                      fontSize: "clamp(18px, 5vw, 26px)",
                      letterSpacing: "0.16em",
                      color: C.text,
                    }}
                  >
                    {val}
                  </span>
                ) : (
                  <Grid cells={val as number[]} />
                )}
                <span
                  style={{
                    ...base.mono,
                    display: "block",
                    marginTop: "14px",
                    fontSize: "12px",
                    letterSpacing: "0.14em",
                    color: C.muted,
                    textAlign: "center",
                  }}
                >
                  {side === "left" ? "F" : "J"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* --------------------------- NAMING INTRO -------------------------- */
  if (phase === "namingIntro") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Colour task finished</div>
          <h2 style={base.h2}>One more thing</h2>
          <p style={base.body}>
            You will now see the twenty blues one at a time. For each one, say whether you would
            call it a <em>lighter</em>{" "}blue or a <em>darker</em>{" "}blue. There is no right answer
            — just your first reaction.
          </p>
          <p style={base.small}>
            Press <strong>F</strong>{" "}for lighter, <strong>J</strong>{" "}for darker, or tap a
            button. Twenty judgements, about half a minute.
          </p>
          <button style={base.btn} onClick={() => setPhase("naming")}>
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ NAMING ----------------------------- */
  if (phase === "naming") {
    const id = namingOrder[namingIdx];
    return (
      <div style={base.stage}>
        <style>{FONTS}</style>
        <div style={{ ...base.eyebrow, marginBottom: "34px" }}>
          {namingIdx + 1} / {namingOrder.length}
        </div>
        <Swatch hex={hexOf(id)} size="clamp(88px, 26vw, 132px)" />
        <div style={{ display: "flex", gap: "14px", marginTop: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              onClick={() => respond(side, "pointer")}
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
                padding: "14px 28px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {side === "left" ? "Lighter blue (F)" : "Darker blue (J)"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------------------- BACKGROUND --------------------------- */
  if (phase === "background") {
    const opts: { key: ColorVision; label: string }[] = [
      { key: "typical", label: "No — as far as I know my colour vision is typical" },
      { key: "atypical", label: "Yes — I have a diagnosed colour vision difference" },
      { key: "unsure", label: "I am not sure" },
    ];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>One last question &middot; optional</div>
          <h2 style={base.h2}>Colour vision</h2>
          <p style={base.small}>
            Asked after the task so it cannot influence your answers. It lets the class check
            whether the pattern holds when everyone sees the blues the same way. Skip it if you
            prefer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
            {opts.map((o) => (
              <button
                key={o.key}
                onClick={() => setColorVision(o.key)}
                aria-pressed={colorVision === o.key}
                style={{
                  textAlign: "left",
                  padding: "14px 18px",
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "18px",
                  cursor: "pointer",
                  background: colorVision === o.key ? C.accent : C.well,
                  color: colorVision === o.key ? C.bg : C.text,
                  border: `1px solid ${colorVision === o.key ? C.accent : C.border}`,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button style={base.btn} disabled={submitting} onClick={() => send(colorVision)}>
              {submitting ? "Sending…" : "Submit →"}
            </button>
            <button style={base.btnGhost} disabled={submitting} onClick={() => send(null)}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- DEBRIEF ----------------------------- */
  const kept = trials.filter(keepTrial);
  const b = boundaryFit.boundary;
  const cellRt = (category: "cross" | "within", distance: 2 | 4) =>
    mean(
      kept
        .filter((t) => t.distance === distance && isCross(t.target, t.distractor, b) === (category === "cross"))
        .map((t) => t.rtMs)
    );
  const nearCrossRt = cellRt("cross", 2);
  const nearWithinRt = cellRt("within", 2);
  const nearAdvantage = nearWithinRt && nearCrossRt ? nearWithinRt - nearCrossRt : 0;
  const rtByInterference = (i: Interference) => mean(kept.filter((t) => t.interference === i).map((t) => t.rtMs));
  const accuracy = trials.length ? trials.filter((t) => t.correct).length / trials.length : 0;
  const ms = (v: number) => (v ? `${Math.round(v)} ms` : "—");

  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Winawer et al. 2007</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <div style={{ ...base.well, marginBottom: "28px" }}>
          <div
            style={{
              ...base.mono,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: "10px",
            }}
          >
            Your run
          </div>
          <div style={{ fontSize: "17px", lineHeight: 1.7, color: C.body }}>
            You got <strong style={{ color: C.text }}>{Math.round(accuracy * 100)}%</strong>{" "}of the
            matches right. You drew your light/dark line between stimulus{" "}
            <strong style={{ color: C.text }}>{Math.floor(b)}</strong>{" "}and{" "}
            <strong style={{ color: C.text }}>{Math.ceil(b)}</strong>{" "}of 20
            {boundaryAmbiguousNote(boundaryFit.ambiguous)}. On the hard (2-step) comparisons your
            mean was {ms(nearCrossRt)}{" "}across that line and {ms(nearWithinRt)}{" "}within one side of
            it{" "}
            {nearAdvantage ? `(a ${Math.round(Math.abs(nearAdvantage))} ms ${nearAdvantage > 0 ? "advantage" : "disadvantage"} for crossing)` : ""}.
          </div>
          <div style={{ ...base.mono, fontSize: "12px", color: C.muted, marginTop: "14px", lineHeight: 1.7 }}>
            NO INTERFERENCE {ms(rtByInterference("none"))} &nbsp;&middot;&nbsp; SPATIAL{" "}
            {ms(rtByInterference("spatial"))} &nbsp;&middot;&nbsp; VERBAL {ms(rtByInterference("verbal"))}
          </div>
          <div style={{ ...base.small, marginTop: "12px", marginBottom: 0, fontSize: "14px" }}>
            One person&rsquo;s 72 trials is far too little to show anything on its own — these are
            your numbers, not a result. The class total is what counts.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.cross }}>
            Your responses could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The idea</h2>
        <p style={base.body}>
          Russian has no single word covering all the blues you just saw. It divides them
          obligatorily into <em>goluboy</em>{" "}(lighter blues) and <em>siniy</em>{" "}(darker blues) —
          two basic colour words, the way English treats <em>red</em>{" "}and <em>pink</em>. Winawer
          and colleagues asked whether that difference in vocabulary shows up in something as
          basic as telling two colours apart by eye.
        </p>
        <p style={base.body}>
          The twenty blues you saw span that Russian border. Some of your comparisons fell on
          opposite sides of it, some on the same side. Nothing about the colours themselves marks
          the border — it is a fact about Russian, not about light.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>What they found</h2>
        <p style={base.body}>
          Russian speakers were faster when the two colours fell into different Russian categories
          than when they fell into the same one — a <em>category advantage</em>. It showed up only
          on the hard, 2-step comparisons, and it was wiped out by holding a number in mind, but
          not by holding a pattern in mind.
        </p>

        <p style={{ ...base.small, marginBottom: "10px" }}>
          Mean reaction time on the hard comparisons, Russian speakers (Table 1, p. 7783):
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "18px" }}>
          <thead>
            <tr>
              {["", "Cross-category", "Within-category", "Advantage"].map((h) => (
                <th
                  key={h}
                  style={{
                    ...base.mono,
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.muted,
                    textAlign: h ? "right" : "left",
                    padding: "6px 8px",
                    borderBottom: `1px solid ${C.border}`,
                    fontWeight: 400,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["No interference", 1164, 1288, "+124", "P = 0.018"],
                ["Spatial interference", 1162, 1270, "+109", "P = 0.041"],
                ["Verbal interference", 1325, 1260, "−64", "P = 0.076"],
              ] as const
            ).map((r) => (
              <tr key={r[0]}>
                <td style={{ fontSize: "15px", color: C.body, padding: "8px", borderBottom: `1px solid ${C.border}` }}>
                  {r[0]}
                </td>
                <td style={{ ...base.mono, fontSize: "13px", color: C.text, textAlign: "right", padding: "8px", borderBottom: `1px solid ${C.border}` }}>
                  {r[1]}
                </td>
                <td style={{ ...base.mono, fontSize: "13px", color: C.text, textAlign: "right", padding: "8px", borderBottom: `1px solid ${C.border}` }}>
                  {r[2]}
                </td>
                <td style={{ ...base.mono, fontSize: "13px", color: r[3].startsWith("+") ? C.within : C.cross, textAlign: "right", padding: "8px", borderBottom: `1px solid ${C.border}` }}>
                  {r[3]}{" "}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={base.small}>
          N = 21 Russian speakers. The category advantage was reliably larger without interference
          than with verbal interference (124 vs &minus;64 ms, t(20) = 2.93, P = 0.008) and larger
          with spatial than with verbal interference (109 vs &minus;64 ms, t(20) = 3.23, P =
          0.004). Spatial and no interference did not differ (P = 0.81), and nothing differed on
          the easy 4-step comparisons.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Where you come in</h2>
        <p style={base.body}>
          You did the English-speaker version of this study — the same twenty blues, the same
          triads, the same interference. Winawer et al. ran 21 English speakers on exactly these
          stimuli and found <strong>no category advantage in any condition</strong>{" "}
          (F(1, 20) = 0.150, P = 0.703). So the class is expected to come out flat. That is the
          result, not a failure: it is the comparison that makes the Russian effect mean something.
        </p>
        <p style={base.body}>
          Two things the English speakers <em>did</em>{" "}show, which the class should be able to
          reproduce. First, hard comparisons took far longer than easy ones. Second, holding a
          number in mind slowed everyone down (1,113 ms with no interference, 1,156 ms with
          spatial, 1,216 ms with verbal; F(2, 40) = 5.170, P = 0.010) — the dual task costs time
          for everybody; what it does not do, for an English speaker, is remove a category effect,
          because there was none there to remove.
        </p>
        <p style={base.body}>
          The last twenty judgements were the point of the whole thing. English speakers in the
          original drew their light/dark line at stimulus 8.6 on average; Russian speakers drew
          the goluboy/siniy line at 8.7. Almost the same place. As the authors put it (p. 7783),
          &ldquo;the critical difference in this case is not that English speakers cannot
          distinguish between light and dark blues, but rather that Russian speakers cannot avoid
          distinguishing them: they must do so to speak Russian in a conventional manner.&rdquo;
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why the number task</h2>
        <p style={base.body}>
          If the Russian advantage came from Russian speakers&rsquo; eyes having been permanently
          retuned by a lifetime of using two words, then asking them to rehearse eight digits
          should not touch it. It did. That is the argument that the effect is <em>online</em>{" "}—
          language is being recruited in the moment, during a task that has nothing to do with
          talking. The pattern-memory condition is the control: it shows the disruption is not
          just the cost of doing two things at once.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Things to be sceptical about</h2>
        <p style={base.body}>
          Your screen is not calibrated. The original ran on a characterised monitor in a darkened
          room, with 2.5 cm squares viewed from 60 cm. The paper publishes only the two endpoints
          of its colour ramp, so the eighteen colours in between had to be reconstructed; the
          method is written up in the spec that accompanies this build. Night mode, auto-brightness
          and wide-gamut displays all shift the colours further. None of this should bias the
          within- versus cross-category comparison — every trial you saw came off the same ramp on
          the same screen — but it adds noise, and it means your absolute times are not comparable
          to the published ones.
        </p>
        <p style={base.body}>
          The classroom version is also much shorter: 72 trials against the original 408, and
          twenty naming judgements against forty. Cutting trials costs precision, which is one
          reason a null result in the class is weak evidence on its own.
        </p>
        <p style={{ ...base.small, marginBottom: 0 }}>
          Winawer, J., Witthoft, N., Frank, M. C., Wu, L., Wade, A. R., &amp; Boroditsky, L.
          (2007). Russian blues reveal effects of language on color discrimination.{" "}
          <em>Proceedings of the National Academy of Sciences</em>{" "}104(19), 7780&ndash;7785.{" "}
          <a href="https://doi.org/10.1073/pnas.0701644104" style={{ color: C.text }}>
            doi:10.1073/pnas.0701644104
          </a>
        </p>
      </div>
    </div>
  );
}

function boundaryAmbiguousNote(ambiguous: boolean) {
  return ambiguous ? " (your light/dark answers were not in a single run, so that line is a best fit)" : "";
}
