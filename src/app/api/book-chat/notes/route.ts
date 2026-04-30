import { list } from "@vercel/blob";
import { isOwnerAuthed } from "@/lib/book-chat/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwnerAuthed())) return new Response("unauthorized", { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ blobs: [] });
  }
  const { blobs } = await list({ prefix: "book-chat/notes/" });
  blobs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return Response.json({
    blobs: blobs.map((b) => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })),
  });
}
