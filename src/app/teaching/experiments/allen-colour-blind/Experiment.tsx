"use client";

import { useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  // Condition accents. Deliberately blue vs. amber rather than the usual
  // red/green pair: this experiment is about colour vision, some participants
  // will be colour-blind, and a blue/amber contrast survives both protan and
  // deutan deficiencies.
  favc: "#2F5D8C",
  unfavc: "#8C5A2E",
  err: "#8C3A2E",
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
  vignette: {
    fontSize: "19px",
    lineHeight: 1.78,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "26px 28px",
    marginBottom: "32px",
  },
  qlabel: {
    fontSize: "17px",
    lineHeight: 1.5,
    color: C.text,
    marginBottom: "14px",
    display: "block",
  },
  qnum: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.14em",
    color: C.muted,
    marginRight: "10px",
  },
};

/* ------------------------------------------------------------------ *
 * Source paper
 *
 * Allen, K., Quinlan, P., Andow, J. & Fischer, E. (2021). "What is it
 * like to be colour-blind? A case study in experimental philosophy of
 * experience." Mind & Language 37(5), 814–839.
 * doi:10.1111/mila.12370 — DOI resolved against api.crossref.org.
 * Open access (CC-BY).
 *
 * Page numbers in the comments below refer to the open-access PDF's own
 * 1–26 running pagination; add 813 for the journal's page number.
 *
 * ---- IMPORTANT: this is NOT a replication ----
 * Allen et al. ran hour-long semi-structured interviews with 17 screened
 * colour-blind participants, using licensed NCS print stimuli and EnChroma
 * glasses, coded in NVivo. None of that ports to a browser task run on a
 * mixed cohort. What is built here is an ORIGINAL third-person design: it
 * measures what mostly-trichromatic students BELIEVE about colour-blind
 * experience, and then confronts those beliefs with the paper's first-person
 * findings. It targets a claim the paper asserts but never itself tests —
 * that the standard view is "the view that the colloquial name 'colour
 * blindness' suggests" (p. 1) and enjoys "widespread acceptance" (p. 3).
 *
 * Full page-cited spec, including every quote the option wordings compress
 * and the full audit queue:
 *   docs/cold-experiments/allen-colour-blind-spec.md
 * ------------------------------------------------------------------ */

type Condition = "favourable" | "unfavourable";
type ViewKey = "standard" | "alien" | "revised" | "common";
type ColourName = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "brown" | "grey";
type NewColours = "reds" | "greens" | "pinks-purples" | "blues" | "yellows";
type SelfReportCVD = "yes" | "no" | "unsure";

/* ------------------------------------------------------------------ *
 * Colour-vision-deficiency simulation
 *
 * Viénot, F., Brettel, H. & Mollon, J. D. (1999). "Digital video
 * colourmaps for checking the legibility of displays by dichromats."
 * Color Research & Application 24(4), 243–252.
 * doi:10.1002/(SICI)1520-6378(199908)24:4<243::AID-COL5>3.0.CO;2-3
 *
 * the simplified single-plane form of
 *
 * Brettel, H., Viénot, F. & Mollon, J. D. (1997). "Computerized simulation
 * of color appearance for dichromats." Journal of the Optical Society of
 * America A 14(10), 2647–2655. doi:10.1364/JOSAA.14.002647
 *
 * Both DOIs resolved against api.crossref.org. The single-plane projection
 * is valid for protanopia and deuteranopia; the 1997 two-half-plane
 * construction is only needed for tritanopia.
 *
 * Pipeline: sRGB → linearise → LMS → collapse the missing cone channel →
 * back to linear RGB → re-apply the sRGB transfer function → clamp.
 *
 * This runs once at module load over six flat swatches, so it is cheap,
 * pure and deterministic — same values on the server and after hydration.
 * ------------------------------------------------------------------ */

const RGB_TO_LMS: readonly (readonly number[])[] = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS_TO_RGB: readonly (readonly number[])[] = [
  [0.080944, -0.130504, 0.116721],
  [-0.0102485, 0.0540194, -0.113615],
  [-0.000365294, -0.00412163, 0.693513],
];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

