export type PrincipleId =
  | "max-floor"
  | "max-average"
  | "max-average-floor"
  | "max-average-range";

export type Principle = {
  id: PrincipleId;
  short: string;
  long: string;
  blurb: string;
};

export const PRINCIPLES: Principle[] = [
  {
    id: "max-floor",
    short: "Maximize the floor",
    long: "Maximize the floor (Rawls's difference principle)",
    blurb:
      "Choose the distribution whose lowest-income class is the highest. Protect the worst-off above all.",
  },
  {
    id: "max-average",
    short: "Maximize the average",
    long: "Maximize the average income",
    blurb:
      "Choose the distribution with the highest average income, regardless of how it is spread.",
  },
  {
    id: "max-average-floor",
    short: "Maximize the average with a floor constraint",
    long: "Maximize the average with a floor constraint",
    blurb:
      "Choose the distribution with the highest average income among those whose lowest-income class is at or above some agreed-upon minimum.",
  },
  {
    id: "max-average-range",
    short: "Maximize the average with a range constraint",
    long: "Maximize the average with a range constraint",
    blurb:
      "Choose the distribution with the highest average income among those whose gap between richest and poorest class is at or below some agreed-upon maximum.",
  },
];

export type ClassLabel =
  | "High"
  | "Medium high"
  | "Medium"
  | "Medium low"
  | "Low";

export const CLASS_LABELS: ClassLabel[] = [
  "High",
  "Medium high",
  "Medium",
  "Medium low",
  "Low",
];

export type Distribution = {
  id: string;
  incomes: Record<ClassLabel, number>;
};

export type Situation = {
  id: string;
  label: string;
  distributions: Distribution[];
};

// Table A from Frohlich, Oppenheimer & Eavey (1987), p. 613.
export const SITUATION_A: Situation = {
  id: "A",
  label: "Situation A",
  distributions: [
    {
      id: "1",
      incomes: {
        High: 28000,
        "Medium high": 25000,
        Medium: 20000,
        "Medium low": 15000,
        Low: 12000,
      },
    },
    {
      id: "2",
      incomes: {
        High: 35000,
        "Medium high": 30000,
        Medium: 25000,
        "Medium low": 15000,
        Low: 10000,
      },
    },
    {
      id: "3",
      incomes: {
        High: 30000,
        "Medium high": 29000,
        Medium: 28000,
        "Medium low": 27000,
        Low: 6000,
      },
    },
    {
      id: "4",
      incomes: {
        High: 25000,
        "Medium high": 22000,
        Medium: 19000,
        "Medium low": 16000,
        Low: 13000,
      },
    },
  ],
};

// A larger candidate set for the group-decision phase. The chosen principle +
// constraint narrows this set; we then pick the best-conforming distribution.
export const GROUP_DISTRIBUTIONS: Distribution[] = [
  ...SITUATION_A.distributions,
  {
    id: "5",
    incomes: {
      High: 40000,
      "Medium high": 30000,
      Medium: 22000,
      "Medium low": 14000,
      Low: 8000,
    },
  },
  {
    id: "6",
    incomes: {
      High: 26000,
      "Medium high": 24000,
      Medium: 21000,
      "Medium low": 18000,
      Low: 15000,
    },
  },
  {
    id: "7",
    incomes: {
      High: 32000,
      "Medium high": 28000,
      Medium: 24000,
      "Medium low": 20000,
      Low: 11000,
    },
  },
  {
    id: "8",
    incomes: {
      High: 45000,
      "Medium high": 32000,
      Medium: 20000,
      "Medium low": 12000,
      Low: 5000,
    },
  },
];

export function average(d: Distribution): number {
  return (
    CLASS_LABELS.reduce((s, c) => s + d.incomes[c], 0) / CLASS_LABELS.length
  );
}
export function floor(d: Distribution): number {
  return Math.min(...CLASS_LABELS.map((c) => d.incomes[c]));
}
export function ceiling(d: Distribution): number {
  return Math.max(...CLASS_LABELS.map((c) => d.incomes[c]));
}
export function range(d: Distribution): number {
  return ceiling(d) - floor(d);
}

export type Choice = {
  principle: PrincipleId;
  // for constraint-based principles
  constraint?: number;
};

// Given a principle + optional constraint, pick the best-conforming
// distribution. Returns null if nothing qualifies.
export function selectDistribution(
  pool: Distribution[],
  choice: Choice,
): Distribution | null {
  switch (choice.principle) {
    case "max-floor":
      return pool.reduce((b, d) => (floor(d) > floor(b) ? d : b), pool[0]);
    case "max-average":
      return pool.reduce((b, d) => (average(d) > average(b) ? d : b), pool[0]);
    case "max-average-floor": {
      const c = choice.constraint ?? 0;
      const eligible = pool.filter((d) => floor(d) >= c);
      if (eligible.length === 0) return null;
      return eligible.reduce(
        (b, d) => (average(d) > average(b) ? d : b),
        eligible[0],
      );
    }
    case "max-average-range": {
      const c = choice.constraint ?? Infinity;
      const eligible = pool.filter((d) => range(d) <= c);
      if (eligible.length === 0) return null;
      return eligible.reduce(
        (b, d) => (average(d) > average(b) ? d : b),
        eligible[0],
      );
    }
  }
}

