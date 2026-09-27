import { createHmac, timingSafeEqual } from "node:crypto";

// Signed class links: ux-phi's instructor class page links each course
// experiment to its admin dashboard here, locked to that class's session.
// ux-phi signs {experiment, session, expiry} with EXPERIMENTS_CLASS_LINK_SECRET
// (shared by both sites); /api/experiments/class-link checks it and stores the
// token in a per-experiment cookie. While that cookie is valid, the admin page
// opens without a password and the submissions API serves ONLY that session —
// never other classes' answers. The instructor password still sees everything.
//
// Token: base64url(JSON {x: slug, s: session, e: unix seconds}) + "." +
// base64url(HMAC-SHA256(secret, first part)). Mirrored in ux-phi's
// src/lib/experiment-class-link.ts; change both together.

export type ClassLink = { slug: string; session: string; exp: number };

// Where each experiment's admin dashboard lives. Chain has no admin page (its
// host view is keyed by room code), so it has no class link.
export const ADMIN_PATHS: Record<string, string> = {
  "allen-colour-blind": "/teaching/experiments/allen-colour-blind/admin",
  "berlin-kay": "/teaching/experiments/berlin-kay/admin",
  "concept-breadth": "/teaching/experiments/concept-breadth/admin",
  "frohlich-justice": "/teaching/experiments/frohlich-justice/admin",
  "knobe-side-effect": "/teaching/experiments/knobe-side-effect/admin",
  "lindauer-cancelling": "/teaching/experiments/lindauer-cancelling/admin",
  "machery-tradeoff": "/teaching/experiments/machery-tradeoff/admin",
  "nadelhoffer-blame": "/teaching/experiments/nadelhoffer-blame/admin",
  "pettit-knobe-decided": "/teaching/experiments/pettit-knobe-decided/admin",
  "phillips-alternatives": "/teaching/experiments/phillips-alternatives/admin",
  "reuter-truth": "/teaching/experiments/reuter-truth/admin",
  "roberson-triads": "/teaching/experiments/roberson-triads/admin",
  "sripada-deepself": "/teaching/experiments/sripada-deepself/admin",
  "uttich-lombrozo-norms": "/teaching/experiments/uttich-lombrozo-norms/admin",
  "winawer-russian-blues": "/teaching/experiments/winawer-russian-blues/admin",
  "brown-lenneberg": "/teaching/philosophy-of-language/games/brown-lenneberg/admin",
  "conceptual-inflation": "/teaching/philosophy-of-language/games/conceptual-inflation/admin",
  "gilbert-unbelieving": "/teaching/philosophy-of-language/games/gilbert-unbelieving/admin",
  "heider-focal-colors": "/teaching/philosophy-of-language/games/heider-focal-colors/admin",
};

export function classLinkCookieName(slug: string): string {
  return `class_link_${slug}`;
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function verifyClassLink(
  token: string | undefined | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): ClassLink | null {
  const secret = process.env.EXPERIMENTS_CLASS_LINK_SECRET;
  if (!secret || !token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(secret, body), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof p.x !== "string" || typeof p.s !== "string" || typeof p.e !== "number") return null;
    if (!p.s || p.e <= nowSeconds || !(p.x in ADMIN_PATHS)) return null;
    return { slug: p.x, session: p.s, exp: p.e };
  } catch {
    return null;
  }
}

type CookieJar = { get(name: string): { value: string } | undefined };

// The class session this browser may see for one experiment, or null.
export function classLinkSession(jar: CookieJar, slug: string): string | null {
  return classLinkTokenSession(jar.get(classLinkCookieName(slug))?.value, slug);
}

/** The session a raw token grants for one experiment, or null. The embedded
 * dashboard (ux-phi's Experiments tab frames it) carries the token in its
 * address, because a cookie set inside another site's frame is a blocked
 * third-party cookie in most browsers. */
export function classLinkTokenSession(
  token: string | undefined | null,
  slug: string,
): string | null {
  const link = verifyClassLink(token);
  return link && link.slug === slug ? link.session : null;
}

/** For API routes: the class cookie, or a `t=` token on the request. */
export function classLinkSessionFor(
  request: Request,
  jar: CookieJar,
  slug: string,
): string | null {
  return (
    classLinkSession(jar, slug) ??
    classLinkTokenSession(new URL(request.url).searchParams.get("t"), slug)
  );
}
