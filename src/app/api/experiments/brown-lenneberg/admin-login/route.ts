import { cookies } from "next/headers";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const expected = process.env.INSTRUCTOR_PASSWORD ?? "";
  const origin = new URL(request.url).origin;
  const adminUrl = `${origin}/teaching/philosophy-of-language/games/brown-lenneberg/admin`;

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
}
