import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { loadBook } from "@/lib/book-chat/books";
import { requireAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXTRACT_MODEL = "claude-opus-4-7";

const EXTRACT_PROMPT = `You are helping a reader build study notes from a chat they had with the author of a book. The conversation is the spine of these notes — your job is to capture and sharpen what actually came up in it, NOT to summarize or reconstruct the chapter.

Ground rules:
- The CONVERSATION is your source material. Work only from the threads, examples, and arguments that the reader and author actually developed together. Do not survey the chapter or lay out its full argument.
- The chapter/book text is provided ONLY as a reference to draw on as needed — to pull a supporting quote, pin down a term, or check a detail for something that came up in the chat. Reach into it when a point in the conversation calls for support; otherwise leave it alone. Don't import material the conversation didn't touch.
- Better to cover the two or three things the conversation genuinely got into, well, than to pad toward full chapter coverage.

For each substantive point or argument that emerged in the conversation:

- **A short, plain-English title** (no jargon if avoidable)
- **The gist** — 2-3 sentences in the conversational register of the chat. How did the author actually put it? Use the analogies, examples, and turns of phrase that came up. This is the main content of the note.
- **In standard form** — *only if the conversation actually developed an argument worth formalizing*: numbered premises and a conclusion (use ∴), in plain language. Skip this for points that were exploratory or illustrative rather than argued.
- **Supporting quote** — 1-2 direct quotes from the chapter (use blockquotes) that back up or illustrate *this specific point from the conversation*. Only include if there's a genuinely apt line; note roughly where in the chapter it comes from. Skip if nothing fits.
- **Worries / pushback** — objections that came up in the chat, plus the obvious one worth raising. Phrase them as sharp, answerable questions.

Then, only if warranted by what was discussed:

- **Key concepts** — terms that came up in the conversation and were used in a non-obvious way, defined in plain language (technical version in parens).
- **Open threads** — things the conversation raised but didn't settle. Good to think through further.

Tone: warm, intellectually serious, accessible. Telegraphic but human, precise but not stiff. Avoid academic throat-clearing.

Output GitHub-flavored markdown. Don't pad. If the conversation didn't actually develop a real argument on some topic, leave it out. Don't invent positions the reader didn't take, and don't reach into the chapter for material the conversation never engaged.

Conversation and chapter reference follow.`;

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

=== THE CONVERSATION (your primary source — build the notes from this) ===
${convo}

=== CHAPTER REFERENCE (consult only as needed for quotes/terms/details on points the conversation raised — do not summarize it) ===
Summary: ${ch.summary ?? ""}
Key claims: ${(ch.key_claims ?? []).join("; ")}

Full text:
${(ch.text ?? "").slice(0, 60000)}`;

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
