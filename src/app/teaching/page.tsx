import Link from "next/link";
import localFont from "next/font/local";
import type { Metadata } from "next";

const betania = localFont({
  src: "./fonts/BetaniaPatmosInGDL-Regular.woff2",
});

export const metadata: Metadata = {
  title: "Teaching — Nat Hansen",
  description: "Courses taught by Nat Hansen",
};

const modules = [
  {
    title: "Philosophy of Language: Animals, Babies, Colours, and Language Death",
    year: "2026",
    slug: "philosophy-of-language",
  },
  {
    title: "Speech Attacks: Bullshit, Lies, Propaganda",
    year: "2026",
    slug: "speech-attacks",
  },
];

export default function TeachingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Hero Header with sunset photo */}
      <header className="relative overflow-hidden h-72 sm:h-80 md:h-96 flex items-end">
        <img
          src="/teaching-header.png"
          alt="Sunset over the ocean"
          className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pb-8 w-full">
          <Link
            href="/"
            className="text-white/70 text-sm hover:text-white transition-colors mb-4 inline-block"
          >
            &larr; nat-hansen.com
          </Link>
          <h1
            className={`${betania.className} text-5xl sm:text-6xl md:text-7xl text-white drop-shadow-lg`}
          >
            Teaching
          </h1>
        </div>
      </header>

      {/* Course list */}
      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <section>
          <h2 className="text-sm text-stone-500 mb-6 uppercase tracking-wider">
            Modules
          </h2>
          <div className="space-y-4">
            {modules.map((mod) => (
              <Link
                key={mod.slug}
                href={`/teaching/${mod.slug}`}
                className="block border border-stone-300 rounded-lg p-5 hover:border-stone-400 transition-colors"
              >
                <h3
                  className={`${betania.className} text-2xl sm:text-3xl text-stone-800`}
                >
                  {mod.title}
                </h3>
                <p className="text-stone-500 text-sm mt-2">{mod.year}</p>
              </Link>
            ))}
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
