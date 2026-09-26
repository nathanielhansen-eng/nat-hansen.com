import { cookies } from "next/headers";
import { isInstructorPassword } from "@/lib/instructor-auth";
import { INSTRUCTOR_COOKIE } from "@/lib/chain/host-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const origin = new URL(request.url).origin;
  const hostUrl = `${origin}/teaching/experiments/chain/host`;

  if (!isInstructorPassword(pw)) {
    return Response.redirect(`${hostUrl}?err=1`, 303);
  }
  const jar = await cookies();
  jar.set(INSTRUCTOR_COOKIE, pw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.redirect(hostUrl, 303);
}
