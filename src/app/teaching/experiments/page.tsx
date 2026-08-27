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
    title: "Reuter & Brun (2022)",
    subtitle: "Empirical Studies on Truth and the Project of Re-engineering Truth",
    slug: "reuter-truth",
    blurb:
      "Is 'true' ambiguous? A three-part replication: read a story where a speaker's answer fits everything they believe but not the facts, then one where it fits the facts but not their beliefs, and say whether each answer was true. A third part runs the paper's checks on whether 'true' really just meant truthful. Reuter & Brun found responses split close to 50/50 — evidence that everyday 'true' has both a correspondence and a coherence sense.",
  },
  {
    title: "McGrath & Haslam (2020) · Tse & Haslam (2023)",
    subtitle: "The Harm Concept Breadth Scale & the Concept Breadth Scales",
    slug: "concept-breadth",
    blurb:
      "How broad are your concepts of trauma and mental disorder? The instruments Haslam's team built to measure 'concept creep', verbatim: five descriptions of depression graded from most to least severe — how far down the ladder do you keep saying 'mental disorder'? — then ten scenarios, from an armed mugging to a teenager moving to a new town, rated for whether what happened was traumatic. You get your own breadth scores against the published US samples and against everyone who has answered before you.",
  },
  {
    title: "Knobe (2003)",
    subtitle: "Intentional Action and Side Effects in Ordinary Language",
    slug: "knobe-side-effect",
    blurb:
      "The side-effect effect — the most-cited result in experimental philosophy. Read one vignette, assigned at random, and say whether a chairman who is indifferent to the environment harmed (or helped) it intentionally. The two versions are matched on foresight, indifference and causal structure, and differ only in whether the side effect is bad or good; Knobe found 82% vs 23%. Both of his studies are included, and class results are compiled live against the published figures.",
  },
  {
    title: "Machery (2008)",
    subtitle: "The Folk Concept of Intentional Action",
    slug: "machery-tradeoff",
    blurb:
      "A non-moral test of the side-effect effect. Read one randomly assigned smoothie-shop vignette and say whether Joe intentionally paid a dollar more (a cost) or intentionally got a free commemorative cup (a bonus) — then rate whether the outcome was blameworthy, praiseworthy, or neutral. Machery found 95% vs 45% 'intentional' with both outcomes judged morally neutral, evidence that cost-benefit reasoning, not morality, drives the asymmetry. Class results compiled live against the published figures.",
  },
  {
    title: "Pettit & Knobe (2009)",
    subtitle: "The Pervasive Impact of Moral Judgment",
    slug: "pettit-knobe-decided",
    blurb:
      "Does the moral asymmetry reach beyond 'intentionally'? Read one randomly assigned version of the chairman case and rate, 1–7, whether he 'decided' to help or harm the environment. Pettit & Knobe found stronger agreement that he 'decided' to do it in the harm version (4.6 vs 2.7) — the same asymmetry for an ordinary mental-state word, evidence that moral judgment is a pervasive input to folk psychology. Class results compiled live against the published figures.",
  },
  {
    title: "Sripada (2010)",
    subtitle: "The Deep Self and Asymmetries in Intentional Action",
    slug: "sripada-deepself",
    blurb:
      "The badness of an outcome, or its fit with who the agent is? Read one randomly assigned, morally neutral rifle-contest vignette — one where the winner has no real stake, one where winning fulfils a lifelong dream — and rate whether the hit was intentional. Sripada found people call the outcome intentional far more when it concords with the agent's settled values, independent of moral valence. Class results compiled live against the published figures.",
  },
  {
    title: "Uttich & Lombrozo (2010)",
    subtitle: "Norms Inform Mental State Ascriptions",
    slug: "uttich-lombrozo-norms",
    blurb:
      "Moral badness, or norm-breaking as such? Read one randomly assigned Gizmo-company vignette where a foreseen side effect either conforms to or violates a norm — sometimes a moral norm, sometimes a mere colour convention — and rate, 1–7, how apt it is to call it intentional. Uttich & Lombrozo found norm-violating outcomes rated more intentional even for conventional norms, evidence that norm violation, not moral valence, carries the effect. Class results compiled live against the published figures.",
  },
  {
    title: "Nadelhoffer (2006)",
    subtitle: "Bad Acts, Blameworthy Agents, and Intentional Actions",
    slug: "nadelhoffer-blame",
    blurb:
      "Does blame bias our judgments of what a person did on purpose? Read one randomly assigned version of a fatal car-swerve case — a fleeing thief killing a pursuing police officer, or an innocent driver killing an armed carjacker — and say whether the death was brought about knowingly, intentionally, and how much blame it deserves. A built-in lesson in experimental design: the two versions differ in more than one way at once. Class results compiled live against the published figures.",
  },
  {
    title: "Phillips, Luguri & Knobe (2015)",
    subtitle: "Unifying Morality's Influence: The Relevance of Alternative Possibilities",
    slug: "phillips-alternatives",
    blurb:
      "Why does morality change judgments that aren't about morality? Read one randomly assigned version of the chairman case, then rate both whether he acted intentionally and whether a bystander's alternative was relevant. The claim: morality shapes which alternative possibilities strike us as relevant, and that is what moves the intentionality verdict — unifying the side-effect effect with parallel effects on causation and freedom. Your class's two measures are compiled live against the published figures.",
  },
  {
    title: "Lindauer & Southwood (2021)",
    subtitle: "How to Cancel the Knobe Effect",
    slug: "lindauer-cancelling",
    blurb:
      "Can the side-effect effect be switched off? Read one randomly assigned version of the chairman case and rate your agreement that he did NOT do it intentionally — except one group can also register strong condemnation in the same breath (\"…but he knowingly harmed it and should be blamed\"). When that option is present, the asymmetry collapses: the survey evidence its authors read as support for the pragmatic account. Compiled live against the published figures.",
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
    title: "Inspired by Allen, Quinlan, Andow & Fischer (2021)",
    subtitle: "What Is It Like to Be Colour-Blind?",
    slug: "allen-colour-blind",
    blurb:
      "What do you think a red/green colour-blind person sees when they look at something red? Choose between four rival philosophical accounts, name six patches run through a standard simulation of colour blindness, and predict which colours would look new through 'colour-correcting' glasses. Allen et al. interviewed 17 colour-blind participants: all of them named the red patch red, 12 of 17 saw no new colours through the glasses, and nobody saw red or green for the first time — every candidate new colour was a pink or a purple. An original classroom design built on the paper's question, not a replication of its interview method. Class results compiled live against the published findings.",
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
    title: "Winawer et al. (2007)",
    subtitle: "Russian Blues and Colour Discrimination",
    slug: "winawer-russian-blues",
    blurb:
      "Does the vocabulary you have change how fast you can tell two colours apart? A speeded matching task on twenty blues spanning the Russian siniy/goluboy border, which English does not mark: pick which of two squares matches the one above, sometimes while rehearsing an eight-digit number, sometimes while holding a grid pattern in mind. Russian speakers were 124 ms faster across the border than within it — and verbal, but not spatial, interference wiped that out. The class runs the paper's English-speaker arm, where the predicted result is a flat line.",
  },
  {
    title: "Roberson, Davies & Davidoff (2000)",
    subtitle: "Color Categories Are Not Universal: The Triad Task",
    slug: "roberson-triads",
    blurb:
      "The double-dissociation test. See three color chips at a time and click the two that look most alike — one set spans the English green–blue boundary, the other spans the boundary Berinmo (five basic color terms, Papua New Guinea) draws between nol and wor, straight through English green. Roberson et al. found each group's similarity judgments snapped to its own language's boundary and sat at chance on the other's: English speakers 23.0 vs 14.38 of 32, Berinmo 20.75 vs 25.38. The class runs the English arm against the published Berinmo numbers.",
  },
  {
    title: "Berlin & Kay (1969)",
    subtitle: "Basic Color Terms: Mapping the Munsell Array",
    slug: "berlin-kay",
    blurb:
      "The procedure that launched the universals debate, on the 330-chip World Color Survey Munsell array. List the basic color words of a language you speak, mark every chip each word covers, and pick its single best example. Berlin & Kay found that boundaries wander but foci cluster in the same regions across twenty languages; Roberson, Davies & Davidoff's Berinmo work pushed back. The instructor dashboard lays the class's charts on top of each other, focal points and term regions compared across whatever languages are in the room.",
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
              {e.slug === "reuter-truth" && (
                <Link
                  href="/teaching/experiments/reuter-truth/admin"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor results dashboard &rarr;
                </Link>
              )}
              {e.slug === "roberson-triads" && (
                <Link
                  href="/teaching/experiments/roberson-triads/admin"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor results dashboard &rarr;
                </Link>
              )}
              {e.slug === "berlin-kay" && (
                <Link
                  href="/teaching/experiments/berlin-kay/admin"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor results dashboard &rarr;
                </Link>
              )}
              {e.slug === "winawer-russian-blues" && (
                <Link
                  href="/teaching/experiments/winawer-russian-blues/admin"
                  className="text-stone-400 text-xs hover:text-stone-700 transition-colors mt-3 inline-block"
                >
                  Instructor results dashboard &rarr;
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
              {e.slug === "allen-colour-blind" && (
                <Link
                  href="/teaching/experiments/allen-colour-blind/admin"
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
