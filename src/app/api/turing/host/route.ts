import { requireHost } from "@/lib/turing/host-auth";
import {
  createSession,
  loadSession,
  saveSession,
  emptyRound,
  newId,
  setTyping,
} from "@/lib/turing/session";
import { generateAIReply, typingDurationMs, estimateOpponentCps } from "@/lib/turing/ai";
import type { Agent, Pair } from "@/lib/turing/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await requireHost()))
    return new Response("unauthorized", { status: 401 });
  const body = (await req.json()) as { action: string; [k: string]: unknown };
  const action = body.action;

  if (action === "create") {
    const dur = Number(body.roundDurationSec ?? 300);
    const s = await createSession(dur);
    return Response.json({ code: s.code });
  }

  const code = String(body.code ?? "").toUpperCase();
  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });

  switch (action) {
    case "configure": {
      const agents = (body.agents as Agent[] | undefined) ?? s.agents;
      const pairs = (body.pairs as Pair[] | undefined) ?? s.pairs;
      const roundDurationSec = Number(
        body.roundDurationSec ?? s.config.roundDurationSec
      );
      // assign labels per pair so participants see "Witness A" / "Witness B"
      // based on position within pair; we already store labels per witness.
      s.agents = agents.map((a) => ({
        ...a,
        kind: "ai" as const,
        id: a.id || newId(),
      }));
      s.pairs = pairs.map((p) => ({ ...p, id: p.id || newId() }));
      s.config.roundDurationSec = roundDurationSec;
      // ensure transcripts exist for each pair
      for (const p of s.pairs) {
        if (!s.round.transcripts[p.id]) s.round.transcripts[p.id] = [];
      }
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "remove_participant": {
      const id = String(body.id);
      s.participants = s.participants.filter((p) => p.id !== id);
      s.pairs = s.pairs.filter((p) => p.aId !== id && p.bId !== id);
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "remove_judge": {
      const id = String(body.id);
      s.judges = s.judges.filter((j) => j.id !== id);
      delete s.round.votes[id];
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "start_round": {
      if (s.status !== "lobby" && s.status !== "revealed")
        return new Response("bad status", { status: 400 });
      const now = Date.now();
      s.status = "round_active";
      s.round.startedAt = now;
      s.round.endsAt = now + s.config.roundDurationSec * 1000;
      // ensure each pair has a transcript bucket
      for (const p of s.pairs) {
        if (!s.round.transcripts[p.id]) s.round.transcripts[p.id] = [];
      }
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "end_round": {
      if (s.status !== "round_active")
        return new Response("bad status", { status: 400 });
      s.status = "round_judging";
      s.round.endsAt = Date.now();
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "reveal": {
      if (s.status !== "round_judging" && s.status !== "round_active")
        return new Response("bad status", { status: 400 });
      s.status = "revealed";
      s.round.revealed = true;
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "new_round": {
      if (s.status !== "revealed")
        return new Response("bad status", { status: 400 });
      s.history.push(s.round);
      const next = emptyRound(s.round.number + 1);
      for (const p of s.pairs) next.transcripts[p.id] = [];
      s.round = next;
      s.status = "lobby";
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "advance_ai": {
      // host triggers a single AI turn for AI<->AI pairs (or to nudge)
      const pairId = String(body.pairId);
      const witnessId = String(body.witnessId);
      const pair = s.pairs.find((p) => p.id === pairId);
      if (!pair) return new Response("no pair", { status: 404 });
      const agent = s.agents.find((a) => a.id === witnessId);
      if (!agent) return new Response("not an ai", { status: 400 });
      if (s.status !== "round_active")
        return new Response("round not active", { status: 400 });
      const transcript = s.round.transcripts[pairId] ?? [];
      await setTyping(code, pairId, {
        who: agent.id,
        until: Date.now() + 30000,
      });

      let reply = "";
      try {
        reply = await generateAIReply(agent, transcript);
      } catch {
        reply = "";
      }

      const fresh = await loadSession(code);
      if (!fresh) return new Response("gone", { status: 410 });
      if (reply && fresh.status === "round_active") {
        const oppId = pair.aId === agent.id ? pair.bId : pair.aId;
        const cps = estimateOpponentCps(fresh, pairId, oppId);
        const dur = typingDurationMs(reply, cps);
        const now = Date.now();
        fresh.round.transcripts[pairId] = fresh.round.transcripts[pairId] ?? [];
        fresh.round.transcripts[pairId].push({
          id: newId(),
          from: agent.id,
          text: reply,
          sentAt: now,
          displayAt: now + dur,
        });
        await saveSession(fresh);
        await setTyping(code, pairId, { who: agent.id, until: now + dur });
      } else {
        await saveSession(fresh);
        await setTyping(code, pairId, null);
      }
      return Response.json({ ok: true, reply });
    }
    default:
      return new Response("unknown action", { status: 400 });
  }
}
