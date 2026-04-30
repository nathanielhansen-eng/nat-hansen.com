import type { Metadata } from "next";
import { requireAuthed } from "@/lib/book-chat/auth";

export const metadata: Metadata = {
  title: "Book Chat",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BookChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await requireAuthed();
  if (!ok) return <PasswordGate />;
  return <>{children}</>;
}

function PasswordGate() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf7f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
      }}
    >
      <form
        method="POST"
        action="/api/book-chat/login"
        style={{
          background: "#ffffff",
          border: "1px solid #e8e2d6",
          padding: "44px 48px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9a8866",
            marginBottom: "12px",
          }}
        >
          Private
        </div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 400,
            fontStyle: "italic",
            marginBottom: "20px",
            color: "#1f1d1a",
          }}
        >
          Book Chat
        </h1>
        <p style={{ color: "#6b665e", fontSize: "15px", marginBottom: "20px" }}>
          Talk to a book&apos;s author about a chapter you&apos;re reading.
        </p>
        <label
          style={{
            display: "block",
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9a8866",
            marginBottom: "8px",
          }}
        >
          Password
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          style={{
            border: "1px solid #e8e2d6",
            padding: "12px 16px",
            fontSize: "18px",
            fontFamily: "Georgia, serif",
            width: "100%",
            outline: "none",
            background: "#fdfaf5",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#6b4423",
            color: "#faf7f2",
            border: "none",
            padding: "12px 30px",
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Enter →
        </button>
      </form>
    </div>
  );
}
