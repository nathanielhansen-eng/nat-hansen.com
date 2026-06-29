// Generic transmission-chain ("telephone game") data model.
//
// A Room holds N independent parallel Chains. Each Chain is a sequence of
// Generations. Generation n is handed the previous generation's *signal* as
// input, the student produces a *response*, and `signalFromResponse` derives
// the signal handed to generation n+1. The engine is task-agnostic: `input`
// and `response` are opaque JSON owned by the task module (see tasks/types.ts).

export type Generation = {
  n: number; // 1-based; generation 0 is the seed (stored on the Chain, not here)
  input: unknown; // signal shown to this student (output of the previous gen)
  response: unknown | null; // student's submitted response, null while in-flight
  participantTag: string | null; // anonymous tag, e.g. "P-7"
  startedAt: number | null; // claim time (also the lease anchor)
  submittedAt: number | null;
  timingMs: number | null; // client-reported time on task
};

export type Chain = {
  id: string; // "A", "B", ...
  seed: unknown; // signal handed to generation 1
  generations: Generation[]; // ordered, n = 1..cap
  closed: boolean; // reached the generation cap
};

export type RoomConfig = {
  taskId: string;
  numChains: number;
  cap: number; // max student generations per chain
  leaseMs: number; // how long a claimed-but-unsubmitted slot is held
};

export type RoomStatus = "open" | "ended";

export type Room = {
  code: string;
  createdAt: number;
  status: RoomStatus;
  config: RoomConfig;
  chains: Chain[];
  participantCount: number; // monotonic, drives anonymous tag assignment
  rev: number;
};

// What a student receives when they successfully claim a slot.
export type ClaimResult = {
  ok: true;
  taskId: string;
  chainId: string;
  n: number;
  input: unknown;
};

// Returned to a student after submitting: their chain's drift so far.
export type ChainSnapshot = {
  chainId: string;
  seed: unknown;
  generations: {
    n: number;
    response: unknown;
    participantTag: string | null;
  }[];
};
