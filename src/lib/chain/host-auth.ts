import { cookies } from "next/headers";
import { isInstructorPassword } from "@/lib/instructor-auth";

// Reuses the shared instructor cookie/password already used by the other
// experiments' admin dashboards (see frohlich-justice/admin-login).
export const INSTRUCTOR_COOKIE = "instructor_auth";

export async function isInstructor(): Promise<boolean> {
  const jar = await cookies();
  return isInstructorPassword(jar.get(INSTRUCTOR_COOKIE)?.value);
}
