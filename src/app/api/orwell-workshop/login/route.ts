import { cookies } from "next/headers";
import { GUEST_COOKIE } from "@/lib/orwell-workshop/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const expected = process.env.ORWELL_WORKSHOP_PASSWORD ?? "";
  const origin = new URL(request.url).origin;
  const target = `${origin}/private/orwell-workshop`;

  if (!expected || pw !== expected) {
    return Response.redirect(`${target}?err=1`, 303);
  }

  const jar = await cookies();
  jar.set(GUEST_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.redirect(target, 303);
}
