import { put } from "@vercel/blob";
import { redis } from "./redis";
import { getTask } from "./tasks/registry";
import type {
  Chain,
  ChainSnapshot,
  ClaimResult,
  Generation,
  Room,
  RoomConfig,
} from "./types";

const ROOM_TTL = 60 * 60 * 24 * 30; // 30 days, matches turing sessions
const roomKey = (code: string) => `chain:room:${code}`;
const lockKey = (code: string) => `chain:lock:${code}`;
const countKey = (code: string) => `chain:pcount:${code}`;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(len = 5): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHA[bytes[i] % ALPHA.length];
  return out;
}

const ALPHA_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function chainId(i: number): string {
  // Class rooms use a handful of chains; A..Z covers it, with a numeric
  // fallback for the implausible >26 case.
  return i < 26 ? ALPHA_LETTERS[i] : `C${i + 1}`;
}

// ---- locking -------------------------------------------------------------
// A short per-room mutex makes the load-modify-save of the Room JSON safe when
// many students claim/submit at once. Hold time is a few Redis round-trips.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function acquireLock(code: string, ttlMs = 5000): Promise<string | null> {
  if (!redis) return null;
  const token = crypto.randomUUID();
  for (let i = 0; i < 40; i++) {
    const ok = await redis.set(lockKey(code), token, { nx: true, px: ttlMs });
    if (ok) return token;
    await sleep(50 + Math.floor(Math.random() * 50));
  }
  return null;
}

const RELEASE_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function releaseLock(code: string, token: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.eval(RELEASE_LUA, [lockKey(code)], [token]);
  } catch {
    /* best-effort */
  }
}

async function withRoomLock<T>(
  code: string,
  fn: (room: Room) => T | Promise<T>,
): Promise<T> {
  const token = await acquireLock(code);
  if (!token) throw new Error("could not acquire room lock");
  try {
    const room = await loadRoom(code);
    if (!room) throw new Error("room not found");
    return await fn(room);
  } finally {
    await releaseLock(code, token);
  }
}

// ---- persistence ---------------------------------------------------------

export async function loadRoom(code: string): Promise<Room | null> {
  if (!redis) throw new Error("redis not configured");
  const raw = await redis.get<Room | string>(roomKey(code));
  if (!raw) return null;
  return typeof raw === "string" ? (JSON.parse(raw) as Room) : raw;
}

async function saveRoom(room: Room): Promise<void> {
  if (!redis) throw new Error("redis not configured");
  room.rev += 1;
  await redis.set(roomKey(room.code), JSON.stringify(room), { ex: ROOM_TTL });
}

