import type { Metadata } from "next";
import { list } from "@vercel/blob";
import { isOwnerAuthed } from "@/lib/book-chat/auth";

export const metadata: Metadata = {
  title: "Book Chat — Notes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const owner = await isOwnerAuthed();
  if (!owner) {
    return (
      <div style={{ padding: 40, fontFamily: "Georgia, serif", color: "#1f1d1a" }}>
        <h1 style={{ fontStyle: "italic" }}>Owner only</h1>
        <p style={{ color: "#6b665e" }}>
          Saved extractions are visible to the owner. Sign in with the owner password from{" "}
          <a href="/private/book-chat" style={{ color: "#6b4423" }}>
            /private/book-chat
          </a>
          .
        </p>
      </div>
    );
  }

  let blobs: Array<{ pathname: string; url: string; size: number; uploadedAt: Date }> = [];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const res = await list({ prefix: "book-chat/notes/" });
    blobs = [...res.blobs].sort((a, b) =>
      a.uploadedAt < b.uploadedAt ? 1 : -1,
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf7f2",
        color: "#1f1d1a",
        fontFamily: 'Georgia, "Iowan Old Style", serif',
        padding: "40px 32px",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <a
          href="/private/book-chat"
          style={{
            color: "#6b4423",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          ← Book Chat
        </a>
        <h1 style={{ fontSize: 28, fontStyle: "italic", margin: "16px 0 6px" }}>
          Saved extractions
        </h1>
        <p style={{ color: "#6b665e", marginBottom: 28 }}>
          Persisted to Vercel Blob from every Extract action across all sessions.
        </p>
        {blobs.length === 0 ? (
          <p style={{ color: "#6b665e", fontStyle: "italic" }}>
            No extractions yet.
            {!process.env.BLOB_READ_WRITE_TOKEN && " (BLOB_READ_WRITE_TOKEN not configured)"}
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {blobs.map((b) => (
              <li
                key={b.pathname}
                style={{
                  borderBottom: "1px solid #e8e2d6",
                  padding: "12px 0",
                }}
              >
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#1f1d1a", textDecoration: "none" }}
                >
                  <div style={{ fontSize: 16 }}>{b.pathname.replace("book-chat/notes/", "")}</div>
                  <div
                    style={{
                      color: "#6b665e",
                      fontSize: 12,
                      fontFamily: "ui-monospace, monospace",
                      marginTop: 2,
                    }}
                  >
                    {new Date(b.uploadedAt).toLocaleString()} · {(b.size / 1024).toFixed(1)} KB
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
