// The Turing and chain games keep their live state in Redis. When Redis is
// missing or unreachable, answer 503 with a readable message instead of an
// empty 500, so a class sees why the game won't start.

function isRedisUnavailable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.message === "redis not configured") return true;
  if (err.name === "UpstashError") return true;
  // Unresolvable or refused host: undici throws TypeError("fetch failed").
  return err instanceof TypeError && err.message === "fetch failed";
}

export function withRedis<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (!isRedisUnavailable(err)) throw err;
      console.error("redis unavailable:", err);
      return Response.json(
        { error: "The game server is unavailable right now. Please tell your instructor." },
        { status: 503 },
      );
    }
  };
}
