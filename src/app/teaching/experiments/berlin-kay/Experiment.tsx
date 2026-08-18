"use client";

import { useMemo, useRef, useState } from "react";
import ChipGrid from "./ChipGrid";
import { byCnum, type Chip } from "./chips";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  well: "#FDFAF5",
  red: "#CC1A14",
};

const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(10px, 3vw, 20px)",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "52px 56px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
  },
  cardWide: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "1060px",
    width: "100%",
    padding: "clamp(14px, 3vw, 36px) clamp(12px, 3.5vw, 40px)",
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
  input: {
    border: `1px solid ${C.border}`,
    padding: "12px 16px",
    fontSize: "19px",
    fontFamily: "'Crimson Pro', Georgia, serif",
    width: "100%",
    outline: "none",
    background: C.well,
    boxSizing: "border-box" as const,
  },
};

type Phase = "intro" | "language" | "terms" | "map" | "review" | "debrief";
type Mode = "paint" | "focal";
type ColorVision = "typical" | "atypical" | "unsure";

interface TermMap {
  term: string;
  chips: Set<number>;
  focal: number | null;
}

const MAX_TERMS = 20;

/** Portrait-phone gate, CSS-only: the browser's own media query decides
 * which wrapper is visible, so it keeps working where in-app browsers and
 * iOS quirks never fire resize events. The task stays mounted underneath —
 * rotating loses no state. Both display rules are !important because the
 * wrappers carry inline flex styles. */
const GATE_CSS = `
.bk-gate { display: none !important; }
@media (max-width: 699px) and (orientation: portrait) {
  .bk-gate { display: flex !important; }
  .bk-task { display: none !important; }
}
@keyframes bk-rotate { from { transform: rotate(-90deg); } to { transform: rotate(0deg); } }
`;

function RotateGate({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="bk-gate" style={base.wrap}>
      <div style={{ ...base.card, textAlign: "center" }}>
        <div
          style={{
            width: "64px",
            height: "36px",
            border: `3px solid ${C.text}`,
            borderRadius: "6px",
            margin: "0 auto 24px",
            transform: "rotate(-90deg)",
            animation: "bk-rotate 1.6s ease-in-out infinite alternate",
          }}
        />
        <h2 style={base.h2}>Turn your phone sideways</h2>
        <p style={{ ...base.body, marginBottom: 0 }}>
          The chart is four times wider than it is tall — it needs the long side of your screen.
          The task will appear as soon as you rotate.
        </p>
        <p style={{ ...base.small, marginTop: "16px", marginBottom: 0 }}>
          Nothing happening? Your phone&rsquo;s rotation lock may be on.
        </p>
        <button style={base.btnGhost} onClick={onContinue}>
          Continue upright — the chips will be tiny
        </button>
      </div>
    </div>
  );
}

