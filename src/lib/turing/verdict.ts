import type { Session, Round } from "./types";

export type WitnessVerdict = {
  witnessId: string;
  label: string;
  kind: "human" | "ai";
  name?: string;
  humanVotes: number;
  aiVotes: number;
  totalVotes: number;
  // For AI agents: did judges *collectively* believe they were human?
  // null when there are no votes or it's a tie.
  aiPassed: boolean | null;
};

export function tallyRound(s: Session, round: Round): WitnessVerdict[] {
  const out: WitnessVerdict[] = [];
  const witnesses = [
    ...s.participants.map((p) => ({
      id: p.id,
      label: p.label,
      kind: "human" as const,
      name: p.name,
    })),
    ...s.agents.map((a) => ({
      id: a.id,
      label: a.label,
      kind: "ai" as const,
    })),
  ];
  for (const w of witnesses) {
    let human = 0;
    let ai = 0;
    for (const judgeId of Object.keys(round.votes ?? {})) {
      const v = round.votes[judgeId]?.[w.id];
      if (v?.guess === "human") human++;
      else if (v?.guess === "ai") ai++;
    }
    let aiPassed: boolean | null = null;
    if (w.kind === "ai") {
      if (human > ai) aiPassed = true;
      else if (ai > human) aiPassed = false;
      else aiPassed = null;
    }
    out.push({
      witnessId: w.id,
      label: w.label,
      kind: w.kind,
      name: "name" in w ? w.name : undefined,
      humanVotes: human,
      aiVotes: ai,
      totalVotes: human + ai,
      aiPassed,
    });
  }
  return out;
}

export type AgentLeaderboard = {
  agentId: string;
  label: string;
  brief: string;
  model: string;
  rounds: number;
  passes: number;
  fails: number;
  ties: number;
  totalHumanVotes: number;
  totalAiVotes: number;
  passRate: number; // passes / rounds
};

// Walk history + current round (only if revealed) and accumulate per-agent stats.
export function leaderboard(s: Session): AgentLeaderboard[] {
  const rounds: Round[] = [
    ...s.history,
    ...(s.round.revealed ? [s.round] : []),
  ];
  const byAgent = new Map<string, AgentLeaderboard>();
  for (const a of s.agents) {
    byAgent.set(a.id, {
      agentId: a.id,
      label: a.label,
      brief: a.brief,
      model: a.model,
      rounds: 0,
      passes: 0,
      fails: 0,
      ties: 0,
      totalHumanVotes: 0,
      totalAiVotes: 0,
      passRate: 0,
    });
  }
  for (const r of rounds) {
    const tally = tallyRound(s, r);
    for (const t of tally) {
      if (t.kind !== "ai") continue;
      const lb = byAgent.get(t.witnessId);
      if (!lb) continue;
      // Only count rounds where there were any votes for this witness.
      if (t.totalVotes === 0) continue;
      lb.rounds += 1;
      lb.totalHumanVotes += t.humanVotes;
      lb.totalAiVotes += t.aiVotes;
      if (t.aiPassed === true) lb.passes += 1;
      else if (t.aiPassed === false) lb.fails += 1;
      else lb.ties += 1;
    }
  }
  for (const lb of byAgent.values()) {
    lb.passRate = lb.rounds > 0 ? lb.passes / lb.rounds : 0;
  }
  return [...byAgent.values()].sort(
    (a, b) => b.passRate - a.passRate || b.passes - a.passes
  );
}
