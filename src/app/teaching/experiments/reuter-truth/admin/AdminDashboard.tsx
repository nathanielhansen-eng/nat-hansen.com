"use client";

import AdminShell from "@/lib/xphi/AdminShell";
import { chiVs50, fmtP } from "@/lib/xphi/stats";
import { C as TC, admin } from "@/lib/xphi/theme";

const C = { ...TC, corr: TC.red, coh: TC.green };

/** Published values from Reuter & Brun (2022) for side-by-side comparison.
 *  part1/part2 are % answering "true"; part3 percentages are from Study 3
 *  (Rolex, coherent version only). */
const ORIGINAL = {
  part1: { party: 59.6, rolex: 56.8 },
  part2: { party: 65.2, rolex: 35.4 },
  part3: { direct: 71.1, afterControl: 51.1, correctYes: 44.7 },
};

type Scenario = "party" | "rolex";
type Answer = "true" | "false" | "notsure";
type YesNo = "yes" | "no";

interface Submission {
  session: string;
  submittedAt: string;
  durationMs: number;
  order: "party-first" | "rolex-first";
  part1Scenario: Scenario;
  part1Answer: Answer;
  part1RtMs: number;
  part2Scenario: Scenario;
  part2Answer: Answer;
  part2RtMs: number;
  part3BestKnowledge: YesNo;
  part3Correct: YesNo;
  part3Explanation: string;
}

function counts(rows: Submission[], part: 1 | 2, scenario: Scenario) {
  const s = rows.filter((r) => (part === 1 ? r.part1Scenario : r.part2Scenario) === scenario);
  const a = (v: Answer) =>
    s.filter((r) => (part === 1 ? r.part1Answer : r.part2Answer) === v).length;
  return { t: a("true"), f: a("false"), ns: a("notsure"), n: s.length };
}

