"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BookSummary = { slug: string; title: string; author: string };
type LightChapter = {
  title: string;
  summary?: string;
  key_claims?: string[];
  glossary?: string[];
  opener?: string;
};
type Book = {
  slug: string;
  meta: { title: string; author: string };
  persona: string;
  chapters: LightChapter[];
};
type Msg = { role: "user" | "author"; content: string; isOpener?: boolean };
type Extraction = { markdown: string; filename: string; blobUrl: string | null };

const STORAGE_PREFIX = "bookchat:";

function historyKey(slug: string) {
  return STORAGE_PREFIX + slug;
}

export default function BookChatApp({ isOwner }: { isOwner: boolean }) {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [chapterIdx, setChapterIdx] = useState(-1);
  const [historyByChapter, setHistoryByChapter] = useState<Record<number, Msg[]>>({});
  const [streaming, setStreaming] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollPendingRef = useRef(false);
  const anchorIdxRef = useRef(-1);

  useEffect(() => {
    fetch("/api/book-chat/books")
      .then((r) => r.json())
      .then((data) => setBooks(data))
      .catch(() => setBooks([]));
  }, []);

  const persistHistory = useCallback(
    (slug: string, hist: Record<number, Msg[]>) => {
      try {
        localStorage.setItem(historyKey(slug), JSON.stringify(hist));
      } catch {}
    },
    [],
  );

  const pickBook = useCallback(async (slug: string) => {
    const r = await fetch("/api/book-chat/books/" + slug);
    if (!r.ok) return;
    const data = (await r.json()) as Omit<Book, "slug">;
    let saved: Record<number, Msg[]> = {};
    try {
      saved = JSON.parse(localStorage.getItem(historyKey(slug)) || "{}");
    } catch {}
    setBook({ ...data, slug });
    setChapterIdx(-1);
    setHistoryByChapter(saved);
  }, []);

  const pickChapter = useCallback(
    (i: number) => {
      if (!book) return;
      setChapterIdx(i);
      setHistoryByChapter((prev) => {
        if (prev[i]) return prev;
        const opener = book.chapters[i].opener;
        const next = { ...prev };
        next[i] = opener ? [{ role: "author", content: opener, isOpener: true }] : [];
        return next;
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [book],
  );

  useEffect(() => {
    if (scrollPendingRef.current) {
      scrollPendingRef.current = false;
      if (anchorRef.current) {
        anchorRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
      } else if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    } else if (logRef.current && streaming) {
      // keep view pinned during streaming if user is at bottom
    }
  }, [historyByChapter, chapterIdx, streaming]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!book || streaming || chapterIdx < 0 || !text) return;
    const i = chapterIdx;
    const slug = book.slug;
    const existing = historyByChapter[i] ?? [];
    const next = [
      ...existing,
      { role: "user" as const, content: text },
      { role: "author" as const, content: "" },
    ];
    anchorIdxRef.current = next.length - 2;
    scrollPendingRef.current = true;
    setHistoryByChapter((prev) => ({ ...prev, [i]: next }));
    setDraft("");
    setStreaming(true);

    const apiMsgs = next
      .slice(0, -1)
      .filter((m) => !m.isOpener && m.content !== "")
      .map((m) => ({
        role: m.role === "author" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    try {
      const r = await fetch("/api/book-chat/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, chapter_idx: i, messages: apiMsgs }),
      });
      if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setHistoryByChapter((prev) => {
          const cur = prev[i] ? [...prev[i]] : [];
          if (cur.length === 0) return prev;
          cur[cur.length - 1] = { ...cur[cur.length - 1], content: buf };
          return { ...prev, [i]: cur };
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistoryByChapter((prev) => {
        const cur = prev[i] ? [...prev[i]] : [];
        if (cur.length === 0) return prev;
        cur[cur.length - 1] = { ...cur[cur.length - 1], content: "[error: " + msg + "]" };
        return { ...prev, [i]: cur };
      });
    } finally {
      setStreaming(false);
      setHistoryByChapter((prev) => {
        persistHistory(slug, prev);
        return prev;
      });
    }
  }, [book, chapterIdx, draft, historyByChapter, persistHistory, streaming]);

  const extract = useCallback(async () => {
    if (!book || chapterIdx < 0) return;
    const hist = historyByChapter[chapterIdx] ?? [];
    const real = hist.filter((m) => !m.isOpener && m.content);
    if (real.length < 2) {
      alert("Have a conversation first — there's nothing to extract yet.");
      return;
    }
    setExtracting(true);
    const apiMsgs = real.map((m) => ({
      role: m.role === "author" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
    try {
      const r = await fetch("/api/book-chat/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: book.slug,
          chapter_idx: chapterIdx,
          messages: apiMsgs,
        }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = (await r.json()) as Extraction;
      setExtraction(data);
    } catch (e) {
      alert("Extraction failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExtracting(false);
    }
  }, [book, chapterIdx, historyByChapter]);

  const currentChapter = useMemo(() => {
    if (!book || chapterIdx < 0) return null;
    return book.chapters[chapterIdx];
  }, [book, chapterIdx]);
  const currentMsgs = chapterIdx >= 0 ? historyByChapter[chapterIdx] ?? [] : [];

  return (
    <div style={styles.root}>
      <style>{globalCss}</style>
      <aside style={styles.sidebar}>
        {!book ? (
          <>
            <h2 style={styles.h2}>Books</h2>
            {books.length === 0 && <p style={styles.muted}>No books yet.</p>}
            {books.map((b) => (
              <button
                key={b.slug}
                style={styles.bookPick}
                onClick={() => pickBook(b.slug)}
              >
                <div>{b.title}</div>
                <div style={styles.author}>{b.author}</div>
              </button>
            ))}
            {isOwner && (
              <a href="/private/book-chat/notes" style={styles.notesLink}>
                Saved notes archive →
              </a>
            )}
            <LogoutForm />
          </>
        ) : (
          <>
            <h2 style={styles.h2}>Talking to</h2>
            <h1 style={styles.h1}>{book.meta.title}</h1>
            <div style={styles.author}>{book.meta.author}</div>
            <button
              style={styles.bookPick}
              onClick={() => {
                setBook(null);
                setChapterIdx(-1);
              }}
            >
              ← all books
            </button>
            {book.chapters.map((c, i) => (
              <button
                key={i}
                style={{
                  ...styles.chapter,
                  ...(i === chapterIdx ? styles.chapterActive : {}),
                }}
                onClick={() => pickChapter(i)}
              >
                <span style={styles.chapterNum}>{String(i + 1).padStart(2, "0")}</span>
                {c.title}
              </button>
            ))}
            {isOwner && (
              <a href="/private/book-chat/notes" style={styles.notesLink}>
                Saved notes archive →
              </a>
            )}
            <LogoutForm />
          </>
        )}
      </aside>

      <main style={styles.main}>
        <header style={styles.bar}>
          {!currentChapter ? (
            <div style={styles.chSummary}>{book ? "Pick a chapter to begin." : "Pick a book."}</div>
          ) : (
            <>
              <div style={styles.actions}>
                <button
                  style={styles.extractBtn}
                  disabled={extracting}
                  onClick={extract}
                >
                  {extracting ? "Extracting…" : "Extract arguments →"}
                </button>
              </div>
              <div style={styles.chTitle}>{currentChapter.title}</div>
              {currentChapter.summary && (
                <div style={styles.chSummary}>{currentChapter.summary}</div>
              )}
            </>
          )}
        </header>

        <div ref={logRef} style={styles.log}>
          {!book || chapterIdx < 0 ? (
            <div style={styles.empty}>
              {book ? "Pick a chapter from the left." : "Pick a book from the left."}
            </div>
          ) : (
            currentMsgs.map((m, i) => (
              <div
                key={i}
                ref={i === anchorIdxRef.current ? anchorRef : undefined}
                style={styles.msg}
              >
                <div style={styles.who}>
                  {m.role === "user" ? "You" : book.meta.author}
                </div>
                <div
                  style={{
                    ...(m.role === "user" ? styles.userBubble : styles.authorBubble),
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          style={styles.input}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the author…"
            rows={1}
            style={styles.textarea}
          />
          <button
            type="submit"
            disabled={streaming || chapterIdx < 0 || !draft.trim()}
            style={styles.sendBtn}
          >
            Send
          </button>
        </form>
      </main>

      {extraction && (
        <ExtractionModal
          extraction={extraction}
          onClose={() => setExtraction(null)}
        />
      )}
    </div>
  );
}

function LogoutForm() {
  return (
    <form method="POST" action="/api/book-chat/logout" style={{ marginTop: 12 }}>
      <button type="submit" style={styles.logoutBtn}>
        Log out
      </button>
    </form>
  );
}

function ExtractionModal({
  extraction,
  onClose,
}: {
  extraction: Extraction;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHead}>
          <div style={styles.modalMeta}>
            {extraction.blobUrl ? "Saved" : "Downloaded"} · {extraction.filename}
          </div>
          <button
            style={styles.modalBtnPrimary}
            onClick={() => triggerDownload(extraction.filename, extraction.markdown)}
          >
            Download .md
          </button>
          <button
            style={styles.modalBtnPrimary}
            onClick={() => {
              navigator.clipboard.writeText(extraction.markdown);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy markdown"}
          </button>
          <button style={styles.modalBtnGhost} onClick={onClose}>
            Close
          </button>
        </div>
        <pre style={styles.modalBody}>{extraction.markdown}</pre>
      </div>
    </div>
  );
}

function triggerDownload(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const globalCss = `
  .bookchat-root, .bookchat-root * { box-sizing: border-box; }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#faf7f2",
    color: "#1f1d1a",
    fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    fontSize: 16,
    lineHeight: 1.55,
  },
  sidebar: {
    width: 320,
    borderRight: "1px solid #e8e2d6",
    background: "#ffffff",
    padding: "18px 16px",
    overflowY: "auto",
  },
  h2: {
    margin: "0 0 4px",
    fontSize: 16,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#6b665e",
  },
  h1: {
    margin: "0 0 4px",
    fontSize: 22,
    fontStyle: "italic",
  },
  author: { color: "#6b665e", marginBottom: 18 },
  muted: { color: "#6b665e" },
  bookPick: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    borderBottom: "1px solid #e8e2d6",
    padding: "10px 4px",
    font: "inherit",
    color: "#1f1d1a",
    cursor: "pointer",
  },
  chapter: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    borderBottom: "1px solid #e8e2d6",
    padding: "10px 4px",
    font: "inherit",
    color: "#1f1d1a",
    cursor: "pointer",
  },
  chapterActive: { background: "#efe7d7" },
  chapterNum: { color: "#6b665e", marginRight: 8, fontVariantNumeric: "tabular-nums" },
  notesLink: {
    display: "block",
    marginTop: 24,
    fontSize: 13,
    color: "#6b4423",
    fontFamily: "ui-monospace, monospace",
    textDecoration: "none",
    borderTop: "1px solid #e8e2d6",
    paddingTop: 14,
  },
  logoutBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "ui-monospace, monospace",
    fontSize: 12,
    color: "#9a8866",
    cursor: "pointer",
    textDecoration: "underline",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  bar: {
    padding: "14px 24px",
    borderBottom: "1px solid #e8e2d6",
    background: "#ffffff",
    overflow: "hidden",
  },
  actions: { float: "right" },
  chTitle: { fontSize: 20, fontStyle: "italic" },
  chSummary: { color: "#6b665e", fontSize: 14, marginTop: 4 },
  extractBtn: {
    font: "inherit",
    fontSize: 13,
    background: "transparent",
    color: "#6b4423",
    border: "1px solid #6b4423",
    borderRadius: 4,
    padding: "5px 12px",
    cursor: "pointer",
  },
  log: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
    maxWidth: 820,
    margin: "0 auto",
    width: "100%",
  },
  msg: { marginBottom: 18 },
  who: {
    fontSize: 12,
    color: "#6b665e",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  userBubble: {
    background: "#efe7d7",
    padding: "10px 14px",
    borderRadius: 6,
    display: "inline-block",
  },
  authorBubble: { whiteSpace: "pre-wrap" },
  empty: { color: "#6b665e", padding: 40, textAlign: "center", fontStyle: "italic" },
  input: {
    borderTop: "1px solid #e8e2d6",
    background: "#ffffff",
    padding: "14px 24px",
    display: "flex",
    gap: 10,
  },
  textarea: {
    flex: 1,
    resize: "none",
    font: "inherit",
    border: "1px solid #e8e2d6",
    borderRadius: 6,
    padding: 10,
    background: "#faf7f2",
    color: "#1f1d1a",
    minHeight: 44,
    maxHeight: 160,
  },
  sendBtn: {
    font: "inherit",
    background: "#6b4423",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "0 18px",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  modal: {
    background: "#faf7f2",
    maxWidth: 820,
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  modalHead: {
    padding: "14px 20px",
    borderBottom: "1px solid #e8e2d6",
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  modalMeta: {
    flex: 1,
    color: "#6b665e",
    fontSize: 13,
    fontFamily: "ui-monospace, monospace",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  modalBtnPrimary: {
    font: "inherit",
    background: "#6b4423",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 4,
    cursor: "pointer",
  },
  modalBtnGhost: {
    font: "inherit",
    background: "transparent",
    color: "#1f1d1a",
    border: "1px solid #e8e2d6",
    padding: "6px 14px",
    borderRadius: 4,
    cursor: "pointer",
  },
  modalBody: {
    flex: 1,
    overflowY: "auto",
    margin: 0,
    padding: "20px 24px",
    whiteSpace: "pre-wrap",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.55,
    background: "#fff",
  },
};
