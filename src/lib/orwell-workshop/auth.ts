import { cookies } from "next/headers";

export const GUEST_COOKIE = "orwell_workshop_auth";

export async function isAuthed(): Promise<boolean> {
  const expected = process.env.ORWELL_WORKSHOP_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value === expected;
}
