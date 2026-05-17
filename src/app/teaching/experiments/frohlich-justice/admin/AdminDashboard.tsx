"use client";

import { useEffect, useMemo, useState } from "react";

const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  green: "#1A7840",
  red: "#CC1A14",
};

type PrincipleId =
  | "max-floor"
  | "max-average"
  | "max-average-floor"
  | "max-average-range";

const PRINCIPLE_SHORT: Record<PrincipleId, string> = {
  "max-floor": "Max floor",
  "max-average": "Max avg",
  "max-average-floor": "Max avg + floor",
  "max-average-range": "Max avg + range",
};

type Choice = { principle: PrincipleId; constraint?: number };

type VoteRecord = {
  speaker: string;
  vote: "YES" | "NO" | "ABSTAIN";
  reason: string;
};

interface Submission {
  session: string;
  submittedAt: string;
  rank1: PrincipleId[] | null;
  rank2: PrincipleId[] | null;
  rankFinal: PrincipleId[] | null;
  individual: {
    choice: Choice;
    classLabel: string;
    income: number;
  } | null;
  group: {
    proposal: Choice;
    distributionId: string;
    classLabel: string;
    income: number;
  } | null;
  voteRound: number;
  chatTurns: number;
  finalVotes: VoteRecord[] | null;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US");
}

function choiceLabel(c: Choice): string {
  const s = PRINCIPLE_SHORT[c.principle];
  if (c.constraint !== undefined) return `${s} (${fmt(c.constraint)})`;
  return s;
}

function rankLine(r: PrincipleId[] | null): string {
  if (!r) return "—";
  return r.map((id) => PRINCIPLE_SHORT[id]).join(" › ");
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");

  const load = async (s?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const url = s
        ? `/api/experiments/frohlich-justice/submissions?session=${encodeURIComponent(s)}`
        : `/api/experiments/frohlich-justice/submissions`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setSubmissions(j.submissions ?? []);
      setSessions(j.sessions ?? []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const total = submissions.length;
    const counts: Record<PrincipleId, { rank1: number; rankFinal: number; group: number }> = {
      "max-floor": { rank1: 0, rankFinal: 0, group: 0 },
      "max-average": { rank1: 0, rankFinal: 0, group: 0 },
      "max-average-floor": { rank1: 0, rankFinal: 0, group: 0 },
      "max-average-range": { rank1: 0, rankFinal: 0, group: 0 },
    };
    let groupReached = 0;
    let unanimousReached = 0;
    for (const s of submissions) {
      if (s.rank1?.[0]) counts[s.rank1[0]].rank1 += 1;
      if (s.rankFinal?.[0]) counts[s.rankFinal[0]].rankFinal += 1;
      if (s.group) {
        groupReached += 1;
        counts[s.group.proposal.principle].group += 1;
        if (s.finalVotes && s.finalVotes.every((v) => v.vote === "YES"))
          unanimousReached += 1;
      }
    }
    return { total, counts, groupReached, unanimousReached };
  }, [submissions]);

  const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)}%`);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Crimson Pro', Georgia, serif",
        color: C.text,
        padding: "32px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: 8,
          }}
        >
          Distributive Justice — instructor view
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
          Class data{session ? ` — session ${session}` : ""}
        </h1>
        <div style={{ color: C.body, marginBottom: 24, fontSize: 16 }}>
          {submissions.length} submission{submissions.length === 1 ? "" : "s"} loaded.
          Reference: Frohlich, Oppenheimer &amp; Eavey (1987) — of 44 five-person
          groups, 0 chose max-floor and 35 chose max-avg + floor.
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Filter session:
          </label>
          <select
            value={session}
            onChange={(e) => {
              const v = e.target.value;
              setSession(v);
              load(v || undefined);
            }}
            style={{
              border: `1px solid ${C.border}`,
              padding: "8px 12px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              background: C.surface,
              color: C.text,
            }}
          >
            <option value="">(all sessions)</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(session || undefined)}
            style={{
              border: `1px solid ${C.border}`,
              background: C.surface,
              padding: "8px 16px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              cursor: "pointer",
              color: C.text,
            }}
          >
            Refresh
          </button>
        </div>

        {loading && <div style={{ color: C.muted }}>Loading…</div>}
        {err && <div style={{ color: C.red }}>Error: {err}</div>}

        {!loading && !err && (
          <>
            <Section title="Principle preferences (counts and % of n)">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: "left", fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <th style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>Principle</th>
                    <th style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>First rank #1</th>
                    <th style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>Final rank #1</th>
                    <th style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>Group adopted</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PRINCIPLE_SHORT) as PrincipleId[]).map((id) => (
                    <tr key={id}>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
                        {PRINCIPLE_SHORT[id]}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                        {summary.counts[id].rank1} ({pct(summary.counts[id].rank1, summary.total)})
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                        {summary.counts[id].rankFinal} ({pct(summary.counts[id].rankFinal, summary.total)})
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                        {summary.counts[id].group} ({pct(summary.counts[id].group, summary.groupReached)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, color: C.muted, fontSize: 13 }}>
                Groups that reached an adopted principle:{" "}
                <strong style={{ color: C.text }}>{summary.groupReached}</strong> /{" "}
                {summary.total}. Of those, unanimous final vote captured:{" "}
                <strong style={{ color: C.text }}>{summary.unanimousReached}</strong>.
              </div>
            </Section>

            <Section title="Submissions">
              {submissions.length === 0 ? (
                <div style={{ color: C.muted }}>No submissions yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: C.muted, textAlign: "left", fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      <th style={th()}>When</th>
                      <th style={th()}>Session</th>
                      <th style={th()}>Initial ranking</th>
                      <th style={th()}>Final ranking</th>
                      <th style={th()}>Solo choice → class → income</th>
                      <th style={th()}>Group adopted → income</th>
                      <th style={th(true)}>Rounds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...submissions]
                      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                      .map((s, i) => (
                        <tr key={i}>
                          <td style={td()}>{s.submittedAt.replace("T", " ").slice(0, 19)}</td>
                          <td style={td()}>{s.session}</td>
                          <td style={td()}>{rankLine(s.rank1)}</td>
                          <td style={td()}>{rankLine(s.rankFinal)}</td>
                          <td style={td()}>
                            {s.individual
                              ? `${choiceLabel(s.individual.choice)} → ${s.individual.classLabel} → ${fmt(s.individual.income)}`
                              : "—"}
                          </td>
                          <td style={td()}>
                            {s.group
                              ? `${choiceLabel(s.group.proposal)} (D${s.group.distributionId}) → ${s.group.classLabel} → ${fmt(s.group.income)}`
                              : "—"}
                          </td>
                          <td style={td(true)}>
                            {s.group ? s.voteRound + 1 : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function th(right?: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderBottom: `1px solid ${C.border}`,
    textAlign: right ? "right" : "left",
    whiteSpace: "nowrap",
  };
}

function td(right?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: `1px solid ${C.border}`,
    textAlign: right ? "right" : "left",
    fontFamily: right ? "'Space Mono', monospace" : "inherit",
    verticalAlign: "top",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          padding: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
}
