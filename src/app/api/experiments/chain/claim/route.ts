import { claimSlot } from "@/lib/chain/store";
import { setClaim } from "@/lib/chain/identity";

export const dynamic = "force-dynamic";

// A student claims the next available generation slot in the room. Returns the
// input signal to work from, or { busy } when all chains are momentarily
// occupied (the client should poll again shortly), or { ended }.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const code = String(body.code ?? "").toUpperCase();
  if (!code) return Response.json({ ok: false, error: "no code" }, { status: 400 });

  let result;
  try {
    result = await claimSlot(code);
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason });
  }

  await setClaim(code, result.chainId, result.n);
  return Response.json({
    ok: true,
    taskId: result.taskId,
    chainId: result.chainId,
    n: result.n,
    input: result.input,
  });
}
