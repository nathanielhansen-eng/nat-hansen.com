import type { FC, ReactNode } from "react";

// Client-side counterpart to the server task module. Each task supplies an
// interactive component (learn + produce) and a compact summary renderer used
// by the post-submit reveal and the instructor dashboard.
export type ChainTaskComponentProps = {
  input: unknown;
  submitting: boolean;
  onSubmit: (response: unknown) => void;
};

export type ChainTaskClient = {
  id: string;
  Component: FC<ChainTaskComponentProps>;
  // `value` is either a seed signal or a stored response — both task-defined.
  renderSummary: (value: unknown) => ReactNode;
};
