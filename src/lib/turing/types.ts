export type Role = "host" | "participant" | "judge";

export type Kind = "human" | "ai";

export type Agent = {
  id: string;
  label: string;
  brief: string;
  model: string;
  kind: "ai";
  // Tell loop: the live agent carries the approved patch for its generation;
  // the control is a frozen Gen 0 copy of the same brief.
  loopRole?: "live" | "control";
  generation?: number;
  patch?: Patch | null;
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

// A span a judge marked as a giveaway, as character offsets into one message.
export type Tell = {
  messageId: string;
  start: number;
  end: number;
  text: string;
};

export type Vote = {
  guess: "human" | "ai";
  tells?: Tell[];
};

export type TellTheme = {
  theme: string;
  note: string;
  quotes: string[];
};

// Appended to the live agent's system prompt, reminder last.
export type Patch = {
  themes: TellTheme[];
  exemplars: string[];
  reminder: string;
};

export type Generation = {
  n: number;
  patch: Patch | null;
  approvedAt: number;
  fromRound: number | null; // last round whose tells fed this patch
  tellCount: number;
};

export type Lineage = {
  baseBrief: string;
  model: string;
  liveAgentId: string;
  controlAgentId: string;
  generations: Generation[];
  draft: (Patch & { fromRound: number; tellCount: number; draftedAt: number }) | null;
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
  // Stamped at start_round so history can be read back per generation.
  agentGenerations?: Record<string, number>;
  labels?: Record<string, string>;
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
  lineage?: Lineage | null;
  rev: number;
};

export type Witness = (Agent | Participant) & { kind: "ai" | "human" };
