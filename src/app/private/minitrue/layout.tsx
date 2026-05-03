import type { Metadata } from "next";
import { isAuthed } from "@/lib/orwell-workshop/auth";

export const metadata: Metadata = {
  title: "Ministry of Truth — Document Compliance Office",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MinitrueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAuthed();
  if (!ok) return <PasswordGate />;
  return <>{children}</>;
}

function PasswordGate() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f1ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
        color: "#1a1a1a",
      }}
    >
      <form
        method="POST"
        action="/api/orwell-workshop/login"
        style={{
          background: "#ffffff",
          border: "2px solid #1a1a1a",
          padding: "44px 48px",
          maxWidth: "460px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8a0000",
            marginBottom: "10px",
            fontWeight: 700,
          }}
        >
          ★ Restricted Access ★
        </div>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            margin: "0 0 4px",
            color: "#1a1a1a",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Ministry of Truth
        </h1>
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 400,
            margin: "0 0 22px",
            color: "#555",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Document Compliance Office
        </h2>
        <p style={{ color: "#444", fontSize: "13px", marginBottom: "22px", lineHeight: 1.6 }}>
          Authorised personnel only. Submit identification credentials.
        </p>
        <label
          style={{
            display: "block",
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#777",
            marginBottom: "6px",
            fontWeight: 700,
          }}
        >
          Authorisation Code
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          style={{
            border: "1px solid #1a1a1a",
            padding: "10px 14px",
            fontSize: "15px",
            fontFamily: "inherit",
            width: "100%",
            outline: "none",
            background: "#fafafa",
            color: "#1a1a1a",
            boxSizing: "border-box",
            borderRadius: 0,
          }}
        />
        <button
          type="submit"
          style={{
            background: "#8a0000",
            color: "#ffffff",
            border: "none",
            padding: "12px 28px",
            fontFamily: "inherit",
            fontSize: "12px",
            cursor: "pointer",
            marginTop: "20px",
            borderRadius: 0,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 700,
          }}
        >
          Submit ▶
        </button>
        <p
          style={{
            color: "#888",
            fontSize: "10px",
            marginTop: "26px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Form MoT-Auth-1984 · Oceania · Ingsoc
        </p>
      </form>
    </div>
  );
}