export function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

// $0.10 per $1,000 of annual income (Frohlich et al. p. 613).
export function payoutForIncome(income: number): number {
  return Math.round((income / 1000) * 10) / 100;
}

// --- Personas for the group-discussion phase ---

export type PersonaId = "devon" | "maya" | "sam" | "riley";

export type Persona = {
  id: PersonaId;
  name: string;
  oneLine: string;
  systemPrompt: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "devon",
    name: "Devon",
    oneLine: "worried about ending up at the bottom; pulls toward the floor.",
    systemPrompt: `You are Devon, a participant in a five-person group deliberating which principle of distributive justice should govern your payouts. You don't know which income class you'll be randomly assigned to.

You are anxious about ending up at the bottom. You instinctively favor maximizing the floor (Rawls's difference principle) — the worst-off position should be as high as possible. You'd rather give up a higher average than risk a brutal low.

You are not a philosophy student. You don't cite Rawls by name. You talk like an ordinary person reasoning out loud. You push back when others say things that sound callous about the worst-off. You can be moved by good arguments, especially if someone proposes a floor that's high enough that you stop worrying.

Keep responses to 1–3 sentences. Speak by default. If the user asks you a direct question, addresses you by name, or says something that pushes against your view, you MUST respond. Only output [QUIET] if your previous turn made exactly the same point and the conversation has clearly moved on without engaging you.`,
  },
  {
    id: "maya",
    name: "Maya",
    oneLine: "expected-value thinker; pulls toward maximizing the average.",
    systemPrompt: `You are Maya, a participant in a five-person group deliberating which principle of distributive justice should govern your payouts. You don't know which class you'll be randomly assigned to.

You think in expected value. With five classes drawn at random, each is 20% likely. Maximizing the average maximizes everyone's expected payoff. You find it strange to obsess over the worst case when the worst case is one outcome out of five. You're skeptical of constraints that throw away expected money to insure against unlikely losses.

You're direct, sometimes blunt, but not hostile. You're willing to accept a low floor constraint if it makes others comfortable, but you push back on high constraints that cost a lot of average.

Keep responses to 1–3 sentences. Speak by default. If the user asks you a direct question, addresses you by name, or says something that pushes against your view, you MUST respond. Only output [QUIET] if your previous turn made exactly the same point and the conversation has clearly moved on without engaging you.`,
  },
  {
    id: "sam",
    name: "Sam",
    oneLine: "looks for workable compromises; gravitates to a floor constraint.",
    systemPrompt: `You are Sam, a participant in a five-person group deliberating which principle of distributive justice should govern your payouts. You don't know which class you'll be randomly assigned to.

You're a compromiser. You find pure floor-maximizing too cautious and pure average-maximizing too callous. You're drawn to maximizing the average with a floor constraint — set a minimum we can all live with, then maximize from there. You're good at proposing concrete numbers and asking the group whether they could live with them.

You facilitate. You restate other people's points to check you've understood. You float specific floor values to test the group.

Keep responses to 1–3 sentences. Speak by default — as the facilitator you usually have something to say. If the user asks you a direct question, addresses you by name, or there's tension to mediate, you MUST respond. Only output [QUIET] if your previous turn made exactly the same point and the conversation has clearly moved on without engaging you.`,
  },
  {
    id: "riley",
    name: "Riley",
    oneLine: "cares about inequality itself; drawn to capping the range.",
    systemPrompt: `You are Riley, a participant in a five-person group deliberating which principle of distributive justice should govern your payouts. You don't know which class you'll be randomly assigned to.

You care about inequality as such, not just about the floor. A society where the top earns five times the bottom feels wrong to you even if the bottom is comfortable. You're drawn to maximizing the average with a range constraint — cap how far apart the classes can be.

You raise the inequality concern when it's missing. You're willing to consider a floor constraint as second-best if the group really won't budge.

Keep responses to 1–3 sentences. Speak by default. If the user asks you a direct question, addresses you by name, or says something that pushes against your view, you MUST respond. Only output [QUIET] if your previous turn made exactly the same point and the conversation has clearly moved on without engaging you.`,
  },
];

export function tableContext(situation: Situation): string {
  const lines: string[] = [];
  lines.push(`Situation ${situation.id}:`);
  lines.push("Class       | " + situation.distributions.map((d) => "D" + d.id).join(" | "));
  for (const c of CLASS_LABELS) {
    lines.push(
      c.padEnd(11) +
        " | " +
        situation.distributions
          .map((d) => fmtMoney(d.incomes[c]).padStart(7))
          .join(" | "),
    );
  }
  lines.push(
    "Average    | " +
      situation.distributions.map((d) => fmtMoney(average(d)).padStart(7)).join(" | "),
  );
  lines.push(
    "Floor       | " +
      situation.distributions.map((d) => fmtMoney(floor(d)).padStart(7)).join(" | "),
  );
  lines.push(
    "Range      | " +
      situation.distributions.map((d) => fmtMoney(range(d)).padStart(7)).join(" | "),
  );
  return lines.join("\n");
}