function PartTable({ rows, part }: { rows: Submission[]; part: 1 | 2 }) {
  const label =
    part === 1
      ? "Part 1 · Study 1 — coherent, not corresponding"
      : "Part 2 · Study 2 — corresponding, not coherent";
  const orig = part === 1 ? ORIGINAL.part1 : ORIGINAL.part2;
  return (
    <div style={admin.panel}>
      <div style={{ ...admin.eyebrow, marginBottom: "14px" }}>{label}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "520px" }}>
          <thead>
            <tr>
              <th style={{ ...admin.th, textAlign: "left" }}>Scenario</th>
              <th style={admin.th}>True</th>
              <th style={admin.th}>False</th>
              <th style={admin.th}>Not sure</th>
              <th style={admin.th}>N</th>
              <th style={admin.th}>% true</th>
              <th style={admin.th}>Paper</th>
              <th style={admin.th}>χ² vs 50%</th>
            </tr>
          </thead>
          <tbody>
            {(["party", "rolex"] as const).map((sc) => {
              const c = counts(rows, part, sc);
              const chi = chiVs50(c.t, c.f);
              const excl = c.t + c.f;
              return (
                <tr key={sc}>
                  <td style={{ ...admin.td, textAlign: "left", fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "16px" }}>
                    {sc === "party" ? "The party" : "The Rolex"}
                  </td>
                  <td style={{ ...admin.td, color: C.coh }}>{c.t}</td>
                  <td style={{ ...admin.td, color: C.corr }}>{c.f}</td>
                  <td style={admin.td}>{c.ns}</td>
                  <td style={admin.td}>{c.n}</td>
                  <td style={{ ...admin.td, color: C.text, fontWeight: 700 }}>
                    {excl ? `${Math.round((c.t / excl) * 100)}%` : "—"}
                  </td>
                  <td style={{ ...admin.td, color: C.muted }}>{orig[sc]}%</td>
                  <td style={{ ...admin.td, color: C.muted }}>
                    {chi ? `${chi.x2.toFixed(2)}, p ${fmtP(chi.p)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
        {part === 1 ? (
          <>
            &lsquo;True&rsquo; is the coherentist answer here. The paper&rsquo;s test is a
            goodness-of-fit χ² of true vs false against the 50% mark, df&nbsp;=&nbsp;1,
            &lsquo;not sure&rsquo; excluded; neither of their scenarios differed significantly
            from 50/50.
          </>
        ) : (
          <>
            &lsquo;True&rsquo; is the correspondentist answer here. In the paper, Party showed a
            significant correspondentist majority (65.2% true) while Rolex reversed the pattern
            (54.2% false) — the between-scenario difference was itself significant.
          </>
        )}
      </div>
    </div>
  );
}

function Part3Panel({ rows }: { rows: Submission[] }) {
  const bkYes = rows.filter((r) => r.part3BestKnowledge === "yes").length;
  const corrYes = rows.filter((r) => r.part3Correct === "yes").length;
  const n = rows.length;
  // 2×2 of the Part 1 truth answer (excluding "not sure") against the
  // Part 3 correctness answer — the wedge between "true" and "correct".
  const cell = (a: Answer, c: YesNo) =>
    rows.filter((r) => r.part1Answer === a && r.part3Correct === c).length;
  return (
    <div style={admin.panel}>
      <div style={{ ...admin.eyebrow, marginBottom: "14px" }}>
        Part 3 · Study 3 — the substitution objection
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", marginBottom: "18px" }}>
        {[
          ["Best of knowledge: yes", n ? `${Math.round((bkYes / n) * 100)}%` : "—", `${bkYes}/${n}`],
          ["Answer was correct: yes", n ? `${Math.round((corrYes / n) * 100)}%` : "—", `${corrYes}/${n}`],
          ["Paper: correct-yes", `${ORIGINAL.part3.correctYes}%`, "Rolex only"],
        ].map(([k, v, sub]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ ...admin.eyebrow, fontSize: "10px" }}>{k}</span>
            <span style={{ ...admin.mono, fontSize: "17px", color: C.text }}>{v}</span>
            <span style={{ ...admin.mono, fontSize: "11px", color: C.muted }}>{sub}</span>
          </div>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "420px" }}>
          <thead>
            <tr>
              <th style={{ ...admin.th, textAlign: "left" }}>Part 1 answer</th>
              <th style={admin.th}>Correct: yes</th>
              <th style={admin.th}>Correct: no</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...admin.td, textAlign: "left", color: C.coh }}>True</td>
              <td style={admin.td}>{cell("true", "yes")}</td>
              <td style={{ ...admin.td, color: C.text, fontWeight: 700 }}>{cell("true", "no")}</td>
            </tr>
            <tr>
              <td style={{ ...admin.td, textAlign: "left", color: C.corr }}>False</td>
              <td style={admin.td}>{cell("false", "yes")}</td>
              <td style={admin.td}>{cell("false", "no")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "14px", color: C.muted, marginTop: "12px", lineHeight: 1.6 }}>
        The bold cell — students who called the answer <em>true</em> in Part 1 but not{" "}
        <em>correct</em> in Part 3 — is the wedge between &lsquo;true&rsquo; and
        &lsquo;correct&rsquo; that Study 3 used against the true-for-her objection. Note the
        design difference: in the paper the control and correctness questions were
        between-subjects and came <em>before</em> (or instead of) the truth question; here they
        come after it, within-subject.
      </div>
    </div>
  );
}

function Explanations({ rows }: { rows: Submission[] }) {
  const explanations = rows.filter((r) => r.part3Explanation && r.part3Explanation.trim());
  return (
    <div style={admin.panel}>
      <div style={{ ...admin.eyebrow, marginBottom: "14px" }}>
        Explanations ({explanations.length})
      </div>
      {explanations.length === 0 ? (
        <div style={{ ...admin.mono, fontSize: "13px", color: C.muted }}>
          No written explanations yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {explanations.map((r, i) => (
            <div
              key={i}
              style={{
                borderLeft: `2px solid ${r.part1Answer === "true" ? C.coh : r.part1Answer === "false" ? C.corr : C.border}`,
                paddingLeft: "14px",
              }}
            >
              <div style={{ ...admin.mono, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: "4px" }}>
                {r.part1Scenario} · said {r.part1Answer === "notsure" ? "not sure" : r.part1Answer} · correct: {r.part3Correct}
              </div>
              <div style={{ fontSize: "16px", lineHeight: 1.6, color: C.body }}>
                {r.part3Explanation}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: "14px", color: C.muted, marginTop: "14px", lineHeight: 1.6 }}>
        Reuter and Brun coded explanations for substitution — look for &lsquo;lie&rsquo;,
        &lsquo;honest&rsquo;, &lsquo;deception&rsquo; (truthfulness readings) versus
        &lsquo;based on what she knew at the time&rsquo; (genuinely coherentist ones).
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminShell<Submission>
      slug="reuter-truth"
      heading={<>Reuter &amp; Brun (2022) — is &lsquo;true&rsquo; ambiguous?</>}
      csvHeader={[
        "session",
        "submittedAt",
        "order",
        "part1Scenario",
        "part1Answer",
        "part1RtMs",
        "part2Scenario",
        "part2Answer",
        "part2RtMs",
        "part3BestKnowledge",
        "part3Correct",
        "part3Explanation",
        "durationMs",
      ]}
      csvRow={(s) => [
        s.session,
        s.submittedAt,
        s.order,
        s.part1Scenario,
        s.part1Answer,
        Math.round(s.part1RtMs),
        s.part2Scenario,
        s.part2Answer,
        Math.round(s.part2RtMs),
        s.part3BestKnowledge,
        s.part3Correct,
        s.part3Explanation,
        Math.round(s.durationMs),
      ]}
      shareNote="Each visitor gets the two stories in a random order (which story is coherent and which is incoherent follows from the order), so send everyone the same link. Give each class its own session id to keep cohorts separate."
    >
      {({ rows }) => (
        <>
          <PartTable rows={rows} part={1} />
          <PartTable rows={rows} part={2} />
          <Part3Panel rows={rows} />
          <Explanations rows={rows} />
        </>
      )}
    </AdminShell>
  );
}
