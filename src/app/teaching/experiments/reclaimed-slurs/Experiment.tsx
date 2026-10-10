"use client";

import { useMemo, useRef, useState } from "react";
import {
  CONTEXTS,
  CONTEXT_QUESTION,
  CONTEXT_SPECS,
  INGROUP_QUESTIONS,
  MEASURES,
  MEASURE_SPECS,
  SCALE_MAX,
  SCALE_MIN,
  SELF_QUESTION,
  SLUG,
  TERMS,
  coin,
  composite,
  shuffle,
  type Context,
  type IngroupAnswer,
  type IngroupKey,
  type Measure,
  type Ratings,
  type Term,
} from "@/lib/reclaimed-slurs";
import pilot from "./pilot-reference.json";
import {
  FONT_IMPORT,
  HS,
  INK,
  MUTED,
  PAPER,
  PART_COLOR,
  PLASMA_UNDER30,
  SANS,
  SERIF,
  TIGHT,
  TIGHTER,
  PLASMA_OVER60,
} from "./design";

const CSS = `
${FONT_IMPORT}
.rs-range { -webkit-appearance: none; appearance: none; width: 100%; height: 40px; background: transparent; margin: 0; cursor: pointer; touch-action: none; }
.rs-range::-webkit-slider-runnable-track { height: 2px; background: ${INK}; }
.rs-range::-moz-range-track { height: 2px; background: ${INK}; }
.rs-range::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: var(--thumb); margin-top: -12px; border: 2px solid ${INK}; }
.rs-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--thumb); border: 2px solid ${INK}; }
.rs-range.untouched::-webkit-slider-thumb { opacity: 0; }
.rs-range.untouched::-moz-range-thumb { opacity: 0; }
.rs-btn { background: ${INK}; color: ${PAPER}; border: none; padding: 14px 26px; font-family: ${SANS}; font-weight: 700; font-size: 17px; letter-spacing: ${TIGHT}; cursor: pointer; }
.rs-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.rs-btn:not(:disabled):hover { background: var(--accent); color: ${INK}; }
.rs-choice { background: ${PAPER}; color: ${INK}; border: 2px solid ${INK}; padding: 10px 16px; font-family: ${SANS}; font-weight: 700; font-size: 16px; letter-spacing: ${TIGHT}; cursor: pointer; }
.rs-choice[aria-pressed="true"] { background: ${INK}; color: ${PAPER}; }
`;

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: PAPER, color: INK, fontFamily: SERIF },
  column: { maxWidth: "720px", margin: "0 auto", padding: "0 16px 64px" },
  kicker: { fontFamily: SANS, fontWeight: 700, fontSize: "15px", letterSpacing: TIGHT, margin: 0 },
  display: {
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: "clamp(40px, 9vw, 68px)",
    lineHeight: 0.95,
    letterSpacing: TIGHTER,
    margin: "0 0 28px",
  },
  h2: {
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: "clamp(26px, 5vw, 34px)",
    lineHeight: 1.05,
    letterSpacing: TIGHTER,
    margin: "0 0 14px",
  },
  body: { fontSize: "21px", lineHeight: 1.5, margin: "0 0 18px" },
  note: { fontSize: "17px", lineHeight: 1.45, color: MUTED, margin: "0 0 16px" },
  q: { fontSize: "21px", lineHeight: 1.35, margin: "0 0 2px" },
  scale: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: SANS,
    fontSize: "13px",
    letterSpacing: "-0.01em",
    color: MUTED,
  },
  rule: { border: 0, borderTop: `2px solid ${INK}`, margin: "28px 0" },
  runIn: { fontFamily: SANS, fontWeight: 700, letterSpacing: TIGHT },
};

/** Full-bleed colour band: the part's colour, with its number set huge. */
function Band({ color, label, number }: { color: string; label: string; number?: string }) {
  return (
    <div style={{ background: color, marginBottom: "36px" }}>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "18px 16px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          minHeight: "92px",
          boxSizing: "border-box",
        }}
      >
        <p style={{ ...S.kicker, alignSelf: "flex-start" }}>{label}</p>
        {number && (
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "88px", lineHeight: 0.75, letterSpacing: TIGHTER }}>
            {number}
          </span>
        )}
      </div>
    </div>
  );
}

