import { loadSession, saveSession } from "@/lib/turing/session";
import { getId } from "@/lib/turing/identity";
import { cleanTells } from "@/lib/turing/loop";
import type { Vote } from "@/lib/turing/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    code: string;
    votes: Record<string, "human" | "ai">;
    tells?: Record<string, unknown>;
  };
  const code = String(body.code ?? "").toUpperCase();
  const myId = await getId(code, "judge");
  if (!myId) return new Response("not a judge", { status: 401 });

  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });
  if (s.status !== "round_judging" && s.status !== "round_active")
    return new Response("voting closed", { status: 400 });

  const my: Record<string, Vote> = {};
  for (const [k, v] of Object.entries(body.votes ?? {})) {
    if (v !== "human" && v !== "ai") continue;
    my[k] = { guess: v };
    // Giveaway marks only count on witnesses this judge called a bot.
    if (v === "ai") {
      const tells = cleanTells(s.round, k, body.tells?.[k]);
      if (tells.length) my[k].tells = tells;
    }
  }
  s.round.votes[myId] = my;
  await saveSession(s);
  return Response.json({ ok: true });
}
