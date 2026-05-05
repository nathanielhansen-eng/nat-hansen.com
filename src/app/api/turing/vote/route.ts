import { loadSession, saveSession } from "@/lib/turing/session";
import { getId } from "@/lib/turing/identity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    code: string;
    votes: Record<string, "human" | "ai">;
  };
  const code = String(body.code ?? "").toUpperCase();
  const myId = await getId(code, "judge");
  if (!myId) return new Response("not a judge", { status: 401 });

  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });
  if (s.status !== "round_judging" && s.status !== "round_active")
    return new Response("voting closed", { status: 400 });

  const my: Record<string, { guess: "human" | "ai" }> = {};
  for (const [k, v] of Object.entries(body.votes ?? {})) {
    if (v === "human" || v === "ai") my[k] = { guess: v };
  }
  s.round.votes[myId] = my;
  await saveSession(s);
  return Response.json({ ok: true });
}
