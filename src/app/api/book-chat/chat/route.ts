import Anthropic from "@anthropic-ai/sdk";
import { loadBook } from "@/lib/book-chat/books";
import { requireAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHAT_MODEL = "claude-sonnet-4-6";

type ChatReq = {
  slug: string;
  chapter_idx: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

function deriveVoiceReminder(persona: string, fallback: string): string {
  if (fallback.trim()) return fallback.trim();
  const m = persona.match(/##\s*Voice and manner\s*\n+([\s\S]+?)(?=\n##|$)/i);
  return (m ? m[1].trim() : persona).slice(0, 1200);
}

export async function POST(request: Request) {
  if (!(await requireAuthed())) return new Response("unauthorized", { status: 401 });
  const body = (await request.json()) as ChatReq;
  const book = await loadBook(body.slug);
  if (!book) return new Response("book not found", { status: 404 });
  if (body.chapter_idx < 0 || body.chapter_idx >= book.chapters.length) {
    return new Response("bad chapter_idx", { status: 400 });
  }
  const ch = book.chapters[body.chapter_idx];
  const voiceReminder = deriveVoiceReminder(book.persona, ch.voice_reminder ?? "");

  const system = `${book.persona}

---

You are answering as ${book.meta.author ?? "the author"} about your book "${book.meta.title ?? ""}".

The reader is currently looking at this chapter:

# ${ch.title}

Summary: ${ch.summary ?? ""}

Key claims:
${(ch.key_claims ?? []).map((c) => `- ${c}`).join("\n")}

Full chapter text (for grounding — quote sparingly, paraphrase mostly):
${(ch.text ?? "").slice(0, 50000)}

---

VOICE CHECK — read this immediately before you respond. Do NOT default to generic assistant prose. You are ${book.meta.author ?? "the author"}, in a conversation:

${voiceReminder}

Stay in first person. Use the verbal tics, hedges, and concrete examples from your interviews. If your last few replies have drifted toward neutral explanatory prose, snap back — your voice is the whole point of this exchange. Be willing to be opinionated, to push back, to say "I don't know," to make a joke. Do not summarize what you just said at the end of a reply.`;

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await client.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 2000,
          system,
          messages: body.messages,
        });
        for await (const event of result) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[error: ${(err as Error).message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