function mul3(m: readonly (readonly number[])[], v: readonly number[]): number[] {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

/** Deuteranope collapse: M' = 0.494207·L + 1.24827·S, with L and S unchanged. */
function simulateDeuteranopia(hex: string): string {
  const lin = [
    srgbToLinear(parseInt(hex.slice(1, 3), 16)),
    srgbToLinear(parseInt(hex.slice(3, 5), 16)),
    srgbToLinear(parseInt(hex.slice(5, 7), 16)),
  ];
  const lms = mul3(RGB_TO_LMS, lin);
  const collapsed = [lms[0], 0.494207 * lms[0] + 1.24827 * lms[2], lms[2]];
  const out = mul3(LMS_TO_RGB, collapsed);
  return `#${out.map((v) => linearToSrgb(v).toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}

interface Swatch {
  key: ColourName;
  /** sRGB approximation to an NCS elementary or binary hue. NOT a licensed NCS
   *  value — the `ncs` string is an approximate label only. */
  original: string;
  ncs: string;
  /** "rg" = hue collapses under the deuteranopia transform; "yb" = broadly preserved. */
  axis: "rg" | "yb";
}

/* Presentation order is fixed and interleaved so the collapsing and preserved
 * patches are not visibly grouped. `key` doubles as the scoring key: a response
 * counts only if the participant names the patch with its ORIGINAL hue's name. */
const SWATCHES: Swatch[] = [
  { key: "red", original: "#C8102E", ncs: "≈ Y90R", axis: "rg" },
  { key: "yellow", original: "#F2C500", ncs: "≈ Y", axis: "yb" },
  { key: "purple", original: "#7B3F98", ncs: "≈ R50B", axis: "rg" },
  { key: "green", original: "#00875A", ncs: "≈ G", axis: "rg" },
  { key: "blue", original: "#0B6FA4", ncs: "≈ B", axis: "yb" },
  { key: "orange", original: "#E2711D", ncs: "≈ Y50R", axis: "rg" },
];

const SIMULATED: string[] = SWATCHES.map((s) => simulateDeuteranopia(s.original));

const COLOUR_NAMES: ColourName[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "grey",
];

/* ------------------------------------------------------------------ *
 * Task 1 stimuli — the between-subjects viewing-context vignettes.
 *
 * The manipulation operationalises the paper's favourability claim:
 * "Perception of reds and greens is improved if the stimulus is a material
 * object rather than a spectral light, if the object is well-illuminated,
 * if the stimulus (object or light) occupies a sufficiently large area in
 * the visual field, or is presented for a sufficient length of time"
 * (p. 4), citing Smith and Pokorny's (1977) finding that "dichromats tend
 * to perform more like some form of trichromat when the stimulus occupies
 * more than 8° of the visual field" (p. 4). Compare participant #6 on the
 * same red seen as a small chip and as a large door (p. 16).
 *
 * Several favourability factors are bundled into each vignette rather than
 * varied one at a time — this maximises the effect for a classroom N but
 * confounds the factors. Flagged in the spec's audit queue.
 * ------------------------------------------------------------------ */

interface Vignette {
  paras: string[];
  /** Short phrase used in the debrief recap. */
  label: string;
}

const VIGNETTES: Record<Condition, Vignette> = {
  unfavourable: {
    paras: [
      "You are in a dimly lit room. Someone on the far side of the table holds up a small card — a coloured chip about the size of a postage stamp — lets you glance at it for a second, and turns it face down again.",
      "The chip is a strong, saturated red.",
    ],
    label: "the small chip, glimpsed in dim light",
  },
  favourable: {
    paras: [
      "You are standing outside on a bright day. In front of you is a door, evenly painted and freshly finished. It fills a good part of what you can see, and you can look at it for as long as you like.",
      "The door is a strong, saturated red.",
    ],
    label: "the large door, in bright daylight",
  },
};

const VIEW_PROMPT =
  "Now imagine someone with the most common form of colour blindness — red/green colour vision deficiency — in exactly this situation, looking at exactly this. Which of the following comes closest to what they see?";

/* Each option is a plain-English compression of one of the four accounts the
 * paper sets out at pp. 1–4. The compressions are the load-bearing stimulus
 * text and are queued for hand-audit; the quotes they compress are in §2.1 of
 * the spec. */
interface ViewOption {
  key: ViewKey;
  text: string;
  /** Name used only in the debrief, after the response is locked in. */
  name: string;
  gloss: string;
}

const VIEW_OPTIONS: Record<ViewKey, ViewOption> = {
  standard: {
    key: "standard",
    text: "A shade of grey. For them the red/green dimension is simply missing — the world comes in blues, yellows, greys, blacks and whites.",
    name: "The standard view",
    gloss:
      "The textbook account, and the one the phrase ‘colour blindness’ suggests: red and green hues are absent and are seen as greys.",
  },
  alien: {
    key: "alien",
    text: "A colour you have never seen and could not imagine — one with no place anywhere in your own colour space.",
    name: "The alien colour view",
    gloss:
      "The colours a colour-blind perceiver sees cannot be located in trichromatic human colour space at all — not even the blues, yellows and greys.",
  },
  revised: {
    key: "revised",
    text: "Yellowish, or bluish — and nothing more specific than that. Not orange, not brown, not any particular shade: just yellowishness, on its own.",
    name: "The revised reduction view",
    gloss:
      "Byrne and Hilbert’s account: the achromatic colours plus unique yellow and unique blue are shared with you, but binary hues appear merely yellowish or bluish — a way no trichromat ever sees them.",
  },
  common: {
    key: "common",
    text: "Red — genuinely red, though perhaps darker, duller, or browner than it looks to you.",
    name: "The common colour view",
    gloss:
      "Colour-blind perceivers can genuinely perceive the colours they are supposedly blind to, at least in favourable conditions — though those colours may look darker, or less intense.",
  },
};

const VIEW_KEYS: ViewKey[] = ["standard", "alien", "revised", "common"];

const NEW_COLOUR_OPTIONS: { key: NewColours; label: string }[] = [
  { key: "reds", label: "Reds" },
  { key: "greens", label: "Greens" },
  { key: "pinks-purples", label: "Pinks and purples" },
  { key: "blues", label: "Blues" },
  { key: "yellows", label: "Yellows" },
];

/* ------------------------------------------------------------------ *
 * Published values from Allen et al. (2021), for the debrief. Page numbers
 * are the PDF's own 1–26 pagination. Every number here is transcribed from
 * the paper; see §3.3 of the spec for the full table.
 * ------------------------------------------------------------------ */
const ORIG = {
  n: 17,
  /** "17 colour-blind participants were interviewed (16 males, 1 female, average age 38.5)" (p. 6) */
  comparisonN: 20,
  /** "a comparison group of 20 normal trichromatic perceivers" (p. 11) */
  noNewColours: 12,
  noNewColoursPct: 71,
  /** "The majority of participants (12, 71%) did not report seeing any colours that they had not seen before." (p. 17) */
  purpleTrouble: 13,
  /** "Thirteen participants either reported difficulties with, or made mistakes involving, purple." (p. 14) */
  wouldBuy: 10,
  wouldBuyPct: 59,
  /** "a majority (10, 59%) felt that the changes … were sufficiently significant that they would at least consider buying a pair" (p. 17) */
  redNamedM: "3.8",
  redNamedSD: "2.2",
  redCompM: "6.6",
  redCompSD: "4.2",
  redT: "−2.467",
  redP: "< .05",
  greenNamedM: "4.1",
  greenNamedSD: "2",
  greenCompM: "7.7",
  greenCompSD: "3.1",
  greenT: "−4.121",
  greenP: "< .01",
};

function Paras({ paras }: { paras: string[] }) {
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ margin: i === paras.length - 1 ? 0 : "0 0 16px" }}>
          {p}
        </p>
      ))}
    </>
  );
}

/** Fisher–Yates, called only from click handlers so nothing impure runs in render. */
function shuffled<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "intro" | "views" | "swatches" | "glasses" | "background" | "debrief";

export default function Experiment({
  session,
  study,
  tag = null,
}: {
  session: string;
  study: 1;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [condition, setCondition] = useState<Condition | null>(null);
  const [viewOrder, setViewOrder] = useState<ViewKey[] | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [viewShownAt, setViewShownAt] = useState<number | null>(null);
  const [viewChoice, setViewChoice] = useState<ViewKey | null>(null);
  const [viewRtMs, setViewRtMs] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [namings, setNamings] = useState<(ColourName | null)[]>(() => SWATCHES.map(() => null));
  const [newColours, setNewColours] = useState<NewColours | null>(null);
  const [cvd, setCvd] = useState<SelfReportCVD | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [revealOriginals, setRevealOriginals] = useState(false);

  const start = (now: number, assigned: Condition, order: ViewKey[]) => {
    setCondition(assigned);
    setViewOrder(order);
    setStartedAt(now);
    setViewShownAt(now);
    setPhase("views");
  };

  // `now` is read in the click handler and passed in, so nothing impure runs during render.
  const chooseView = (v: ViewKey, now: number) => {
    if (viewShownAt !== null && viewRtMs === null) setViewRtMs(now - viewShownAt);
    setViewChoice(v);
  };

  const nameSwatch = (i: number, name: ColourName) => {
    setNamings((prev) => {
      const next = prev.slice();
      next[i] = name;
      return next;
    });
  };

  const send = async (cvdValue: SelfReportCVD | null) => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      study,
      condition,
      viewChoice,
      viewOrder: (viewOrder ?? VIEW_KEYS).join("|"),
      confidence,
      viewRtMs: viewRtMs ?? 0,
      namings,
      newColours,
      selfReportCVD: cvdValue,
    };
    try {
      const r = await fetch("/api/experiments/allen-colour-blind", {
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

  /* ----------------------------- INTRO ----------------------------- */
  // `condition === null` can only happen before "Begin", so this also serves as the
  // type narrowing that lets every later phase treat the assignment as settled.
  if (phase === "intro" || condition === null || viewOrder === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Allen, Quinlan, Andow &amp; Fischer 2021</div>
          <h1 style={base.h1}>What is it like to be colour-blind?</h1>
          <p style={base.body}>
            Three short tasks: a scenario to judge, six colour patches to name, and one prediction.
            It takes about four minutes. There are no right answers to the first and last{" "}
            &mdash; this is a study of what people assume about other people&rsquo;s experience.
          </p>
          <p style={base.small}>
            You have been assigned at random to one of two versions of the opening scenario, and
            will see only that one. Your answers are recorded anonymously &mdash; no name, no login,
            nothing that identifies you. Afterwards you will see both versions and what the 2021
            study actually found.
          </p>
          <p style={base.small}>
            Part of this uses colour on screen. Screens are not colour-calibrated and rooms are not
            evenly lit, so treat the patches as rough. You do not need normal colour vision to take
            part &mdash; there is a question about that at the end.
          </p>
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() =>
              start(
                Date.now(),
                Math.random() < 0.5 ? "favourable" : "unfavourable",
                shuffled(VIEW_KEYS)
              )
            }
          >
            Begin &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Assignment is settled from here on.
  const V = VIGNETTES[condition];
  const condColour = condition === "favourable" ? C.favc : C.unfavc;

  /* ----------------------------- TASK 1 ---------------------------- */
  if (phase === "views") {
    const ready = viewChoice !== null && confidence !== null;
    return (
      <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "40px", paddingBottom: "40px" }}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 1 of 3 &middot; Please read carefully</div>

          <div style={base.vignette}>
            <Paras paras={V.paras} />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q1</span>
              {VIEW_PROMPT}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {viewOrder.map((k) => {
                const on = viewChoice === k;
                return (
                  <button
                    key={k}
                    onClick={() => chooseView(k, Date.now())}
                    aria-pressed={on}
                    style={{
                      textAlign: "left",
                      padding: "16px 20px",
                      fontFamily: "'Crimson Pro', Georgia, serif",
                      fontSize: "18px",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      background: on ? C.accent : C.well,
                      color: on ? C.bg : C.text,
                      border: `1px solid ${on ? C.accent : C.border}`,
                    }}
                  >
                    {VIEW_OPTIONS[k].text}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <span style={base.qlabel}>
              <span style={base.qnum}>Q2</span>
              How confident are you in that answer?
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = confidence === n;
                return (
                  <button
                    key={n}
                    onClick={() => setConfidence(n)}
                    aria-pressed={on}
                    aria-label={`Confidence ${n} of 5`}
                    style={{
                      flex: "1 1 0",
                      padding: "14px 0",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "14px",
                      cursor: "pointer",
                      background: on ? C.accent : C.well,
                      color: on ? C.bg : C.text,
                      border: `1px solid ${on ? C.accent : C.border}`,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div style={{ ...base.small, ...base.mono, fontSize: "11px", display: "flex", justifyContent: "space-between", marginTop: "8px", marginBottom: 0 }}>
              <span>Not at all</span>
              <span>Very</span>
            </div>
          </div>

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => setPhase("swatches")}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Answer both questions to continue.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ----------------------------- TASK 2 ---------------------------- */
  if (phase === "swatches") {
    const ready = namings.every((n) => n !== null);
    return (
      <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "40px", paddingBottom: "40px" }}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 2 of 3 &middot; Naming</div>
          <h2 style={base.h2}>Six patches</h2>
          <p style={base.body}>
            Each patch below has been put through a standard computer simulation of red/green
            colour blindness. Name the colour you actually see in each one.
          </p>
          <p style={base.small}>
            Go on what is in front of you, not on what you think the patch &lsquo;really&rsquo; is.
            Answer all six.
          </p>

          {SWATCHES.map((s, i) => (
            <div key={s.key} style={{ marginBottom: "28px" }}>
              <div
                style={{
                  background: SIMULATED[i],
                  height: "62px",
                  border: `1px solid ${C.border}`,
                  marginBottom: "10px",
                }}
                role="img"
                aria-label={`Colour patch ${i + 1} of ${SWATCHES.length}`}
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {COLOUR_NAMES.map((n) => {
                  const on = namings[i] === n;
                  return (
                    <button
                      key={n}
                      onClick={() => nameSwatch(i, n)}
                      aria-pressed={on}
                      style={{
                        flex: "1 1 auto",
                        minWidth: "68px",
                        padding: "10px 4px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "11px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        background: on ? C.accent : C.well,
                        color: on ? C.bg : C.text,
                        border: `1px solid ${on ? C.accent : C.border}`,
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => setPhase("glasses")}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Name all six patches to continue.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ----------------------------- TASK 3 ---------------------------- */
  if (phase === "glasses") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part 3 of 3 &middot; One prediction</div>
          <h2 style={base.h2}>The glasses</h2>
          <p style={base.body}>
            There are glasses sold on the claim that they enhance colour vision for people who are
            colour-blind. Suppose someone with red/green colour blindness puts on a pair and looks
            around at the ordinary world.
          </p>
          <span style={base.qlabel}>
            <span style={base.qnum}>Q3</span>
            Which colours do you think would strike them as most new, or most changed?
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {NEW_COLOUR_OPTIONS.map((o) => {
              const on = newColours === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => setNewColours(o.key)}
                  aria-pressed={on}
                  style={{
                    textAlign: "left",
                    padding: "14px 18px",
                    fontFamily: "'Crimson Pro', Georgia, serif",
                    fontSize: "18px",
                    cursor: "pointer",
                    background: on ? C.accent : C.well,
                    color: on ? C.bg : C.text,
                    border: `1px solid ${on ? C.accent : C.border}`,
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <button
            style={{
              ...base.btn,
              opacity: newColours ? 1 : 0.35,
              cursor: newColours ? "pointer" : "not-allowed",
            }}
            disabled={!newColours}
            onClick={() => setPhase("background")}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- BACKGROUND -------------------------- */
  if (phase === "background") {
    const opts: { key: SelfReportCVD; label: string }[] = [
      { key: "no", label: "No" },
      { key: "yes", label: "Yes — some form of colour vision deficiency" },
      { key: "unsure", label: "Not sure" },
    ];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>One last question &middot; optional</div>
          <h2 style={base.h2}>Do you have any form of colour blindness?</h2>
          <p style={base.small}>
            Asked after your answers so it cannot influence them. Around 8% of men and 0.5% of
            women in European populations do. It lets the class separate the two groups &mdash;
            which matters here, because the whole question is whether people on the outside can say
            what the experience on the inside is like. Skip it if you prefer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
            {opts.map((o) => (
              <button
                key={o.key}
                onClick={() => setCvd(o.key)}
                aria-pressed={cvd === o.key}
                style={{
                  textAlign: "left",
                  padding: "14px 18px",
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "18px",
                  cursor: "pointer",
                  background: cvd === o.key ? C.accent : C.well,
                  color: cvd === o.key ? C.bg : C.text,
                  border: `1px solid ${cvd === o.key ? C.accent : C.border}`,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button style={base.btn} disabled={submitting} onClick={() => send(cvd)}>
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

  /* ---------------------------- DEBRIEF ---------------------------- */
  const chosen = viewChoice ? VIEW_OPTIONS[viewChoice] : null;
  const scored = SWATCHES.map((s, i) => ({ s, given: namings[i], sim: SIMULATED[i] }));
  const namingScore = scored.filter((x) => x.given === x.s.key).length;
  const rgTotal = SWATCHES.filter((s) => s.axis === "rg").length;
  const ybTotal = SWATCHES.filter((s) => s.axis === "yb").length;
  const rgScore = scored.filter((x) => x.s.axis === "rg" && x.given === x.s.key).length;
  const ybScore = scored.filter((x) => x.s.axis === "yb" && x.given === x.s.key).length;
  const other: Condition = condition === "favourable" ? "unfavourable" : "favourable";

  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>What you just took part in</h1>

        <div
          style={{
            borderLeft: `3px solid ${condColour}`,
            background: C.well,
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              ...base.mono,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: condColour,
              marginBottom: "8px",
            }}
          >
            {condition}{" "}viewing condition
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            You were shown {V.label}, and answered that a red/green colour-blind viewer would see{" "}
            <strong style={{ color: C.text }}>{chosen ? chosen.name.toLowerCase() : "—"}</strong>.
            Of the six simulated patches,{" "}
            <strong style={{ color: C.text }}>{namingScore}</strong>{" "}kept the name of the colour
            they started as &mdash; though naming the originals was never the task, as explained
            below.
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.err }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The four options were four philosophical views</h2>
        <p style={base.body}>
          Allen and colleagues set out four rival accounts of what colour-blind experience is like.
          The four answers you chose between are those four accounts, in plain English.
        </p>
        <div style={{ marginBottom: "24px" }}>
          {VIEW_KEYS.map((k) => {
            const o = VIEW_OPTIONS[k];
            const mine = viewChoice === k;
            return (
              <div
                key={k}
                style={{
                  borderLeft: `2px solid ${mine ? condColour : C.border}`,
                  paddingLeft: "16px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ fontSize: "18px", color: C.text, marginBottom: "4px" }}>
                  {o.name}
                  {mine && (
                    <span style={{ ...base.mono, fontSize: "10px", letterSpacing: "0.14em", color: condColour, marginLeft: "10px" }}>
                      YOUR ANSWER
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "16px", lineHeight: 1.6, color: C.muted }}>{o.gloss}</div>
              </div>
            );
          })}
        </div>
        <p style={base.small}>
          The paper concludes that the evidence &ldquo;militate[s] against the standard view of
          colour blindness&rdquo; and against the alien and revised reduction views, and instead
          &ldquo;support[s] the common colour view&rdquo; &mdash; that colour-blind perceivers can
          genuinely perceive the colours they are supposedly blind to, at least when conditions are
          favourable.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>The other version of the scenario</h2>
        <p style={base.small}>
          Half the room read {VIGNETTES[other].label} instead of {V.label}. That is the whole
          manipulation.
        </p>
        <div style={{ ...base.vignette, marginBottom: "16px" }}>
          <Paras paras={VIGNETTES[other].paras} />
        </div>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          Allen et al. report that how well a colour-blind perceiver sees a colour depends heavily
          on the viewing context: a material object rather than a light, well illuminated, filling
          a large part of the visual field, seen for long enough. One of their participants, shown
          the same red as a small chip and as a large door, could identify the door confidently but
          said of the chip: &ldquo;The sample is too small to tell.&rdquo; So the two scenarios you
          and your neighbour read are, according to the paper, genuinely different cases. The
          question for the class is whether your answers moved with them.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>What the patches actually were</h2>
        <p style={base.small}>
          Each patch was a strong colour run through a standard simulation of deuteranopia. Your
          score:{" "}
          <strong style={{ color: C.text }}>
            {rgScore}/{rgTotal}
          </strong>{" "}
          on the four patches the simulation collapses, and{" "}
          <strong style={{ color: C.text }}>
            {ybScore}/{ybTotal}
          </strong>{" "}
          on the two it broadly leaves alone.
        </p>
        <p style={base.small}>
          You were not asked to work out what the originals were &mdash; only to name what was in
          front of you. The score is split because the simulation treats the two groups differently:
          it broadly preserves yellow and blue, so honest naming should still land on those two, but
          it collapses red, green, purple and orange into olives, greys and blues, so honest naming
          should miss those four. Missing them is the expected result, not a mistake &mdash; it
          shows, on your own eyes, which distinctions the simulation says a deuteranope&rsquo;s
          colour signal no longer carries.
        </p>
        <button style={base.btnGhost} onClick={() => setRevealOriginals((r) => !r)}>
          {revealOriginals ? "Hide originals" : "Show the originals"}
        </button>
        {revealOriginals && (
          <div style={{ marginTop: "20px", marginBottom: "8px" }}>
            {scored.map((x) => (
              <div
                key={x.s.key}
                style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}
              >
                <span style={{ background: x.sim, width: "52px", height: "34px", border: `1px solid ${C.border}`, flexShrink: 0 }} />
                <span style={{ ...base.mono, fontSize: "13px", color: C.muted }}>&rarr;</span>
                <span style={{ background: x.s.original, width: "52px", height: "34px", border: `1px solid ${C.border}`, flexShrink: 0 }} />
                <span style={{ ...base.mono, fontSize: "12px", color: C.body, lineHeight: 1.4 }}>
                  {x.s.key}{" "}
                  <span style={{ color: C.muted }}>({x.s.ncs})</span>
                  <br />
                  <span style={{ color: x.given === x.s.key ? C.favc : C.unfavc }}>
                    you said {x.given ?? "—"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={{ ...base.small, marginTop: "18px" }}>
          Notice the purple. Under the simulation it goes blue &mdash; and purple was where Allen
          et al.&rsquo;s real participants had the most trouble too:{" "}
          {ORIG.purpleTrouble}{" "}of {ORIG.n} either reported difficulties with it or made mistakes
          involving it, often calling it blue.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>But a simulation is not an experience</h2>
        <p style={base.body}>
          This is the part worth arguing about. A colour-blindness simulation renders a
          dichromat&rsquo;s reduced range in ordinary colours, on an ordinary screen, for ordinary
          eyes. It can show you what a dichromat cannot{" "}
          <em>discriminate</em>. It cannot show you what their experience is{" "}
          <em>like</em>. And what it puts on screen &mdash; reds and greens turned to olive, brown
          and grey &mdash; is close to a picture of the standard view, which is exactly the view
          Allen et al. argue the evidence tells against.
        </p>
        <p style={base.body}>
          Their participants did far better than the simulation would predict. Every one of them
          correctly identified the green patch at due west on the colour circle as green. Every one
          of them, including a near-achromat, correctly identified the red apex of the colour
          triangle as red. Only one of {ORIG.n} sorted the mid-red and mid-green samples into the
          same pile. They named fewer red and green objects in 30 seconds than a comparison group
          of {ORIG.comparisonN} normal trichromats ({ORIG.redNamedM} vs {ORIG.redCompM} for red,
          {" "}
          {ORIG.greenNamedM} vs {ORIG.greenCompM} for green) &mdash; but &lsquo;fewer&rsquo; is a
          long way from &lsquo;none&rsquo;.
        </p>
        <p style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
          Two limits on the patches you saw. First, screens are not colour-calibrated and your room
          is not a lab, so the exact hues differed across the class. Second, the transform models a{" "}
          <em>dichromat</em>{" "}&mdash; someone missing a cone type entirely. Most red/green
          colour-blind people are anomalous trichromats, whose loss is far milder, so the
          simulation overstates the deficit for the commonest form of the condition.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>The glasses question</h2>
        <p style={base.body}>
          You predicted{" "}
          <strong style={{ color: C.text }}>
            {NEW_COLOUR_OPTIONS.find((o) => o.key === newColours)?.label.toLowerCase() ?? "—"}
          </strong>
          . Allen et al. put their participants in EnChroma glasses, which are marketed on the
          claim that they enhance colour vision for the colour-blind, and asked whether they were
          seeing any colours they had never seen before.
        </p>
        <p style={base.body}>
          {ORIG.noNewColours}{" "}of {ORIG.n} participants ({ORIG.noNewColoursPct}%) reported no new
          colours at all. Among the handful who thought they might have seen something new,{" "}
          <strong style={{ color: C.text }}>no one</strong>{" "}claimed to have seen red or green for
          the first time. Every candidate new colour was a pink or a purple &mdash; skin, and the
          bluebells flowering outside the department. No one who failed the Ishihara test without
          the glasses passed it while wearing them; in that sense the glasses do not correct colour
          blindness. Even so, {ORIG.wouldBuy}{" "}of {ORIG.n} ({ORIG.wouldBuyPct}%) said they would at
          least consider buying a pair.
        </p>
        <p style={base.small}>
          That pattern is the paper&rsquo;s best argument. If red/green colour-blind people simply
          could not see reds and greens, enhancement should have handed them reds and greens first.
          Instead it handed them pinks and purples &mdash; the colours that are{" "}
          <em>made of</em>{" "}red and blue, red and white. Which fits an account on which they could
          see red all along, and the glasses just made it easier.
        </p>

        <div style={base.divider} />

        <h2 style={base.h2}>Why it matters</h2>
        <p style={base.body}>
          The paper is also a methodological argument. Most experimental philosophy asks people to
          judge whether a concept applies to a made-up case &mdash; Gettier cases, trolley
          problems. But part of the evidence in the philosophy of perception is what experience is
          like from the inside, and questionnaires are poorly suited to that. So Allen and
          colleagues ran hour-long semi-structured interviews with{" "}
          {ORIG.n}{" "}colour-blind participants and coded the transcripts thematically &mdash;
          qualitative methods, in a field that has mostly avoided them.
        </p>
        <p style={{ ...base.small, background: C.well, border: `1px solid ${C.border}`, padding: "16px 18px" }}>
          <strong style={{ color: C.text }}>What you just did was not that study.</strong>{" "}
          Their participants were colour-blind and described their own experience; you were asked
          to predict someone else&rsquo;s. Their stimuli were licensed print samples under
          controlled light; yours were pixels. This exercise is an original classroom design built
          on the paper&rsquo;s question, not a replication of its method &mdash; and it tests
          something the paper asserts but never measures: that the standard view is what the
          ordinary phrase &lsquo;colour blindness&rsquo; suggests to people. Whether your class
          bears that out is the first thing to look at.
        </p>

        <p style={{ ...base.small, marginBottom: 0 }}>
          Allen, K., Quinlan, P., Andow, J., &amp; Fischer, E. (2021). What is it like to be
          colour-blind? A case study in experimental philosophy of experience.{" "}
          <em>Mind &amp; Language</em>{" "}37(5), 814&ndash;839.{" "}
          <a href="https://doi.org/10.1111/mila.12370" style={{ color: C.text }}>
            doi:10.1111/mila.12370
          </a>{" "}
          (open access). Simulation after Vi&eacute;not, Brettel &amp; Mollon (1999),{" "}
          <em>Color Research &amp; Application</em>{" "}24(4), 243&ndash;252.
        </p>
      </div>
    </div>
  );
}
