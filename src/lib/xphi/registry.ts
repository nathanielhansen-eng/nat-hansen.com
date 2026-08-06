// Single source of truth for the classroom experiments: feeds the
// /teaching/experiments index cards and the class-summary allowlist.
// Order here is display order (curated, not chronological).

export type ExperimentDef = {
  title: string;
  subtitle: string;
  slug: string; // React key and the default link
  href?: string; // overrides the default /teaching/experiments/<slug> link
  blurb: string;
  cta?: string; // defaults to "Start experiment →"
  isStatic?: boolean; // static HTML served from /public — plain <a>, not next/link
  /** Instructor results dashboard, rendered as a small link on the card. */
  adminHref?: string;
  /** Additional card links (host consoles, extra dashboards). `isStatic`
   *  entries render as plain <a>. */
  extraLinks?: { href: string; label: string; isStatic?: boolean }[];
  /** Served by /api/experiments/class-summary. Blob-backed experiments
   *  only; adding a slug here exposes its aggregate (never free text) to
   *  the ux-phi course dashboard. */
  classSummary?: boolean;
};

export const EXPERIMENTS: ExperimentDef[] = [
  {
    title: "Zollman (2010)",
    subtitle: "The Epistemic Benefit of Transient Diversity",
    slug: "zollman",
    href: "/teaching/games/zollman/tutorial.html",
    isStatic: true,
    cta: "Open the tutorial →",
    blurb:
      "An interactive build-up of Zollman's bandit-network model of scientific communities — why more communication can mean less truth — one assumption at a time. Then two dashboards: the original model, and an extension in which each scientist consults a sycophantic or a devil's-advocate LLM, showing that whether an AI helps a community reach the truth turns on the shape of its network. Runs entirely in the browser.",
    extraLinks: [
      { href: "/teaching/games/zollman/dashboard_original.html", label: "Original-model dashboard →", isStatic: true },
      { href: "/teaching/games/zollman/sycophant_vs_advocate.html", label: "Sycophant vs. devil’s advocate →", isStatic: true },
    ],
  },
  {
    title: "Reuter & Brun (2022)",
    subtitle: "Empirical Studies on Truth and the Project of Re-engineering Truth",
    slug: "reuter-truth",
    blurb:
      "Is 'true' ambiguous? A three-part replication: read a story where a speaker's answer fits everything they believe but not the facts, then one where it fits the facts but not their beliefs, and say whether each answer was true. A third part runs the paper's checks on whether 'true' really just meant truthful. Reuter & Brun found responses split close to 50/50 — evidence that everyday 'true' has both a correspondence and a coherence sense.",
    adminHref: "/teaching/experiments/reuter-truth/admin",
    classSummary: true,
  },
  {
    title: "Knobe (2003)",
    subtitle: "Intentional Action and Side Effects in Ordinary Language",
    slug: "knobe-side-effect",
    blurb:
      "The side-effect effect — the most-cited result in experimental philosophy. Read one vignette, assigned at random, and say whether a chairman who is indifferent to the environment harmed (or helped) it intentionally. The two versions are matched on foresight, indifference and causal structure, and differ only in whether the side effect is bad or good; Knobe found 82% vs 23%. Both of his studies are included, and class results are compiled live against the published figures.",
    adminHref: "/teaching/experiments/knobe-side-effect/admin",
    classSummary: true,
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
    extraLinks: [{ href: "/teaching/experiments/chain/host", label: "Instructor host console →" }],
  },
  {
    title: "Brown & Lenneberg (1954)",
    subtitle: "Codability and Colour Memory",
    slug: "brown-lenneberg",
    href: "/teaching/philosophy-of-language/games/brown-lenneberg",
    blurb:
      "A classroom replication of the codability-and-memory study: name 12 colours, then try to recognise a subset after a 30-second arithmetic-filled delay. Anonymous results are compiled live for discussion.",
    classSummary: true,
  },
  {
    title: "Heider — Focal Colours (1972)",
    subtitle: "Universals in Colour Naming and Memory",
    slug: "heider-focal-colors",
    href: "/teaching/philosophy-of-language/games/heider-focal-colors",
    blurb:
      "Rosch Heider's challenge to Brown & Lenneberg. Pick best examples of basic colour names, name 12 chips (focal, internominal, boundary), then recognise a subset from an 80-chip array — testing whether codability drives memory or some colours are simply more distinctive.",
    classSummary: true,
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

/** Slugs served by /api/experiments/class-summary (blob experiments only;
 *  `chain` is special-cased there and reads Redis). */
export const CLASS_SUMMARY_SLUGS = new Set(
  EXPERIMENTS.filter((e) => e.classSummary).map((e) => e.slug)
);
