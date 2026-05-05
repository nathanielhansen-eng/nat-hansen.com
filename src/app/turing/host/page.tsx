import { isHostAuthed } from "@/lib/turing/host-auth";
import HostConsole from "./HostConsole";

export const metadata = { title: "Host — Turing Test" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const sp = await searchParams;
  const authed = await isHostAuthed();
  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-xl font-semibold mb-4">Host login</h1>
        <form
          action="/api/turing/host/login"
          method="POST"
          className="flex flex-col gap-3"
        >
          <input
            name="password"
            type="password"
            required
            className="border border-neutral-300 px-3 py-2 rounded"
            placeholder="password"
          />
          <button className="bg-black text-white px-4 py-2 rounded">Login</button>
          {sp.err && <p className="text-sm text-red-600">Wrong password.</p>}
        </form>
      </main>
    );
  }
  return <HostConsole />;
}
