import { cookies } from "next/headers";

export const HOST_COOKIE = "turing_host";

export async function isHostAuthed(): Promise<boolean> {
  const expected = process.env.TURING_HOST_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(HOST_COOKIE)?.value === expected;
}

export async function requireHost(): Promise<boolean> {
  return isHostAuthed();
}
