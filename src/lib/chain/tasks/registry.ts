import type { ChainTaskModule } from "./types";
import { esperTask } from "./esper";

// Server-side registry of task modules. Add new transmission-chain experiments
// here (sentence telephone, Bartlett retelling, drawing<->description, ...) and
// register a matching client UI component under the app/.../tasks registry.
const MODULES: ChainTaskModule[] = [esperTask];

export const TASK_MODULES: Record<string, ChainTaskModule> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

export function getTask(id: string): ChainTaskModule | null {
  return TASK_MODULES[id] ?? null;
}

export function taskList(): { id: string; title: string; blurb: string }[] {
  return MODULES.map((m) => ({ id: m.id, title: m.title, blurb: m.blurb }));
}
