import { redis } from "./redis";
import type { Session, Round, TypingState } from "./types";

export type TypingMap = Record<string, TypingState | null>;

const typingKey = (code: string) => `turing:typing:${code}`;

export async function loadTyping(code: string): Promise<TypingMap> {
  if (!redis) return {};
  const raw = (await redis.hgetall(typingKey(code))) as Record<
    string,
    string | TypingState
  > | null;
  if (!raw) return {};
  const out: TypingMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = null;
      }
    } else if (v && typeof v === "object") {
      out[k] = v as TypingState;
    }
  }
  return out;
}

export async function setTyping(
  code: string,
  pairId: string,
  value: TypingState | null
): Promise<void> {
  if (!redis) return;
  if (value === null) {
    await redis.hdel(typingKey(code), pairId);
  } else {
    await redis.hset(typingKey(code), {
      [pairId]: JSON.stringify(value),
    });
    await redis.expire(typingKey(code), 60 * 60 * 24);
  }
}

export async function clearTyping(code: string): Promise<void> {
  if (!redis) return;
  await redis.del(typingKey(code));
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newCode(len = 5): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHA[bytes[i] % ALPHA.length];
  return out;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyRound(n: number): Round {
  return {
    number: n,
    startedAt: null,
    endsAt: null,
    transcripts: {},
    typing: {},
    votes: {},
    revealed: false,
  };
}

const key = (code: string) => `turing:session:${code}`;
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function loadSession(code: string): Promise<Session | null> {
  if (!redis) throw new Error("redis not configured");
  const raw = await redis.get<Session | string>(key(code));
  if (!raw) return null;
  if (typeof raw === "string") return JSON.parse(raw) as Session;
  return raw;
}

export async function saveSession(s: Session): Promise<void> {
  if (!redis) throw new Error("redis not configured");
  s.rev += 1;
  await redis.set(key(s.code), JSON.stringify(s), { ex: SESSION_TTL });
}

export async function createSession(roundDurationSec: number): Promise<Session> {
  if (!redis) throw new Error("redis not configured");
  for (let i = 0; i < 10; i++) {
    const code = newCode();
    const exists = await redis.exists(key(code));
    if (!exists) {
      const s: Session = {
        code,
        createdAt: Date.now(),
        status: "lobby",
        config: { roundDurationSec },
        agents: [],
        participants: [],
        judges: [],
        pairs: [],
        round: emptyRound(1),
        history: [],
        rev: 0,
      };
      await saveSession(s);
      return s;
    }
  }
  throw new Error("could not allocate code");
}

export async function withSession<T>(
  code: string,
  fn: (s: Session) => T | Promise<T>
): Promise<T> {
  const s = await loadSession(code);
  if (!s) throw new Error("session not found");
  const result = await fn(s);
  await saveSession(s);
  return result;
}

export function findWitness(s: Session, id: string) {
  const a = s.agents.find((x) => x.id === id);
  if (a) return a;
  const p = s.participants.find((x) => x.id === id);
  if (p) return p;
  return null;
}

export function findPairFor(s: Session, witnessId: string) {
  return s.pairs.find((p) => p.aId === witnessId || p.bId === witnessId) ?? null;
}

export function opponentOf(pairId: string, witnessId: string, s: Session) {
  const p = s.pairs.find((x) => x.id === pairId);
  if (!p) return null;
  const otherId = p.aId === witnessId ? p.bId : p.aId;
  return findWitness(s, otherId);
}
