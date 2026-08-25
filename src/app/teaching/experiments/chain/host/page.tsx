import type { Metadata } from "next";
import { cookies } from "next/headers";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Transmission chain — Instructor",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const authed = jar.get("instructor_auth")?.value;
  const ok = !!authed && authed === process.env.INSTRUCTOR_PASSWORD;

  if (!ok) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Crimson Pro', Georgia, serif",
          padding: 20,
        }}
      >
        <form
          method="POST"
          action="/api/experiments/chain/host/login"
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD5C0",
            padding: "48px 52px",
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9A8866",
              marginBottom: 12,
            }}
          >
            Instructor access
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 24, color: "#1A1814" }}>
            Transmission chains
          </h1>
          <label
            style={{
              display: "block",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9A8866",
              marginBottom: 8,
            }}
          >
            Password
          </label>
          <input
            type="password"
            name="password"
            autoFocus
            style={{
              border: "1px solid #DDD5C0",
              padding: "12px 16px",
              fontSize: 19,
              fontFamily: "'Crimson Pro', Georgia, serif",
              width: "100%",
              outline: "none",
              background: "#FDFAF5",
              boxSizing: "border-box",
            }}
          />
          {sp.err && (
            <div
              style={{
                color: "#CC1A14",
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                marginTop: 10,
              }}
            >
              Wrong password.
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "#1A1814",
              color: "#F5F5F4",
              border: "none",
              padding: "13px 36px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginTop: 20,
            }}
          >
            Enter →
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard />;
}
