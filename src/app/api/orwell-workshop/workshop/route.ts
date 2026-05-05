import Anthropic from "@anthropic-ai/sdk";
import { isAuthed } from "@/lib/orwell-workshop/auth";
import {
  getClientIp,
  minitruePerDay,
  minitruePerMinute,
} from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

type ClaudeReq = {
  system?: string;
  user?: string;
  max_tokens?: number;
};

export async function POST(request: Request) {
  const passwordMode = process.env.MINITRUE_REQUIRE_PASSWORD === "1";
  if (passwordMode && !(await isAuthed())) {
    return new Response("unauthorized", { status: 401 });
  }

  // Rate limit only when the page is public (authed users bypass).
  if (!passwordMode && minitruePerMinute && minitruePerDay) {
    const ip = getClientIp(request);
    const [m, d] = await Promise.all([
      minitruePerMinute.limit(ip),
      minitruePerDay.limit(ip),
    ]);
    if (!m.success || !d.success) {
      const reset = Math.max(m.reset, d.reset);
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return new Response(
        JSON.stringify({
          error: "Submission throttled by the Ministry. Try again shortly.",
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": String(retryAfter),
          },
        },
      );
    }
  }
  const body = (await request.json()) as ClaudeReq;
  const system = (body.system ?? "").toString();
  const user = (body.user ?? "").toString();
  const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 1500, 64), 2000);
  if (!user.trim()) return new Response("missing user message", { status: 400 });
  if (user.length > 16000 || system.length > 16000) {
    return new Response("message too long", { status: 400 });
  }

  const client = new Anthropic();
  const result = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  return Response.json({ text });
}
