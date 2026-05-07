import Link from "next/link";
import localFont from "next/font/local";
import { Press_Start_2P } from "next/font/google";
import type { Metadata } from "next";

const betania = localFont({
  src: "../fonts/BetaniaPatmosInGDL-Regular.woff2",
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Speech Attacks — Nat Hansen",
  description: "Speech Attacks: Bullshit, Lies, Propaganda",
};

const topics = [
  "What is bullshit, and how does it differ from lying?",
  "The philosophy of deception and lying",
  "Propaganda: manipulation, ideology, and language",
  "Free speech and its limits",
];

export default function SpeechAttacksPage() {
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
            Speech Attacks: Bullshit, Lies, Propaganda
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
            Language can be used to inform, persuade, and connect — but it can
            also be weaponised. This module examines the ways speech acts can
            go wrong, from Harry Frankfurt&rsquo;s analysis of bullshit to
            classical and contemporary theories of lying and propaganda. We
            consider what makes these &ldquo;speech attacks&rdquo; distinctive
            and what, if anything, should be done about them.
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
            Games &amp; Experiments
          </h2>
          <div className="border border-stone-300 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className={`${pressStart.className} text-xs sm:text-sm text-stone-800`}>
                Gilbert, Krull &amp; Malone (1990)
              </h3>
              <Link
                href="/teaching/philosophy-of-language/games/gilbert-unbelieving"
                className="text-stone-500 text-sm hover:text-stone-800 transition-colors whitespace-nowrap"
              >
                Start experiment &rarr;
              </Link>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              A classroom replication of Study 1 from &ldquo;Unbelieving the Unbelievable.&rdquo;
              Learn an invented Hopi vocabulary, get occasionally interrupted by a tone, then sit
              the identification test. The diagnostic asymmetry &mdash; false propositions
              misidentified as true under interruption &mdash; is what Spinoza predicts and
              Descartes does not.
            </p>
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
