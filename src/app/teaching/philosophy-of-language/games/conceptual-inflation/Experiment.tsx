"use client";

import { useState, useEffect, useMemo, useRef } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
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
  input: {
    border: `1px solid ${C.border}`,
    padding: "12px 16px",
    fontSize: "19px",
    fontFamily: "'Crimson Pro', Georgia, serif",
    width: "100%",
    outline: "none",
    background: "#FDFAF5",
    boxSizing: "border-box",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type QType = "extension" | "intensity";

interface Question {
  term: string;
  type: QType;
}

interface Block {
  id: string;
  questions: Question[];
}

const RACE_OPTIONS = [
  {
    key: "ai_an",
    label: "American Indian or Alaska Native",
    detail:
      "For example, Navajo Nation, Blackfeet Tribe, Mayan, Aztec, Native Village of Barrow Inupiat Traditional Government, Nome Eskimo Community",
  },
  {
    key: "asian",
    label: "Asian",
    detail: "For example, Chinese, Filipino, Asian Indian, Vietnamese, Korean, Japanese",
  },
  {
    key: "black",
    label: "Black or African American",
    detail: "For example, Jamaican, Haitian, Nigerian, Ethiopian, Somalian",
  },
  {
    key: "hispanic",
    label: "Hispanic, Latino or Spanish Origin",
    detail:
      "For example, Mexican or Mexican American, Puerto Rican, Cuban, Salvadoran, Dominican, Columbian",
  },
  {
    key: "mena",
    label: "Middle Eastern or North African",
    detail: "For example, Lebanese, Iranian, Egyptian, Syrian, Moroccan, Algerian",
  },
  {
    key: "nh_pi",
    label: "Native Hawaiian or Other Pacific Islander",
    detail: "For example, Native Hawaiian, Samoan, Chamorro, Tongan, Fijian, Marshallese",
  },
  {
    key: "white",
    label: "White",
    detail: "For example, German, Irish, English, Italian, Polish, French",
  },
  { key: "other", label: "Some other race, ethnicity, or origin, please specify:", detail: null },
  { key: "decline", label: "I prefer not to answer", detail: null },
] as const;

const THIN = ["disagreeable", "terrible", "worthless"];
const DEGREE = ["slightly racist", "moderately racist", "extremely racist"];
const ALT = ["racially ignorant", "racially insensitive", "racially unjust"];

function buildBlocks(): { blocks: Block[]; bareOrder: QType[] } {
  // Two bare-racist blocks (ext, int) — counterbalance order
  const bareOrder: QType[] = Math.random() < 0.5 ? ["extension", "intensity"] : ["intensity", "extension"];

  const make = (id: string, type: QType, terms: string[]): Block => ({
    id,
    questions: shuffle(terms.map((t) => ({ term: t, type }))),
  });

  const six: Block[] = shuffle([
    make("thin-extension", "extension", THIN),
    make("thin-intensity", "intensity", THIN),
    make("degree-extension", "extension", DEGREE),
    make("degree-intensity", "intensity", DEGREE),
    make("alt-extension", "extension", ALT),
    make("alt-intensity", "intensity", ALT),
  ]);

  const blocks: Block[] = [
    ...bareOrder.map<Block>((t) => ({
      id: `bare-${t}`,
      questions: [{ term: "racist", type: t }],
    })),
    ...six,
  ];

  return { blocks, bareOrder };
}

interface Response {
  questionType: QType;
  term: string;
  value: number;
  rtMs: number;
}

interface Demographics {
  age: number | null;
  ageDeclined: boolean;
  gender: string | null;
  genderDeclined: boolean;
  race: string[];
  raceOther: string | null;
  raceDeclined: boolean;
}

type Phase = "intro" | "consent" | "questions" | "demographics" | "thanks";

export default function Experiment({ session }: { session: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [consented, setConsented] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const { blocks, blockOrderIds } = useMemo(() => {
    const { blocks } = buildBlocks();
    return { blocks, blockOrderIds: blocks.map((b) => b.id) };
  }, []);

  // flatten into a single page-per-question stream (preserving block order +
  // the in-block randomization done in buildBlocks)
  const questionStream: Question[] = useMemo(() => blocks.flatMap((b) => b.questions), [blocks]);

  const [qIdx, setQIdx] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);

  // slider state per question
  const [moved, setMoved] = useState(false);
  const [val, setVal] = useState(50);
  const [pageStart, setPageStart] = useState<number>(Date.now());

  // demographics state
  const [age, setAge] = useState("");
  const [ageDeclined, setAgeDeclined] = useState(false);
  const [gender, setGender] = useState("");
  const [genderDeclined, setGenderDeclined] = useState(false);
  const [raceSel, setRaceSel] = useState<string[]>([]);
  const [raceOther, setRaceOther] = useState("");

  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMoved(false);
    setVal(50);
    setPageStart(Date.now());
  }, [qIdx, phase]);

  const submitSlider = () => {
    if (!moved) return;
    const q = questionStream[qIdx];
    const rt = Date.now() - pageStart;
    setResponses((p) => [...p, { questionType: q.type, term: q.term, value: val, rtMs: rt }]);
    if (qIdx + 1 >= questionStream.length) {
      setPhase("demographics");
    } else {
      setQIdx((p) => p + 1);
    }
  };

  const ageNum = (() => {
    if (ageDeclined) return null;
    const n = parseInt(age.trim(), 10);
    if (Number.isNaN(n)) return null;
    return n;
  })();

  const demogValid = (() => {
    // age: either declined OR a sensible number
    const ageOk = ageDeclined || (age.trim() !== "" && ageNum !== null && ageNum >= 13 && ageNum <= 120);
    // gender: declined OR non-empty (<=200)
    const genderOk = genderDeclined || (gender.trim().length > 0 && gender.trim().length <= 200);
    // race: at least one selection; if "other" selected, raceOther must be non-empty (<=200)
    const otherSel = raceSel.includes("other");
    const raceOk =
      raceSel.length > 0 && (!otherSel || (raceOther.trim().length > 0 && raceOther.trim().length <= 200));
    return ageOk && genderOk && raceOk;
  })();

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const declined = raceSel.length === 1 && raceSel[0] === "decline";
    const demographics: Demographics = {
      age: ageDeclined ? null : ageNum,
      ageDeclined,
      gender: genderDeclined ? null : gender.trim(),
      genderDeclined,
      race: raceSel.filter((k) => k !== "decline"),
      raceOther: raceSel.includes("other") ? raceOther.trim() : null,
      raceDeclined: declined,
    };
    const payload = {
      session,
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      blockOrder: blockOrderIds,
      responses,
      demographics,
    };
    try {
      const r = await fetch("/api/experiments/conceptual-inflation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitStatus(r.ok ? "ok" : "err");
    } catch {
      setSubmitStatus("err");
    }
    setPhase("thanks");
    setSubmitting(false);
  };

  // ----------- INTRO -----------
  if (phase === "intro")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Hansen &amp; Liao · Forthcoming in Ergo</div>
          <h1 style={base.h1}>
            Measuring
            <br />
            Conceptual Inflation
          </h1>
          <p style={base.body}>
            Some philosophers and commentators argue that the meaning of <em>racist</em> has &ldquo;inflated&rdquo;
            — that it now applies to a wider range of people, or carries a different moral force, than it once
            did. This study asks two simple questions about <em>racist</em> and a set of comparison terms:{" "}
            <strong>how broadly does it apply</strong>, and <strong>how bad is it</strong> to be called one?
          </p>
          <p style={base.body}>
            You will respond to twenty 0–100 sliders, then answer a few short demographic questions. The whole
            thing takes about 5–10 minutes.
          </p>
          <p style={{ ...base.small, fontStyle: "italic" }}>
            Your anonymous responses will be compiled and used for in-class discussion.
          </p>
          <button style={base.btn} onClick={() => { setStartedAt(Date.now()); setPhase("consent"); }}>
            Begin →
          </button>
        </div>
      </div>
    );

  // ----------- CONSENT -----------
  if (phase === "consent")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Informed consent</div>
          <h2 style={base.h2}>Please read before continuing.</h2>
          <p style={base.body}>
            <strong>Project Title:</strong> The Social Meaning of Expressions Condemning Oppression
          </p>
          <p style={base.body}>
            <strong>Purpose:</strong> We are conducting a research study on the social meaning of expressions
            that relate to patterns of oppression and come with a force of moral condemnation. Participation in
            this study will involve filling out a brief questionnaire. We anticipate that your involvement will
            require approximately 5–10 minutes. You must be a normal adult English Speaker in the US to
            participate.
          </p>
          <p style={base.body}>
            <strong>Risks and Benefits:</strong> This study involves minimal risks. Participants will be asked
            to reflect on language use and meaning, and respond to survey questions. While this may make some
            people feel uncomfortable, the risk is not greater than what one would experience in daily life. We
            hope that the results will benefit the scientific community and the society.
          </p>
          <p style={base.body}>
            <strong>Confidentiality:</strong> All of your responses will be anonymous. In the interest of open
            science, we plan to make the anonymized results available to the scientific community.
          </p>
          <p style={base.body}>
            <strong>Voluntary Participation:</strong> Participation in this study is completely voluntary. Even
            if you decide to participate now, you may change your mind and stop at any time.
          </p>
          <p style={base.body}>
            <strong>Questions:</strong> If you have any questions about this study, you can contact the
            principal investigator, Shen-yi Liao, at liao.shen.yi@gmail.com. The University of Puget Sound
            Institutional Research Board has approved this research project.
          </p>
          <p style={{ ...base.body, fontWeight: 600 }}>Do you voluntarily consent to participate?</p>
          {consented === false && (
            <p style={{ ...base.small, color: "#CC1A14", fontStyle: "italic" }}>
              You declined to consent. You can close this tab; nothing has been recorded.
            </p>
          )}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              style={base.btn}
              onClick={() => {
                setConsented(true);
                setPhase("questions");
              }}
            >
              Yes, I consent →
            </button>
            <button
              style={base.btnGhost}
              onClick={() => setConsented(false)}
            >
              No
            </button>
          </div>
        </div>
      </div>
    );

  // ----------- QUESTIONS -----------
  if (phase === "questions") {
    const q = questionStream[qIdx];
    const isExt = q.type === "extension";
    const prompt = isExt
      ? `What percentage of people can be reasonably called '${q.term}'?`
      : `How bad is it for a person to be called '${q.term}'?`;
    const leftLabel = isExt ? "none" : "not at all";
    const rightLabel = isExt ? "all" : "the worst";

    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={{ ...base.card, padding: "44px 52px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div style={base.eyebrow}>
              {isExt ? "Extension" : "Intensity"}
            </div>
            <div style={{ ...base.mono, fontSize: "12px", color: C.muted }}>
              {qIdx + 1} / {questionStream.length}
            </div>
          </div>
          <h2 style={{ ...base.h2, marginBottom: "32px" }}>{prompt}</h2>

          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "10px",
              }}
            >
              <span>{leftLabel}</span>
              <span>{rightLabel}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={val}
              onChange={(e) => {
                setVal(parseInt(e.target.value, 10));
                setMoved(true);
              }}
              onInput={() => setMoved(true)}
              onTouchStart={() => { /* require an actual move */ }}
              style={{
                width: "100%",
                accentColor: C.accent,
                touchAction: "manipulation",
              }}
            />
            <div
              style={{
                marginTop: "12px",
                textAlign: "center",
                fontFamily: "'Space Mono', monospace",
                fontSize: "20px",
                color: moved ? C.text : C.muted,
                minHeight: "28px",
              }}
            >
              {moved ? val : "— move the slider to set a value —"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px" }}>
            <button
              style={{
                ...base.btn,
                marginTop: 0,
                opacity: moved ? 1 : 0.4,
                cursor: moved ? "pointer" : "not-allowed",
              }}
              onClick={submitSlider}
              disabled={!moved}
            >
              {qIdx + 1 < questionStream.length ? "Next →" : "Continue →"}
            </button>
            {!moved && (
              <span style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>
                You must move the slider before continuing.
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: "28px",
              height: "2px",
              background: "#EDE8DF",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: C.accent,
                width: `${(qIdx / questionStream.length) * 100}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------- DEMOGRAPHICS -----------
  if (phase === "demographics") {
    const toggleRace = (k: string) => {
      setRaceSel((p) => {
        if (k === "decline") return p.includes("decline") ? [] : ["decline"];
        const without = p.filter((x) => x !== "decline");
        return without.includes(k) ? without.filter((x) => x !== k) : [...without, k];
      });
    };
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>A few quick questions</div>
          <h2 style={base.h2}>Demographics</h2>
          <p style={{ ...base.small, marginBottom: "24px" }}>
            Your responses are anonymous. You may decline any item.
          </p>

          {/* AGE */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ ...base.eyebrow, display: "block", marginBottom: "8px" }}>
              What is your age in years?
            </label>
            <input
              type="number"
              min={13}
              max={120}
              value={age}
              disabled={ageDeclined}
              onChange={(e) => setAge(e.target.value)}
              style={{ ...base.input, opacity: ageDeclined ? 0.5 : 1 }}
              placeholder="e.g. 34"
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                fontSize: "15px",
                color: C.body,
              }}
            >
              <input
                type="checkbox"
                checked={ageDeclined}
                onChange={(e) => {
                  setAgeDeclined(e.target.checked);
                  if (e.target.checked) setAge("");
                }}
              />
              I prefer not to answer
            </label>
          </div>

          {/* GENDER */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ ...base.eyebrow, display: "block", marginBottom: "8px" }}>
              How do you currently describe your gender identity?
            </label>
            <input
              type="text"
              value={gender}
              disabled={genderDeclined}
              onChange={(e) => setGender(e.target.value)}
              maxLength={200}
              style={{ ...base.input, opacity: genderDeclined ? 0.5 : 1 }}
              placeholder="Please specify"
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                fontSize: "15px",
                color: C.body,
              }}
            >
              <input
                type="checkbox"
                checked={genderDeclined}
                onChange={(e) => {
                  setGenderDeclined(e.target.checked);
                  if (e.target.checked) setGender("");
                }}
              />
              I prefer not to answer
            </label>
          </div>

          {/* RACE */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ ...base.eyebrow, display: "block", marginBottom: "8px" }}>
              Which categories describe you? Select all that apply.
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {RACE_OPTIONS.map((opt) => {
                const checked = raceSel.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      fontSize: "16px",
                      lineHeight: "1.5",
                      color: C.body,
                      padding: "10px 12px",
                      border: `1px solid ${checked ? C.accent : C.border}`,
                      background: checked ? "#FDFAF5" : C.surface,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRace(opt.key)}
                      style={{ marginTop: "4px" }}
                    />
                    <span>
                      <strong>{opt.label}</strong>
                      {opt.detail && (
                        <span style={{ color: C.muted, fontSize: "14px" }}> — {opt.detail}</span>
                      )}
                    </span>
                  </label>
                );
              })}
              {raceSel.includes("other") && (
                <input
                  type="text"
                  value={raceOther}
                  onChange={(e) => setRaceOther(e.target.value)}
                  maxLength={200}
                  placeholder="Please specify"
                  style={base.input}
                />
              )}
            </div>
          </div>

          {submitStatus === "err" && (
            <p style={{ ...base.small, color: "#CC1A14" }}>
              Something went wrong saving your response. Please try again.
            </p>
          )}

          <button
            style={{
              ...base.btn,
              opacity: demogValid && !submitting ? 1 : 0.4,
              cursor: demogValid && !submitting ? "pointer" : "not-allowed",
            }}
            onClick={submit}
            disabled={!demogValid || submitting}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </button>
        </div>
      </div>
    );
  }

  // ----------- THANKS -----------
  if (phase === "thanks")
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>Done</div>
          <h1 style={base.h1}>Thank you.</h1>
          {submitStatus === "ok" ? (
            <p style={base.body}>
              Your anonymous responses have been recorded and added to the class aggregate. You can close this
              tab.
            </p>
          ) : (
            <p style={base.body}>
              Your responses were collected, but something went wrong saving them to the class aggregate. If
              this is a live class, please let the instructor know.
            </p>
          )}
          <p style={{ ...base.small, fontStyle: "italic" }}>
            This study is a replication of Hansen &amp; Liao, &ldquo;Measuring Conceptual Inflation: The Case
            of &lsquo;Racist&rsquo;&rdquo; (forthcoming in <em>Ergo</em>).
          </p>
        </div>
      </div>
    );

  return (
    <div style={base.wrap}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <p style={base.body}>Loading…</p>
      </div>
    </div>
  );
}
