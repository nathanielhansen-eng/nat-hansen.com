// Vercel Blob persistence for the classroom experiments. One private JSON
// blob per submission at <slug>/<session>/<id>.json. Server-side only.

import { put, list, get } from "@vercel/blob";

/** Session ids: illegal characters become "-" (so a pasted human name still
 *  round-trips to the same id everywhere). Pass a fallback of "default" in
 *  submit paths, "" in read paths (matching the shipped behaviour). */
export function sanitizeSession(s: string, fallback = ""): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64) || fallback;
}

/** Launcher-supplied opaque tag (course-dashboard integration): illegal
 *  characters are stripped, empty results drop to null, never required. */
export function sanitizeTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null;
}

/** Write one submission. `session` must already be sanitized. */
export async function putSubmission(slug: string, session: string, record: unknown): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `${slug}/${session}/${id}.json`;
  await put(key, JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
}

/** Paginate a prefix, returning blob pathnames plus the session names seen
 *  (second path segment). */
export async function listSubmissionBlobs(
  prefix: string
): Promise<{ pathnames: string[]; sessions: string[] }> {
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
  return { pathnames, sessions: Array.from(sessions).sort() };
}

/** Fetch and parse submission blobs; unreadable ones are dropped. */
export async function fetchSubmissions(pathnames: string[]): Promise<Record<string, unknown>[]> {
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
  return fetched.filter((x): x is Record<string, unknown> => x !== null);
}

/** All submissions for one experiment session. `session` must already be
 *  sanitized. */
export async function loadSessionSubmissions(
  slug: string,
  session: string
): Promise<Record<string, unknown>[]> {
  const { pathnames } = await listSubmissionBlobs(`${slug}/${session}/`);
  return fetchSubmissions(pathnames);
}