/** Four overlapping circles, one per question, multiplied like printed ink. */
function Circles() {
  const cols = [PART_COLOR.bad2, PART_COLOR.bad1, PART_COLOR.offense, PART_COLOR.valence];
  return (
    <svg viewBox="0 0 400 130" style={{ width: "100%", maxWidth: "460px", display: "block", margin: "8px 0 28px" }} aria-hidden>
      {cols.map((c, i) => (
        <circle key={c} cx={65 + i * 90} cy={65} r={62} fill={c} style={{ mixBlendMode: "multiply" }} />
      ))}
    </svg>
  );
}

function RatingSlider({
  value,
  onChange,
  low,
  high,
  label,
  color,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  low: string;
  high: string;
  label: string;
  color: string;
}) {
  const touched = value !== undefined;
  return (
    <div style={{ ["--thumb" as string]: color }}>
      <input
        type="range"
        className={`rs-range${touched ? "" : " untouched"}`}
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={1}
        value={touched ? value : 0}
        aria-label={label}
        aria-valuetext={touched ? String(value) : "not yet answered"}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => {
          // A tap on the untouched track at exactly the midpoint fires no change
          // event; record it so the participant isn't stuck.
          if (!touched) {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            onChange(Math.round(SCALE_MIN + frac * (SCALE_MAX - SCALE_MIN)));
          }
        }}
      />
      <div style={S.scale}>
        <span>−50 {low}</span>
        <span style={{ color: INK, fontWeight: 700, fontSize: "16px" }}>
          {touched ? (value > 0 ? `+${value}` : value) : "·"}
        </span>
        <span>{high} +50</span>
      </div>
    </div>
  );
}

