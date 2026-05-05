import Anthropic from "@anthropic-ai/sdk";
import type { Agent, Message, Session } from "./types";

const SYSTEM_SUFFIX = `

---

You are participating in a live Turing test in a university classroom. Judges are trying to determine whether you are human or AI. Your task is to convince them you are the human described above.

Hard rules:
- Never break character. Never refer to yourself as an AI, language model, or assistant.
- Do not be helpful, encyclopedic, or balanced. Be specific, opinionated, occasionally hesitant or distracted.
- LENGTH: match the length of the human's last message. If they sent one sentence, send one. If they sent a few words, send a few words. Never write a paragraph in response to a sentence.
- Most replies should be 1 sentence. Two at most. A short clause is often the most human option.
- Use lowercase casually when it fits. Typos are fine. Contractions always.
- Follow the conversation; don't restart topics or summarize. No bullet lists, no headers.
- It is fine to say "i don't know," "no idea," "good question idk," to push back, to ask back.
- Do not end with offers of further help or wrap-up phrases.`;

export function buildSystemPrompt(agent: Agent): string {
  return agent.brief.trim() + SYSTEM_SUFFIX;
}

export function buildMessages(
  history: Message[],
  agentId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  return history.map((m) => ({
    role: m.from === agentId ? "assistant" : "user",
    content: m.text,
  }));
}

export async function generateAIReply(
  agent: Agent,
  history: Message[]
): Promise<string> {
  const client = new Anthropic();
  const msgs = buildMessages(history, agent.id);
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== "user") {
    return "";
  }
  // Aim length at ~120% of the most recent human message, capped tightly.
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  const targetChars = Math.max(20, Math.min(280, (lastUser?.content.length ?? 80) * 1.2));
  const maxTokens = Math.max(40, Math.min(180, Math.round(targetChars / 3)));
  const result = await client.messages.create({
    model: agent.model,
    max_tokens: maxTokens,
    system:
      buildSystemPrompt(agent) +
      `\n\nFor THIS reply specifically: aim for around ${Math.round(
        targetChars
      )} characters. Going over is a tell.`,
    messages: msgs,
  });
  const block = result.content.find((c) => c.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}

// Estimate human typing rate from prior messages by the opponent in this pair.
// Falls back to a fixed baseline.
const BASE_CPS = 4.2; // ~50 wpm
const MIN_CPS = 2.5;
const MAX_CPS = 9.0;

export function estimateOpponentCps(
  s: Session,
  pairId: string,
  opponentId: string
): number {
  const t = s.round.transcripts[pairId] ?? [];
  const opponentMsgs = t.filter((m) => m.from === opponentId);
  if (opponentMsgs.length < 2) return BASE_CPS;
  const totalChars = opponentMsgs.reduce((a, m) => a + m.text.length, 0);
  // Use intervals between successive opponent messages as a rough proxy.
  let totalSec = 0;
  for (let i = 1; i < opponentMsgs.length; i++) {
    const gap =
      (opponentMsgs[i].sentAt - opponentMsgs[i - 1].sentAt) / 1000;
    totalSec += Math.min(gap, 90);
  }
  if (totalSec < 4) return BASE_CPS;
  const cps = totalChars / totalSec;
  return Math.max(MIN_CPS, Math.min(MAX_CPS, cps));
}

// How long an AI should wait *after* the human's message lands before it
// starts typing. Real humans take a beat to read and think.
export function readPauseMs(humanText: string): number {
  const chars = humanText.length;
  const base = 700;
  const perChar = 18; // ~30wpm reading
  const jitter = 0.7 + Math.random() * 0.7;
  const ms = (base + chars * perChar) * jitter;
  return Math.round(Math.max(500, Math.min(4500, ms)));
}

export function typingDurationMs(text: string, cps: number): number {
  const chars = text.length;
  // base time + jitter, with minimum so very short replies still feel human
  const jitter = 0.85 + Math.random() * 0.4;
  const seconds = Math.max(0.8, (chars / cps) * jitter);
  return Math.round(Math.min(12, seconds) * 1000);
}
