import type { Metadata } from "next";
import { isInstructorPassword } from "@/lib/instructor-auth";
import { classLinkSession, classLinkTokenSession } from "@/lib/class-link";
import EmbedFrame from "@/components/EmbedFrame";
import ClassLinkBanner from "@/components/ClassLinkBanner";
import { cookies } from "next/headers";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Conceptual Inflation — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; t?: string; embed?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const authed = jar.get("instructor_auth")?.value;
  const ok = isInstructorPassword(authed);
  // Signed class link from ux-phi: this class's session only (src/lib/class-link.ts).
  // Framed in ux-phi's class page: the token rides in the address.
  const embedded = sp.embed === "1" && !!classLinkTokenSession(sp.t, "conceptual-inflation");
  const classSession = ok
    ? null
    : (embedded ? classLinkTokenSession(sp.t, "conceptual-inflation") : null) ??
      classLinkSession(jar, "conceptual-inflation");

  if (!ok && !classSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Crimson Pro', Georgia, serif",
          padding: "20px",
        }}
      >
        <form
          method="POST"
          action="/api/experiments/conceptual-inflation/admin-login"
          style={{
            background: "#FFFFFF",
            border: "1px solid #D6D3D1",
            padding: "48px 52px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#78716C",
              marginBottom: "12px",
            }}
          >
            Instructor access
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 400, marginBottom: "24px", color: "#1C1917" }}>
            Conceptual Inflation — class data
          </h1>
          <label
            style={{
              display: "block",
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#78716C",
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
              border: "1px solid #D6D3D1",
              padding: "12px 16px",
              fontSize: "19px",
              fontFamily: "'Crimson Pro', Georgia, serif",
              width: "100%",
              outline: "none",
              background: "#FAFAF9",
              boxSizing: "border-box",
            }}
          />
          {sp.err && (
            <div
              style={{
                color: "#CC1A14",
                fontFamily: "'Space Mono', monospace",
                fontSize: "12px",
                marginTop: "10px",
              }}
            >
              Wrong password.
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "#1C1917",
              color: "#F5F5F4",
              border: "none",
              padding: "13px 36px",
              fontFamily: "'Space Mono', monospace",
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

  if (embedded && classSession) {
    return (
      <EmbedFrame token={sp.t!} slug="conceptual-inflation">
        <AdminDashboard />
      </EmbedFrame>
    );
  }

  if (classSession) {
    return (
      <>
        <ClassLinkBanner session={classSession} />
        <AdminDashboard />
      </>
    );
  }

  return <AdminDashboard />;
}
