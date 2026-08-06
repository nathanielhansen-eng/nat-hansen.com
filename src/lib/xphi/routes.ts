// Route-handler factories for the per-experiment API triple. The submit
// POST keeps a bespoke validator per experiment; the submissions GET and
// admin-login POST are identical modulo the slug, so route files reduce to
//   export const GET = makeSubmissionsGET("<slug>");

import { cookies } from "next/headers";
import {
  fetchSubmissions,
  listSubmissionBlobs,
  putSubmission,
  sanitizeSession,
  sanitizeTag,
} from "./blob";
import { validateSpecSubmission, type SpecShape } from "./spec";

export async function isInstructor(): Promise<boolean> {
  const jar = await cookies();
  const authed = jar.get("instructor_auth")?.value;
  return !!authed && authed === process.env.INSTRUCTOR_PASSWORD;
}

/** The validator returns a record with a sanitized `session`, or null → 400. */
export async function handleSubmitPOST<T extends { session: string }>(
  slug: string,
  request: Request,
  validate: (body: unknown) => T | null
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const submission = validate(body);
  if (!submission) {
    return Response.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  await putSubmission(slug, submission.session, submission);
  return Response.json({ ok: true });
}

/** Submit route for a spec-driven VignetteStudy: the whole POST handler,
 *  validation included, derived from the spec's shape. */
export function makeSpecSubmitPOST(slug: string, shape: SpecShape) {
  return (request: Request): Promise<Response> =>
    handleSubmitPOST(slug, request, (body) =>
      validateSpecSubmission(shape, body, {
        session: (s) => sanitizeSession(s, "default"),
        tag: sanitizeTag,
      })
    );
}

export function makeSubmissionsGET(slug: string) {
  return async function GET(request: Request): Promise<Response> {
    if (!(await isInstructor())) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const sessionParam = url.searchParams.get("session");
    const prefix = sessionParam ? `${slug}/${sanitizeSession(sessionParam)}/` : `${slug}/`;
    const { pathnames, sessions } = await listSubmissionBlobs(prefix);
    const submissions = await fetchSubmissions(pathnames);
    return Response.json({ ok: true, submissions, sessions });
  };
}

export function makeAdminLoginPOST(slug: string) {
  return async function POST(request: Request): Promise<Response> {
    const form = await request.formData();
    const pw = String(form.get("password") ?? "");
    const expected = process.env.INSTRUCTOR_PASSWORD ?? "";
    const origin = new URL(request.url).origin;
    const adminUrl = `${origin}/teaching/experiments/${slug}/admin`;

    if (!expected || pw !== expected) {
      return Response.redirect(`${adminUrl}?err=1`, 303);
    }
    const jar = await cookies();
    jar.set("instructor_auth", expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return Response.redirect(adminUrl, 303);
  };
}
