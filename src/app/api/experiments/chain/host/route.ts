import { isInstructor } from "@/lib/chain/host-auth";
import { createRoom, endRoom, loadRoom } from "@/lib/chain/store";
import { getTask, taskList } from "@/lib/chain/tasks/registry";
import type { RoomConfig } from "@/lib/chain/types";

export const dynamic = "force-dynamic";

// GET: instructor dashboard data. ?code=XXXXX returns that room's full state;
// no code returns the list of available task modules (for the create form).
export async function GET(req: Request) {
  if (!(await isInstructor()))
    return new Response("unauthorized", { status: 401 });
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return Response.json({ tasks: taskList() });
  const room = await loadRoom(code.toUpperCase());
  if (!room) return new Response("not found", { status: 404 });
  return Response.json({ room });
}

export async function POST(req: Request) {
  if (!(await isInstructor()))
    return new Response("unauthorized", { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const action = String(body.action ?? "");

  if (action === "create") {
    const taskId = String(body.taskId ?? "");
    if (!getTask(taskId))
      return Response.json({ ok: false, error: "unknown task" }, { status: 400 });
    const numChains = clampInt(body.numChains, 1, 26, 5);
    const cap = clampInt(body.cap, 2, 60, 8);
    const config: RoomConfig = {
      taskId,
      numChains,
      cap,
      leaseMs: 10 * 60 * 1000, // 10 min to complete a claimed generation
    };
    const room = await createRoom(config);
    return Response.json({ ok: true, code: room.code });
  }

  if (action === "end") {
    const code = String(body.code ?? "").toUpperCase();
    if (!code) return Response.json({ ok: false }, { status: 400 });
    await endRoom(code);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
