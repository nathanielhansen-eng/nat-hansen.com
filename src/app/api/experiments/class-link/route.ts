import { cookies } from "next/headers";
import { ADMIN_PATHS, classLinkCookieName, verifyClassLink } from "@/lib/class-link";

// Entry point for a signed class link from ux-phi (see src/lib/class-link.ts):
// check the token, keep it in a cookie for this one experiment, and open the
// admin dashboard, which then shows only the class's session.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const link = verifyClassLink(url.searchParams.get("t"));
  if (!link) {
    return new Response(
      "This class link has expired or isn't valid. Open it again from your class page on ux-phi.com.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  // Embedded in ux-phi's class page: no cookie (it would be a blocked
  // third-party cookie inside the frame); the token rides in the address.
  if (url.searchParams.get("embed") === "1") {
    const t = encodeURIComponent(url.searchParams.get("t")!);
    return Response.redirect(`${url.origin}${ADMIN_PATHS[link.slug]}?embed=1&t=${t}`, 303);
  }
  const jar = await cookies();
  jar.set(classLinkCookieName(link.slug), url.searchParams.get("t")!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, link.exp - Math.floor(Date.now() / 1000)),
  });
  return Response.redirect(`${url.origin}${ADMIN_PATHS[link.slug]}`, 303);
}
