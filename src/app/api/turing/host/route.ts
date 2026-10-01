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
import { draftPatch } from "@/lib/turing/tell-loop";
import { liveAgent } from "@/lib/turing/loop";
import type { Agent, Pair, Patch, Session } from "@/lib/turing/types";

// Labels carry over between rounds, so after a reveal everyone knows which
// letters were bots. Reshuffle them across all witnesses for each new round.
function shuffleLabels(s: Session) {
  const ws = [...s.participants, ...s.agents];
  const labels = ws.map((w) => w.label);
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  ws.forEach((w, i) => (w.label = labels[i]));
}

function cleanPatch(raw: unknown): Patch | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const reminder = String(p.reminder ?? "").trim().slice(0, 2000);
  if (!reminder) return null;
  const exemplars = (Array.isArray(p.exemplars) ? p.exemplars : [])
    .map((e) => String(e).trim().slice(0, 400))
    .filter(Boolean)
    .slice(0, 10);
  const themes = (Array.isArray(p.themes) ? p.themes : [])
    .slice(0, 6)
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return {
        theme: String(o.theme ?? "").slice(0, 80),
        note: String(o.note ?? "").slice(0, 300),
        quotes: (Array.isArray(o.quotes) ? o.quotes : [])
          .map((q) => String(q).slice(0, 200))
          .slice(0, 3),
      };
    })
    .filter((t) => t.theme);
  return { themes, exemplars, reminder };
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
      const prior = new Map(s.agents.map((a) => [a.id, a]));
      s.agents = agents.map((a) => {
        const old = prior.get(a.id);
        // Loop agents keep their brief, model and generation: changing them
        // mid-loop would break the comparison with the control.
        if (old?.loopRole) return { ...old, label: a.label || old.label };
        return {
          ...a,
          kind: "ai" as const,
          id: a.id || newId(),
          loopRole: undefined,
          generation: undefined,
          patch: undefined,
        };
      });
      for (const old of prior.values()) {
        if (old.loopRole && !s.agents.some((a) => a.id === old.id))
          s.agents.push(old);
      }
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
      s.round.agentGenerations = Object.fromEntries(
        s.agents.map((a) => [a.id, a.generation ?? 0])
      );
      s.round.labels = Object.fromEntries(
        [...s.participants, ...s.agents].map((w) => [w.id, w.label])
      );
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
      shuffleLabels(s);
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
    case "start_loop": {
      if (s.lineage) return new Response("loop already running", { status: 400 });
      if (s.status === "round_active")
        return new Response("round in progress", { status: 400 });
      const agent = s.agents.find((a) => a.id === String(body.agentId));
      if (!agent || !agent.brief.trim())
        return new Response("pick an AI with a brief", { status: 400 });
      const used = new Set([...s.participants, ...s.agents].map((w) => w.label));
      let label = "Witness ?";
      for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        if (!used.has(`Witness ${ch}`)) {
          label = `Witness ${ch}`;
          break;
        }
      }
      agent.loopRole = "live";
      agent.generation = 0;
      agent.patch = null;
      const control: Agent = {
        id: newId(),
        label,
        brief: agent.brief,
        model: agent.model,
        kind: "ai",
        loopRole: "control",
        generation: 0,
        patch: null,
      };
      s.agents.push(control);
      s.lineage = {
        baseBrief: agent.brief,
        model: agent.model,
        liveAgentId: agent.id,
        controlAgentId: control.id,
        generations: [
          { n: 0, patch: null, approvedAt: Date.now(), fromRound: null, tellCount: 0 },
        ],
        draft: null,
      };
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "draft_patch": {
      if (!s.lineage) return new Response("no loop", { status: 400 });
      let draft;
      try {
        draft = await draftPatch(s);
      } catch (e) {
        console.error("[turing/host] draft_patch failed:", e);
        return new Response("drafting failed", { status: 502 });
      }
      if (!draft)
        return new Response("no tells on the live bot yet", { status: 400 });
      const fresh = await loadSession(code);
      if (!fresh?.lineage) return new Response("gone", { status: 410 });
      fresh.lineage.draft = draft;
      await saveSession(fresh);
      return Response.json({ ok: true });
    }
    case "approve_patch": {
      const L = s.lineage;
      const live = liveAgent(s);
      if (!L || !live || !L.draft)
        return new Response("nothing to approve", { status: 400 });
      if (s.status === "round_active")
        return new Response("round in progress", { status: 400 });
      const patch = cleanPatch(body.patch ?? L.draft);
      if (!patch) return new Response("patch needs a reminder", { status: 400 });
      const n = (live.generation ?? 0) + 1;
      live.generation = n;
      live.patch = patch;
      L.generations.push({
        n,
        patch,
        approvedAt: Date.now(),
        fromRound: L.draft.fromRound,
        tellCount: L.draft.tellCount,
      });
      L.draft = null;
      await saveSession(s);
      return Response.json({ ok: true, generation: n });
    }
    case "discard_draft": {
      if (s.lineage) s.lineage.draft = null;
      await saveSession(s);
      return Response.json({ ok: true });
    }
    case "end_loop": {
      if (!s.lineage) return Response.json({ ok: true });
      if (s.status === "round_active")
        return new Response("round in progress", { status: 400 });
      // Keep both agents as ordinary AIs; history keeps its stamps.
      for (const a of s.agents) {
        if (a.loopRole) a.loopRole = undefined;
      }
      s.lineage = null;
      await saveSession(s);
      return Response.json({ ok: true });
    }
    default:
      return new Response("unknown action", { status: 400 });
  }
}
