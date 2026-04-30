import { lightChapters, loadBook } from "@/lib/book-chat/books";
import { requireAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!(await requireAuthed())) return new Response("unauthorized", { status: 401 });
  const { slug } = await ctx.params;
  const book = await loadBook(slug);
  if (!book) return new Response("not found", { status: 404 });
  return Response.json({
    meta: book.meta,
    persona: book.persona,
    chapters: lightChapters(book.chapters),
  });
}