export default function Experiment({ session, tag }: { session: string; tag: string | null }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ignoreRotate, setIgnoreRotate] = useState(false);

  const [language, setLanguage] = useState("");
  const [native, setNative] = useState<boolean | null>(null);

  const [terms, setTerms] = useState<TermMap[]>([]);
  const [termDraft, setTermDraft] = useState("");
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<Mode>("paint");

  const [colorVision, setColorVision] = useState<ColorVision | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  // Drag-paint state: the op decided on pointerdown (toggle direction) is
  // applied to every chip the pointer crosses until pointerup.
  const dragOp = useRef<"add" | "remove" | null>(null);

  const addTerm = () => {
    const t = termDraft.trim().slice(0, 40);
    if (!t) return;
    if (terms.some((x) => x.term.toLowerCase() === t.toLowerCase())) {
      setTermDraft("");
      return;
    }
    if (terms.length >= MAX_TERMS) return;
    setTerms([...terms, { term: t, chips: new Set(), focal: null }]);
    setTermDraft("");
  };

  const mutateCurrent = (fn: (t: TermMap) => TermMap) => {
    setTerms((prev) => prev.map((t, i) => (i === current ? fn(t) : t)));
  };

  const applyOp = (chip: Chip, op: "add" | "remove") => {
    mutateCurrent((t) => {
      const chips = new Set(t.chips);
      let focal = t.focal;
      if (op === "add") chips.add(chip.cnum);
      else {
        chips.delete(chip.cnum);
        if (focal === chip.cnum) focal = null;
      }
      return { ...t, chips, focal };
    });
  };

  const onChipDown = (chip: Chip) => {
    const t = terms[current];
    if (!t) return;
    if (mode === "focal") {
      mutateCurrent((x) => {
        const chips = new Set(x.chips);
        chips.add(chip.cnum);
        return { ...x, chips, focal: chip.cnum };
      });
      return;
    }
    const op: "add" | "remove" = t.chips.has(chip.cnum) ? "remove" : "add";
    dragOp.current = op;
    applyOp(chip, op);
  };

  const onChipEnter = (chip: Chip) => {
    if (mode !== "paint" || dragOp.current === null) return;
    applyOp(chip, dragOp.current);
  };

  const endDrag = () => {
    dragOp.current = null;
  };

  const complete = terms.length > 0 && terms.every((t) => t.chips.size > 0 && t.focal !== null);

  const membershipCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of terms) for (const c of t.chips) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [terms]);

  const send = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      language: language.trim().slice(0, 60),
      native,
      colorVision,
      terms: terms.map((t) => ({
        term: t.term,
        focal: t.focal,
        chips: Array.from(t.chips).sort((a, b) => a - b),
      })),
    };
    try {
      const r = await fetch("/api/experiments/berlin-kay", {
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
          <div style={base.eyebrow}>Berlin &amp; Kay 1969</div>
          <h1 style={base.h1}>Mapping your color words</h1>
          <p style={base.body}>
            You are about to see a chart of 330 color chips, modeled on the chart that Berlin and
            Kay presented to speakers of twenty different languages and that the World Color
            Survey later gave to speakers of 110 more languages.
          </p>
          <p style={base.body}>
            But first, you will be asked to list the basic color terms of the language(s) you
            speak. Then, for each of the basic color terms you listed, mark{" "}
            <em>every chip you could call by that term</em>, and then pick its{" "}
            <em>single best example</em>. Once you have completed your chart, we will compare
            your responses with other people doing the experiment, so we can see whether the
            colors picked as best examples cluster together, even across different languages.
          </p>
          <p style={base.small}>
            Your responses are recorded anonymously — no name, no login. What is recorded is the
            language you name, your color words, and which chips you marked. It takes about ten
            minutes. Afterwards you will see what Berlin and Kay claimed, and who disputed it.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              setStartedAt(Date.now());
              setPhase("language");
            }}
          >
            Begin →
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------- LANGUAGE ----------------------------- */
  if (phase === "language") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Step 1 of 3</div>
          <h2 style={base.h2}>Which language will you map?</h2>
          <p style={base.body}>
            Pick the language whose color words you know best. If you speak more than one, choose
            the one you grew up with — you can always run the task again for another.
          </p>
          <label style={{ ...base.eyebrow, display: "block", marginTop: "8px" }}>Language</label>
          <input
            style={base.input}
            value={language}
            maxLength={60}
            autoFocus
            placeholder="e.g. English, Bengali, Portuguese…"
            onChange={(e) => setLanguage(e.target.value)}
          />
          <div style={{ marginTop: "22px" }}>
            <label style={{ ...base.eyebrow, display: "block" }}>
              Did you grow up speaking it?
            </label>
            {(
              [
                [true, "Yes — from childhood"],
                [false, "No — I learned it later"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={String(v)}
                style={{
                  display: "block",
                  fontSize: "18px",
                  color: C.body,
                  marginBottom: "6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="native"
                  checked={native === v}
                  onChange={() => setNative(v)}
                  style={{ marginRight: "10px" }}
                />
                {label}
              </label>
            ))}
          </div>
          <button
            style={{ ...base.btn, opacity: language.trim() && native !== null ? 1 : 0.4 }}
            disabled={!language.trim() || native === null}
            onClick={() => setPhase("terms")}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------- TERMS ------------------------------- */
  if (phase === "terms") {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Step 2 of 3</div>
          <h2 style={base.h2}>
            List the basic color words of {language.trim() || "your language"}
          </h2>
          <div style={base.well}>
            A <strong>basic</strong>{" "}color word, in Berlin and Kay&rsquo;s sense, is: a single
            word (<em>blue</em>, not <em>light blue</em>); not a kind of another color (
            <em>scarlet</em>{" "}is a kind of red — leave it out); usable for all sorts of things, not
            just one (<em>blond</em>{" "}is only for hair); and a word everyone who speaks the language
            knows.
          </div>
          <p style={base.small}>
            Type each word and press Enter. English speakers typically list around eleven — but
            list what <em>your</em>{" "}language has, not what you think the chart wants.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              style={base.input}
              value={termDraft}
              maxLength={40}
              autoFocus
              placeholder="color word"
              onChange={(e) => setTermDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTerm();
                }
              }}
            />
            <button style={{ ...base.btnGhost, marginTop: 0, whiteSpace: "nowrap" }} onClick={addTerm}>
              Add
            </button>
          </div>
          <div style={{ marginTop: "18px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {terms.map((t, i) => (
              <span
                key={t.term}
                style={{
                  ...base.mono,
                  fontSize: "13px",
                  background: C.well,
                  border: `1px solid ${C.border}`,
                  padding: "6px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {t.term}
                <button
                  aria-label={`remove ${t.term}`}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: C.muted,
                    fontSize: "13px",
                    padding: 0,
                  }}
                  onClick={() => {
                    setTerms(terms.filter((_, j) => j !== i));
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            style={{ ...base.btn, opacity: terms.length >= 2 ? 1 : 0.4 }}
            disabled={terms.length < 2}
            onClick={() => {
              setCurrent(0);
              setMode("paint");
              setPhase("map");
            }}
          >
            To the chart →
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------- MAP -------------------------------- */
  if (phase === "map") {
    const t = terms[current];
    if (!t) {
      setPhase("terms");
      return null;
    }
    const decorate = (chip: Chip) => {
      const mine = t.chips.has(chip.cnum);
      const others = (membershipCount.get(chip.cnum) ?? 0) - (mine ? 1 : 0);
      return {
        ring: mine,
        focal: t.focal === chip.cnum,
        dot: others > 0,
      };
    };
    return (
      <>
        <style>{FONTS}</style>
        {!ignoreRotate && <style>{GATE_CSS}</style>}
        {!ignoreRotate && <RotateGate onContinue={() => setIgnoreRotate(true)} />}
        <div
          className="bk-task"
          style={{ ...base.wrap, alignItems: "flex-start" }}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
        <div style={base.cardWide}>
          <div style={base.eyebrow}>
            Step 3 of 3 · word {current + 1} of {terms.length}
          </div>
          <h2 style={{ ...base.h2, marginBottom: "8px" }}>
            &ldquo;{t.term}&rdquo;
          </h2>
          <p style={{ ...base.small, marginBottom: "14px" }}>
            {mode === "paint" ? (
              <>
                Mark <strong>every chip you could call &ldquo;{t.term}&rdquo;</strong>{" "}— click or
                drag across the chart. Click a marked chip to unmark it. Chips can belong to more
                than one word; a small dot means another of your words already claims that chip.
              </>
            ) : (
              <>
                Now click the <strong>single best example</strong>{" "}of &ldquo;{t.term}&rdquo; — the
                chip you would point to if someone asked what &ldquo;{t.term}&rdquo; looks like.
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <button
              style={{
                ...(mode === "paint" ? base.btn : base.btnGhost),
                marginTop: 0,
                padding: "9px 20px",
              }}
              onClick={() => setMode("paint")}
            >
              1 · Mark the chips
            </button>
            <button
              style={{
                ...(mode === "focal" ? base.btn : base.btnGhost),
                marginTop: 0,
                padding: "9px 20px",
                opacity: t.chips.size > 0 || mode === "focal" ? 1 : 0.4,
              }}
              onClick={() => setMode("focal")}
            >
              2 · Best example
            </button>
            <span style={{ ...base.mono, fontSize: "12px", color: C.muted, alignSelf: "center" }}>
              {t.chips.size} chip{t.chips.size === 1 ? "" : "s"}
              {t.focal !== null && byCnum[t.focal]
                ? ` · best example ${byCnum[t.focal].row}${byCnum[t.focal].col}`
                : " · no best example yet"}
            </span>
          </div>
          <ChipGrid
            interactive
            paintable={mode === "paint"}
            decorate={decorate}
            onChipDown={onChipDown}
            onChipEnter={onChipEnter}
          />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {current > 0 && (
              <button style={base.btnGhost} onClick={() => { setCurrent(current - 1); setMode("paint"); }}>
                ← {terms[current - 1].term}
              </button>
            )}
            {current < terms.length - 1 ? (
              <button
                style={{
                  ...base.btn,
                  opacity: t.chips.size > 0 && t.focal !== null ? 1 : 0.4,
                }}
                disabled={t.chips.size === 0 || t.focal === null}
                onClick={() => {
                  setCurrent(current + 1);
                  setMode("paint");
                }}
              >
                Next word: {terms[current + 1].term} →
              </button>
            ) : (
              <button
                style={{ ...base.btn, opacity: complete ? 1 : 0.4 }}
                disabled={!complete}
                onClick={() => setPhase("review")}
              >
                Review your chart →
              </button>
            )}
            {(t.chips.size === 0 || t.focal === null) && (
              <span style={{ ...base.mono, fontSize: "11px", color: C.muted, marginTop: "20px" }}>
                {t.chips.size === 0 ? "mark at least one chip" : "then pick the best example"}
              </span>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  /* ------------------------------- REVIEW ------------------------------- */
  if (phase === "review") {
    const decorate = (chip: Chip) => {
      const n = membershipCount.get(chip.cnum) ?? 0;
      const isFocal = terms.some((t) => t.focal === chip.cnum);
      return {
        dim: n === 0,
        focal: isFocal,
        badge: n > 1 ? String(n) : undefined,
      };
    };
    return (
      <>
        <style>{FONTS}</style>
        {!ignoreRotate && <style>{GATE_CSS}</style>}
        {!ignoreRotate && <RotateGate onContinue={() => setIgnoreRotate(true)} />}
        <div className="bk-task" style={{ ...base.wrap, alignItems: "flex-start" }}>
        <div style={base.cardWide}>
          <div style={base.eyebrow}>Your chart</div>
          <h2 style={base.h2}>The color space of {language.trim()}, according to you</h2>
          <p style={base.small}>
            Greyed chips are ones none of your words covers. Circles are your best examples. A
            number means the chip belongs to more than one of your words. Go back if anything looks
            wrong — this is what gets laid over your classmates&rsquo; charts.
          </p>
          <ChipGrid decorate={decorate} />
          <div style={{ margin: "18px 0", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {terms.map((t, i) => (
              <button
                key={t.term}
                style={{ ...base.btnGhost, marginTop: 0, padding: "8px 14px", fontSize: "11px" }}
                onClick={() => {
                  setCurrent(i);
                  setMode("paint");
                  setPhase("map");
                }}
              >
                {t.term} · {t.chips.size}
                {t.focal !== null && byCnum[t.focal]
                  ? ` · ★ ${byCnum[t.focal].row}${byCnum[t.focal].col}`
                  : ""}
              </button>
            ))}
          </div>
          <div style={base.divider} />
          <label style={{ ...base.eyebrow, display: "block" }}>
            One last question — as far as you know, is your color vision typical?
          </label>
          {(
            [
              ["typical", "Typical, as far as I know"],
              ["atypical", "Atypical (e.g. some form of color-blindness)"],
              ["unsure", "Not sure"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              style={{
                display: "block",
                fontSize: "17px",
                color: C.body,
                marginBottom: "6px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="cv"
                checked={colorVision === v}
                onChange={() => setColorVision(v)}
                style={{ marginRight: "10px" }}
              />
              {label}
            </label>
          ))}
          <button
            style={{ ...base.btn, opacity: colorVision !== null && !submitting ? 1 : 0.5 }}
            disabled={colorVision === null || submitting}
            onClick={send}
          >
            {submitting ? "Sending…" : "Submit your chart →"}
          </button>
        </div>
        </div>
      </>
    );
  }

  /* ------------------------------- DEBRIEF ------------------------------- */
  const focalDecorate = (chip: Chip) => {
    const n = membershipCount.get(chip.cnum) ?? 0;
    return {
      dim: n === 0,
      focal: terms.some((t) => t.focal === chip.cnum),
    };
  };
  return (
    <div style={{ ...base.wrap, alignItems: "flex-start" }}>
      <style>{FONTS}</style>
      <div style={base.cardWide}>
        <div style={base.eyebrow}>Debrief</div>
        <h2 style={base.h2}>Berlin &amp; Kay&rsquo;s findings and later challenges</h2>
        {submitStatus === "err" && (
          <p style={{ ...base.mono, fontSize: "12px", color: C.red }}>
            Your chart could not be sent — tell your instructor. The debrief below still applies.
          </p>
        )}
        <p style={base.body}>
          Berlin and Kay ran this procedure on speakers of twenty languages and made two claims
          that upended the field. First, although the <em>boundaries</em>{" "}people drew were vague
          and wandered all over the chart, the <em>best examples</em>{" "}did not: foci clustered in
          the same small regions of the chart regardless of language. Second, languages acquire
          basic color terms in a constrained order — no language, on their evidence, has a word
          for brown before it has words on the black/white, red, green/yellow, and blue rungs
          below it.
        </p>
        <p style={base.body}>
          That universalism was itself challenged. Eleanor Rosch Heider&rsquo;s Dani studies first
          seemed to confirm it — but Roberson, Davies and Davidoff (2000), working with Berinmo
          speakers in Papua New Guinea, failed to replicate her key results and found that
          similarity judgments track the boundaries a language actually has. Your class is now a
          data point in that argument: when the charts are combined, do the best examples from
          different languages pile up in the same places, or follow each language&rsquo;s own
          lines?
        </p>
        <div style={base.well}>
          <strong>Where this deviates from the original.</strong>{" "}Berlin and Kay used painted
          Munsell chips under controlled lighting; you used a screen. About a quarter of the
          chart&rsquo;s most saturated chips lie outside what an sRGB monitor can display at all
          and are shown desaturated — an ordinary monitor cannot reproduce a Munsell book, which
          is itself a lesson in what a color stimulus is. Their informants also did not list
          their own basic terms; the list was elicited separately first. Treat today&rsquo;s data
          accordingly.
        </div>
        <p style={base.small}>Your chart, one more time:</p>
        <ChipGrid decorate={focalDecorate} />
        <p style={{ ...base.small, marginTop: "16px" }}>
          Sources: Berlin, B. &amp; Kay, P. (1969), <em>Basic Color Terms</em>; Rosch Heider, E.
          (1972), J. Exp. Psychol. 93; Roberson, D., Davies, I. &amp; Davidoff, J. (2000), J. Exp.
          Psychol.: General 129, doi:10.1037/0096-3445.129.3.369. Chip colorimetry from the World
          Color Survey data archive.
        </p>
      </div>
    </div>
  );
}
