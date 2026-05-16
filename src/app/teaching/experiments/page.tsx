import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiments — Nat Hansen",
  description:
    "Interactive playtests of classic experiments in philosophy and political science.",
};

const experiments = [
  {
    title: "Frohlich, Oppenheimer & Eavey (1987)",
    subtitle: "Choices of Principles of Distributive Justice",
    slug: "frohlich-justice",
    blurb:
      "A solo playtest of the classic veil-of-ignorance experiment. Pick a principle, see what you'd earn, then deliberate with four simulated co-participants and try to reach unanimous agreement. The original study found 35 of 44 groups chose a principle Rawls explicitly rejected.",
  },
];

export default function ExperimentsPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-stone-900 text-white py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            href="/teaching"
            className="text-stone-400 text-sm hover:text-white transition-colors mb-4 inline-block"
          >
            &larr; Teaching
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-white">
            Experiments
          </h1>
          <p className="text-stone-400 text-sm mt-3 max-w-2xl">
            Playable versions of canonical experiments — designed for solo
            walkthrough or as the basis for in-class replication.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="space-y-6">
          {experiments.map((e) => (
            <section
              key={e.slug}
              className="border border-stone-300 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <h3 className="text-stone-800 text-base font-medium">
                    {e.title}
                  </h3>
                  <div className="text-stone-500 text-sm italic">
                    {e.subtitle}
                  </div>
                </div>
                <Link
                  href={`/teaching/experiments/${e.slug}`}
                  className="text-stone-500 text-sm hover:text-stone-800 transition-colors whitespace-nowrap"
                >
                  Start experiment &rarr;
                </Link>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed mt-3">
                {e.blurb}
              </p>
            </section>
          ))}
        </div>
      </main>

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
