import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { loadBook } from "@/lib/book-chat/books";
import { requireAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXTRACT_MODEL = "claude-opus-4-7";

const EXTRACT_PROMPT = `You are helping a philosopher build lecture notes from a chat they had with the author of a book. The lecture should be MORE intelligible and relatable than the book itself — that's the whole point. The book is dense; the conversation between reader and author already did the work of making it accessible. Your job is to preserve that.

For each substantive argument that emerged in the conversation:

- **A short, plain-English title** (no jargon if avoidable)
- **The gist** — 2-3 sentences in the conversational register of the chat. How would the author explain this to a curious friend over coffee? Use the analogies, examples, and turns of phrase that actually came up. This is what goes on the slide as the main content.
- **In standard form** — numbered premises and a conclusion (use ∴), so the lecturer has the rigorous skeleton when they want it. Keep premises in plain language; reserve technical vocabulary for when it earns its keep.
- **Evidence from the book** — 1-3 direct quotes (use blockquotes) that support or illustrate the argument. Pick lines that would work on a slide — vivid, compact, quotable. Note roughly where in the chapter they come from.
- **Worries / pushback** — objections that came up in the chat, plus obvious ones a careful student would raise. Phrase them as questions a smart undergrad might ask.
- **Lecturer notes** — what landed in the conversation, what examples to lean on, where to slow down, where students typically get stuck.

Also include at the end:

- **Key concepts** — terms the author uses idiosyncratically, defined in plain language with the technical version in parens.
- **Quotable lines** — 3-6 short standalone passages from the chapter, vivid enough to anchor a slide on their own.
- **Open threads** — things the conversation raised but didn't settle. Good seeds for class discussion.

Tone: warm, intellectually serious, accessible. Write the way a good professor writes their own notes — telegraphic but human, precise but not stiff. Avoid academic throat-clearing. The goal is "I could give this lecture from these notes," not "I have proven a theorem."

Output GitHub-flavored markdown. Don't pad. If the conversation didn't actually develop a real argument on some topic, just don't include it — better fewer good arguments than many thin ones. Don't invent positions the reader didn't take.

Conversation and chapter context follow.`;

type ExtractReq = {
  slug: string;
  chapter_idx: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function POST(request: Request) {
  if (!(await requireAuthed())) return new Response("unauthorized", { status: 401 });
  const body = (await request.json()) as ExtractReq;
  const book = await loadBook(body.slug);
  if (!book) return new Response("book not found", { status: 404 });
  if (body.chapter_idx < 0 || body.chapter_idx >= book.chapters.length) {
    return new Response("bad chapter_idx", { status: 400 });
  }
  const ch = book.chapters[body.chapter_idx];

  const convo = body.messages
    .map((m) => `### ${m.role.toUpperCase()}\n${m.content}`)
    .join("\n\n");

  const userMsg = `Book: "${book.meta.title ?? ""}" by ${book.meta.author ?? ""}
Chapter: ${ch.title}
Chapter summary: ${ch.summary ?? ""}
Key claims listed for this chapter:
${(ch.key_claims ?? []).map((c) => `- ${c}`).join("\n")}

--- CHAPTER TEXT ---
${(ch.text ?? "").slice(0, 60000)}

--- CONVERSATION ---
${convo}`;

  const client = new Anthropic();
  const resp = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 6000,
    system: EXTRACT_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const block = resp.content[0];
  const text = block.type === "text" ? block.text.trim() : "";

  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const safeTitle =
    Array.from(ch.title)
      .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : "-"))
      .join("")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40);
  const filename = `ch${String(body.chapter_idx).padStart(2, "0")}-${safeTitle}-${ts}.md`;
  const header = `# ${ch.title} — Argument Extraction\n*From conversation on ${now.toISOString().slice(0, 16).replace("T", " ")} · ${book.meta.title ?? ""} by ${book.meta.author ?? ""}*\n\n`;
  const markdown = header + text;

  let blobUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`book-chat/notes/${body.slug}/${filename}`, markdown, {
        access: "public",
        contentType: "text/markdown; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      blobUrl = blob.url;
    } catch (err) {
      console.error("book-chat blob write failed:", err);
    }
  }

  return Response.json({ markdown, filename, blobUrl });
}
