import { cookies } from "next/headers";

export type Role = "participant" | "judge";

const cookieName = (code: string, role: Role) =>
  `turing_${role === "participant" ? "p" : "j"}_${code.toUpperCase()}`;

export type Identity = { role: Role; id: string };

export async function getId(code: string, role: Role): Promise<string | null> {
  const jar = await cookies();
  return jar.get(cookieName(code, role))?.value ?? null;
}

export async function setId(code: string, role: Role, id: string): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(code, role), id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearId(code: string, role: Role): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(code, role));
}

// When the role is unknown (e.g., state polls without ?role), prefer participant.
export async function detectIdentity(code: string): Promise<Identity | null> {
  const pid = await getId(code, "participant");
  if (pid) return { role: "participant", id: pid };
  const jid = await getId(code, "judge");
  if (jid) return { role: "judge", id: jid };
  return null;
}
