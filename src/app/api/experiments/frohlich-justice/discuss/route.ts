import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS, PersonaId, tableContext, GROUP_DISTRIBUTIONS } from "@/lib/frohlich";

type Msg = { role: "user" | "assistant"; speaker: string; content: string };

function parseVote(raw: string): {
  vote: "YES" | "NO" | "ABSTAIN";
  reason: string;
} {
  if (!raw) return { vote: "ABSTAIN", reason: "(empty response)" };

  // First try: extract any JSON object and parse it.
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as {
        vote?: unknown;
        reason?: unknown;
      };
      if (typeof parsed.vote === "string") {
        const v = parsed.vote.trim().toUpperCase();
        if (v === "YES" || v === "NO") {
          return {
            vote: v,
            reason:
              typeof parsed.reason === "string" && parsed.reason.trim()
                ? parsed.reason.trim()
                : raw,
          };
        }
      }
    } catch {
      // fall through to token scan
    }
  }

  // Fallback: scan the raw text for YES/NO tokens.
  const upper = raw.toUpperCase();
  const hasYes = /\bYES\b/.test(upper);
  const hasNo = /\bNO\b(?!T\b|\b\w)/.test(upper);
  if (hasYes && !hasNo) return { vote: "YES", reason: raw.slice(0, 200) };
  if (hasNo && !hasYes) return { vote: "NO", reason: raw.slice(0, 200) };

  // Second fallback: detect affirmative phrasing common when the model
  // forgets the JSON envelope but is clearly agreeing.
  const aff =
    /\b(i'?m good|i'?m in|let'?s vote|let'?s do it|that'?s the move|i agree|i'?ll vote yes|lock it in|sounds good)\b/i.test(
      raw,
    );
  if (aff && !hasNo) return { vote: "YES", reason: raw.slice(0, 200) };

  return {
    vote: "ABSTAIN",
    reason: `(could not parse vote from: ${raw.slice(0, 120)})`,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !("personaId" in body)
  ) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const { messages, personaId, mode, proposal } = body as {
    messages: Msg[];
    personaId: PersonaId;
    mode?: "discuss" | "vote";
    proposal?: { principleLong: string; constraintText?: string };
  };

  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) {
    return Response.json({ error: "Unknown persona" }, { status: 400 });
  }

  const client = new Anthropic();

  const pool =
    "The group is choosing one principle that will govern the distribution of income. After agreement, a distribution will be drawn from those conforming to the chosen principle, then each person will be randomly assigned a class within it. Here is the pool of candidate distributions the experimenters are working from:\n\n" +
    tableContext({
      id: "pool",
      label: "Candidate pool",
      distributions: GROUP_DISTRIBUTIONS,
    });

  // Convert the multi-speaker transcript into a single-perspective message
  // list for the model. The persona is "assistant"; everyone else (including
  // other personas) is "user", with their name prepended.
  const apiMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "assistant" && m.speaker === persona.name) {
      apiMessages.push({ role: "assistant", content: m.content });
    } else {
      const label = m.speaker || (m.role === "user" ? "User" : "Participant");
      apiMessages.push({ role: "user", content: `${label}: ${m.content}` });
    }
  }
  if (apiMessages.length === 0 || apiMessages[0].role !== "user") {
    apiMessages.unshift({
      role: "user",
      content: "(The deliberation begins. What do you want to say?)",
    });
  }
  if (apiMessages[apiMessages.length - 1].role === "assistant") {
    apiMessages.push({
      role: "user",
      content: "(Your turn to react, if you want to.)",
    });
  }

  if (mode === "vote" && proposal) {
    // Build a focused voting prompt. We do NOT include the persona's full
    // chat-mode systemPrompt — the [QUIET] instructions and chat shaping
    // confuse the JSON output. Instead, give a compact character cue plus
    // the vote framing.
    const voteSystem = `You are ${persona.name}, a participant in a five-person group deliberating principles of distributive justice. In character: ${persona.oneLine}

Other participants: ${PERSONAS.filter((p) => p.id !== personaId)
      .map((p) => p.name)
      .join(", ")}, and the human user.

The group is being asked to vote on the following proposal:
PRINCIPLE: ${proposal.principleLong}${proposal.constraintText ? "\nCONSTRAINT: " + proposal.constraintText : ""}

Adoption requires unanimity. The transcript that follows is the full deliberation up to this moment. Read it and decide whether to vote YES or NO on this exact proposal, in character as ${persona.name}.

IMPORTANT: If you said in the discussion that you would vote yes, vote yes. If you genuinely changed your mind, vote no and say why. Don't reflexively vote no out of caution. Most realistic deliberators who said yes during discussion vote yes when called.

Output: exactly one JSON object, nothing else. No prose before or after. Schema:
{"vote": "YES", "reason": "<one sentence, under 25 words, in your voice>"}
or
{"vote": "NO", "reason": "<one sentence, under 25 words, in your voice>"}`;

    try {
      // Prefill the assistant turn with the start of the JSON object so the
      // model is forced to continue with a valid value/reason and can't drop
      // back into conversational prose.
      const prefill = '{"vote": "';
      const voteRes = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: voteSystem,
        messages: [...apiMessages, { role: "assistant", content: prefill }],
      });
      const blk = voteRes.content[0];
      const raw = blk && blk.type === "text" ? prefill + blk.text.trim() : "";
      const parsed = parseVote(raw);
      return Response.json({
        speaker: persona.name,
        vote: parsed.vote,
        reason: parsed.reason,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  const system = `${persona.systemPrompt}

Other participants in the room: ${PERSONAS.filter((p) => p.id !== personaId)
    .map((p) => p.name)
    .join(", ")}, and the human user. The user does not have a stated stance yet — they are deliberating with the group.

Context for the deliberation:
${pool}

You are taking ONE turn. Stay in character as ${persona.name}. Do not write dialogue for other participants. Do not include your name as a prefix — just say what you'd say. Keep it 1–3 sentences. If you'd genuinely have nothing to add this turn, output exactly [QUIET].`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: apiMessages,
    });
    const block = response.content[0];
    const text = block && block.type === "text" ? block.text.trim() : "";
    return Response.json({ speaker: persona.name, content: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
