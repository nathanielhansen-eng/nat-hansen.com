import type { Message, Session } from "./types";
import type { TypingMap } from "./session";
import { tallyRound, leaderboard, type WitnessVerdict, type AgentLeaderboard } from "./verdict";

export type PublicMessage = {
  id: string;
  from: string;
  text: string | null; // null when still "typing"
  at: number;
};

export type PublicTyping = {
  pairId: string;
  who: string;
};

function visibleMessages(msgs: Message[], now: number): PublicMessage[] {
  const out: PublicMessage[] = [];
  for (const m of msgs) {
    if (m.displayAt <= now) {
      out.push({ id: m.id, from: m.from, text: m.text, at: m.displayAt });
    }
  }
  return out;
}

function pendingTypingFromMessages(
  msgs: Message[],
  now: number
): { who: string } | null {
  // If there is a message whose displayAt is in the future, the sender is "typing"
  for (const m of msgs) {
    if (m.displayAt > now) return { who: m.from };
  }
  return null;
}

function getExplicitTyping(typing: TypingMap, pairId: string): string | null {
  const now = Date.now();
  const v = typing[pairId];
  if (v && v.until > now) return v.who;
  return null;
}

export type HostView = {
  role: "host";
  session: Session;
  now: number;
};

export type ParticipantView = {
  role: "participant";
  code: string;
  status: Session["status"];
  selfId: string;
  selfLabel: string;
  pairId: string | null;
  opponentLabel: string | null;
  messages: PublicMessage[];
  opponentTyping: boolean;
  endsAt: number | null;
  roundNumber: number;
  now: number;
  reveal?: {
    self: WitnessVerdict;
    partner: WitnessVerdict | null;
    partnerKind: "human" | "ai" | null;
    partnerName?: string;
  };
};

export type JudgeView = {
  role: "judge";
  code: string;
  status: Session["status"];
  selfId: string;
  selfName: string;
  roundNumber: number;
  endsAt: number | null;
  pairs: Array<{
    pairId: string;
    aLabel: string;
    bLabel: string;
    aId: string;
    bId: string;
    messages: PublicMessage[];
    typingWho: string | null;
  }>;
  witnesses: Array<{ id: string; label: string }>;
  myVotes: Record<string, "human" | "ai">;
  revealed: boolean;
  truth?: Array<{ id: string; label: string; kind: "human" | "ai"; name?: string }>;
  verdicts?: WitnessVerdict[];
  leaderboard?: AgentLeaderboard[];
  now: number;
};

export function hostView(s: Session, typing: TypingMap): HostView {
  // expose typing on the session-shaped object for the host UI to read
  const sWithTyping = { ...s, round: { ...s.round, typing } };
  return { role: "host", session: sWithTyping, now: Date.now() };
}

export function participantView(
  s: Session,
  selfId: string,
  typing: TypingMap
): ParticipantView {
  const now = Date.now();
  const me = s.participants.find((p) => p.id === selfId);
  const pair = s.pairs.find((p) => p.aId === selfId || p.bId === selfId) ?? null;
  let messages: PublicMessage[] = [];
  let opponentTyping = false;
  let opponentLabel: string | null = null;

  if (pair) {
    const oppId = pair.aId === selfId ? pair.bId : pair.aId;
    const opp =
      s.agents.find((a) => a.id === oppId) ??
      s.participants.find((p) => p.id === oppId);
    opponentLabel = opp?.label ?? null;
    const t = s.round.transcripts[pair.id] ?? [];
    messages = visibleMessages(t, now);

    const explicit = getExplicitTyping(typing, pair.id);
    const pending = pendingTypingFromMessages(t, now);
    const typingWho = pending?.who ?? explicit;
    if (typingWho && typingWho !== selfId) opponentTyping = true;
  }

  const view: ParticipantView = {
    role: "participant",
    code: s.code,
    status: s.status,
    selfId,
    selfLabel: me?.label ?? "?",
    pairId: pair?.id ?? null,
    opponentLabel,
    messages,
    opponentTyping,
    endsAt: s.round.endsAt,
    roundNumber: s.round.number,
    now,
  };

  if (s.round.revealed && pair) {
    const verdicts = tallyRound(s, s.round);
    const oppId = pair.aId === selfId ? pair.bId : pair.aId;
    const oppAgent = s.agents.find((a) => a.id === oppId);
    const oppHuman = s.participants.find((p) => p.id === oppId);
    const partnerKind = oppAgent ? "ai" : oppHuman ? "human" : null;
    const self = verdicts.find((v) => v.witnessId === selfId);
    const partner = verdicts.find((v) => v.witnessId === oppId) ?? null;
    if (self) {
      view.reveal = {
        self,
        partner,
        partnerKind,
        partnerName: oppHuman?.name,
      };
    }
  }

  return view;
}

export function judgeView(
  s: Session,
  selfId: string,
  typing: TypingMap
): JudgeView {
  const now = Date.now();
  const me = s.judges.find((j) => j.id === selfId);
  const witnesses = [
    ...s.participants.map((p) => ({ id: p.id, label: p.label })),
    ...s.agents.map((a) => ({ id: a.id, label: a.label })),
  ];

  const pairs = s.pairs.map((p) => {
    const a =
      s.agents.find((x) => x.id === p.aId) ??
      s.participants.find((x) => x.id === p.aId);
    const b =
      s.agents.find((x) => x.id === p.bId) ??
      s.participants.find((x) => x.id === p.bId);
    const t = s.round.transcripts[p.id] ?? [];
    const explicit = getExplicitTyping(typing, p.id);
    const pending = pendingTypingFromMessages(t, now);
    return {
      pairId: p.id,
      aLabel: a?.label ?? "?",
      bLabel: b?.label ?? "?",
      aId: p.aId,
      bId: p.bId,
      messages: visibleMessages(t, now),
      typingWho: pending?.who ?? explicit,
    };
  });

  const myVotes: Record<string, "human" | "ai"> = {};
  const v = s.round.votes[selfId] ?? {};
  for (const k of Object.keys(v)) myVotes[k] = v[k].guess;

  const view: JudgeView = {
    role: "judge",
    code: s.code,
    status: s.status,
    selfId,
    selfName: me?.name ?? "judge",
    roundNumber: s.round.number,
    endsAt: s.round.endsAt,
    pairs,
    witnesses,
    myVotes,
    revealed: s.round.revealed,
    now,
  };

  if (s.round.revealed) {
    view.truth = witnesses.map((w) => {
      const a = s.agents.find((x) => x.id === w.id);
      if (a) return { id: a.id, label: a.label, kind: "ai" as const };
      const p = s.participants.find((x) => x.id === w.id)!;
      return {
        id: p.id,
        label: p.label,
        kind: "human" as const,
        name: p.name,
      };
    });
    view.verdicts = tallyRound(s, s.round);
    view.leaderboard = leaderboard(s);
  }

  return view;
}
