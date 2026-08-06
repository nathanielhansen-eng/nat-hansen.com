"use client";

// Spec-driven between-subjects vignette study (roadmap Tier A): one
// randomly assigned condition, one vignette, a fixed question set on one
// screen, an optional skippable background question, and a debrief with a
// condition comparison and the paper's figures. Produces the standard
// payload validated by validateSpecSubmission. Scope is deliberately
// Knobe-shaped — batteries, interstitials, and counterbalancing are
// Tier B capabilities and live in bespoke components until there is a
// second consumer to generalize from.

import { useState } from "react";
import { C, FONTS, base } from "./theme";
import { Paras } from "./vignette";
import { condText, type ConditionDef, type VignetteStudySpec } from "./spec";

type Phase = "intro" | "task" | "background" | "debrief";
type Answers = Record<string, number | string>;

export default function VignetteStudy({
  spec,
  session,
  tag = null,
}: {
  spec: VignetteStudySpec;
  session: string;
  /** Opaque launcher-supplied tag (e.g. from a course dashboard); stored
   * with the record so the launching site can highlight "your" response. */
  tag?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  // Assigned once, in the "Begin" click handler — never during render. Doing it in a
  // useState initialiser would roll it on the server too, and that value would be
  // thrown away at hydration.
  const [condition, setCondition] = useState<ConditionDef | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [taskShownAt, setTaskShownAt] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [rts, setRts] = useState<Record<string, number>>({});
  const [background, setBackground] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "err">("idle");
  const [compare, setCompare] = useState<string | null>(null);

  const startTask = (now: number, assigned: ConditionDef) => {
    setCondition(assigned);
    setCompare(assigned.key);
    setStartedAt(now);
    setTaskShownAt(now);
    setPhase("task");
  };

  // `now` is read in the click handler and passed in, so nothing impure runs during render.
  const answer = (qid: string, v: number | string, now: number) => {
    if (taskShownAt !== null && !(qid in rts)) setRts((r) => ({ ...r, [qid]: now - taskShownAt }));
    setAnswers((a) => ({ ...a, [qid]: v }));
  };

  const send = async (backgroundValue: string | null) => {
    if (submitting || condition === null) return;
    setSubmitting(true);
    const payload = {
      session,
      ...(tag ? { tag } : {}),
      submittedAt: new Date().toISOString(),
      durationMs: startedAt ? Date.now() - startedAt : 0,
      condition: condition.key,
      answers,
      rts,
      background: backgroundValue,
    };
    try {
      const r = await fetch(`/api/experiments/${spec.slug}`, {
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
  if (phase === "intro" || condition === null) {
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{spec.eyebrow}</div>
          <h1 style={base.h1}>{spec.title}</h1>
          <div style={base.body}>{spec.intro}</div>
          {spec.introSmall && <div style={base.small}>{spec.introSmall}</div>}
          <div style={base.divider} />
          <p style={{ ...base.small, marginBottom: 0 }}>
            <span style={base.mono}>SESSION</span> &nbsp;{session}
          </p>
          <button
            style={base.btn}
            onClick={() =>
              startTask(
                Date.now(),
                spec.conditions[Math.floor(Math.random() * spec.conditions.length)]
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
  const cond = condition;
  const cmpKey = compare ?? cond.key;
  const cmpCond = spec.conditions.find((c) => c.key === cmpKey) ?? cond;

  /* ------------------------------ TASK ----------------------------- */
  if (phase === "task") {
    const ready = spec.questions.every((q) => q.id in answers);
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{spec.taskEyebrow ?? "Please read carefully"}</div>

          <div style={base.vignette}>
            <Paras paras={cond.paras} mark={false} />
          </div>

          {spec.questions.map((q, qi) => (
            <div key={q.id} style={{ marginBottom: qi === spec.questions.length - 1 ? "8px" : "32px" }}>
              <span style={base.qlabel}>
                <span style={base.qnum}>Q{qi + 1}</span>
                {condText(q.prompt, cond.key)}
              </span>
              {q.kind === "likert" ? (
                <>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((n) => {
                      const on = answers[q.id] === n;
                      return (
                        <button
                          key={n}
                          onClick={() => answer(q.id, n, Date.now())}
                          aria-pressed={on}
                          style={{
                            flex: "1 1 44px",
                            minWidth: "44px",
                            padding: "12px 0",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "16px",
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      marginTop: "8px",
                      fontSize: "13px",
                      color: C.muted,
                    }}
                  >
                    <span>{condText(q.lo, cond.key)}</span>
                    <span>{condText(q.hi, cond.key)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  {q.options.map((o) => {
                    const on = answers[q.id] === o.key;
                    return (
                      <button
                        key={o.key}
                        onClick={() => answer(q.id, o.key, Date.now())}
                        aria-pressed={on}
                        style={{
                          flex: "1 1 0",
                          padding: "14px 0",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "13px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
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
              )}
            </div>
          ))}

          <button
            style={{ ...base.btn, opacity: ready ? 1 : 0.35, cursor: ready ? "pointer" : "not-allowed" }}
            disabled={!ready}
            onClick={() => (spec.background ? setPhase("background") : send(null))}
          >
            Continue &rarr;
          </button>
          {!ready && (
            <div style={{ ...base.small, marginTop: "12px", marginBottom: 0 }}>
              Answer every question to continue.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- BACKGROUND -------------------------- */
  if (phase === "background" && spec.background) {
    const bg = spec.background;
    return (
      <div style={base.wrap}>
        <style>{FONTS}</style>
        <div style={base.card}>
          <div style={base.eyebrow}>{bg.eyebrow ?? "One last question · optional"}</div>
          <h2 style={base.h2}>{bg.heading}</h2>
          {bg.small && <div style={base.small}>{bg.small}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
            {bg.options.map((o) => (
              <button
                key={o.key}
                onClick={() => setBackground(o.key)}
                aria-pressed={background === o.key}
                style={{
                  textAlign: "left",
                  padding: "14px 18px",
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "18px",
                  cursor: "pointer",
                  background: background === o.key ? C.accent : C.well,
                  color: background === o.key ? C.bg : C.text,
                  border: `1px solid ${background === o.key ? C.accent : C.border}`,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button style={base.btn} disabled={submitting} onClick={() => send(background)}>
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
  const d = spec.debrief;
  return (
    <div style={{ ...base.wrap, alignItems: "flex-start", paddingTop: "48px", paddingBottom: "48px" }}>
      <style>{FONTS}</style>
      <div style={base.card}>
        <div style={base.eyebrow}>Thank you &middot; Debrief</div>
        <h1 style={{ ...base.h1, marginBottom: "20px" }}>{d.title}</h1>

        <div
          style={{
            borderLeft: `3px solid ${cond.colour}`,
            background: C.well,
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div style={{ ...base.mono, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: cond.colour, marginBottom: "8px" }}>
            {cond.label} condition
          </div>
          <div style={{ fontSize: "18px", lineHeight: 1.6, color: C.body }}>
            {d.summary({ condition: cond, answers })}
          </div>
        </div>

        {submitStatus === "err" && (
          <p style={{ ...base.small, color: C.red }}>
            Your response could not be saved to the class data. Everything below still works, but
            let your instructor know.
          </p>
        )}

        <h2 style={base.h2}>The versions</h2>
        {d.compareIntro && <div style={base.small}>{d.compareIntro}</div>}
        <div style={{ display: "flex", gap: "10px", marginBottom: "0" }}>
          {spec.conditions.map((c) => (
            <button
              key={c.key}
              onClick={() => setCompare(c.key)}
              aria-pressed={cmpKey === c.key}
              style={{
                flex: "1 1 0",
                padding: "11px 0",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: cmpKey === c.key ? C.surface : C.well,
                color: cmpKey === c.key ? C.text : C.muted,
                border: `1px solid ${C.border}`,
                borderBottom: cmpKey === c.key ? `2px solid ${c.colour}` : `1px solid ${C.border}`,
              }}
            >
              {c.label} version
            </button>
          ))}
        </div>
        <div style={{ ...base.vignette, marginTop: "-1px", marginBottom: "16px" }}>
          <Paras paras={cmpCond.paras} mark />
        </div>
        {d.comparisonNote && (
          <div style={{ ...base.small, borderLeft: `2px solid ${C.border}`, paddingLeft: "14px" }}>
            {d.comparisonNote}
          </div>
        )}

        {d.paper && (
          <>
            <div style={base.divider} />
            <h2 style={base.h2}>{d.paper.heading}</h2>
            {d.paper.intro && <div style={base.small}>{d.paper.intro}</div>}
            <div style={{ marginBottom: "14px" }}>
              {d.paper.bars.map((row) => (
                <div
                  key={row.label}
                  style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}
                >
                  <span style={{ ...base.mono, fontSize: "12px", color: C.muted, width: "110px" }}>
                    {row.label}
                  </span>
                  <span style={{ flex: 1, height: "10px", background: "#EDE6D8", display: "block" }}>
                    <span
                      style={{ display: "block", height: "100%", width: `${row.pct}%`, background: row.colour }}
                    />
                  </span>
                  <span style={{ ...base.mono, fontSize: "14px", color: C.text, width: "52px", textAlign: "right" }}>
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
            {d.paper.note && <div style={base.small}>{d.paper.note}</div>}
          </>
        )}

        {d.sections?.map((s) => (
          <div key={s.heading}>
            <div style={base.divider} />
            <h2 style={base.h2}>{s.heading}</h2>
            <div style={base.body}>{s.body}</div>
          </div>
        ))}

        <p style={{ ...base.small, marginBottom: 0, marginTop: "18px" }}>{d.citation}</p>
      </div>
    </div>
  );
}
