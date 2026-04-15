import Link from "next/link";
import localFont from "next/font/local";
import type { Metadata } from "next";

const betania = localFont({
  src: "../fonts/BetaniaPatmosInGDL-Regular.woff2",
});

export const metadata: Metadata = {
  title: "Philosophy of Language — Nat Hansen",
  description:
    "Philosophy of Language: Animals, Babies, Colours, and Language Death",
};

const topics = [
  "Animal communication and the boundaries of language",
  "Language acquisition in infants",
  "Colour terms and linguistic relativity",
  "Language death, endangerment, and revival",
];

export default function PhilosophyOfLanguagePage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="relative overflow-hidden h-56 sm:h-64 md:h-72 flex items-end">
        <img
          src="/teaching-header.png"
          alt="Sunset over the ocean"
          className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pb-8 w-full">
          <Link
            href="/teaching"
            className="text-white/70 text-sm hover:text-white transition-colors mb-4 inline-block"
          >
            &larr; Teaching
          </Link>
          <h1
            className={`${betania.className} text-3xl sm:text-4xl md:text-5xl text-white drop-shadow-lg`}
          >
            Philosophy of Language: Animals, Babies, Colours, and Language Death
          </h1>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            About this module
          </h2>
          <p className="text-stone-600 text-base leading-relaxed">
            This module explores the philosophy of language through four
            striking case studies that test the limits of what language is, how
            it works, and what happens when it disappears. We ask: do animals
            have language? How do babies acquire it? Do colour terms shape
            perception? And what is lost when a language dies?
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Topics
          </h2>
          <div className="space-y-3">
            {topics.map((topic) => (
              <div
                key={topic}
                className="border border-stone-300 rounded-lg p-4"
              >
                <p className="text-stone-800 text-base">{topic}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Details
          </h2>
          <p className="text-stone-600 text-base">2026 &middot; University of Reading</p>
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
