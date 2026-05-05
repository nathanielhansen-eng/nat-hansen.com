import { loadSession, loadTyping, saveSession } from "@/lib/turing/session";
import { getId, detectIdentity } from "@/lib/turing/identity";
import { isHostAuthed } from "@/lib/turing/host-auth";
import { hostView, participantView, judgeView } from "@/lib/turing/redact";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") ?? "").toUpperCase();
  const wantedRole = url.searchParams.get("role"); // "host" | "participant" | "judge"
  if (!code) return new Response("no code", { status: 400 });

  const [s, typing] = await Promise.all([loadSession(code), loadTyping(code)]);
  if (!s) return new Response("session not found", { status: 404 });
  // Auto-promote an expired active round into judging so participants see the
  // cutoff and can't send more messages even if the host hasn't clicked end.
  if (
    s.status === "round_active" &&
    s.round.endsAt !== null &&
    s.round.endsAt <= Date.now()
  ) {
    s.status = "round_judging";
    await saveSession(s);
  }

  if (wantedRole === "host") {
    if (!(await isHostAuthed())) return new Response("unauthorized", { status: 401 });
    return Response.json(hostView(s, typing));
  }
  if (wantedRole === "participant") {
    const id = await getId(code, "participant");
    if (!id) return new Response("no identity", { status: 401 });
    return Response.json(participantView(s, id, typing));
  }
  if (wantedRole === "judge") {
    const id = await getId(code, "judge");
    if (!id) return new Response("no identity", { status: 401 });
    return Response.json(judgeView(s, id, typing));
  }
  // Fallback: no role specified — pick whichever cookie exists.
  const ident = await detectIdentity(code);
  if (!ident) return new Response("no identity", { status: 401 });
  if (ident.role === "participant")
    return Response.json(participantView(s, ident.id, typing));
  return Response.json(judgeView(s, ident.id, typing));
}
