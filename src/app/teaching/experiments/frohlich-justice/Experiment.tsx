"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "frohlich-justice-state-v1";

type PersistedState = {
  stage: Stage;
  rank1: PrincipleId[] | null;
  rank2: PrincipleId[] | null;
  rankFinal: PrincipleId[] | null;
  indResult: IndividualResult | null;
  chat: ChatMsg[];
  proposal: Choice | null;
  votes: VoteRecord[] | null;
  groupResult: GroupResult | null;
  voteRound: number;
  submitted: boolean;
};

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
import {
  PRINCIPLES,
  PrincipleId,
  Principle,
  SITUATION_A,
  GROUP_DISTRIBUTIONS,
  CLASS_LABELS,
  ClassLabel,
  Distribution,
  Choice,
  selectDistribution,
  average,
  floor,
  range,
  fmtMoney,
  PERSONAS,
  PersonaId,
} from "@/lib/frohlich";

function ReferencePanel() {
  return (
    <details className="border border-[#DDD5C0] rounded bg-white group">
      <summary className="cursor-pointer px-3 py-2 text-[#3A3328] text-sm hover:text-[#1A1814] select-none">
        <span className="text-[#9A8866]">▸</span> Reference — principles &amp;
        candidate distributions (D1–D{GROUP_DISTRIBUTIONS.length})
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3">
        <div className="space-y-1.5">
          {PRINCIPLES.map((p) => (
            <div key={p.id} className="text-sm">
              <span className="text-[#1A1814]">{p.short}</span>{" "}
              <span className="text-[#9A8866]">— {p.blurb}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#DDD5C0] pt-3">
          <div className="text-[#9A8866] text-sm mb-1.5">
            Group-decision pool (the personas reference these by ID)
          </div>
          <DistributionTable
            distributions={GROUP_DISTRIBUTIONS}
            highlightFn={() => null}
          />
        </div>
      </div>
    </details>
  );
}

type Stage =
  | "intro"
  | "read"
  | "comprehension"
  | "rank1"
  | "table"
  | "choice1"
  | "payoff1"
  | "rank2"
  | "discussion-intro"
  | "discussion"
  | "vote"
  | "vote-result"
  | "group-payoff"
  | "rank-final"
  | "debrief";

type ChatMsg = { role: "user" | "assistant"; speaker: string; content: string };

type VoteRecord = {
  speaker: string;
  vote: "YES" | "NO" | "ABSTAIN";
  reason: string;
};

type IndividualResult = {
  choice: Choice;
  distribution: Distribution;
  classLabel: ClassLabel;
  income: number;
  counterfactuals: { principle: Principle; income: number }[];
};

type GroupResult = {
  proposal: Choice;
  proposalText: string;
  distribution: Distribution;
  classLabel: ClassLabel;
  income: number;
};

const STAGE_ORDER: Stage[] = [
  "intro",
  "read",
  "comprehension",
  "rank1",
  "table",
  "choice1",
  "payoff1",
  "rank2",
  "discussion-intro",
  "discussion",
  "vote",
  "vote-result",
  "group-payoff",
  "rank-final",
  "debrief",
];

function randomClass(): ClassLabel {
  return CLASS_LABELS[Math.floor(Math.random() * CLASS_LABELS.length)];
}

export default function Experiment({ session }: { session: string }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [rank1, setRank1] = useState<PrincipleId[] | null>(null);
  const [rank2, setRank2] = useState<PrincipleId[] | null>(null);
  const [rankFinal, setRankFinal] = useState<PrincipleId[] | null>(null);
  const [indResult, setIndResult] = useState<IndividualResult | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [proposal, setProposal] = useState<Choice | null>(null);
  const [votes, setVotes] = useState<VoteRecord[] | null>(null);
  const [groupResult, setGroupResult] = useState<GroupResult | null>(null);
  const [voteRound, setVoteRound] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted state on mount (client only) to avoid SSR mismatch.
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setStage(persisted.stage);
      setRank1(persisted.rank1);
      setRank2(persisted.rank2);
      setRankFinal(persisted.rankFinal);
      setIndResult(persisted.indResult);
      setChat(persisted.chat);
      setProposal(persisted.proposal);
      setVotes(persisted.votes);
      setGroupResult(persisted.groupResult);
      setVoteRound(persisted.voteRound);
      setSubmitted(persisted.submitted ?? false);
    }
    setHydrated(true);
  }, []);

  // Persist on every relevant state change, but only after hydration so the
  // initial empty state doesn't overwrite saved progress.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      const snapshot: PersistedState = {
        stage,
        rank1,
        rank2,
        rankFinal,
        indResult,
        chat,
        proposal,
        votes,
        groupResult,
        voteRound,
        submitted,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // storage may be full or disabled; non-fatal
    }
  }, [
    hydrated,
    stage,
    rank1,
    rank2,
    rankFinal,
    indResult,
    chat,
    proposal,
    votes,
    groupResult,
    voteRound,
    submitted,
  ]);

  function go(next: Stage) {
    setStage(next);
  }

  function resetAll() {
    clearPersisted();
    setStage("intro");
    setRank1(null);
    setRank2(null);
    setRankFinal(null);
    setIndResult(null);
    setChat([]);
    setProposal(null);
    setVotes(null);
    setGroupResult(null);
    setVoteRound(0);
    setSubmitted(false);
  }

  // Fire-and-forget submission when the participant reaches debrief.
  useEffect(() => {
    if (!hydrated) return;
    if (stage !== "debrief") return;
    if (submitted) return;
    const payload = {
      session,
      submittedAt: new Date().toISOString(),
      rank1,
      rank2,
      rankFinal,
      individual: indResult
        ? {
            choice: indResult.choice,
            classLabel: indResult.classLabel,
            income: indResult.income,
          }
        : null,
      group: groupResult
        ? {
            proposal: groupResult.proposal,
            distributionId: groupResult.distribution.id,
            classLabel: groupResult.classLabel,
            income: groupResult.income,
          }
        : null,
      voteRound,
      chatTurns: chat.filter((m) => m.role === "user" && m.speaker === "You")
        .length,
      chat,
      finalVotes: votes,
    };
    setSubmitted(true);
    fetch("/api/experiments/frohlich-justice/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // best-effort; user already finished the experiment
      setSubmitted(false);
    });
  }, [
    hydrated,
    stage,
    submitted,
    session,
    rank1,
    rank2,
    rankFinal,
    indResult,
    groupResult,
    voteRound,
    chat,
    votes,
  ]);

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const progress = Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100);

  return (
    <div
      className="min-h-screen bg-[#F4F0E8] text-[#1A1814] flex flex-col"
      style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`}</style>
      <header className="border-b border-[#DDD5C0] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <Link
          href="/teaching/experiments"
          className="text-[#9A8866] hover:text-[#3A3328] transition-colors text-base"
        >
          &larr; experiments
        </Link>
        <div className="text-center">
          <p
            className="text-[#9A8866] text-[11px] uppercase tracking-[0.18em]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Distributive Justice Experiment
            <span className="ml-2 text-[#9A8866]">· playtest</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm font-mono">
          {stage !== "intro" && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Restart from the beginning? Your saved progress will be erased.",
                  )
                ) {
                  resetAll();
                }
              }}
              className="text-[#9A8866] hover:text-[#3A3328] transition-colors"
              title="Restart"
            >
              start over
            </button>
          )}
          <span className="text-[#9A8866] w-10 text-right">{progress}%</span>
        </div>
      </header>
      <div className="h-0.5 bg-[#FDFAF5]">
        <div
          className="h-full bg-[#1A1814]/60 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10 w-full flex-1">
        {stage === "intro" && <Intro onNext={() => go("read")} />}
        {stage === "read" && <ReadPrinciples onNext={() => go("comprehension")} />}
        {stage === "comprehension" && (
          <Comprehension onPass={() => go("rank1")} />
        )}
        {stage === "rank1" && (
          <RankingStep
            label="First ranking"
            instructions="Rank the four principles from most to least preferred. You'll rank again after each phase."
            onSubmit={(r) => {
              setRank1(r);
              go("table");
            }}
          />
        )}
        {stage === "table" && <TableWalkthrough onNext={() => go("choice1")} />}
        {stage === "choice1" && (
          <IndividualChoice
            onSubmit={(choice) => {
              const dist = selectDistribution(SITUATION_A.distributions, choice);
              if (!dist) return;
              const cls = randomClass();
              const income = dist.incomes[cls];
              const counterfactuals = PRINCIPLES.filter(
                (p) => p.id !== choice.principle,
              ).map((p) => {
                // For counterfactual constraint principles, reuse the user's
                // own constraint when applicable.
                const cf: Choice =
                  p.id === "max-average-floor"
                    ? { principle: p.id, constraint: 10000 }
                    : p.id === "max-average-range"
                      ? { principle: p.id, constraint: 18000 }
                      : { principle: p.id };
                const cfDist = selectDistribution(
                  SITUATION_A.distributions,
                  cf,
                );
                const cfIncome = cfDist ? cfDist.incomes[cls] : 0;
                return {
                  principle: p,
                  income: cfIncome,
                };
              });
              setIndResult({
                choice,
                distribution: dist,
                classLabel: cls,
                income,
                counterfactuals,
              });
              go("payoff1");
            }}
          />
        )}
        {stage === "payoff1" && indResult && (
          <IndividualPayoff result={indResult} onNext={() => go("rank2")} />
        )}
        {stage === "rank2" && (
          <RankingStep
            label="Second ranking"
            instructions="Your first ranking is shown below. Adjust it if seeing a principle play out has changed your mind — or leave it as is."
            initial={rank1}
            onSubmit={(r) => {
              setRank2(r);
              go("discussion-intro");
            }}
          />
        )}
        {stage === "discussion-intro" && (
          <DiscussionIntro onNext={() => go("discussion")} />
        )}
        {stage === "discussion" && (
          <Discussion
            chat={chat}
            setChat={setChat}
            onPropose={() => go("vote")}
          />
        )}
        {stage === "vote" && (
          <VoteSetup
            chat={chat}
            voteRound={voteRound}
            onVote={(proposal, results) => {
              setProposal(proposal);
              setVotes(results);
              go("vote-result");
            }}
          />
        )}
        {stage === "vote-result" && proposal && votes && (
          <VoteResult
            proposal={proposal}
            votes={votes}
            onAdopt={() => {
              // Build group payoff.
              const dist = selectDistribution(GROUP_DISTRIBUTIONS, proposal);
              if (!dist) return;
              const cls = randomClass();
              const income = dist.incomes[cls];
              const principle = PRINCIPLES.find(
                (p) => p.id === proposal.principle,
              )!;
              const constraintText = proposal.constraint
                ? proposal.principle === "max-average-floor"
                  ? `floor ≥ ${fmtMoney(proposal.constraint)}`
                  : `range ≤ ${fmtMoney(proposal.constraint)}`
                : "";
              setGroupResult({
                proposal,
                proposalText:
                  principle.short +
                  (constraintText ? " (" + constraintText + ")" : ""),
                distribution: dist,
                classLabel: cls,
                income,
              });
              go("group-payoff");
            }}
            onKeepTalking={() => {
              const principle = PRINCIPLES.find(
                (p) => p.id === proposal.principle,
              )!;
              const proposalLine =
                principle.short +
                (proposal.constraint &&
                proposal.principle === "max-average-floor"
                  ? ` (floor ≥ ${fmtMoney(proposal.constraint)})`
                  : proposal.constraint &&
                      proposal.principle === "max-average-range"
                    ? ` (range ≤ ${fmtMoney(proposal.constraint)})`
                    : "");
              const summary =
                `[VOTE FAILED on "${proposalLine}"] ` +
                votes
                  .map((v) => `${v.speaker} — ${v.vote}: ${v.reason}`)
                  .join(" | ") +
                ". Unanimity not reached; discussion continues.";
              setChat((prev) => [
                ...prev,
                { role: "user", speaker: "Moderator", content: summary },
              ]);
              setVoteRound((r) => r + 1);
              setVotes(null);
              setProposal(null);
              go("discussion");
            }}
          />
        )}
        {stage === "group-payoff" && groupResult && (
          <GroupPayoff result={groupResult} onNext={() => go("rank-final")} />
        )}
        {stage === "rank-final" && (
          <RankingStep
            label="Final ranking"
            instructions="Last ranking — your previous ranking is shown below. Did the group discussion change your view?"
            initial={rank2 ?? rank1}
            onSubmit={(r) => {
              setRankFinal(r);
              go("debrief");
            }}
          />
        )}
        {stage === "debrief" && (
          <Debrief
            rank1={rank1}
            rank2={rank2}
            rankFinal={rankFinal}
            indResult={indResult}
            groupResult={groupResult}
            onRestart={resetAll}
          />
        )}
      </main>
    </div>
  );
}

// ---------- Stage components ----------

function Intro({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">A choice behind a veil of ignorance</h1>
      <div className="border border-[#DDD5C0] rounded p-4 bg-white space-y-3 text-base text-[#3A3328] leading-relaxed">
        <div className="text-[#9A8866] text-sm uppercase tracking-wider">
          The veil of ignorance
        </div>
        <p>
          The philosopher John Rawls argued that to choose fair principles for
          a society, you should imagine choosing them{" "}
          <span className="text-[#1A1814]">
            without knowing which position you'll end up in
          </span>
          . Rich or poor, lucky or unlucky — strip those facts away and ask:
          what rule would you want governing the distribution?
        </p>
        <p>
          That's the setup here. You'll pick a principle for distributing
          income before knowing which income class you'll be assigned to. Your
          income is determined by a random class draw made <em>after</em>{" "}you
          choose, so the rule you pick is the rule you live under, whoever
          you turn out to be.
        </p>
        <p className="text-[#9A8866] text-sm">
          This is a teaching adaptation of Frohlich, Oppenheimer &amp; Eavey
          (1987), who ran a version of this experiment with real participants
          and real money. Their original framing left the veil mostly
          unexplained on purpose — to avoid priming subjects toward Rawls's
          preferred answer. We're more upfront about it here because the point
          is to understand the setup, not to replicate the experimental
          conditions.
        </p>
      </div>
      <p className="text-[#3A3328] leading-relaxed">
        The experiment has five phases:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-[#9A8866] text-base">
        <li>Learn four principles of distributive justice.</li>
        <li>Take a brief comprehension test.</li>
        <li>
          Pick one principle yourself, get randomly assigned an income class,
          and see what you'd have earned.
        </li>
        <li>
          Deliberate with four other (simulated) participants and try to reach
          unanimous agreement on a principle for the whole group.
        </li>
        <li>Rank the principles a final time and debrief.</li>
      </ol>
      <PrimaryButton onClick={onNext}>Begin</PrimaryButton>
    </div>
  );
}

function ReadPrinciples({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">The four principles</h1>
      <p className="text-[#9A8866] text-base">
        Each principle picks a different "best" income distribution from a set
        of candidates.
      </p>
      <div className="space-y-4">
        {PRINCIPLES.map((p) => (
          <div
            key={p.id}
            className="border border-[#DDD5C0] rounded p-4 bg-white"
          >
            <div className="text-[#1A1814] font-medium mb-1">{p.long}</div>
            <div className="text-[#9A8866] text-base">{p.blurb}</div>
          </div>
        ))}
      </div>
      <PrimaryButton onClick={onNext}>I've read these</PrimaryButton>
    </div>
  );
}

type CompQuestion = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

const COMP_QUESTIONS: CompQuestion[] = [
  {
    q: "Which principle says: choose the distribution whose lowest-income class is the highest?",
    options: [
      "Maximize the average",
      "Maximize the floor",
      "Maximize the average with a range constraint",
      "Maximize the average with a floor constraint",
    ],
    correct: 1,
    explain:
      "Maximizing the floor (Rawls's difference principle) is exactly: the worst-off class is as high as possible.",
  },
  {
    q: "Suppose you choose 'maximize the average with a floor constraint of $12,000.' What's true?",
    options: [
      "You will always also have the highest possible average.",
      "Only distributions whose lowest class earns at least $12,000 are eligible; among those you pick the highest average.",
      "You will pick whichever distribution has the highest floor.",
      "The constraint is ignored if no distribution meets it.",
    ],
    correct: 1,
    explain:
      "A floor constraint filters out distributions that fall below the floor; you then maximize the average among the survivors.",
  },
  {
    q: "True or false: choosing 'maximize the average with a floor constraint' can mean giving up the highest possible average income.",
    options: ["False", "True"],
    correct: 1,
    explain:
      "Yes — that's the whole point of the compromise. A constraint costs you average to buy a guarantee.",
  },
  {
    q: "If you pick a principle and the random draw assigns you the 'Low' class, your income comes from…",
    options: [
      "The average of the chosen distribution.",
      "The Low income in the distribution your principle selected.",
      "The Low income across all four distributions averaged.",
      "Whatever distribution has the highest Low income.",
    ],
    correct: 1,
    explain:
      "Your class is randomly drawn; your income = the value at that class in the distribution your principle selected.",
  },
  {
    q: "Why does the group choice happen 'behind a veil of ignorance'?",
    options: [
      "Because the group doesn't know which distributions are in the pool.",
      "Because you don't know which class you'll be assigned to when you pick the principle.",
      "Because the experimenters hide the principle names.",
      "Because the discussion is conducted with the lights off.",
    ],
    correct: 1,
    explain:
      "The veil here is class-assignment ignorance: you choose a rule before knowing where you'll land in it.",
  },
];

function Comprehension({ onPass }: { onPass: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    COMP_QUESTIONS.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const allCorrect =
    submitted && answers.every((a, i) => a === COMP_QUESTIONS[i].correct);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">Comprehension check</h1>
      <p className="text-[#9A8866] text-base">
        You'll need all five right to proceed. You can retry as many times as
        you like.
      </p>
      <div className="border border-[#DDD5C0] rounded p-3 bg-white text-[#9A8866] text-sm leading-relaxed">
        <span className="text-[#3A3328]">Heads-up:</span> these questions test
        what the principles <em>mean</em>, not which distribution you'd pick.
        The same distribution can satisfy more than one principle (e.g. one
        distribution may both maximize the floor and meet a range constraint),
        and a principle may have several distributions that qualify before it
        picks the best. That's not a trick — it's the whole reason the
        principles disagree only sometimes.
      </div>
      <div className="space-y-6">
        {COMP_QUESTIONS.map((q, i) => {
          const correct = submitted && answers[i] === q.correct;
          const wrong =
            submitted && answers[i] !== null && answers[i] !== q.correct;
          return (
            <div key={i} className="border border-[#DDD5C0] rounded p-4">
              <div className="text-[#1A1814] mb-3">
                <span className="text-[#9A8866] mr-2">{i + 1}.</span>
                {q.q}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <label
                    key={j}
                    className="flex items-start gap-2 text-[#3A3328] text-base cursor-pointer hover:text-[#1A1814]"
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === j}
                      onChange={() =>
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[i] = j;
                          return next;
                        })
                      }
                      className="mt-1"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {correct && (
                <div className="mt-3 text-[#1A7840] text-sm">
                  Correct. {q.explain}
                </div>
              )}
              {wrong && (
                <div className="mt-3 text-[#CC1A14] text-sm">
                  Not quite. {q.explain}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!allCorrect && (
        <PrimaryButton
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
        >
          {submitted ? "Re-check" : "Submit"}
        </PrimaryButton>
      )}
      {allCorrect && (
        <div className="space-y-3">
          <div className="text-[#1A7840] text-base">
            All five correct. You're cleared to proceed.
          </div>
          <PrimaryButton onClick={onPass}>Continue</PrimaryButton>
        </div>
      )}
    </div>
  );
}

function RankingStep({
  label,
  instructions,
  initial,
  onSubmit,
}: {
  label: string;
  instructions: string;
  initial?: PrincipleId[] | null;
  onSubmit: (ranking: PrincipleId[]) => void;
}) {
  const [order, setOrder] = useState<PrincipleId[]>(
    initial && initial.length === PRINCIPLES.length
      ? initial
      : PRINCIPLES.map((p) => p.id),
  );
  const [confidence, setConfidence] = useState(3);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">{label}</h1>
      <p className="text-[#9A8866] text-base">{instructions}</p>
      <ol className="space-y-2">
        {order.map((id, i) => {
          const p = PRINCIPLES.find((x) => x.id === id)!;
          return (
            <li
              key={id}
              className="flex items-center justify-between border border-[#DDD5C0] rounded p-3 bg-white"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-[#9A8866] font-mono text-base w-4">
                  {i + 1}
                </span>
                <span className="text-[#1A1814]">{p.short}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-2 py-1 text-[#9A8866] hover:text-[#1A1814] disabled:opacity-30 disabled:cursor-not-allowed border border-[#DDD5C0] rounded text-sm"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="px-2 py-1 text-[#9A8866] hover:text-[#1A1814] disabled:opacity-30 disabled:cursor-not-allowed border border-[#DDD5C0] rounded text-sm"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="space-y-2">
        <div className="text-[#9A8866] text-base">
          How confident are you in this ranking?{" "}
          <span className="text-[#1A1814]">{confidence}</span> / 5
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={confidence}
          onChange={(e) => setConfidence(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <PrimaryButton onClick={() => onSubmit(order)}>Lock it in</PrimaryButton>
    </div>
  );
}

function TableWalkthrough({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">Situation A</h1>
      <p className="text-[#9A8866] text-base">
        Here are four candidate distributions. Each row is an income class; each
        column is one distribution. The table is in annual dollars.
      </p>
      <p className="text-[#9A8866] text-sm leading-relaxed">
        A note on the numbers: these are the actual figures from Frohlich,
        Oppenheimer &amp; Eavey (1987), so they're in 1987 dollars. Roughly{" "}
        <span className="text-[#3A3328]">multiply by 3 for 2026 equivalents</span>{" "}
        — e.g. a $12,000 income at the low end was about $36,000 today; the
        $35,000 top of D2 was about $105,000. The principles you're choosing
        between work the same on either scale, but the texture of "what counts
        as a livable floor" reads differently in modern dollars.
      </p>
      <DistributionTable
        distributions={SITUATION_A.distributions}
        highlightFn={() => null}
      />
      <div className="border border-[#DDD5C0] rounded p-4 bg-white space-y-2 text-base">
        <div className="text-[#1A1814] font-medium">
          Which distribution does each principle pick?
        </div>
        <div className="text-[#9A8866] text-sm italic">
          The four principles don't map onto four distinct distributions. Two
          principles can pick the same one (here D4 wins on both
          floor-maximizing and range-constrained grounds), and other
          distributions in the pool aren't picked by anyone. That's the point:
          which principle you adopt only matters where they disagree.
        </div>
        <ul className="space-y-1 text-[#9A8866]">
          <li>
            <span className="text-[#1A1814]">Maximize the floor:</span>{" "}
            Distribution 4 — its Low class earns $13,000, more than any other.
          </li>
          <li>
            <span className="text-[#1A1814]">Maximize the average:</span>{" "}
            Distribution 3 — average $24,000.
          </li>
          <li>
            <span className="text-[#1A1814]">
              Max average with a $12,000 floor constraint:
            </span>{" "}
            Only 1 and 4 clear $12,000; of those, 1 has the higher average
            ($20,000 vs $19,000), so it wins.
          </li>
          <li>
            <span className="text-[#1A1814]">
              Max average with a $15,000 range constraint:
            </span>{" "}
            Only Distribution 4 has range ≤ $15,000 (its range is $12,000).
          </li>
        </ul>
      </div>
      <PrimaryButton onClick={onNext}>I see the trade-offs</PrimaryButton>
    </div>
  );
}

function DistributionTable({
  distributions,
  highlightFn,
}: {
  distributions: Distribution[];
  highlightFn: (d: Distribution) => "selected" | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="text-[#9A8866] text-sm uppercase tracking-wider">
            <th className="text-left py-2 pr-3 font-normal">Class</th>
            {distributions.map((d) => (
              <th
                key={d.id}
                className={`text-right py-2 px-3 font-normal ${
                  highlightFn(d) === "selected"
                    ? "text-[#1A7840]"
                    : "text-[#9A8866]"
                }`}
              >
                D{d.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[#3A3328]">
          {CLASS_LABELS.map((c) => (
            <tr key={c} className="border-t border-[#DDD5C0]">
              <td className="py-1.5 pr-3 text-[#9A8866]">{c}</td>
              {distributions.map((d) => (
                <td
                  key={d.id}
                  className={`text-right py-1.5 px-3 ${
                    highlightFn(d) === "selected" ? "text-[#1A7840]" : ""
                  }`}
                >
                  {fmtMoney(d.incomes[c])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-[#DDD5C0] text-[#9A8866]">
            <td className="py-1.5 pr-3 italic">Average</td>
            {distributions.map((d) => (
              <td key={d.id} className="text-right py-1.5 px-3 italic">
                {fmtMoney(Math.round(average(d)))}
              </td>
            ))}
          </tr>
          <tr className="text-[#9A8866]">
            <td className="py-1.5 pr-3 italic">Floor</td>
            {distributions.map((d) => (
              <td key={d.id} className="text-right py-1.5 px-3 italic">
                {fmtMoney(floor(d))}
              </td>
            ))}
          </tr>
          <tr className="text-[#9A8866]">
            <td className="py-1.5 pr-3 italic">Range</td>
            {distributions.map((d) => (
              <td key={d.id} className="text-right py-1.5 px-3 italic">
                {fmtMoney(range(d))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function IndividualChoice({
  onSubmit,
}: {
  onSubmit: (c: Choice) => void;
}) {
  const [principle, setPrinciple] = useState<PrincipleId | null>(null);
  const [floorC, setFloorC] = useState(12000);
  const [rangeC, setRangeC] = useState(20000);

  const preview = useMemo(() => {
    if (!principle) return null;
    const choice: Choice =
      principle === "max-average-floor"
        ? { principle, constraint: floorC }
        : principle === "max-average-range"
          ? { principle, constraint: rangeC }
          : { principle };
    return selectDistribution(SITUATION_A.distributions, choice);
  }, [principle, floorC, rangeC]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">Phase 1 — Your turn</h1>
      <p className="text-[#9A8866] text-base">
        Pick a principle. It will pick a distribution. You'll then be randomly
        assigned to an income class, and your income comes from that class.
      </p>
      <DistributionTable
        distributions={SITUATION_A.distributions}
        highlightFn={(d) => (preview && preview.id === d.id ? "selected" : null)}
      />
      <div className="space-y-3">
        {PRINCIPLES.map((p) => (
          <label
            key={p.id}
            className={`flex items-start gap-3 border rounded p-3 cursor-pointer transition-colors ${
              principle === p.id
                ? "border-[#1A1814] bg-[#FDFAF5]"
                : "border-[#DDD5C0] hover:border-[#9A8866]"
            }`}
          >
            <input
              type="radio"
              name="principle"
              checked={principle === p.id}
              onChange={() => setPrinciple(p.id)}
              className="mt-1"
            />
            <div>
              <div className="text-[#1A1814] text-base">{p.short}</div>
              <div className="text-[#9A8866] text-sm">{p.blurb}</div>
              {principle === p.id && p.id === "max-average-floor" && (
                <div className="mt-2 text-sm text-[#9A8866]">
                  Floor constraint:{" "}
                  <input
                    type="number"
                    value={floorC}
                    step={1000}
                    min={0}
                    max={30000}
                    onChange={(e) => setFloorC(parseInt(e.target.value) || 0)}
                    className="bg-[#FDFAF5] border border-[#9A8866] rounded px-2 py-0.5 w-24 text-[#1A1814]"
                  />
                </div>
              )}
              {principle === p.id && p.id === "max-average-range" && (
                <div className="mt-2 text-sm text-[#9A8866]">
                  Range constraint (max gap):{" "}
                  <input
                    type="number"
                    value={rangeC}
                    step={1000}
                    min={0}
                    max={50000}
                    onChange={(e) => setRangeC(parseInt(e.target.value) || 0)}
                    className="bg-[#FDFAF5] border border-[#9A8866] rounded px-2 py-0.5 w-24 text-[#1A1814]"
                  />
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
      {preview === null && principle && (
        <div className="text-[#CC1A14] text-base">
          No distribution satisfies your constraint. Loosen it or pick another
          principle.
        </div>
      )}
      <PrimaryButton
        disabled={!principle || preview === null}
        onClick={() => {
          if (!principle) return;
          const choice: Choice =
            principle === "max-average-floor"
              ? { principle, constraint: floorC }
              : principle === "max-average-range"
                ? { principle, constraint: rangeC }
                : { principle };
          onSubmit(choice);
        }}
      >
        Lock in my choice & draw a class
      </PrimaryButton>
    </div>
  );
}

function IndividualPayoff({
  result,
  onNext,
}: {
  result: IndividualResult;
  onNext: () => void;
}) {
  const chosen = PRINCIPLES.find((p) => p.id === result.choice.principle)!;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">The draw</h1>
      <div className="border border-[#1A1814] rounded p-4 bg-[#FDFAF5] space-y-2">
        <div className="text-[#9A8866] text-sm uppercase tracking-wider">
          Your principle
        </div>
        <div className="text-[#1A1814]">{chosen.short}</div>
        <div className="text-[#9A8866] text-sm uppercase tracking-wider pt-2">
          Random class assigned
        </div>
        <div className="text-[#1A1814]">{result.classLabel}</div>
        <div className="text-[#9A8866] text-sm uppercase tracking-wider pt-2">
          Your income
        </div>
        <div className="text-3xl text-[#1A7840]">{fmtMoney(result.income)}</div>
      </div>

      <div className="border border-[#DDD5C0] rounded p-4 space-y-2 bg-white">
        <div className="text-[#3A3328] text-base font-medium">
          What you'd have earned with the same class draw under the other
          principles:
        </div>
        <ul className="text-base text-[#9A8866] space-y-1">
          {result.counterfactuals.map((cf) => (
            <li key={cf.principle.id} className="flex justify-between">
              <span>{cf.principle.short}</span>
              <span className="text-[#1A1814]">{fmtMoney(cf.income)}</span>
            </li>
          ))}
        </ul>
        <div className="text-[#9A8866] text-sm pt-2">
          (Counterfactual constraints used: $10,000 floor / $18,000 range.)
        </div>
      </div>

      <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
    </div>
  );
}

function DiscussionIntro({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">Phase 2 — The group</h1>
      <p className="text-[#3A3328] text-base leading-relaxed">
        You're now in a room with four other participants. None of you knows
        which income class you'll be randomly assigned to. Your task is to reach{" "}
        <span className="text-[#1A1814]">unanimous agreement</span> on a single
        principle that will govern the group's distribution.
      </p>
      <p className="text-[#9A8866] text-base leading-relaxed">
        If you reach unanimity, a distribution will be drawn from those
        conforming to the chosen principle. If you fail, a distribution will be
        drawn at random from the full pool, ignoring any principle.
      </p>
      <p className="text-[#9A8866] text-sm leading-relaxed">
        Note: the group works from a larger candidate pool than Situation A
        (D1–D{GROUP_DISTRIBUTIONS.length}). A collapsible reference panel in the
        room shows the full pool and the principles — open it any time you lose
        track.
      </p>
      <div className="border border-[#DDD5C0] rounded p-4 space-y-3">
        <div className="text-[#3A3328] text-base font-medium">
          The other participants:
        </div>
        {PERSONAS.map((p) => (
          <div key={p.id} className="text-base">
            <span className="text-[#1A1814]">{p.name}</span>
            <span className="text-[#9A8866]"> — {p.oneLine}</span>
          </div>
        ))}
      </div>
      <PrimaryButton onClick={onNext}>Enter the room</PrimaryButton>
    </div>
  );
}

function Discussion({
  chat,
  setChat,
  onPropose,
}: {
  chat: ChatMsg[];
  setChat: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  onPropose: () => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allQuiet, setAllQuiet] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setAllQuiet(false);
    setBusy(true);
    const userMsg: ChatMsg = { role: "user", speaker: "You", content: text };
    let transcript = [...chat, userMsg];
    setChat(transcript);
    setInput("");

    let anySpoke = false;
    for (const persona of PERSONAS) {
      try {
        const res = await fetch("/api/experiments/frohlich-justice/discuss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: transcript, personaId: persona.id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Request failed");
        }
        const { speaker, content } = (await res.json()) as {
          speaker: string;
          content: string;
        };
        if (content && !content.includes("[QUIET]")) {
          anySpoke = true;
          const reply: ChatMsg = {
            role: "assistant",
            speaker,
            content,
          };
          transcript = [...transcript, reply];
          setChat(transcript);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        break;
      }
    }
    if (!anySpoke) setAllQuiet(true);
    setBusy(false);
  }

  return (
    <div className="space-y-4 flex flex-col h-[70vh]">
      <h1 className="text-2xl text-[#1A1814]">Group deliberation</h1>
      <ReferencePanel />
      <div className="flex-1 overflow-y-auto border border-[#DDD5C0] rounded p-4 space-y-3 bg-white">
        {chat.length === 0 && (
          <div className="text-[#9A8866] text-base italic">
            The room is quiet. Say something to start the conversation.
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className="text-base">
            <span
              className={
                m.speaker === "You"
                  ? "text-[#1A7840] font-medium"
                  : m.speaker === "Moderator"
                    ? "text-[#9A8866] italic"
                    : "text-[#3A3328] font-medium"
              }
            >
              {m.speaker}:
            </span>{" "}
            <span className="text-[#1A1814]">{m.content}</span>
          </div>
        ))}
        {busy && (
          <div className="text-[#9A8866] text-sm italic">…</div>
        )}
      </div>
      {allQuiet && !busy && (
        <div className="text-[#9A8866] text-sm italic">
          The room is silent. Try addressing someone by name (Devon, Maya, Sam,
          or Riley) or asking a pointed question.
        </div>
      )}
      {error && <div className="text-[#CC1A14] text-sm">{error}</div>}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Your turn (Enter to send, Shift-Enter for newline)…"
          disabled={busy}
          className="flex-1 bg-[#FDFAF5] border border-[#9A8866] rounded px-3 py-2 text-[#1A1814] text-base resize-none"
          rows={2}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="px-4 py-2 bg-[#1A1814] hover:bg-[#3A3328] disabled:opacity-40 disabled:cursor-not-allowed text-[#F4F0E8] text-sm uppercase tracking-[0.12em]"
        >
          Send
        </button>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-[#DDD5C0]">
        <div className="text-[#9A8866] text-sm">
          {chat.filter((m) => m.role === "user" && m.speaker === "You").length}{" "}
          turns so far
        </div>
        <button
          onClick={onPropose}
          disabled={chat.length < 2}
          className="text-[#3A3328] hover:text-[#1A1814] text-base border border-[#9A8866] px-3 py-1.5 rounded disabled:opacity-40"
        >
          Call for a vote →
        </button>
      </div>
    </div>
  );
}

function VoteSetup({
  chat,
  voteRound,
  onVote,
}: {
  chat: ChatMsg[];
  voteRound: number;
  onVote: (proposal: Choice, votes: VoteRecord[]) => void;
}) {
  const [principle, setPrinciple] = useState<PrincipleId | null>(null);
  const [floorC, setFloorC] = useState(10000);
  const [rangeC, setRangeC] = useState(20000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!principle) return null;
    const choice: Choice =
      principle === "max-average-floor"
        ? { principle, constraint: floorC }
        : principle === "max-average-range"
          ? { principle, constraint: rangeC }
          : { principle };
    return selectDistribution(GROUP_DISTRIBUTIONS, choice);
  }, [principle, floorC, rangeC]);

  async function callVote() {
    if (!principle) return;
    setError(null);
    setBusy(true);
    const proposal: Choice =
      principle === "max-average-floor"
        ? { principle, constraint: floorC }
        : principle === "max-average-range"
          ? { principle, constraint: rangeC }
          : { principle };
    const p = PRINCIPLES.find((x) => x.id === principle)!;
    const constraintText =
      principle === "max-average-floor"
        ? `floor ≥ ${fmtMoney(floorC)}`
        : principle === "max-average-range"
          ? `range ≤ ${fmtMoney(rangeC)}`
          : undefined;

    try {
      const results = await Promise.all(
        PERSONAS.map(async (persona) => {
          const res = await fetch("/api/experiments/frohlich-justice/discuss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: chat,
              personaId: persona.id,
              mode: "vote",
              proposal: { principleLong: p.long, constraintText },
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Vote request failed");
          }
          return (await res.json()) as VoteRecord;
        }),
      );
      onVote(proposal, results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">
        Call a vote {voteRound > 0 && `(round ${voteRound + 1})`}
      </h1>
      <p className="text-[#9A8866] text-base">
        Propose one principle (and a constraint value if applicable). Each
        participant will vote yes or no. Adoption requires unanimity.
      </p>
      <ReferencePanel />
      <div className="space-y-3">
        {PRINCIPLES.map((p) => (
          <label
            key={p.id}
            className={`flex items-start gap-3 border rounded p-3 cursor-pointer transition-colors ${
              principle === p.id
                ? "border-[#1A1814] bg-[#FDFAF5]"
                : "border-[#DDD5C0] hover:border-[#9A8866]"
            }`}
          >
            <input
              type="radio"
              name="proposal"
              checked={principle === p.id}
              onChange={() => setPrinciple(p.id)}
              className="mt-1"
            />
            <div>
              <div className="text-[#1A1814] text-base">{p.short}</div>
              {principle === p.id && p.id === "max-average-floor" && (
                <div className="mt-2 text-sm text-[#9A8866]">
                  Floor:{" "}
                  <input
                    type="number"
                    value={floorC}
                    step={500}
                    onChange={(e) => setFloorC(parseInt(e.target.value) || 0)}
                    className="bg-[#FDFAF5] border border-[#9A8866] rounded px-2 py-0.5 w-24 text-[#1A1814]"
                  />
                </div>
              )}
              {principle === p.id && p.id === "max-average-range" && (
                <div className="mt-2 text-sm text-[#9A8866]">
                  Max range:{" "}
                  <input
                    type="number"
                    value={rangeC}
                    step={500}
                    onChange={(e) => setRangeC(parseInt(e.target.value) || 0)}
                    className="bg-[#FDFAF5] border border-[#9A8866] rounded px-2 py-0.5 w-24 text-[#1A1814]"
                  />
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
      {principle && preview && (
        <div className="border border-[#1A1814] rounded p-3 bg-[#FDFAF5] text-base space-y-2">
          <div className="text-[#9A8866] text-sm uppercase tracking-wider">
            This proposal would select
          </div>
          <div className="text-[#1A1814]">
            Distribution {preview.id} — floor{" "}
            <span className="text-[#3A3328]">{fmtMoney(floor(preview))}</span>,
            average{" "}
            <span className="text-[#3A3328]">
              {fmtMoney(Math.round(average(preview)))}
            </span>
            , range{" "}
            <span className="text-[#3A3328]">{fmtMoney(range(preview))}</span>
          </div>
          <DistributionTable
            distributions={[preview]}
            highlightFn={() => "selected"}
          />
        </div>
      )}
      {principle && preview === null && (
        <div className="text-[#CC1A14] text-base">
          No distribution in the pool satisfies that constraint. Loosen it or
          pick another principle.
        </div>
      )}
      {error && <div className="text-[#CC1A14] text-base">{error}</div>}
      <PrimaryButton
        onClick={callVote}
        disabled={!principle || preview === null || busy}
      >
        {busy ? "Collecting votes…" : "Put it to the group"}
      </PrimaryButton>
    </div>
  );
}

function VoteResult({
  proposal,
  votes,
  onAdopt,
  onKeepTalking,
}: {
  proposal: Choice;
  votes: VoteRecord[];
  onAdopt: () => void;
  onKeepTalking: () => void;
}) {
  const principle = PRINCIPLES.find((p) => p.id === proposal.principle)!;
  const unanimous = votes.every((v) => v.vote === "YES");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">The vote</h1>
      <div className="border border-[#DDD5C0] rounded p-4 bg-white">
        <div className="text-[#9A8866] text-sm uppercase tracking-wider mb-1">
          Proposal
        </div>
        <div className="text-[#1A1814] text-base">
          {principle.short}
          {proposal.constraint && proposal.principle === "max-average-floor" && (
            <span className="text-[#9A8866]">
              {" "}
              — floor ≥ {fmtMoney(proposal.constraint)}
            </span>
          )}
          {proposal.constraint &&
            proposal.principle === "max-average-range" && (
              <span className="text-[#9A8866]">
                {" "}
                — range ≤ {fmtMoney(proposal.constraint)}
              </span>
            )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="border border-[#DDD5C0] rounded p-3 text-base flex justify-between items-start">
          <div>
            <span className="text-[#1A7840] font-medium">You</span>
            <span className="text-[#9A8866]"> (proposer)</span>
          </div>
          <span className="text-[#1A7840] font-mono text-sm">YES</span>
        </div>
        {votes.map((v) => (
          <div
            key={v.speaker}
            className="border border-[#DDD5C0] rounded p-3 text-base"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-[#1A1814] font-medium">{v.speaker}</span>
              <span
                className={`font-mono text-sm ${
                  v.vote === "YES"
                    ? "text-[#1A7840]"
                    : v.vote === "NO"
                      ? "text-[#CC1A14]"
                      : "text-[#1A7840]"
                }`}
              >
                {v.vote}
              </span>
            </div>
            <div className="text-[#9A8866] text-sm">{v.reason}</div>
          </div>
        ))}
      </div>
      {unanimous ? (
        <div className="space-y-3">
          <div className="text-[#1A7840] text-base">
            Unanimous. The principle is adopted.
          </div>
          <PrimaryButton onClick={onAdopt}>Draw the distribution</PrimaryButton>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[#CC1A14] text-base">
            Not unanimous. The group keeps deliberating.
          </div>
          <button
            onClick={onKeepTalking}
            className="px-4 py-2 bg-[#1A1814] hover:bg-[#3A3328] text-[#F4F0E8] text-sm uppercase tracking-[0.12em]"
          >
            Back to discussion
          </button>
        </div>
      )}
    </div>
  );
}

function GroupPayoff({
  result,
  onNext,
}: {
  result: GroupResult;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">The group draw</h1>
      <div className="border border-[#1A1814] rounded p-4 bg-[#FDFAF5] space-y-2">
        <div className="text-[#9A8866] text-sm uppercase tracking-wider">
          Adopted principle
        </div>
        <div className="text-[#1A1814]">{result.proposalText}</div>
        <div className="text-[#9A8866] text-sm uppercase tracking-wider pt-2">
          Distribution selected from pool
        </div>
        <div className="text-[#1A1814]">Distribution {result.distribution.id}</div>
        <div className="text-[#9A8866] text-sm uppercase tracking-wider pt-2">
          Your random class
        </div>
        <div className="text-[#1A1814]">{result.classLabel}</div>
        <div className="text-[#9A8866] text-sm uppercase tracking-wider pt-2">
          Your income
        </div>
        <div className="text-3xl text-[#1A7840]">{fmtMoney(result.income)}</div>
      </div>
      <DistributionTable
        distributions={[result.distribution]}
        highlightFn={() => "selected"}
      />
      <PrimaryButton onClick={onNext}>Continue to final ranking</PrimaryButton>
    </div>
  );
}

function Debrief({
  rank1,
  rank2,
  rankFinal,
  indResult,
  groupResult,
  onRestart,
}: {
  rank1: PrincipleId[] | null;
  rank2: PrincipleId[] | null;
  rankFinal: PrincipleId[] | null;
  indResult: IndividualResult | null;
  groupResult: GroupResult | null;
  onRestart: () => void;
}) {
  function nameFor(id: PrincipleId) {
    return PRINCIPLES.find((p) => p.id === id)?.short ?? id;
  }
  function rankRow(label: string, r: PrincipleId[] | null) {
    if (!r) return null;
    return (
      <div className="space-y-1">
        <div className="text-[#9A8866] text-sm uppercase tracking-wider">
          {label}
        </div>
        <ol className="text-base text-[#1A1814] list-decimal list-inside space-y-0.5">
          {r.map((id) => (
            <li key={id}>{nameFor(id)}</li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-[#1A1814]">Debrief</h1>
      <p className="text-[#9A8866] text-base">
        Frohlich, Oppenheimer & Eavey (1987) ran this with 44 five-person
        groups. Zero of the 44 chose Rawls's difference principle. 35 of 44
        chose "maximize the average with a floor constraint." Compare your own
        path:
      </p>
      <div className="grid sm:grid-cols-3 gap-4 border border-[#DDD5C0] rounded p-4 bg-white">
        {rankRow("Before", rank1)}
        {rankRow("After your own draw", rank2)}
        {rankRow("After the group", rankFinal)}
      </div>
      {indResult && (
        <div className="text-base text-[#9A8866]">
          Individual phase: you chose{" "}
          <span className="text-[#1A1814]">
            {nameFor(indResult.choice.principle)}
          </span>
          , drew {indResult.classLabel}, earned{" "}
          <span className="text-[#1A1814]">{fmtMoney(indResult.income)}</span>.
        </div>
      )}
      {groupResult && (
        <div className="text-base text-[#9A8866]">
          Group phase: adopted{" "}
          <span className="text-[#1A1814]">{groupResult.proposalText}</span>,
          drew {groupResult.classLabel}, earned{" "}
          <span className="text-[#1A1814]">
            {fmtMoney(groupResult.income)}
          </span>
          .
        </div>
      )}
      <button
        onClick={onRestart}
        className="px-4 py-2 bg-[#1A1814] hover:bg-[#3A3328] text-[#F4F0E8] text-sm uppercase tracking-[0.12em]"
      >
        Run it again
      </button>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-9 py-3 bg-[#1A1814] hover:bg-[#3A3328] disabled:opacity-40 disabled:cursor-not-allowed text-[#F4F0E8] text-sm uppercase tracking-[0.12em] transition-colors"
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {children}
    </button>
  );
}