// Persist a durable copy to Blob so data survives Redis TTL and matches the
// download convention of the other experiments. Overwritten on each submit.
async function archive(room: Room): Promise<void> {
  try {
    await put(`chain/${room.code}/room.json`, JSON.stringify(room), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch {
    /* archival is best-effort; live state stays in Redis */
  }
}

// ---- room lifecycle ------------------------------------------------------

export async function createRoom(config: RoomConfig): Promise<Room> {
  if (!redis) throw new Error("redis not configured");
  const task = getTask(config.taskId);
  if (!task) throw new Error("unknown task");

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = newCode();
    if (await redis.exists(roomKey(code))) continue;

    const chains: Chain[] = [];
    for (let i = 0; i < config.numChains; i++) {
      const seed = task.seed();
      const gen1: Generation = {
        n: 1,
        input: seed,
        response: null,
        participantTag: null,
        startedAt: null,
        submittedAt: null,
        timingMs: null,
      };
      chains.push({ id: chainId(i), seed, generations: [gen1], closed: false });
    }

    const room: Room = {
      code,
      createdAt: Date.now(),
      status: "open",
      config,
      chains,
      participantCount: 0,
      rev: 0,
    };
    await redis.del(countKey(code));
    await saveRoom(room);
    return room;
  }
  throw new Error("could not allocate room code");
}

export async function endRoom(code: string): Promise<void> {
  await withRoomLock(code, async (room) => {
    room.status = "ended";
    await saveRoom(room);
    await archive(room);
  });
}

// ---- slot mechanics ------------------------------------------------------

// The single in-flight generation of a chain is its last one. It is claimable
// when it has no worker (startedAt === null) or its worker's lease has expired.
function reclaimable(gen: Generation, leaseMs: number, now: number): boolean {
  if (gen.response !== null) return false; // already submitted
  if (gen.startedAt === null) return true; // never claimed
  return gen.startedAt + leaseMs < now; // lease expired -> abandoned
}

function openGen(chain: Chain, leaseMs: number, now: number): Generation | null {
  if (chain.closed) return null;
  const last = chain.generations[chain.generations.length - 1];
  return reclaimable(last, leaseMs, now) ? last : null;
}

// Atomically claim the next available slot across all chains. Returns null when
// every chain is either closed or currently being worked by someone else (the
// student should poll again shortly).
export async function claimSlot(
  code: string,
): Promise<ClaimResult | { ok: false; reason: "busy" | "ended" }> {
  if (!redis) throw new Error("redis not configured");
  return withRoomLock(code, async (room) => {
    if (room.status === "ended") return { ok: false, reason: "ended" as const };
    const now = Date.now();
    const { leaseMs } = room.config;

    // Prefer the shortest chain so generations advance evenly across chains.
    const candidates = room.chains
      .map((c) => ({ c, gen: openGen(c, leaseMs, now) }))
      .filter((x) => x.gen !== null)
      .sort((a, b) => a.c.generations.length - b.c.generations.length);

    if (candidates.length === 0) {
      const allClosed = room.chains.every((c) => c.closed);
      return { ok: false, reason: allClosed ? "ended" : "busy" } as const;
    }

    const { c, gen } = candidates[0];
    const tagNum = await redis!.incr(countKey(code));
    gen!.startedAt = now;
    gen!.participantTag = `P-${tagNum}`;
    room.participantCount = tagNum;
    await saveRoom(room);

    return {
      ok: true as const,
      taskId: room.config.taskId,
      chainId: c.id,
      n: gen!.n,
      input: gen!.input,
    };
  });
}

// Submit a validated response for a claimed slot. Enqueues the next generation
// (or closes the chain at the cap) and returns the chain's drift snapshot.
export async function submitGeneration(
  code: string,
  chainIdStr: string,
  n: number,
  rawResponse: unknown,
): Promise<
  | { ok: true; snapshot: ChainSnapshot }
  | { ok: false; reason: "not_found" | "stale" | "invalid" | "ended" }
> {
  if (!redis) throw new Error("redis not configured");
  const task = getTask((await loadRoom(code))?.config.taskId ?? "");
  if (!task) return { ok: false, reason: "not_found" };

  const response = task.validateResponse(rawResponse);
  if (response === null) return { ok: false, reason: "invalid" };

  const result = await withRoomLock(code, async (room) => {
    if (room.status === "ended")
      return { ok: false as const, reason: "ended" as const };
    const chain = room.chains.find((c) => c.id === chainIdStr);
    if (!chain) return { ok: false as const, reason: "not_found" as const };
    const gen = chain.generations.find((g) => g.n === n);
    if (!gen) return { ok: false as const, reason: "not_found" as const };
    if (gen.response !== null)
      return { ok: false as const, reason: "stale" as const };

    const now = Date.now();
    gen.response = response;
    gen.submittedAt = now;
    gen.timingMs = gen.startedAt !== null ? now - gen.startedAt : null;

    if (chain.generations.length >= room.config.cap) {
      chain.closed = true;
    } else {
      const nextSignal = task.signalFromResponse(response);
      chain.generations.push({
        n: n + 1,
        input: nextSignal,
        response: null,
        participantTag: null,
        startedAt: null,
        submittedAt: null,
        timingMs: null,
      });
    }

    await saveRoom(room);
    void archive(room);

    const snapshot: ChainSnapshot = {
      chainId: chain.id,
      seed: chain.seed,
      generations: chain.generations
        .filter((g) => g.response !== null)
        .map((g) => ({
          n: g.n,
          response: g.response,
          participantTag: g.participantTag,
        })),
    };
    return { ok: true as const, snapshot };
  });

  return result;
}
