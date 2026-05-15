import type { Metadata } from "next";
import { isAuthed } from "@/lib/orwell-workshop/auth";

export const metadata: Metadata = {
  title: "Orwell Workshop",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrwellWorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set MINITRUE_REQUIRE_PASSWORD=1 in Vercel env to re-enable the gate.
  if (process.env.MINITRUE_REQUIRE_PASSWORD === "1") {
    const ok = await isAuthed();
    if (!ok) return <PasswordGate />;
  }
  return <>{children}</>;
}

function PasswordGate() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1c1c1c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: 'Menlo, Monaco, "SF Mono", "Courier New", monospace',
        color: "#e8e8e8",
      }}
    >
      <form
        method="POST"
        action="/api/orwell-workshop/login"
        style={{
          background: "#1e1e1e",
          border: "1px solid #3a3a3a",
          padding: "44px 48px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
          borderRadius: "9px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6c7086",
            marginBottom: "12px",
          }}
        >
          # private
        </div>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 400,
            marginBottom: "20px",
            color: "#f1fa8c",
          }}
        >
          ## Orwell Workshop
        </h1>
        <p style={{ color: "#c8c8c8", fontSize: "13px", marginBottom: "20px", lineHeight: 1.6 }}>
          Paste any prose, get paragraph-by-paragraph edits drawn from
          Orwell&apos;s rules.
        </p>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6c7086",
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
            border: "1px solid #3a3a3a",
            padding: "10px 14px",
            fontSize: "14px",
            fontFamily: "inherit",
            width: "100%",
            outline: "none",
            background: "#0d0d0d",
            color: "#e8e8e8",
            boxSizing: "border-box",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          style={{
            background: "transparent",
            color: "#4afa57",
            border: "1px solid #4afa57",
            padding: "8px 22px",
            fontFamily: "inherit",
            fontSize: "13px",
            cursor: "pointer",
            marginTop: "20px",
            borderRadius: "4px",
            textTransform: "lowercase",
          }}
        >
          enter →
        </button>
      </form>
    </div>
  );
}
