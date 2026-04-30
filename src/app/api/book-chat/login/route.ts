import { cookies } from "next/headers";
import { GUEST_COOKIE, OWNER_COOKIE } from "@/lib/book-chat/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const pw = String(form.get("password") ?? "");
  const guest = process.env.BOOK_CHAT_PASSWORD ?? "";
  const owner = process.env.BOOK_CHAT_OWNER_PASSWORD ?? "";
  const origin = new URL(request.url).origin;
  const target = `${origin}/private/book-chat`;

  const isGuest = guest && pw === guest;
  const isOwner = owner && pw === owner;

  if (!isGuest && !isOwner) {
    return Response.redirect(`${target}?err=1`, 303);
  }

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  if (isOwner) {
    jar.set(OWNER_COOKIE, owner, opts);
    if (guest) jar.set(GUEST_COOKIE, guest, opts);
  } else {
    jar.set(GUEST_COOKIE, guest, opts);
  }
  return Response.redirect(target, 303);
}
