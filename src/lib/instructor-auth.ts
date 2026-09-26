// Instructor dashboards accept Nat's INSTRUCTOR_PASSWORD or any password in
// GUEST_INSTRUCTOR_PASSWORDS (comma-separated), so a visiting instructor can be
// given their own password and later lose it without rotating Nat's. The
// instructor_auth cookie holds whichever password was used, so removing a guest
// password from the env also logs that guest out.
export function isInstructorPassword(value: string | undefined): boolean {
  if (!value) return false;
  const guests = (process.env.GUEST_INSTRUCTOR_PASSWORDS ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const valid = [process.env.INSTRUCTOR_PASSWORD, ...guests].filter(Boolean);
  return valid.includes(value);
}
