import { loadSession, loadTyping, setTyping } from "@/lib/turing/session";
import { getId } from "@/lib/turing/identity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { code: string; isTyping: boolean };
  const code = String(body.code ?? "").toUpperCase();
  const myId = await getId(code, "participant");
  if (!myId) return new Response("nope", { status: 401 });

  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });
  if (s.status !== "round_active") return Response.json({ ok: true });

  const pair = s.pairs.find((p) => p.aId === myId || p.bId === myId);
  if (!pair) return Response.json({ ok: true });

  // don't override an AI's typing indicator
  const tmap = await loadTyping(code);
  const current = tmap[pair.id];
  if (current && current.who !== myId && current.until > Date.now()) {
    return Response.json({ ok: true });
  }
  await setTyping(
    code,
    pair.id,
    body.isTyping ? { until: Date.now() + 4000, who: myId } : null
  );
  return Response.json({ ok: true });
}
