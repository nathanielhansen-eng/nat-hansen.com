/* ------------------------------------------------------------------ *
 * Stimuli for the concept-breadth experiment. Both instruments are
 * reproduced VERBATIM from the authors' own supplementary materials,
 * published under CC-BY licences — do not edit the vignette or
 * instruction strings.
 *
 * Part 1 (the severity ladder) is the major depressive disorder item
 * (VS02_MDD) of the Concept Breadth–Vertical scale (CB-V):
 *   Tse, J. S. Y., & Haslam, N. (2023). Individual differences in the
 *   expansiveness of mental disorder concepts: development and
 *   validation of concept breadth scales. BMC Psychiatry, 23, 718.
 *   doi:10.1186/s12888-023-05152-6 — Additional file 1, Appendix A.
 *
 * Part 2 is the Trauma subscale of the Harm Concept Breadth Scale:
 *   McGrath, M. J., & Haslam, N. (2020). Development and validation of
 *   the Harm Concept Breadth Scale: Assessing individual differences
 *   in harm inflation. PLoS ONE, 15(8), e0237732.
 *   doi:10.1371/journal.pone.0237732 — S1 Appendix.
 * ------------------------------------------------------------------ */

/** CB-V instruction text (Additional file 1, Appendix A), verbatim. */
export const LADDER_INSTRUCTIONS =
  "Please read the following descriptions about five people carefully from top to bottom and make a decision about each person.";

/** CB-V question text, verbatim. */
export const LADDER_QUESTION = "Do any of these people described below have a mental disorder?";

/* ------------------------------------------------------------------ *
 * ADAPTED (not verbatim): the "severe" variants. Each inserts exactly
 * one word into the corresponding original — the manipulation for the
 * two-pass design. CC-BY permits adaptation; these are OUR minimal-pair
 * modifications of the authors' items and are labeled as such in the
 * debrief. Everything else about the stimuli is held identical.
 * ------------------------------------------------------------------ */

/** ADAPTED from LADDER_QUESTION: "severe" inserted. */
export const LADDER_QUESTION_SEVERE =
  "Do any of these people described below have a severe mental disorder?";

/** The two pass variants. "bare" = the published instruments, verbatim. */
export type Variant = "bare" | "severe";
export type PassOrder = "bare-first" | "severe-first";

/**
 * VS02_MDD, verbatim, in the instrument's own order: most severe at the
 * top of the page, least severe at the bottom. Index 0 = rung 1 (most
 * severe) … index 4 = rung 5 (least severe).
 */
export const MDD_LADDER: string[] = [
  "This person has been feeling very sad, self-critical, and upset every day for the past year. They have lost a significant amount of weight and cannot fall asleep at night, so they feel very tired all the time. They are also completely unable to concentrate and think clearly, which has caused them to lose their job.",
  "This person has been feeling very sad, self-critical, and upset every day for the past two months. They have lost a lot of weight and cannot fall asleep at night, so they feel tired all the time. They are also unable to concentrate and think clearly, which has impaired their ability to work.",
  "This person has been feeling very sad, self-critical, and upset every day for the past month. They have lost some weight and cannot fall asleep at night, so they feel tired all the time. They are also unable to concentrate and think clearly, which has impacted their work performance.",
  "This person has been feeling very sad, self-critical, and upset every day for the past two weeks. They have lost some weight and cannot fall asleep at night, so they often feel very tired. They have trouble concentrating and thinking clearly, which has somewhat impacted their work performance.",
  "This person has been feeling very sad, self-critical, and upset most days for the past two weeks. They think they have lost some weight and cannot fall asleep easily at night, so they often feel tired. Sometimes, they have trouble concentrating and thinking clearly, but it does not affect their work.",
];

/** HCBS Trauma-subscale instruction text (S1 Appendix), verbatim. */
export const TRAUMA_INSTRUCTIONS =
  "The following descriptions may or may not be considered examples of a traumatic event. Based on the information you are given, please rate whether you agree that what happened to the person named in the scenario was traumatic";

/** ADAPTED from TRAUMA_INSTRUCTIONS: "severely" inserted. */
export const TRAUMA_INSTRUCTIONS_SEVERE =
  "The following descriptions may or may not be considered examples of a traumatic event. Based on the information you are given, please rate whether you agree that what happened to the person named in the scenario was severely traumatic";

/** The statement rated on each trauma page, per variant. The bare form
 * restates the HCBS instruction's embedded clause; the severe form is
 * the same with "severely" inserted (ADAPTED). Adverbial "severely
 * traumatic" rather than nominal "a severe trauma" keeps the minimal
 * pair: one word inserted, the construction unchanged. */
export const TRAUMA_STATEMENT: Record<Variant, string> = {
  bare: "What happened to the person named in the scenario was traumatic.",
  severe: "What happened to the person named in the scenario was severely traumatic.",
};

/** The HCBS response labels, verbatim (1–6). */
export const TRAUMA_SCALE_LABELS = [
  "Strongly disagree",
  "Moderately disagree",
  "Slightly disagree",
  "Slightly agree",
  "Moderately agree",
  "Strongly agree",
] as const;

