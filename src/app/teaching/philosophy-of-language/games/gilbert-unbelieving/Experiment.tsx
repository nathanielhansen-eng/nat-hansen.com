"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F5F5F4",
  surface: "#FFFFFF",
  border: "#D6D3D1",
  text: "#1C1917",
  muted: "#78716C",
  body: "#44403C",
  accent: "#1C1917",
  green: "#1A7840",
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
    padding: "20px",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "clamp(24px, 5vw, 52px) clamp(20px, 5vw, 56px)",
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
  h1: { fontSize: "34px", fontWeight: 400, lineHeight: "1.15", marginBottom: "28px", color: C.text },
  h2: { fontSize: "24px", fontWeight: 400, lineHeight: "1.2", marginBottom: "20px", color: C.text },
  body: { fontSize: "19px", lineHeight: "1.72", color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: "1.6", color: C.muted, marginBottom: "16px" },
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
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
};

// Pool of Hopi-style nonsense propositions from Gilbert et al. 1990 Table 1
const POOL: Array<{ x: string; y: string }> = [
  { x: "ghoren", y: "jug" },
  { x: "monishna", y: "star" },
  { x: "cirell", y: "tree" },
  { x: "tarka", y: "wolf" },
  { x: "dinca", y: "flame" },
  { x: "polay", y: "stream" },
  { x: "tica", y: "fox" },
  { x: "bilicar", y: "spear" },
  { x: "korrom", y: "mountain" },
  { x: "curira", y: "necklace" },
  { x: "waihas", y: "fish" },
  { x: "rotan", y: "hunter" },
  { x: "wika", y: "deer" },
  { x: "rirg", y: "valley" },
  { x: "suffa", y: "cloud" },
  { x: "walive", y: "bear" },
  { x: "tecrill", y: "mouse" },
  { x: "basol", y: "fisherman" },
  { x: "casin", y: "rope" },
  { x: "nasli", y: "snake" },
  { x: "twyrin", y: "doctor" },
  { x: "bandi", y: "raccoon" },
  { x: "dalith", y: "root" },
  { x: "tiloom", y: "cup" },
  { x: "gafin", y: "pinecone" },
  { x: "hib", y: "canoe" },
  { x: "trica", y: "weasel" },
  { x: "neseti", y: "bee" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type SignalKind = "true" | "false" | "blank";
type Role = "buffer" | "filler" | "critical";

interface Trial {
  idx: number;
  x: string;
  y: string; // the y the subject sees in "An X is a Y" (may be wrong if signal=false)
  trueY: string; // the actually correct y for this x (used in test)
  signal: SignalKind;
  interrupted: boolean;
  role: Role;
}

interface TestItem {
  x: string;
  y: string; // the y as paired in the learning phase
  signal: SignalKind; // what the signal said
  interrupted: boolean;
  isFoil: boolean; // not seen during learning
}

// Build a 20-trial sequence:
// 4 buffers (2 start, 2 end), 16 middle slots:
//   12 critical (6 TRUE, 6 FALSE, 2 of each TRUE/FALSE interrupted)
//   4 fillers (BLANK signal)
function buildTrials(): { trials: Trial[]; foils: Array<{ x: string; y: string }> } {
  const pool = shuffle(POOL);
  // 20 used in sequence + 4 foils for test
  const seq = pool.slice(0, 20);
  const foilSrc = pool.slice(20, 24);

  // Generate "wrong" pairings for FALSE trials by shifting the y values within the false-trial group.
  // First decide roles for each of the 20 stimuli once placed in trial order.

  // Random assignment of role to slots 1..20:
  // slots 0,1,18,19 = buffers; among 2..17 randomly place 6 TRUE crit, 6 FALSE crit, 4 BLANK fillers.
  const middleSlots = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const shuffledMiddle = shuffle(middleSlots);
  const trueSlots = new Set(shuffledMiddle.slice(0, 6));
  const falseSlots = new Set(shuffledMiddle.slice(6, 12));
  // remaining 4 are blank fillers

  // Pick 2 of the 6 TRUE crit slots and 2 of the 6 FALSE crit slots to be interrupted
  const trueArr = [...trueSlots];
  const falseArr = [...falseSlots];
  const interruptedTrue = new Set(shuffle(trueArr).slice(0, 2));
  const interruptedFalse = new Set(shuffle(falseArr).slice(0, 2));

  // For FALSE slots, swap the y values in a derangement among themselves so each gets a wrong y
  const falseStimuli = falseArr.map((s) => ({ slot: s, x: seq[s].x, trueY: seq[s].y }));
  // Simple derangement: rotate ys by one
  const rotatedYs = falseStimuli.map((_, i) => falseStimuli[(i + 1) % falseStimuli.length].trueY);
  const wrongYBySlot = new Map<number, string>();
  falseStimuli.forEach((fs, i) => wrongYBySlot.set(fs.slot, rotatedYs[i]));

  const trials: Trial[] = seq.map((p, i) => {
    let role: Role;
    let signal: SignalKind;
    let interrupted = false;
    let yShown = p.y;

    if (i < 2 || i >= 18) {
      role = "buffer";
      // Buffers get random T/F so subject can't tell, but no interruption
      signal = Math.random() < 0.5 ? "true" : "false";
      if (signal === "false") {
        // give a wrong y from elsewhere
        const other = seq[(i + 7) % seq.length].y;
        yShown = other === p.y ? seq[(i + 9) % seq.length].y : other;
      }
    } else if (trueSlots.has(i)) {
      role = "critical";
      signal = "true";
      interrupted = interruptedTrue.has(i);
    } else if (falseSlots.has(i)) {
      role = "critical";
      signal = "false";
      interrupted = interruptedFalse.has(i);
      yShown = wrongYBySlot.get(i) ?? p.y;
    } else {
      role = "filler";
      signal = "blank";
    }

    return {
      idx: i,
      x: p.x,
      y: yShown,
      trueY: p.y,
      signal,
      interrupted,
      role,
    };
  });

  return { trials, foils: foilSrc };
}

type Phase =
  | "intro"
  | "instructions"
  | "learning"
  | "between"
  | "test"
  | "results";

type SubPhase = "proposition" | "blank1" | "signal" | "blank2";

type TestResponse = "true" | "false" | "noinfo" | "neverseen";

interface TestRow {
  x: string;
  y: string;
  signal: SignalKind;
  interrupted: boolean;
  isFoil: boolean;
  response: TestResponse;
}

const PROP_MS = 4000;
const BLANK1_MS = 1000;
const SIGNAL_MS = 2200;
const BLANK2_MS = 800;
const TONE_DELAY_MS = 750; // after signal onset
const TONE_DUR_MS = 390;

export default function Experiment({ session }: { session: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [foils, setFoils] = useState<Array<{ x: string; y: string }>>([]);
  const [trialIdx, setTrialIdx] = useState(0);
  const [sub, setSub] = useState<SubPhase>("proposition");
  const [tonePlaying, setTonePlaying] = useState(false);
  const [toneResponded, setToneResponded] = useState(false);
  const [missedTones, setMissedTones] = useState(0);
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testResponses, setTestResponses] = useState<TestRow[]>([]);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const toneRespondedRef = useRef(false);

  // Init trials
  useEffect(() => {
    const { trials: t, foils: f } = buildTrials();
    setTrials(t);
    setFoils(f);
  }, []);

  const playTone = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 500;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + TONE_DUR_MS / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + TONE_DUR_MS / 1000 + 0.05);
    } catch {
      /* no-op */
    }
  }, []);

  // Drive trial subphases
  useEffect(() => {
    if (phase !== "learning" || trials.length === 0) return;
    if (trialIdx >= trials.length) {
      setPhase("between");
      return;
    }
    const trial = trials[trialIdx];

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    setSub("proposition");
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setSub("blank1");
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setSub("signal");
            // Schedule tone
            if (trial.interrupted) {
              setToneResponded(false);
              toneRespondedRef.current = false;
              timers.push(
                setTimeout(() => {
                  if (cancelled) return;
                  setTonePlaying(true);
                  playTone();
                  timers.push(
                    setTimeout(() => {
                      if (cancelled) return;
                      setTonePlaying(false);
                      if (!toneRespondedRef.current) {
                        setMissedTones((m) => m + 1);
                      }
                    }, TONE_DUR_MS + 1200)
                  );
                }, TONE_DELAY_MS)
              );
            }
            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setSub("blank2");
                timers.push(
                  setTimeout(() => {
                    if (cancelled) return;
                    setTrialIdx((i) => i + 1);
                  }, BLANK2_MS)
                );
              }, SIGNAL_MS)
            );
          }, BLANK1_MS)
        );
      }, PROP_MS)
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, trialIdx, trials, playTone]);

  // Tone keypress handler
  useEffect(() => {
    if (phase !== "learning") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && tonePlaying) {
        e.preventDefault();
        toneRespondedRef.current = true;
        setToneResponded(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, tonePlaying]);

  // Build test items when entering between phase
  useEffect(() => {
    if (phase !== "between" || testItems.length > 0) return;
    const critical = trials.filter((t) => t.role === "critical");
    const items: TestItem[] = [
      ...critical.map((t) => ({
        x: t.x,
        y: t.y,
        signal: t.signal,
        interrupted: t.interrupted,
        isFoil: false,
      })),
      ...foils.map((f) => ({
        x: f.x,
        y: f.y,
        signal: "blank" as SignalKind,
        interrupted: false,
        isFoil: true,
      })),
    ];
    setTestItems(shuffle(items));
  }, [phase, trials, foils, testItems.length]);

  const submitTestResponse = (resp: TestResponse) => {
    const item = testItems[testIdx];
    const row: TestRow = { ...item, response: resp };
    const newRows = [...testResponses, row];
    setTestResponses(newRows);
    if (testIdx + 1 >= testItems.length) {
      finishExperiment(newRows);
    } else {
      setTestIdx((i) => i + 1);
    }
  };

  const finishExperiment = async (rows: TestRow[]) => {
    setPhase("results");
    try {
      const payload = {
        session,
        submittedAt: new Date().toISOString(),
        missedTones,
        responses: rows,
      };
      const resp = await fetch("/api/experiments/gilbert-unbelieving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(resp.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
  };

  // ============ RENDER ============

  if (phase === "intro")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Gilbert, Krull &amp; Malone · J. Pers. Soc. Psychol. · 1990</div>
          <h1 style={base.h1}>
            Unbelieving the
            <br />
            Unbelievable
          </h1>
          <p style={base.body}>
            Spinoza claimed that to <em>understand</em> a proposition is already to <em>accept</em>{" "}
            it as true; rejecting a falsehood requires a second, separate effort that can be
            disrupted. Descartes denied this — for him, comprehension and assent are independent.
          </p>
          <p style={base.body}>
            Gilbert et al.&apos;s Study 1 set out to decide between them. You will play the role of
            their subject: learn a small fragment of an invented &ldquo;Hopi&rdquo; vocabulary,
            occasionally have your processing interrupted by a tone, and then sit a memory test.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            Your anonymous responses will be added to the class aggregate for in-class discussion.
          </p>
          <div style={base.divider} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {[
              ["Part I", "Vocabulary", "20 trials. Each pairs an invented word with an English noun and labels it TRUE or FALSE."],
              ["Part II", "Identification", "Was each item true, false, never seen — or did you see it but get no signal?"],
            ].map(([label, title, desc]) => (
              <div key={label} style={{ borderTop: `2px solid ${C.border}`, paddingTop: "16px" }}>
                <div style={{ ...base.eyebrow, marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px", color: C.text }}>{title}</div>
                <div style={{ fontSize: "15px", color: C.muted, lineHeight: "1.5" }}>{desc}</div>
              </div>
            ))}
          </div>
          <button style={base.btn} onClick={() => setPhase("instructions")}>
            Continue →
          </button>
        </div>
      </div>
    );

  if (phase === "instructions")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Read carefully</div>
          <h2 style={base.h2}>How a trial works</h2>
          <p style={base.body}>
            On each trial you will see a proposition of the form{" "}
            <strong>&ldquo;A <em>twyrin</em> is a doctor.&rdquo;</strong> A few seconds later either
            the word <strong>TRUE</strong> or <strong>FALSE</strong>{" "}will appear, telling you
            whether the pairing was real Hopi or invented. On some trials the signal is missing
            entirely — those will be marked &ldquo;no info&rdquo; in the test.
          </p>
          <p style={base.body}>
            Occasionally a <strong>tone</strong> will sound. The instant you hear it, press the{" "}
            <strong>space bar</strong> (or, on a phone or tablet, <strong>tap the screen</strong>)
            as fast as you can. (This is the &ldquo;interruption&rdquo; manipulation — it competes
            for the cognitive work that would otherwise unbelieve a falsehood.)
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            Make sure your sound is on — and on iPhone, that the silent switch is off, otherwise
            the tone won&apos;t play. The whole learning phase takes about three minutes; please
            don&apos;t pause or switch tabs.
          </p>
          <button
            style={base.btn}
            onClick={() => {
              // Prime audio context with a user gesture
              try {
                const Ctx =
                  window.AudioContext ||
                  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                audioCtxRef.current = new Ctx();
              } catch {
                /* no-op */
              }
              setPhase("learning");
            }}
          >
            Start Part I →
          </button>
        </div>
      </div>
    );

  if (phase === "learning" && trials.length > 0 && trialIdx < trials.length) {
    const trial = trials[trialIdx];
    const onTapInterrupt = () => {
      if (tonePlaying && !toneRespondedRef.current) {
        toneRespondedRef.current = true;
        setToneResponded(true);
      }
    };
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div
          onClick={onTapInterrupt}
          style={{
            ...base.card,
            textAlign: "center",
            minHeight: "360px",
            cursor: tonePlaying && !toneResponded ? "pointer" : "default",
            background:
              tonePlaying && !toneResponded ? "#FFF5F0" : C.surface,
            transition: "background 0.1s",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div style={base.eyebrow}>Part I — Learning</div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {trialIdx + 1} / {trials.length}
            </div>
          </div>
          <div style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sub === "proposition" && (
              <div style={{ fontSize: "32px", color: C.text, fontWeight: 400 }}>
                A <em>{trial.x}</em> is a {trial.y}.
              </div>
            )}
            {sub === "blank1" && <div />}
            {sub === "signal" && (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "44px",
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  color:
                    trial.signal === "true"
                      ? C.green
                      : trial.signal === "false"
                      ? C.red
                      : "transparent",
                }}
              >
                {trial.signal === "true" ? "TRUE" : trial.signal === "false" ? "FALSE" : "—"}
              </div>
            )}
            {sub === "blank2" && <div />}
          </div>
          <div style={{ marginTop: "24px", minHeight: "60px" }}>
            {tonePlaying && !toneResponded && (
              <div
                style={{
                  display: "inline-block",
                  padding: "14px 28px",
                  border: `2px solid ${C.red}`,
                  borderRadius: "6px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "16px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.red,
                  fontWeight: 700,
                  background: C.surface,
                }}
              >
                <span style={{ fontSize: "22px", verticalAlign: "middle", marginRight: "8px" }}>♪</span>
                TAP / SPACE
              </div>
            )}
            {tonePlaying && toneResponded && (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "20px",
                  color: C.green,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "between")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Part I Complete</div>
          <h2 style={base.h1}>Now the test.</h2>
          <p style={base.body}>
            For each question, decide whether the original proposition was{" "}
            <strong>true</strong>, <strong>false</strong>, that you saw it but received{" "}
            <strong>no information</strong>, or that you <strong>never saw</strong> it.
          </p>
          {missedTones > 0 && (
            <p style={{ ...base.small, fontStyle: "italic", color: C.red }}>
              You missed {missedTones} tone{missedTones === 1 ? "" : "s"} — the interruption
              manipulation may have been weakened on those trials.
            </p>
          )}
          <button style={base.btn} onClick={() => setPhase("test")}>
            Start Part II →
          </button>
        </div>
      </div>
    );

  if (phase === "test" && testItems.length > 0 && testIdx < testItems.length) {
    const item = testItems[testIdx];
    const buttons: Array<{ label: string; resp: TestResponse }> = [
      { label: "True", resp: "true" },
      { label: "False", resp: "false" },
      { label: "No information", resp: "noinfo" },
      { label: "Never seen", resp: "neverseen" },
    ];
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={base.eyebrow}>Part II — Identification</div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {testIdx + 1} / {testItems.length}
            </div>
          </div>
          <div style={{ fontSize: "30px", textAlign: "center", margin: "40px 0", color: C.text }}>
            Is a <em>{item.x}</em> a {item.y}?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {buttons.map((b) => (
              <button
                key={b.resp}
                onClick={() => submitTestResponse(b.resp)}
                style={{
                  background: C.surface,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                  padding: "16px",
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "18px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.surface)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const crit = testResponses.filter((r) => !r.isFoil);
    const cell = (signal: SignalKind, interrupted: boolean, response: TestResponse) =>
      crit.filter((r) => r.signal === signal && r.interrupted === interrupted && r.response === response).length;
    const total = (signal: SignalKind, interrupted: boolean) =>
      crit.filter((r) => r.signal === signal && r.interrupted === interrupted).length;

    const rows = [
      { label: "TRUE props · uninterrupted", sig: "true" as SignalKind, intr: false },
      { label: "TRUE props · interrupted", sig: "true" as SignalKind, intr: true },
      { label: "FALSE props · uninterrupted", sig: "false" as SignalKind, intr: false },
      { label: "FALSE props · interrupted", sig: "false" as SignalKind, intr: true },
    ];

    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, maxWidth: "760px" }}>
          <div style={base.eyebrow}>Experiment Complete</div>
          <h1 style={base.h1}>Your data — and the Spinozan prediction</h1>
          {submitStatus === "ok" && (
            <p style={{ ...base.small, fontStyle: "italic", color: C.green }}>
              ✓ Your anonymous results were added to the class aggregate.
            </p>
          )}
          {submitStatus === "err" && (
            <p style={{ ...base.small, fontStyle: "italic", color: C.red }}>
              (Couldn&apos;t save to the class aggregate — your personal results are still shown
              below.)
            </p>
          )}

          <div style={{ overflowX: "auto", marginBottom: "28px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Space Mono', monospace",
                fontSize: "16px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `2px solid ${C.border}`,
                    color: C.muted,
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>Trial type</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>n</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>true</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>false</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>no info</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>never seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const n = total(r.sig, r.intr);
                  // Highlight the diagnostic cell: FALSE-interrupted-as-true (Spinozan error)
                  const diagnostic = r.sig === "false" && r.intr;
                  return (
                    <tr
                      key={r.label}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: diagnostic ? "#FFF5F0" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 10px",
                          color: C.text,
                          fontFamily: "'Crimson Pro', serif",
                          fontSize: "18px",
                        }}
                      >
                        {r.label.replace("interrupted", "interrupted ")}
                        {r.intr && (
                          <span
                            style={{
                              color: C.red,
                              fontWeight: 700,
                              fontSize: "22px",
                              marginLeft: "4px",
                              verticalAlign: "middle",
                            }}
                          >
                            ♪
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", padding: "14px 10px", color: C.muted }}>{n}</td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "14px 10px",
                          color: diagnostic ? C.red : C.text,
                          fontWeight: diagnostic ? 700 : 400,
                          fontSize: diagnostic ? "20px" : "16px",
                        }}
                      >
                        {cell(r.sig, r.intr, "true")}
                      </td>
                      <td style={{ textAlign: "right", padding: "14px 10px" }}>{cell(r.sig, r.intr, "false")}</td>
                      <td style={{ textAlign: "right", padding: "14px 10px" }}>{cell(r.sig, r.intr, "noinfo")}</td>
                      <td style={{ textAlign: "right", padding: "14px 10px" }}>{cell(r.sig, r.intr, "neverseen")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "12px" }}>
            Item-by-item — grouped by trial type
          </div>
          {(() => {
            const respLabel: Record<TestResponse, string> = {
              true: "true",
              false: "false",
              noinfo: "no info",
              neverseen: "never seen",
            };
            const correctFor = (r: TestRow): TestResponse => {
              if (r.isFoil) return "neverseen";
              if (r.signal === "true") return "true";
              if (r.signal === "false") return "false";
              return "noinfo";
            };

            // Group rows in the order that makes the asymmetry pop:
            // TRUE-un, TRUE-int, FALSE-un, FALSE-int, then foils
            const groups: Array<{
              label: string;
              rows: TestRow[];
              accent: string;
              diagnostic?: boolean;
            }> = [
              {
                label: "TRUE propositions · uninterrupted",
                rows: testResponses.filter((r) => !r.isFoil && r.signal === "true" && !r.interrupted),
                accent: C.green,
              },
              {
                label: "TRUE propositions · interrupted ♪",
                rows: testResponses.filter((r) => !r.isFoil && r.signal === "true" && r.interrupted),
                accent: C.green,
              },
              {
                label: "FALSE propositions · uninterrupted",
                rows: testResponses.filter((r) => !r.isFoil && r.signal === "false" && !r.interrupted),
                accent: C.red,
              },
              {
                label: "FALSE propositions · interrupted ♪  (the diagnostic cell)",
                rows: testResponses.filter((r) => !r.isFoil && r.signal === "false" && r.interrupted),
                accent: C.red,
                diagnostic: true,
              },
              {
                label: "Foils · never shown in Part I",
                rows: testResponses.filter((r) => r.isFoil),
                accent: C.muted,
              },
            ];

            return (
              <>
                <div style={{ overflowX: "auto", marginBottom: "12px" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontFamily: "'Crimson Pro', Georgia, serif",
                      fontSize: "17px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          color: C.muted,
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "12px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        <th style={{ textAlign: "left", padding: "10px 8px" }}>Proposition</th>
                        <th style={{ textAlign: "left", padding: "10px 8px" }}>You said</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", width: "44px" }}>
                          ✓/✗
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <React.Fragment key={g.label}>
                          <tr key={`hdr-${g.label}`}>
                            <td
                              colSpan={3}
                              style={{
                                padding: "16px 8px 6px",
                                fontFamily: "'Space Mono', monospace",
                                fontSize: "12px",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: g.diagnostic ? C.red : g.accent,
                                fontWeight: 700,
                                borderBottom: `2px solid ${g.diagnostic ? C.red : g.accent}`,
                              }}
                            >
                              {g.label}{" "}
                              <span style={{ color: C.muted, fontWeight: 400, marginLeft: "8px" }}>
                                ({g.rows.length})
                              </span>
                            </td>
                          </tr>
                          {g.rows.length === 0 && (
                            <tr key={`empty-${g.label}`}>
                              <td
                                colSpan={3}
                                style={{
                                  padding: "10px 8px",
                                  color: C.muted,
                                  fontStyle: "italic",
                                  fontSize: "15px",
                                }}
                              >
                                (none)
                              </td>
                            </tr>
                          )}
                          {g.rows.map((r, i) => {
                            const correct = r.response === correctFor(r);
                            const spinozanError =
                              !r.isFoil &&
                              r.signal === "false" &&
                              r.interrupted &&
                              r.response === "true";
                            return (
                              <tr
                                key={`${g.label}-${i}`}
                                style={{
                                  borderBottom: `1px solid ${C.border}`,
                                  background: spinozanError ? "#FFF5F0" : "transparent",
                                }}
                              >
                                <td style={{ padding: "12px 8px", color: C.text }}>
                                  A <em>{r.x}</em> is a {r.y}.
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    fontFamily: "'Space Mono', monospace",
                                    fontSize: "14px",
                                    color: spinozanError ? C.red : C.text,
                                    fontWeight: spinozanError ? 700 : 400,
                                  }}
                                >
                                  {respLabel[r.response]}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 8px",
                                    textAlign: "center",
                                    color: correct ? C.green : C.red,
                                    fontFamily: "'Space Mono', monospace",
                                    fontSize: "20px",
                                    fontWeight: 700,
                                  }}
                                >
                                  {correct ? "✓" : "✗"}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: "15px", color: C.muted, fontStyle: "italic", marginBottom: "0" }}>
                  Rows are grouped so the four-way comparison is visible at a glance. The pink-shaded
                  rows are diagnostic Spinozan errors — false propositions you assented to after
                  the tone interrupted your processing.
                </p>
              </>
            );
          })()}

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "12px" }}>Your scorecard</div>
          {(() => {
            const scored = testResponses.map((r) => {
              let correctResp: TestResponse;
              if (r.isFoil) correctResp = "neverseen";
              else if (r.signal === "true") correctResp = "true";
              else if (r.signal === "false") correctResp = "false";
              else correctResp = "noinfo";
              return { r, correct: r.response === correctResp };
            });
            const totalCorrect = scored.filter((s) => s.correct).length;
            const tUn = scored.filter((s) => !s.r.isFoil && s.r.signal === "true" && !s.r.interrupted);
            const tIn = scored.filter((s) => !s.r.isFoil && s.r.signal === "true" && s.r.interrupted);
            const fUn = scored.filter((s) => !s.r.isFoil && s.r.signal === "false" && !s.r.interrupted);
            const fIn = scored.filter((s) => !s.r.isFoil && s.r.signal === "false" && s.r.interrupted);
            const pct = (arr: typeof scored) =>
              arr.length === 0 ? "—" : `${Math.round((100 * arr.filter((s) => s.correct).length) / arr.length)}%`;
            const scoreCells = [
              { label: "TRUE · uninterrupted", arr: tUn },
              { label: "TRUE · interrupted", arr: tIn },
              { label: "FALSE · uninterrupted", arr: fUn },
              { label: "FALSE · interrupted", arr: fIn, diagnostic: true },
            ];
            return (
              <>
                <p style={{ ...base.body, marginBottom: "20px" }}>
                  You answered{" "}
                  <strong>
                    {totalCorrect} of {scored.length}
                  </strong>{" "}
                  correctly overall.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
                  {scoreCells.map((cell) => {
                    const intr = cell.label.includes("interrupted");
                    return (
                      <div
                        key={cell.label}
                        style={{
                          borderTop: `2px solid ${cell.diagnostic ? C.red : C.border}`,
                          background: cell.diagnostic ? "#FFF5F0" : "transparent",
                          padding: "16px 14px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "12px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: C.muted,
                            marginBottom: "10px",
                          }}
                        >
                          {cell.label.replace(" · interrupted", "")}
                          {intr && (
                            <>
                              {" · interrupted "}
                              <span
                                style={{
                                  color: C.red,
                                  fontWeight: 700,
                                  fontSize: "20px",
                                  verticalAlign: "middle",
                                }}
                              >
                                ♪
                              </span>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: "34px", fontWeight: 300, color: C.text, lineHeight: 1 }}>
                          {cell.arr.filter((s) => s.correct).length}
                          <span style={{ fontSize: "20px", color: C.muted }}>/{cell.arr.length}</span>
                          <span
                            style={{
                              fontSize: "18px",
                              color: cell.diagnostic ? C.red : C.muted,
                              fontFamily: "'Space Mono', monospace",
                              marginLeft: "12px",
                              fontWeight: cell.diagnostic ? 700 : 400,
                            }}
                          >
                            {pct(cell.arr)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          <div style={base.divider} />
          <div style={{ ...base.eyebrow, marginBottom: "12px" }}>What Gilbert et al. found</div>
          <p style={base.body}>
            With 33 subjects, interruption had <strong>no effect</strong> on the correct
            identification of true propositions (55% → 58%) but <strong>significantly reduced</strong>{" "}
            correct identification of false ones (55% → 35%). Crucially, interrupted false
            propositions were misidentified as <em>true</em> 33% of the time, while interrupted
            true propositions were misidentified as <em>false</em> only 17% of the time.
          </p>
          <p style={base.body}>
            That is the asymmetry Spinoza predicts and Descartes does not: comprehension carries
            tentative belief by default; rejecting a falsehood is a separate, fragile second
            step. The pink-shaded cell in your table is the diagnostic one — the
            quintessentially Spinozan mistake.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            One subject is one data point; the effect is statistical. The class aggregate (visible
            to your instructor) is what should look like Gilbert&apos;s pattern.
          </p>

          <button
            style={base.btn}
            onClick={() => {
              const { trials: t, foils: f } = buildTrials();
              setTrials(t);
              setFoils(f);
              setTrialIdx(0);
              setSub("proposition");
              setTonePlaying(false);
              setToneResponded(false);
              setMissedTones(0);
              setTestItems([]);
              setTestIdx(0);
              setTestResponses([]);
              setSubmitStatus("idle");
              setPhase("intro");
            }}
          >
            Run Again ↺
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={base.wrap}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <p style={base.body}>Loading…</p>
      </div>
    </div>
  );
}
