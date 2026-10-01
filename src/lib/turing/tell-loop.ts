import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { renderPatch } from "./ai";
import {
  currentGeneration,
  findMessage,
  liveAgent,
  revealedRounds,
} from "./loop";
import type { Patch, Session } from "./types";

const DRAFT_MODEL = "claude-opus-5-5";

type Evidence = {
  tellCount: number;
  fromRound: number;
  botTells: string;
  humanTells: string;
  humanLines: string[];
};

// Tells on the live bot from every revealed round played at its current
// generation, plus what real humans said (exemplar pool) and which human
// lines judges wrongly flagged (so the patch doesn't train those away).
export function gatherEvidence(s: Session): Evidence | null {
  const L = s.lineage;
  if (!L) return null;
  const gen = currentGeneration(s);
  const humanIds = new Set(s.participants.map((p) => p.id));
  let tellCount = 0;
  let fromRound = 0;
  const botParts: string[] = [];
  const humanParts: string[] = [];
  const humanLines = new Set<string>();
  const allHumanLines = new Set<string>();

  for (const r of revealedRounds(s)) {
    if (r.agentGenerations?.[L.liveAgentId] !== gen) continue;
    fromRound = Math.max(fromRound, r.number);
    // Exemplars should be replies, not openers: prefer human lines that
    // answer the other witness.
    for (const t of Object.values(r.transcripts)) {
      t.forEach((m, i) => {
        if (!humanIds.has(m.from)) return;
        if (i > 0 && t[i - 1].from !== m.from) humanLines.add(m.text);
        else allHumanLines.add(m.text);
      });
    }
    for (const votes of Object.values(r.votes ?? {})) {
      for (const [wid, v] of Object.entries(votes)) {
        if (v.guess !== "ai" || !v.tells?.length) continue;
        for (const tell of v.tells) {
          const m = findMessage(r, tell.messageId);
          if (!m) continue;
          const line = `- marked "${tell.text}" in the reply: "${m.text}"`;
          if (wid === L.liveAgentId) {
            botParts.push(line);
            tellCount++;
          } else if (humanIds.has(wid)) {
            humanParts.push(line);
          }
        }
      }
    }
  }
  if (tellCount === 0) return null;
  if (humanLines.size < 4) for (const l of allHumanLines) humanLines.add(l);
  return {
    tellCount,
    fromRound,
    botTells: botParts.join("\n"),
    humanTells: humanParts.join("\n"),
    humanLines: [...humanLines].slice(-80),
  };
}

const PATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["themes", "exemplars", "reminder"],
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["theme", "note", "quotes"],
        properties: {
          theme: { type: "string" },
          note: { type: "string" },
          quotes: { type: "array", items: { type: "string" } },
        },
      },
    },
    exemplars: { type: "array", items: { type: "string" } },
    reminder: { type: "string" },
  },
} as const;

// MODEL-FACING — audit before relying on it.
const DRAFT_SYSTEM = `You help run a classroom Turing test. Students judge text chats and guess which witnesses are bots. When they vote "bot", they mark the exact words that gave it away. Your job is to turn those marks into a revision of the bot's instructions for the next round, so the class can see whether the bot gets harder to catch.

You return three things.

themes: group the marked words into 2 to 5 kinds of giveaway. Name each in a few plain words ("too polished", "answers every part of the question"). In note, say in one sentence what the bot does that people don't. In quotes, copy 1 to 3 marked spans exactly as given.

exemplars: choose 4 to 8 lines that real human witnesses actually typed, from the list provided. Copy each one exactly, character for character. Pick lines that show the opposite of the bot's giveaways. Do not write new lines and do not tidy the ones you choose.

reminder: 2 to 5 short sentences addressed to the bot ("you"), describing how a real person in this chat writes, aimed at the themes. Say what to do, not what to avoid: no lists of banned words or phrases, because the bot paraphrases around them and the class notices. Keep anything from the current reminder that still applies, and rewrite the rest.

Students also sometimes mark words written by real humans. Those marks are listed separately. They show what this class wrongly takes for a bot; do not steer the bot away from those habits.`;

export async function draftPatch(s: Session): Promise<
  (Patch & { fromRound: number; tellCount: number; draftedAt: number }) | null
> {
  const L = s.lineage;
  const live = liveAgent(s);
  if (!L || !live) return null;
  const ev = gatherEvidence(s);
  if (!ev) return null;

  const user = `The bot's persona brief:
<brief>
${L.baseBrief}
</brief>

The patch it is currently running (generation ${live.generation ?? 0}):
<current_patch>
${live.patch ? renderPatch(live.patch).trim() : "(none yet)"}
</current_patch>

Words students marked as giveaways in the bot's replies:
<bot_tells>
${ev.botTells}
</bot_tells>

Words students marked in replies that were actually written by humans:
<human_tells>
${ev.humanTells || "(none)"}
</human_tells>

Lines real human witnesses typed (choose exemplars only from these):
<human_lines>
${ev.humanLines.map((l) => `- ${l}`).join("\n")}
</human_lines>`;

  const client = new Anthropic();
  const res = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: jsonSchemaOutputFormat(PATCH_SCHEMA),
    },
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error("draft refused");
  const out = res.parsed_output;
  if (!out) throw new Error("draft did not parse");

  // Exemplars must be verbatim human lines; drop anything the model wrote.
  const exemplars = out.exemplars
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && ev.humanLines.some((l) => l.includes(e)))
    .slice(0, 8);

  return {
    themes: out.themes.slice(0, 5),
    exemplars,
    reminder: out.reminder.trim(),
    fromRound: ev.fromRound,
    tellCount: ev.tellCount,
    draftedAt: Date.now(),
  };
}
