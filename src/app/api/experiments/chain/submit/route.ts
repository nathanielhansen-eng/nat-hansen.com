import { submitGeneration } from "@/lib/chain/store";
import { getClaim, clearClaim } from "@/lib/chain/identity";

export const dynamic = "force-dynamic";

// A student submits their response for the slot they previously claimed. The
// slot is read from the httpOnly claim cookie set at claim time, so a student
// can only submit to their own generation.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const code = String(body.code ?? "").toUpperCase();
  if (!code) return Response.json({ ok: false, error: "no code" }, { status: 400 });

  const claim = await getClaim(code);
  if (!claim)
    return Response.json({ ok: false, reason: "no_claim" }, { status: 401 });

  let result;
  try {
    result = await submitGeneration(code, claim.chainId, claim.n, body.response);
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason }, { status: 400 });
  }

  await clearClaim(code);
  return Response.json({ ok: true, snapshot: result.snapshot });
}
