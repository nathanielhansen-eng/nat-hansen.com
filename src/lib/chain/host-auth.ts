import { cookies } from "next/headers";

// Reuses the shared instructor cookie/password already used by the other
// experiments' admin dashboards (see frohlich-justice/admin-login).
export const INSTRUCTOR_COOKIE = "instructor_auth";

export async function isInstructor(): Promise<boolean> {
  const expected = process.env.INSTRUCTOR_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(INSTRUCTOR_COOKIE)?.value === expected;
}
