import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiments — Nat Hansen",
  description:
    "Interactive playtests of classic experiments in philosophy and political science.",
};

type ExperimentCard = {
  title: string;
  subtitle: string;
  slug: string; // used for the React key and the default link
  href?: string; // overrides the default /teaching/experiments/<slug> link
  blurb: string;
  cta?: string;
  isStatic?: boolean; // static HTML served from /public — render a plain <a>, not next/link
};

const experiments: ExperimentCard[] = [
  {
    title: "Zollman (2010)",
    subtitle: "The Epistemic Benefit of Transient Diversity",
    slug: "zollman",
    href: "/teaching/games/zollman/tutorial.html",
    isStatic: true,
    cta: "Open the tutorial →",
    blurb:
      "An interactive build-up of Zollman's bandit-network model of scientific communities — why more communication can mean less truth — one assumption at a time. Then two dashboards: the original model, and an extension in which each scientist consults a sycophantic or a devil's-advocate LLM, showing that whether an AI helps a community reach the truth turns on the shape of its network. Runs entirely in the browser.",
  },
  {
    title: "Knobe (2003)",
    subtitle: "Intentional Action and Side Effects in Ordinary Language",
    slug: "knobe-side-effect",
    blurb:
      "The side-effect effect — the most-cited result in experimental philosophy. Read one vignette, assigned at random, and say whether a chairman who is indifferent to the environment harmed (or helped) it intentionally. The two versions are matched on foresight, indifference and causal structure, and differ only in whether the side effect is bad or good; Knobe found 82% vs 23%. Both of his studies are included, and class results are compiled live against the published figures.",
  },
  {
    title: "Frohlich, Oppenheimer & Eavey (1987)",
    subtitle: "Choices of Principles of Distributive Justice",
    slug: "frohlich-justice",
    blurb:
      "A solo playtest of the classic veil-of-ignorance experiment. Pick a principle, see what you'd earn, then deliberate with four simulated co-participants and try to reach unanimous agreement. The original study found 35 of 44 groups chose a principle Rawls explicitly rejected.",
  },
  {
    title: "Esper (1966)",
    subtitle: "Social Transmission of an Artificial Language",
    slug: "chain",
    cta: "Join a room →",
    blurb:
      "A live, in-class transmission chain. Each student learns names for eight shape-colour objects, then reproduces them from memory — and their version becomes the language taught to the next student. Across generations a 'totally suppletive' vocabulary drifts toward morphological categories. Run several parallel chains and compare how they diverge. Instructors: open the room from the host console.",
  },
  {
    title: "Brown & Lenneberg (1954)",
    subtitle: "Codability and Colour Memory",
    slug: "brown-lenneberg",
    href: "/teaching/philosophy-of-language/games/brown-lenneberg",
    blurb:
      "A classroom replication of the codability-and-memory study: name 12 colours, then try to recognise a subset after a 30-second arithmetic-filled delay. Anonymous results are compiled live for discussion.",
  },
  {
    title: "Heider — Focal Colours (1972)",
    subtitle: "Universals in Colour Naming and Memory",
    slug: "heider-focal-colors",
    href: "/teaching/philosophy-of-language/games/heider-focal-colors",
    blurb:
      "Rosch Heider's challenge to Brown & Lenneberg. Pick best examples of basic colour names, name 12 chips (focal, internominal, boundary), then recognise a subset from an 80-chip array — testing whether codability drives memory or some colours are simply more distinctive.",
  },
  {
    title: "Gilbert, Krull & Malone (1990)",
    subtitle: "Unbelieving the Unbelievable",
    slug: "gilbert-unbelieving",
    href: "/teaching/philosophy-of-language/games/gilbert-unbelieving",
    blurb:
      "A replication of Study 1: learn an invented Hopi vocabulary, get interrupted by an occasional tone, then take the identification test. The diagnostic asymmetry — false propositions misidentified as true under interruption — is what Spinoza predicts and Descartes does not. (From the Speech Attacks readings.)",
  },
  {
    title: "Hansen & Liao (2026)",
    subtitle: "Measuring Conceptual Inflation",
    slug: "conceptual-inflation",
    href: "/teaching/philosophy-of-language/games/conceptual-inflation",
    blurb:
      "A classroom replication of Study 1 on the meaning of 'racist'. Rate the extension and intensity of 'racist', its degree-modified forms, related vocabulary, and a set of thin moral terms — then compare your live audience's pattern with the published representative-sample results.",
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
                {e.isStatic ? (
                  <a
                    href={e.href}
                    className="text-stone-500 text-sm hover:text-stone-800 transition-colors whitespace-nowrap"
                  >
                    {e.cta ?? "Start experiment →"}
                  </a>
                ) : (
                  <Link
                    href={e.href ?? `/teaching/experiments/${e.slug}`}
                    className="text-stone-500 text-sm hover:text-stone-800 transition-colors whitespace-nowrap"
                  >
                    {e.cta ?? "Start experiment →"}
                  </Link>
                )}
              </div>
              <p className="text-stone-600 text-sm leading-relaxed mt-3">
                {e.blurb}
              </p>
              {e.slug === "chain" && (
                <Link
                  href="/teaching/experiments/chain/host"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor host console &rarr;
                </Link>
              )}
              {e.slug === "knobe-side-effect" && (
                <Link
                  href="/teaching/experiments/knobe-side-effect/admin"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor results dashboard &rarr;
                </Link>
              )}
              {e.slug === "zollman" && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  <a
                    href="/teaching/games/zollman/dashboard_original.html"
                    className="text-stone-400 text-xs hover:text-stone-700 transition-colors inline-block"
                  >
                    Original-model dashboard &rarr;
                  </a>
                  <a
                    href="/teaching/games/zollman/sycophant_vs_advocate.html"
                    className="text-stone-400 text-xs hover:text-stone-700 transition-colors inline-block"
                  >
                    Sycophant vs. devil&rsquo;s advocate &rarr;
                  </a>
                </div>
              )}
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
