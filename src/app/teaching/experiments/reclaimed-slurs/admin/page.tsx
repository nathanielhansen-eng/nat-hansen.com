import type { Metadata } from "next";
import { isInstructorPassword } from "@/lib/instructor-auth";
import { cookies } from "next/headers";
import Board from "./Board";
import { FONT_IMPORT, HS, INK, PAPER, SANS, SERIF, TIGHT, TIGHTER } from "../design";

export const metadata: Metadata = {
  title: "Four words, four questions — control board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const authed = jar.get("instructor_auth")?.value;
  const ok = isInstructorPassword(authed);
  if (!ok) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: SERIF }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ background: INK, color: PAPER }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: "22px 16px 26px" }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "14px", letterSpacing: TIGHT, color: HS.grey[1], margin: "0 0 8px" }}>
              Control board · instructor access
            </p>
            <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: "clamp(34px, 6vw, 52px)", letterSpacing: TIGHTER, lineHeight: 0.95, margin: 0 }}>
              Four words,
              <br />
              four questions
            </h1>
          </div>
        </div>
        <form
          method="POST"
          action="/api/experiments/reclaimed-slurs/admin-login"
          style={{ maxWidth: "720px", margin: "0 auto", padding: "36px 16px" }}
        >
          <label htmlFor="pw" style={{ display: "block", fontFamily: SANS, fontWeight: 700, fontSize: "16px", letterSpacing: TIGHT, marginBottom: "8px" }}>
            Password
          </label>
          <input
            id="pw"
            type="password"
            name="password"
            autoFocus
            style={{ border: 0, borderBottom: `2px solid ${INK}`, padding: "8px 2px", fontSize: "22px", fontFamily: SANS, width: "100%", maxWidth: "340px", outline: "none", background: "transparent", display: "block" }}
          />
          {sp.err && <p style={{ fontFamily: SANS, fontSize: "15px", color: HS.orange[3], margin: "10px 0 0" }}>Wrong password.</p>}
          <button
            type="submit"
            style={{ background: INK, color: PAPER, border: "none", padding: "14px 26px", fontFamily: SANS, fontWeight: 700, fontSize: "17px", letterSpacing: TIGHT, cursor: "pointer", marginTop: "22px" }}
          >
            Enter →
          </button>
        </form>
      </div>
    );
  }

  return <Board />;
}
