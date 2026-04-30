import { cookies } from "next/headers";
import { GUEST_COOKIE, OWNER_COOKIE } from "@/lib/book-chat/auth";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.delete(GUEST_COOKIE);
  jar.delete(OWNER_COOKIE);
  const origin = new URL(request.url).origin;
  return Response.redirect(`${origin}/private/book-chat`, 303);
}
