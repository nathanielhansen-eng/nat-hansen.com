import { cookies } from "next/headers";

// A student's claim cookie binds them to one slot ("<chainId>:<n>") in a room,
// so the submit handler can authenticate the submission to that exact slot.
const cookieName = (code: string) => `chain_${code.toUpperCase()}`;

export type ClaimCookie = { chainId: string; n: number };

export async function setClaim(
  code: string,
  chainId: string,
  n: number,
): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(code), `${chainId}:${n}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}

export async function getClaim(code: string): Promise<ClaimCookie | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(code))?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(":");
  if (idx < 0) return null;
  const chainId = raw.slice(0, idx);
  const n = Number(raw.slice(idx + 1));
  if (!chainId || !Number.isInteger(n) || n < 1) return null;
  return { chainId, n };
}

export async function clearClaim(code: string): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(code));
}
