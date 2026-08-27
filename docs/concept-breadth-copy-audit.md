# Concept-breadth experiment — copy for Nat's hand-audit

Everything below is **my copy** (Claude, 2026-08-27), quoted in full with its location.
The vignettes, ladder instructions, question text, and the six response labels are
**verbatim from the authors' supplements and are not listed here** — they live in
`src/app/teaching/experiments/concept-breadth/stimuli.ts` under comments marking them
verbatim; audit them only against the sources if you want to check my transcription
(sources: Tse & Haslam 2023 Additional file 1 = `12888_2023_5152_MOESM1_ESM.docx`;
McGrath & Haslam 2020 S1 = `Harm_Concept_Breadth_Scale_pone.0237732.s001.pdf`, both in
`~/Library/CloudStorage/Dropbox/XPhiRacist/_texts/STOP Using Individual Words!/Haslam et al. Concept Creep/Experimental studies/`).

Flagged claims that need your eyes most are marked **⚠**.

---

## 1. Participant intro — `Experiment.tsx:240–262`

> **Where do the concepts stop?**
>
> You will read short descriptions of people and situations and make a series of quick
> judgments about them — fifteen in all, taking three or four minutes. There are no right
> or wrong answers. We are interested in your personal opinions: how *you* define or think
> about two very common concepts.
>
> Your answers are recorded anonymously — no name, no login, nothing that identifies you.
> At the end you will see what the study is about, your own scores, and how they compare
> with everyone who has answered before you.

