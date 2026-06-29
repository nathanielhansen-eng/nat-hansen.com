import EsperTask, { renderEsperSummary } from "./EsperTask";
import type { ChainTaskClient } from "./types";

// Client registry: maps a task id to its interactive component and summary
// renderer. Mirror every server module in src/lib/chain/tasks/registry.ts here.
const CLIENTS: ChainTaskClient[] = [
  { id: "esper", Component: EsperTask, renderSummary: renderEsperSummary },
];

export const TASK_CLIENTS: Record<string, ChainTaskClient> = Object.fromEntries(
  CLIENTS.map((c) => [c.id, c]),
);

export function getTaskClient(id: string): ChainTaskClient | null {
  return TASK_CLIENTS[id] ?? null;
}
