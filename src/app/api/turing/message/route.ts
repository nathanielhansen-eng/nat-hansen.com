import { loadSession, saveSession, newId, setTyping } from "@/lib/turing/session";
import { getId } from "@/lib/turing/identity";
import {
  generateAIReply,
  typingDurationMs,
  estimateOpponentCps,
  readPauseMs,
} from "@/lib/turing/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LEN = 1500;
const MAX_MSGS_PER_PAIR = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { code: string; text: string };
  const code = String(body.code ?? "").toUpperCase();
  const text = String(body.text ?? "").trim();
  console.log(`[turing/message] code=${code} textLen=${text.length}`);
  if (!text) return new Response("empty", { status: 400 });
  if (text.length > MAX_LEN) return new Response("too long", { status: 400 });

  const myId = await getId(code, "participant");
  if (!myId) return new Response("not a participant", { status: 401 });

  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });
  if (s.status !== "round_active")
    return new Response("round not active", { status: 400 });

  const me = s.participants.find((p) => p.id === myId);
  if (!me) return new Response("not in session", { status: 401 });

  const pair = s.pairs.find((p) => p.aId === me.id || p.bId === me.id);
  if (!pair) return new Response("not paired", { status: 400 });

  const transcript = s.round.transcripts[pair.id] ?? [];
  if (transcript.length >= MAX_MSGS_PER_PAIR)
    return new Response("turn cap", { status: 400 });

  // alternation enforcement: cannot send two in a row
  const last = transcript[transcript.length - 1];
  if (last && last.from === me.id)
    return new Response("wait for reply", { status: 400 });

  const now = Date.now();
  transcript.push({
    id: newId(),
    from: me.id,
    text,
    sentAt: now,
    displayAt: now,
  });
  s.round.transcripts[pair.id] = transcript;

  const oppId = pair.aId === me.id ? pair.bId : pair.aId;
  const oppAgent = s.agents.find((a) => a.id === oppId);

  await saveSession(s);

  // typing indicator updates go to a separate Redis key so they don't
  // race with the session blob and clobber transcripts.
  await setTyping(code, pair.id, null);

  if (oppAgent) {
    // Wait a beat before showing "typing..." — humans read and think first.
    const pause = readPauseMs(text);
    await new Promise((r) => setTimeout(r, pause));
    await setTyping(code, pair.id, {
      who: oppAgent.id,
      until: Date.now() + 30000,
    });

    let reply = "";
    try {
      console.log(`[turing/message] generating AI reply for agent=${oppAgent.label} model=${oppAgent.model}`);
      reply = await generateAIReply(oppAgent, transcript);
      console.log(`[turing/message] AI replied len=${reply.length}`);
    } catch (e) {
      console.error(`[turing/message] AI generation failed:`, e);
      reply = "";
    }
    const fresh = await loadSession(code);
    if (!fresh) return new Response("gone", { status: 410 });
    if (reply && fresh.status === "round_active") {
      const cps = estimateOpponentCps(fresh, pair.id, me.id);
      const dur = typingDurationMs(reply, cps);
      const t = fresh.round.transcripts[pair.id] ?? [];
      const sentAt = Date.now();
      t.push({
        id: newId(),
        from: oppAgent.id,
        text: reply,
        sentAt,
        displayAt: sentAt + dur,
      });
      fresh.round.transcripts[pair.id] = t;
      await saveSession(fresh);
      await setTyping(code, pair.id, { who: oppAgent.id, until: sentAt + dur });
    } else {
      await saveSession(fresh);
      await setTyping(code, pair.id, null);
    }
  }

  return Response.json({ ok: true });
}