export interface TraumaVignette {
  /** Stable id stored with every response; t01–t10 follow the S1 Appendix numbering. */
  id: string;
  /** Short chart handle (ours, not the authors'): protagonist + situation. */
  label: string;
  /** Verbatim vignette text. */
  text: string;
}

export const TRAUMA_VIGNETTES: TraumaVignette[] = [
  {
    id: "t01",
    label: "Fay — mother's surgery",
    text: "Fay's 82-year-old mother had to have heart surgery with a 60% survival rate. Fay was extremely anxious leading up to the surgery and fainted in the hospital lounge while waiting to hear the outcome of the surgery.",
  },
  {
    id: "t02",
    label: "Jerry — uncle's death",
    text: "Jerry's mother called to tell him that his 60-year-old uncle had suffered a stroke and passed away. He had always seemed fit and healthy to Jerry and they had only seen each other on the weekend, so it came as a huge shock.",
  },
  {
    id: "t03",
    label: "Kate — partner mugged",
    text: "Kate's partner called her from the police station to say he had been mugged at gunpoint. On the way to pick him up, Kate was shaking so much she had to pull the car over for a while.",
  },
  {
    id: "t04",
    label: "Colin — laid off",
    text: "Last month Colin was laid off from his job. When the manager told him, Colin felt like he'd been kicked in the stomach. Since then he has felt depressed and worthless and often gets angry with his wife.",
  },
  {
    id: "t05",
    label: "Grace — parents separated",
    text: "Grace is six years old. Last year, her parents separated, and her father moved out. Grace didn't cope well with the change and started wetting the bed and refusing to go to school.",
  },
  {
    id: "t06",
    label: "Danny — family moved",
    text: "Danny is fifteen years old. At the end of summer his father was offered a new job and the family moved interstate. Danny is finding it hard to make friends at his new school.",
  },
  {
    id: "t07",
    label: "Vicky — ostracized by a friend",
    text: "As PTA President, Vicky made a decision that her friend disagreed with. Since then, the friend pretends not to see Vicky whenever they bump into each other at school. She has also convinced other parents to stop inviting Vicky to community events and social gatherings.",
  },
  {
    id: "t08",
    label: "Teresa — harassing boss",
    text: "Teresa's boss often makes her feel uncomfortable. He sometimes massages her shoulders while she's working, and often compliments her on her clothes and body. Teresa dreads going to work, and even though it is a great job, she is thinking of leaving.",
  },
  {
    id: "t09",
    label: "Erin — child-protection work",
    text: "As a child protection worker, Erin has worked with many children who have been abused or neglected. After all she's seen and heard, she can't bring herself to go to church anymore and she no longer wants to bring children of her own into this world.",
  },
  {
    id: "t10",
    label: "Walter — refugee counselor",
    text: "As a counsellor working with refugees, Walter builds close professional relationships with many people who have survived war and torture. He often finds himself thinking of the horrors they describe, and has difficulty sleeping. When he does sleep, Walter is regularly awoken by nightmares.",
  },
];

export const TRAUMA_IDS = TRAUMA_VIGNETTES.map((v) => v.id);

/**
 * Published anchors for the debrief and dashboards.
 *  - mddDepth: mean Yes-count on this exact five-rung MDD ladder (0–5),
 *    Tse & Haslam (2023) Study 1, N = 502 US adults (Table 2: M = 3.29,
 *    SD = 1.57).
 *  - mddRung4Yes: proportion saying Yes to rung 4 alone — the CB-V-S
 *    presents that vignette by itself (Table 3: M = 0.53, N = 502).
 *  - traumaItemMean: HCBS Trauma-subscale mean per item on the 1–6
 *    scale, McGrath & Haslam (2020) Study 2, N = 301 US adults
 *    (M = 4.16, SD = 0.73); Study 3 (N = 341) found 4.11.
 */
export const PUBLISHED = {
  mddDepth: 3.29,
  mddDepthSd: 1.57,
  mddRung4Yes: 0.53,
  traumaItemMean: 4.16,
  traumaItemSd: 0.73,
} as const;

/* ---------------- shared submission shape ---------------- */

export interface TraumaResponse {
  id: string;
  /** 1–6 on the HCBS scale. */
  rating: number;
  /** 0-based position at which this vignette was shown to this participant
   * within its pass (trauma order re-randomized per pass). */
  position: number;
  rtMs: number;
}

/** One complete pass (ladder + trauma) under one variant. */
export interface PassData {
  /** Yes/No per ladder rung, index 0 = most severe. */
  ladderYes: boolean[];
  /** Count of Yes answers, 0–5. */
  ladderScore: number;
  /** Time from ladder shown to last ladder answer. */
  ladderRtMs: number;
  trauma: TraumaResponse[];
  /** Sum of the ten ratings, 10–60. */
  traumaScore: number;
}

export interface Submission {
  session: string;
  tag?: string;
  submittedAt: string;
  durationMs: number;
  /** Which variant this participant saw first (assigned at random). */
  passOrder: PassOrder;
  /** The published instruments, verbatim. */
  bare: PassData;
  /** The one-word "severe" modification. */
  severe: PassData;
}
