import Link from "next/link";
import JoinForm from "./JoinForm";

export const metadata = { title: "Turing Test — nat-hansen.com" };

export default function Page() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold mb-2">Live Turing Test</h1>
      <p className="text-sm text-neutral-600 mb-8">
        Enter a room code from your instructor to join.
      </p>
      <JoinForm />
      <div className="mt-10 text-xs text-neutral-500">
        <Link href="/turing/host" className="underline">
          Hosting?
        </Link>
      </div>
    </main>
  );
}