(The "no right or wrong answers / personal opinions" sentence deliberately echoes both
instruments' own instructions.)

## 2. Part 2 break page — `Experiment.tsx:304–312`

> **Ten short scenarios**
>
> The following descriptions may or may not be considered examples of a traumatic event.
> Based on the information you are given, please rate whether you agree that what happened
> to the person named in the scenario was traumatic. *(verbatim HCBS instruction — kept
> here so you see it in context)*
>
> Each scenario appears on its own page, in a random order. Rate each one on a six-point
> scale from "strongly disagree" to "strongly agree". *(mine)*

## 3. Trauma rating prompt — `Experiment.tsx:357`

> What happened to the person named in the scenario was traumatic.

**⚠ Near-verbatim adaptation, not verbatim**: the HCBS instruction is "…rate whether you
agree that what happened to the person named in the scenario was traumatic"; I recast it
as a declarative statement above the agree/disagree buttons (the Qualtrics-style pattern
the CB-H uses: "This person has a mental disorder."). Check you're happy with that move.

## 4. Debrief — `Experiment.tsx:445–530`

> **What you just took part in**
>
> Psychologists led by Nick Haslam have argued that harm-related concepts like *trauma*
> and *mental disorder* have expanded their meanings over recent decades — a process they
> call **concept creep**. The two tasks you just did are the instruments his team built to
> measure how broad *your* versions of those concepts are, in the two directions they
> distinguish.
>
> Part 1 measured **vertical breadth**: all five descriptions were the same condition —
> depression — graded from most to least severe, and your score is how far down the
> severity ladder you kept saying "mental disorder". Part 2 measured **horizontal
> breadth**: ten qualitatively different situations, from events that would satisfy a
> psychiatric manual's definition of a traumatic stressor to ordinary losses and setbacks,
> and your score is how many kinds of thing you counted as traumatic, and how strongly.

**⚠** "events that would satisfy a psychiatric manual's definition of a traumatic
stressor" — this is a Criterion-A gesture; check it against your
`~/Claude/Concept Creep/dsm_criterion_a_audit.md` (e.g. Kate's is *learning of* an armed
mugging of a partner — that one does qualify under DSM-5 A3, but the sentence implies a
clean core-to-periphery gradient).

Score panels (template text; `Experiment.tsx:469–480`):

> **Part 1 · Vertical — the depression ladder** — Your score: *N* of 5 rungs. In the
> authors' US sample (N = 502), the average respondent said Yes to 3.29 of these five
> descriptions, and 53% said Yes to the second-mildest one on its own. Your concept is
> broader than about *P*% of the people who have taken this before you.
>
> **Part 2 · Horizontal — the trauma scenarios** — Your score: *N* of 60 (average *x.x*
> per scenario). In the authors' US sample (N = 301), the average rating was 4.16 per
> scenario on the same six-point scale. Your concept is broader than about *P*% of the
> people who have taken this before you.

**⚠ Anchor sourcing** (documented in `stimuli.ts:119–136`): 3.29 (SD 1.57) = MDD item
mean, Tse & Haslam 2023 Study 1 Table 2; 53% = CB-V-S MDD item (M 0.53) Table 3 — my
reading is that the CB-V-S item is the rung-4 (second-mildest) vignette, which I verified
by matching the vignette texts in the supplement; 4.16 (SD 0.73) = HCBS trauma subscale
mean, McGrath & Haslam 2020 Study 2 Table 3 (Study 3: 4.11–4.12).

Error state (`Experiment.tsx:484–487`):

> Your response could not be saved to the running totals. Everything above still works,
> but the comparison figures will not include you.

> **Where the materials come from**
>
> The depression ladder is one of seven such ladders in Tse and Haslam's Concept
> Breadth–Vertical scale; the full instrument runs the same five-step design for bipolar
> disorder, anxiety, OCD, and more. The trauma scenarios are the complete Trauma subscale
> of McGrath and Haslam's Harm Concept Breadth Scale, which has parallel subscales for
> bullying, prejudice, and mental disorder. Both are reproduced verbatim from the
> authors' published materials (CC-BY). Their studies found that people who score broadly
> on one harm concept tend to score broadly on the others — and that broader
> mental-disorder concepts predict self-diagnosis, over and above how much distress a
> person reports.

**⚠** Two empirical claims here: (a) cross-concept consistency of breadth — McGrath et
al. 2019 / the HCBS general factor; (b) self-diagnosis over-and-above distress — Tse &
Haslam 2024 (SSM–Mental Health). Both match your prior reading notes, but they're mine to
state and yours to bless.

> One design note: this demonstration presents one ladder and one subscale, back to back,
> with the scenarios in random order — scores here are indicative, not a validated
> administration of either full instrument.

Then the two citations with DOIs (Tse & Haslam 2023; McGrath & Haslam 2020).

## 5. Chart labels — `stimuli.ts:64–115` and `LiveView.tsx:57`

My short handles for the trauma vignettes (used in charts/tables only, participants never
see them): *Fay — mother's surgery · Jerry — uncle's death · Kate — partner mugged ·
Colin — laid off · Grace — parents separated · Danny — family moved · Vicky — ostracized
by a friend · Teresa — harassing boss · Erin — child-protection work · Walter — refugee
counselor.*

Ladder rung labels (live view): "Rung 1 — most severe" … "Rung 5 — least severe".

## 6. Live projector view — `LiveView.tsx` (headers ~150–165, glosses ~230–240 and ~330–340)

> Where do the concepts stop? · Live · session *X* · *N* responses in the room ·
> *N* everyone, ever
>
> **Part 1 · Vertical — the depression ladder** — Percent saying "mental disorder", by
> severity rung. … Every rung is the same condition, graded down in severity. Room in
> red, everyone in gray; the black tick is the published 53% for rung 4 alone (N = 502).
> Mean depth: room *x.xx*, everyone *x.xx*, published 3.29 of 5.
>
> **Part 2 · Horizontal — the trauma scenarios** — Mean agreement that the event was
> traumatic (1–6). … Ten qualitatively different events, ordered by how traumatic
> everyone has rated them. Room in green, everyone in gray; the faint tick is the
> published per-scenario mean of 4.16 (N = 301).

## 7. Admin dashboard notes — `AdminDashboard.tsx` (~330 and ~415)

> Mean depth *x.xx* (SD *x.xx*) of 5; published 3.29 (SD 1.57), Tse & Haslam (2023)
> Study 1, N = 502. The tick on rung 4 is the published 53% for that vignette presented
> alone. Non-monotonic patterns (a Yes below a No): *k* of *n*.
>
> Rows ordered by this dataset's means. Total score mean *x* (SD *x*) of 60; the
> published per-item subscale mean is 4.16 (SD 0.73), McGrath & Haslam (2020) Study 2,
> N = 301 — equivalent to 42 of 60. Per-item published means were not reported.

## 8. Index cards — `src/app/teaching/experiments/page.tsx:22–29` and ux-phi `src/lib/experiments-index.ts` (same text)

> **McGrath & Haslam (2020) · Tse & Haslam (2023)** — *The Harm Concept Breadth Scale &
> the Concept Breadth Scales*
>
> How broad are your concepts of trauma and mental disorder? The instruments Haslam's
> team built to measure 'concept creep', verbatim: five descriptions of depression graded
> from most to least severe — how far down the ladder do you keep saying 'mental
> disorder'? — then ten scenarios, from an armed mugging to a teenager moving to a new
> town, rated for whether what happened was traumatic. You get your own breadth scores
> against the published US samples and against everyone who has answered before you.

**⚠** "from an armed mugging" — Kate *learns of* the mugging by phone; the vignette's
event-to-the-named-person is hearing the call. Shorthand may be fine for a card, your call.

**⚠** Subtitle "the Concept Breadth Scales" — the paper's own name for the pair is
"concept breadth scales" (CB-V/CB-H); check you like it as a title next to the HCBS.

## 9. Page metadata — `page.tsx`, `live/page.tsx`, `admin/page.tsx`

> "Where Do the Concepts Stop? — a two-part concept-breadth experiment" / "Take the
> instruments Haslam's team uses to measure concept creep: the depression severity ladder
> (Tse & Haslam 2023) and the trauma subscale of the Harm Concept Breadth Scale (McGrath
> & Haslam 2020)."
