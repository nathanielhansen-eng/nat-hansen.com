// Pure tell-loop helpers, safe to import from client components.
import type { Agent, Message, Round, Session, Tell } from "./types";

export function liveAgent(s: Session): Agent | null {
  if (!s.lineage) return null;
  return s.agents.find((a) => a.id === s.lineage!.liveAgentId) ?? null;
}

export function currentGeneration(s: Session): number {
  return liveAgent(s)?.generation ?? 0;
}

// Every round that has been revealed, oldest first.
export function revealedRounds(s: Session): Round[] {
  return [...s.history, ...(s.round.revealed ? [s.round] : [])].filter(
    (r) => r.revealed
  );
}

export function findMessage(round: Round, id: string): Message | null {
  for (const t of Object.values(round.transcripts)) {
    const m = t.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

// Clamp judge-submitted spans to real text in the witness's own messages.
export function cleanTells(
  round: Round,
  witnessId: string,
  raw: unknown
): Tell[] {
  if (!Array.isArray(raw)) return [];
  const out: Tell[] = [];
  for (const t of raw.slice(0, 20)) {
    if (!t || typeof t !== "object") continue;
    const { messageId, start, end } = t as Record<string, unknown>;
    const m = findMessage(round, String(messageId));
    if (!m || m.from !== witnessId) continue;
    const a = Math.max(0, Math.min(m.text.length, Math.floor(Number(start))));
    const b = Math.max(0, Math.min(m.text.length, Math.floor(Number(end))));
    if (!(b > a)) continue;
    out.push({ messageId: m.id, start: a, end: b, text: m.text.slice(a, b) });
  }
  return out;
}

export type DetectionRow = {
  round: number;
  generation: number;
  liveAi: number;
  liveTotal: number;
  controlAi: number;
  controlTotal: number;
  tellsOnLive: number;
};

// Per revealed round: how often judges called the live bot and the Gen 0
// control "AI". Same judges, same round, so the gap is the bot's progress
// net of the class getting better at the game.
export function detectionCurve(s: Session): DetectionRow[] {
  const L = s.lineage;
  if (!L) return [];
  const rows: DetectionRow[] = [];
  for (const r of revealedRounds(s)) {
    const gen = r.agentGenerations?.[L.liveAgentId];
    if (gen === undefined) continue;
    let liveAi = 0,
      liveTotal = 0,
      controlAi = 0,
      controlTotal = 0,
      tellsOnLive = 0;
    for (const votes of Object.values(r.votes ?? {})) {
      const lv = votes[L.liveAgentId];
      if (lv) {
        liveTotal++;
        if (lv.guess === "ai") {
          liveAi++;
          tellsOnLive += lv.tells?.length ?? 0;
        }
      }
      const cv = votes[L.controlAgentId];
      if (cv) {
        controlTotal++;
        if (cv.guess === "ai") controlAi++;
      }
    }
    rows.push({
      round: r.number,
      generation: gen,
      liveAi,
      liveTotal,
      controlAi,
      controlTotal,
      tellsOnLive,
    });
  }
  return rows;
}

export type HumanFlag = {
  round: number;
  witnessId: string;
  label: string; // the witness's letter in that round
  message: string;
  marked: string[]; // spans judges marked in this message
  judges: number; // how many judges marked something in it
};

// Lines real people wrote that judges voted bot on and marked as giveaways:
// the class's false positives, kept for the record and the paper.
export function humanFlags(s: Session): HumanFlag[] {
  const humanIds = new Set(s.participants.map((p) => p.id));
  const out: HumanFlag[] = [];
  for (const r of revealedRounds(s)) {
    const byMsg = new Map<string, HumanFlag>();
    for (const votes of Object.values(r.votes ?? {})) {
      for (const [wid, v] of Object.entries(votes)) {
        if (!humanIds.has(wid) || v.guess !== "ai" || !v.tells?.length) continue;
        const seen = new Set<string>();
        for (const t of v.tells) {
          const m = findMessage(r, t.messageId);
          if (!m) continue;
          let f = byMsg.get(m.id);
          if (!f) {
            f = {
              round: r.number,
              witnessId: wid,
              label: r.labels?.[wid] ?? "?",
              message: m.text,
              marked: [],
              judges: 0,
            };
            byMsg.set(m.id, f);
          }
          f.marked.push(t.text);
          if (!seen.has(m.id)) {
            f.judges++;
            seen.add(m.id);
          }
        }
      }
    }
    out.push(...byMsg.values());
  }
  return out;
}
