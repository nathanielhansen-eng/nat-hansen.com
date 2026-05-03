import Anthropic from "@anthropic-ai/sdk";
import { isAuthed } from "@/lib/orwell-workshop/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

type ClaudeReq = {
  system?: string;
  user?: string;
  max_tokens?: number;
};

export async function POST(request: Request) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });
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
