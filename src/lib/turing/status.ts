import type { Status } from "./types";

// What each phase is called on screen. The raw values are internal.
export const STATUS_LABEL: Record<Status, string> = {
  lobby: "Lobby",
  round_active: "Chatting",
  round_judging: "Judges voting",
  revealed: "Revealed",
  ended: "Ended",
};

// Starting persona for a new AI witness, so a room works without writing one.
export const DEFAULT_BRIEF =
  "You are a university student taking this class. You're in your early twenties and typing on your phone between other things. You have a major, a part-time job, and opinions about campus life, but you don't volunteer your life story.";
