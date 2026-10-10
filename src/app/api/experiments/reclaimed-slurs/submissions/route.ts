import { list, get } from "@vercel/blob";
import { isInstructorPassword } from "@/lib/instructor-auth";
import { PILOT_SLUG, SLUG } from "@/lib/reclaimed-slurs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}

// Every record under `${root}/` (or one session of it), plus the session names seen.
async function loadAll(root: string, session: string | null) {
  const prefix = session ? `${root}/${sanitizeSession(session)}/` : `${root}/`;
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
        return JSON.parse(await new Response(r.stream).text());
      } catch {
        return null;
      }
    }),
  );
  return { records: fetched.filter((x): x is Record<string, unknown> => x !== null), sessions };
}

export async function GET(request: Request) {
  const jar = await cookies();
  if (!isInstructorPassword(jar.get("instructor_auth")?.value)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = new URL(request.url).searchParams.get("session");
  const [main, pilot] = await Promise.all([loadAll(SLUG, session), loadAll(PILOT_SLUG, session)]);
  return Response.json({
    ok: true,
    submissions: main.records,
    pilot: pilot.records,
    sessions: Array.from(new Set([...main.sessions, ...pilot.sessions])).sort(),
  });
}
