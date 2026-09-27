import { list, get } from "@vercel/blob";
import { isInstructorPassword } from "@/lib/instructor-auth";
import { classLinkSessionFor } from "@/lib/class-link";
import { cookies } from "next/headers";

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}

export async function GET(request: Request) {
  const jar = await cookies();
  const authed = jar.get("instructor_auth")?.value;
  const fullAccess = isInstructorPassword(authed);
  // A signed class link from ux-phi sees its own class session and nothing else.
  const classSession = fullAccess ? null : classLinkSessionFor(request, jar, "pettit-knobe-decided");
  if (!fullAccess && !classSession) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionParam = fullAccess ? url.searchParams.get("session") : classSession;
  const prefix = sessionParam
    ? `pettit-knobe-decided/${sanitizeSession(sessionParam)}/`
    : "pettit-knobe-decided/";

  const sessions = new Set<string>();
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const parts = b.pathname.split("/");
      if (parts.length >= 3) sessions.add(parts[1]);
      pathnames.push(b.pathname);
    }
    cursor = page.cursor;
  } while (cursor);

  const fetched = await Promise.all(
    pathnames.map(async (p) => {
      try {
        const r = await get(p, { access: "private" });
        if (!r || r.statusCode !== 200) return null;
        const text = await new Response(r.stream).text();
        return JSON.parse(text);
      } catch {
        return null;
      }
    })
  );
  const submissions = fetched.filter((x): x is Record<string, unknown> => x !== null);

  return Response.json({ ok: true, submissions, sessions: Array.from(sessions).sort() });
}
