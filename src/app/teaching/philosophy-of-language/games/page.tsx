import Link from "next/link";
import { Press_Start_2P } from "next/font/google";
import type { Metadata } from "next";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Games & Experiments — Philosophy of Language — Nat Hansen",
  description: "Interactive games and experiments for Philosophy of Language",
};

export default function GamesPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-stone-900 text-white py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            href="/teaching/philosophy-of-language"
            className="text-stone-400 text-sm hover:text-white transition-colors mb-4 inline-block"
          >
            &larr; Philosophy of Language
          </Link>
          <h1
            className={`${pressStart.className} text-3xl sm:text-4xl md:text-5xl text-fuchsia-500`}
          >
            Games &amp; Experiments
          </h1>
        </div>
      </header>

      {/* Games list */}
      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <section className="mb-12">
          <div className="border border-stone-300 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-stone-300 flex items-center justify-between">
              <h3 className={`${pressStart.className} text-xs sm:text-sm text-stone-800`}>
                Lewis Signaling Game
              </h3>
              <a
                href="/teaching/games/lewis-signaling-game.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 text-sm hover:text-stone-800 transition-colors"
              >
                Open in new tab &rarr;
              </a>
            </div>
            <iframe
              src="/teaching/games/lewis-signaling-game.html"
              className="w-full border-0"
              style={{ height: "700px" }}
              title="Lewis Signaling Game"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-300 px-6 py-6">
        <div className="max-w-3xl mx-auto text-center text-stone-400 text-xs">
          <Link href="/" className="hover:text-stone-600 transition-colors">
            nat-hansen.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
