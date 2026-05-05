export type Role = "host" | "participant" | "judge";

export type Kind = "human" | "ai";

export type Agent = {
  id: string;
  label: string;
  brief: string;
  model: string;
  kind: "ai";
};

export type Participant = {
  id: string;
  label: string;
  name: string;
  kind: "human";
  joinedAt: number;
};

export type Judge = {
  id: string;
  name: string;
  joinedAt: number;
};

export type Pair = {
  id: string;
  aId: string;
  bId: string;
};

export type Message = {
  id: string;
  from: string;
  text: string;
  sentAt: number;
  displayAt: number;
};

export type TypingState = {
  who: string;
  until: number;
};

export type Vote = {
  guess: "human" | "ai";
};

export type Status =
  | "lobby"
  | "round_active"
  | "round_judging"
  | "revealed"
  | "ended";

export type Round = {
  number: number;
  startedAt: number | null;
  endsAt: number | null;
  transcripts: Record<string, Message[]>;
  typing: Record<string, TypingState | null>;
  votes: Record<string, Record<string, Vote>>;
  revealed: boolean;
};

export type Session = {
  code: string;
  createdAt: number;
  status: Status;
  config: { roundDurationSec: number };
  agents: Agent[];
  participants: Participant[];
  judges: Judge[];
  pairs: Pair[];
  round: Round;
  history: Round[];
  rev: number;
};

export type Witness = (Agent | Participant) & { kind: "ai" | "human" };
