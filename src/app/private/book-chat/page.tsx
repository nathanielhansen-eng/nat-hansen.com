import BookChatApp from "./BookChatApp";
import { isOwnerAuthed } from "@/lib/book-chat/auth";

export default async function Page() {
  const owner = await isOwnerAuthed();
  return <BookChatApp isOwner={owner} />;
}
