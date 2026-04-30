import { listBooks } from "@/lib/book-chat/books";
import { requireAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAuthed())) return new Response("unauthorized", { status: 401 });
  return Response.json(await listBooks());
}
