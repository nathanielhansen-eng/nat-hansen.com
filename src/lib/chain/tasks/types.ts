// Server-side task module interface. These are pure functions only — no React,
// so they are safe to import inside Route Handlers. The matching interactive UI
// lives in a client component registered separately under
// src/app/teaching/experiments/chain/tasks/registry.ts, keyed by the same id.

export type ChainTaskModule = {
  id: string;
  title: string;
  // Short instructor-facing description shown in the room-creation form.
  blurb: string;
  // Generation-0 signal handed to the first student in every chain.
  seed(): unknown;
  // Validate/normalize a raw client submission into a stored response, or null.
  validateResponse(raw: unknown): unknown | null;
  // Derive the signal passed to the next generation from a validated response.
  signalFromResponse(response: unknown): unknown;
};
