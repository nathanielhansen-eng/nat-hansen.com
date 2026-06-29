import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Join a transmission chain — Nat Hansen",
  robots: { index: false, follow: false },
};

// Students reach a room directly via the link/code the instructor shares; this
// page is a simple fallback for typing a room code by hand.
export default function ChainJoinPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F0E8",
        fontFamily: "'Crimson Pro', Georgia, serif",
        color: "#1A1814",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        action={joinAction}
        style={{ maxWidth: 420, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: 14,
          }}
        >
          Transmission chain
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 400, marginBottom: 22 }}>
          Enter your room code
        </h1>
        <input
          name="code"
          autoFocus
          autoCapitalize="characters"
          placeholder="ABCDE"
          maxLength={6}
          style={{
            border: "1px solid #DDD5C0",
            padding: "14px 18px",
            fontSize: 28,
            letterSpacing: "0.3em",
            textAlign: "center",
            fontFamily: "'Space Mono', monospace",
            textTransform: "uppercase",
            width: 240,
            outline: "none",
            background: "#FDFAF5",
            marginBottom: 22,
          }}
        />
        <div>
          <button
            type="submit"
            style={{
              background: "#1A1814",
              color: "#F4F0E8",
              border: "none",
              padding: "13px 34px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Join →
          </button>
        </div>
        <p style={{ marginTop: 28, fontSize: 13, color: "#9A8866" }}>
          <Link href="/teaching/experiments" style={{ color: "#9A8866" }}>
            ← all experiments
          </Link>
        </p>
      </form>
    </div>
  );
}

async function joinAction(formData: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (code) redirect(`/teaching/experiments/chain/${code}`);
}
