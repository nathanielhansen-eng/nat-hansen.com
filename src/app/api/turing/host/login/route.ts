import { cookies } from "next/headers";
import { HOST_COOKIE } from "@/lib/turing/host-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const expected = process.env.TURING_HOST_PASSWORD ?? "";
  const origin = new URL(request.url).origin;
  if (!expected || pw !== expected) {
    return Response.redirect(`${origin}/turing/host?err=1`, 303);
  }
  const jar = await cookies();
  jar.set(HOST_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.redirect(`${origin}/turing/host`, 303);
}
