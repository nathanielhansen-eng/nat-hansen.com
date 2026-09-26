import { cookies } from "next/headers";
import { isInstructorPassword } from "@/lib/instructor-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const origin = new URL(request.url).origin;
  const adminUrl = `${origin}/teaching/experiments/reuter-truth/admin`;

  if (!isInstructorPassword(pw)) {
    return Response.redirect(`${adminUrl}?err=1`, 303);
  }
  const jar = await cookies();
  jar.set("instructor_auth", pw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return Response.redirect(adminUrl, 303);
}