// Where one score sits against the pilot's two age groups, on the -50..50 line.
function ScoreStrip({ term, score }: { term: Term; score: number }) {
  const ref = pilot.terms[term];
  const x = (v: number) => `${((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
  const dot = (v: number, size: number, fill: string, title: string) => (
    <div
      title={title}
      style={{
        position: "absolute",
        left: x(v),
        top: "50%",
        width: `${size}px`,
        height: `${size}px`,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: fill,
        mixBlendMode: "multiply",
      }}
    />
  );
  return (
    <div style={{ marginBottom: "26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "24px" }}>‘{term}’</span>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "17px", letterSpacing: TIGHT }}>
          {score > 0 ? "+" : ""}
          {score.toFixed(1)}
        </span>
      </div>
      <div style={{ position: "relative", height: "34px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "2px", background: INK }} />
        <div style={{ position: "absolute", left: "50%", top: "22%", bottom: "22%", width: "2px", background: INK }} />
        {dot(ref.under30.mean, 26, PLASMA_UNDER30, `Under-30s: ${ref.under30.mean}`)}
        {dot(ref.over60.mean, 26, PLASMA_OVER60, `Over-60s: ${ref.over60.mean}`)}
        {dot(score, 14, INK, `You: ${score.toFixed(1)}`)}
      </div>
      <div style={S.scale}>
        <span>−50</span>
        <span>0</span>
        <span>+50</span>
      </div>
    </div>
  );
}

type Stage =
  | "intro"
  | "block"
  | "age"
  | "sending"
  | "done"
  | "error"
  | "pSelf"
  | "pContext"
  | "pIngroup"
  | "pSending"
  | "pDone"
  | "pError";
type Draft = { [T in Term]?: { [M in Measure]?: number } };
type ContextDraft = { [T in Term]?: { [C in Context]?: number } };

const randomId = () =>
  (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)).slice(0, 16);

export default function Experiment({ session, tag }: { session: string; tag: string | null }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [blockIdx, setBlockIdx] = useState(0);
  const [ratings, setRatings] = useState<Draft>({});
  const [ageText, setAgeText] = useState("");
  const [self, setSelf] = useState<{ [T in Term]?: number }>({});
  const [ctx, setCtx] = useState<ContextDraft>({});
  const [ctxPage, setCtxPage] = useState(0);
  const [ingroup, setIngroup] = useState<{ [K in IngroupKey]?: IngroupAnswer }>({});
  const startedAt = useRef<number>(0);
  const pilotStartedAt = useRef<number>(0);
  const [rid] = useState(randomId);

  // Block order and within-block term order are randomized once per participant.
  const blockOrder = useMemo(() => shuffle(MEASURES), []);
  const termOrders = useMemo(
    () => Object.fromEntries(MEASURES.map((m) => [m, shuffle(TERMS)])) as Record<Measure, Term[]>,
    [],
  );
  // Pilot: self-reference terms shuffled; each context page shows every term
  // once, with friendly/hostile assigned at random per term and swapped on
  // the second page, so the two versions of a word never sit side by side.
  const selfOrder = useMemo(() => shuffle(TERMS), []);
  const ctxPages = useMemo(() => {
    const first = Object.fromEntries(TERMS.map((t) => [t, coin(CONTEXTS[0], CONTEXTS[1])])) as Record<
      Term,
      Context
    >;
    const flip = (c: Context): Context => (c === "friendly" ? "hostile" : "friendly");
    return [shuffle(TERMS).map((t) => ({ t, c: first[t] })), shuffle(TERMS).map((t) => ({ t, c: flip(first[t]) }))];
  }, []);

  const measure = blockOrder[blockIdx];
  const spec = MEASURE_SPECS[measure];
  const color = PART_COLOR[measure];
  const blockDone = TERMS.every((t) => ratings[t]?.[measure] !== undefined);

  const ageNum = ageText.trim() === "" ? null : Number(ageText);
  const ageValid = ageNum === null || (Number.isInteger(ageNum) && ageNum >= 16 && ageNum <= 100);

  const top = () => window.scrollTo({ top: 0 });
  const accent = (c: string) => ({ ["--accent" as string]: c }) as React.CSSProperties;

  async function post(url: string, payload: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.ok;
  }

  async function submit() {
    setStage("sending");
    try {
      const ok = await post(`/api/experiments/${SLUG}`, {
        session,
        rid,
        ...(tag ? { tag } : {}),
        submittedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.current,
        blockOrder,
        ratings: ratings as Ratings,
        age: ageNum,
      });
      setStage(ok ? "done" : "error");
    } catch {
      setStage("error");
    }
  }

  async function submitPilot() {
    setStage("pSending");
    try {
      const ok = await post(`/api/experiments/${SLUG}/pilot`, {
        session,
        rid,
        submittedAt: new Date().toISOString(),
        durationMs: Date.now() - pilotStartedAt.current,
        self,
        context: ctx,
        ingroup,
      });
      setStage(ok ? "pDone" : "pError");
    } catch {
      setStage("pError");
    }
  }

  const ingroupKeys = Object.keys(INGROUP_QUESTIONS) as IngroupKey[];

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {stage === "intro" && (
        <>
          <Band color={HS.grey[0]} label="Classroom survey · about 3 minutes" />
          <div style={S.column}>
            <Circles />
            <h1 style={S.display}>Four words, four questions</h1>
            <p style={S.body}>
              You will see four words that are sometimes used to describe people. For each one we ask four short
              questions, each on a slider from −50 to +50. There are no right answers: we want to know how the words
              strike <em>you</em>.
            </p>
            <p style={S.note}>
              Some of these words can be used as insults. Your answers are anonymous: nothing identifies you, and the
              class will only see pooled results. You can stop at any time.
            </p>
            <button
              className="rs-btn"
              style={accent(HS.orange[1])}
              onClick={() => {
                startedAt.current = Date.now();
                setStage("block");
              }}
            >
              Begin →
            </button>
          </div>
        </>
      )}

      {stage === "block" && (
        <>
          <Band color={color} label={`Part ${blockIdx + 1} of ${blockOrder.length}`} number={String(blockIdx + 1)} />
          <div style={S.column}>
            <h2 style={S.h2}>{spec.question("____")}</h2>
            <p style={S.note}>Move each slider. The marker appears once you touch the line.</p>
            <hr style={S.rule} />
            {termOrders[measure].map((t) => (
              <div key={t} style={{ marginBottom: "30px" }}>
                <p style={S.q}>{spec.question(t)}</p>
                <RatingSlider
                  value={ratings[t]?.[measure]}
                  onChange={(v) => setRatings((p) => ({ ...p, [t]: { ...p[t], [measure]: v } }))}
                  low={spec.low}
                  high={spec.high}
                  label={spec.question(t)}
                  color={color}
                />
              </div>
            ))}
            <button
              className="rs-btn"
              style={accent(color)}
              disabled={!blockDone}
              onClick={() => {
                top();
                if (blockIdx + 1 < blockOrder.length) setBlockIdx(blockIdx + 1);
                else setStage("age");
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {stage === "age" && (
        <>
          <Band color={HS.grey[1]} label="Last question" />
          <div style={S.column}>
            <h2 style={S.h2}>What is your age in years?</h2>
            <p style={S.note}>Optional. Leave it blank if you would rather not say.</p>
            <input
              inputMode="numeric"
              aria-label="Age in years"
              value={ageText}
              onChange={(e) => setAgeText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              style={{
                border: 0,
                borderBottom: `2px solid ${INK}`,
                padding: "8px 2px",
                fontSize: "36px",
                fontFamily: SANS,
                fontWeight: 700,
                letterSpacing: TIGHT,
                width: "120px",
                background: "transparent",
                outline: "none",
                display: "block",
                marginBottom: "18px",
              }}
            />
            {!ageValid && (
              <p style={{ ...S.note, color: HS.orange[3] }}>
                Please enter a whole number between 16 and 100, or leave it blank.
              </p>
            )}
            <button className="rs-btn" style={accent(HS.grey[1])} disabled={!ageValid} onClick={submit}>
              Submit →
            </button>
          </div>
        </>
      )}

      {(stage === "sending" || stage === "pSending") && (
        <div style={{ ...S.column, paddingTop: "80px" }}>
          <p style={S.body}>Sending…</p>
        </div>
      )}

      {(stage === "error" || stage === "pError") && (
        <div style={{ ...S.column, paddingTop: "80px" }}>
          <p style={S.body}>Something went wrong sending your answers.</p>
          <button className="rs-btn" style={accent(HS.orange[1])} onClick={stage === "error" ? submit : submitPilot}>
            Try again
          </button>
        </div>
      )}

      {stage === "done" && (
        <>
          <Band color={HS.grey[0]} label="Recorded · thank you" />
          <div style={S.column}>
            <h2 style={S.h2}>Where your answers sit</h2>
            <p style={S.body}>
              Averaging your four answers for a word gives one score from −50 to +50. Lower means the word struck you as
              more pejorative. The large circles are averages from a 2025 online survey of US adults that asked the same
              questions: the <span style={{ color: PLASMA_UNDER30 }}>●</span> under-30s and the{" "}
              <span style={{ color: "#D9A800" }}>●</span> over-60s. The small black dot is you.
            </p>
            <hr style={S.rule} />
            {TERMS.map((t) => (
              <ScoreStrip key={t} term={t} score={composite(ratings[t] as Record<Measure, number>)} />
            ))}
            <hr style={S.rule} />
            <h2 style={S.h2}>Part two: a pilot</h2>
            <p style={S.body}>
              A few new questions that are not in the published study, testing ideas for where the research could go
              next. About two minutes. Wait for your instructor&apos;s go-ahead.
            </p>
            <button
              className="rs-btn"
              style={accent(HS.blue[1])}
              onClick={() => {
                pilotStartedAt.current = Date.now();
                top();
                setStage("pSelf");
              }}
            >
              Continue to part two →
            </button>
          </div>
        </>
      )}

      {stage === "pSelf" && (
        <>
          <Band color={PART_COLOR.pilot} label="Part two · Pilot · 1 of 3" number="A" />
          <div style={S.column}>
            <h2 style={S.h2}>How bad or good is it to call yourself ‘____’?</h2>
            <p style={S.note}>Imagine using the word about yourself, not about someone else.</p>
            <hr style={S.rule} />
            {selfOrder.map((t) => (
              <div key={t} style={{ marginBottom: "30px" }}>
                <p style={S.q}>{SELF_QUESTION(t)}</p>
                <RatingSlider
                  value={self[t]}
                  onChange={(v) => setSelf((p) => ({ ...p, [t]: v }))}
                  low="Bad"
                  high="Good"
                  label={SELF_QUESTION(t)}
                  color={HS.blue[1]}
                />
              </div>
            ))}
            <button
              className="rs-btn"
              style={accent(HS.blue[1])}
              disabled={!TERMS.every((t) => self[t] !== undefined)}
              onClick={() => {
                top();
                setStage("pContext");
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {stage === "pContext" && (
        <>
          <Band color={PART_COLOR.pilotAlt} label="Part two · Pilot · 2 of 3" number={ctxPage === 0 ? "B" : "B′"} />
          <div style={S.column}>
            <h2 style={S.h2}>The same words, said in different situations</h2>
            <p style={S.note}>Read each short scene, then rate what the speaker said.</p>
            <hr style={S.rule} />
            {ctxPages[ctxPage].map(({ t, c }) => (
              <div key={t} style={{ marginBottom: "34px" }}>
                <p style={{ ...S.q, fontStyle: "italic", marginBottom: "6px" }}>{CONTEXT_SPECS[c].scene(t)}</p>
                <p style={{ ...S.q, fontSize: "18px" }}>{CONTEXT_QUESTION}</p>
                <RatingSlider
                  value={ctx[t]?.[c]}
                  onChange={(v) => setCtx((p) => ({ ...p, [t]: { ...p[t], [c]: v } }))}
                  low="Bad"
                  high="Good"
                  label={`${CONTEXT_SPECS[c].scene(t)} ${CONTEXT_QUESTION}`}
                  color={HS.green[1]}
                />
              </div>
            ))}
            <button
              className="rs-btn"
              style={accent(HS.green[1])}
              disabled={!ctxPages[ctxPage].every(({ t, c }) => ctx[t]?.[c] !== undefined)}
              onClick={() => {
                top();
                if (ctxPage === 0) setCtxPage(1);
                else setStage("pIngroup");
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {stage === "pIngroup" && (
        <>
          <Band color={HS.pink[0]} label="Part two · Pilot · 3 of 3" number="C" />
          <div style={S.column}>
            <h2 style={S.h2}>Two questions about you</h2>
            <p style={S.note}>
              Optional: “Prefer not to say” is always fine. The class only sees results for a group once it has at least
              five people in it, so no one can be picked out.
            </p>
            <hr style={S.rule} />
            {ingroupKeys.map((k) => (
              <div key={k} style={{ marginBottom: "30px" }}>
                <p style={{ ...S.q, marginBottom: "12px" }}>{INGROUP_QUESTIONS[k].question}</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(
                    [
                      ["yes", "Yes"],
                      ["no", "No"],
                      ["na", "Prefer not to say"],
                    ] as [IngroupAnswer, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className="rs-choice"
                      aria-pressed={ingroup[k] === v}
                      onClick={() => setIngroup((p) => ({ ...p, [k]: v }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="rs-btn"
              style={accent(HS.pink[1])}
              disabled={!ingroupKeys.every((k) => ingroup[k])}
              onClick={submitPilot}
            >
              Submit →
            </button>
          </div>
        </>
      )}

      {stage === "pDone" && (
        <>
          <Band color={PART_COLOR.pilot} label="Recorded · thank you" />
          <div style={S.column}>
            <h2 style={S.h2}>What the pilot is testing</h2>
            <p style={S.body}>
              <span style={S.runIn}>A. Calling yourself.</span> If a word is being reclaimed, using it about yourself may
              be fine even when using it about others is not.
            </p>
            <p style={S.body}>
              <span style={S.runIn}>B. Same words, different scenes.</span> If the gap between the friendly and the
              hostile version is large, perhaps what has changed is less the word&apos;s meaning than how much its effect
              depends on who says it and how.
            </p>
            <p style={S.body}>
              <span style={S.runIn}>C. Who is answering.</span> Reclamation is often said to start inside the group a word
              targets. Comparing answers by group checks that, so long as each group is large enough to report.
            </p>
            <p style={S.note}>Your instructor will show the class results.</p>
          </div>
        </>
      )}
    </div>
  );
}
