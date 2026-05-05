import { loadSession, saveSession, newId } from "@/lib/turing/session";
import { setId } from "@/lib/turing/identity";

export const dynamic = "force-dynamic";

function nextLabel(used: Set<string>): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of letters) {
    const lab = `Witness ${ch}`;
    if (!used.has(lab)) return lab;
  }
  return `Witness ${used.size + 1}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    code: string;
    role: "participant" | "judge";
    name: string;
  };
  const code = String(body.code ?? "").toUpperCase().trim();
  const name = String(body.name ?? "").trim().slice(0, 60) || "anon";
  const role = body.role;
  if (!code || (role !== "participant" && role !== "judge")) {
    return new Response("bad request", { status: 400 });
  }

  const s = await loadSession(code);
  if (!s) return new Response("session not found", { status: 404 });

  const id = newId();
  if (role === "participant") {
    const used = new Set([
      ...s.participants.map((p) => p.label),
      ...s.agents.map((a) => a.label),
    ]);
    const label = nextLabel(used);
    s.participants.push({
      id,
      name,
      label,
      kind: "human",
      joinedAt: Date.now(),
    });
  } else {
    s.judges.push({ id, name, joinedAt: Date.now() });
  }
  await saveSession(s);
  await setId(code, role, id);
  return Response.json({ ok: true, id });
}
