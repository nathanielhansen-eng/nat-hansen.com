import { cookies } from "next/headers";
import { INSTRUCTOR_COOKIE } from "@/lib/chain/host-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const expected = process.env.INSTRUCTOR_PASSWORD ?? "";
  const origin = new URL(request.url).origin;
  const hostUrl = `${origin}/teaching/experiments/chain/host`;

  if (!expected || pw !== expected) {
    return Response.redirect(`${hostUrl}?err=1`, 303);
  }
  const jar = await cookies();
  jar.set(INSTRUCTOR_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.redirect(hostUrl, 303);
}
