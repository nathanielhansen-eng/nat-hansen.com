import { cookies } from "next/headers";

export const GUEST_COOKIE = "book_chat_auth";
export const OWNER_COOKIE = "book_chat_owner";

export async function isGuestAuthed(): Promise<boolean> {
  const expected = process.env.BOOK_CHAT_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value === expected;
}

export async function isOwnerAuthed(): Promise<boolean> {
  const expected = process.env.BOOK_CHAT_OWNER_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(OWNER_COOKIE)?.value === expected;
}

export async function requireAuthed(): Promise<boolean> {
  return (await isGuestAuthed()) || (await isOwnerAuthed());
}
