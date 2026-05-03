import { cookies } from "next/headers";
import { GUEST_COOKIE } from "@/lib/orwell-workshop/auth";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.delete(GUEST_COOKIE);
  const origin = new URL(request.url).origin;
  return Response.redirect(`${origin}/private/orwell-workshop`, 303);
}
