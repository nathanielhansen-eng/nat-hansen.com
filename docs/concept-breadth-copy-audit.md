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

## Round 2 (2026-08-27, after Nat's edits): applied, with these repairs

Your edits are now implemented in the source. Where I touched your wording:

1. **"Applying conceptss" → "Applying concepts"** (typo).
2. **Percentile sentence — substantive.** You wrote "broader than about *P*% of the people
   **in that study**", but the code computed the percentile from this site's visitor pool,
   which would have made the sentence false. Implemented your wording honestly instead: the
   percentile is now a **normal approximation from the published mean and SD** (ladder:
   Φ((score − 3.29)/1.57); trauma: Φ((per-item mean − 4.16)/0.73)). "About" is carrying the
   approximation (both distributions are bounded/discrete). The debrief no longer touches
   the visitor pool at all. Veto if you'd rather drop the sentence than approximate.
3. **Grammar repairs, flagged for your re-check:**
   - "how far down the severity scale you were willing to describe as a 'mental disorder'"
     → "…willing to describe **the case** as a 'mental disorder'" (missing object).
   - "how many of the ten different situations … **were you** willing to count" →
     "…**you were** willing to count" (inverted question syntax inside a declarative).
   - Card: "How far down the scale will you say is an example of 'mental disorder'?" →
     "How far down the scale, **would you say**, is an example of 'mental disorder'?"
   - Card: "what your **your** own breadth scores" → "what your own breadth scores";
     "compared with the published US samples and **against** everyone" → "…and **with**
     everyone".
4. **Harmonizations of what looked like incomplete sweeps — undo any you didn't intend:**
   - Live view: "Mean depth: **room**" → "**this group**" (you'd changed the other "room").
   - Live view axis labels: "Rung 1…" → "**Degree 1…**" to match your "degree of severity"
     / "degree 4" edits on the same screen. (The **admin** dashboard still says "rung" —
     you left section 7 untouched, so I did too.)
   - Titles: live/admin page titles and the admin H1 now match "How far do concepts
     extend?". The participant page title is also "How far do concepts extend? — …" (your
     §9 edit) while its on-page H1 is "Applying concepts" (your §1 edit) — kept both as
     written.
5. *(Resolved in round 3 — see below.)*
6. Your other changes resolved two round-1 flags: the Criterion-A gesture is gone from the
   debrief, and "from **hearing about** an armed mugging" fixes the Kate shorthand.

## Round 3 (2026-08-27): group-vs-published only

Per Nat: comparisons are the CURRENT GROUP (one session id) against the PUBLISHED results,
nowhere an all-time visitor pool — cross-group reveals (the Edinburgh/UCL move) happen by
switching sessions on the admin dashboard. Implemented: the live view now shows only this
group's bars against the published ticks (no gray "everyone" ghosts, no "everyone" counter);
the trauma rows are ordered by this group's own means; the summary endpoint serves one
session and requires it; the card clause "and with everyone who has answered before you"
is trimmed on both sites. This also resolves round-2 item 5.

---

## Round 4 (2026-08-27): the two-pass "severe" design — NEW COPY FOR AUDIT

Per Nat: everyone answers everything twice, once as published (bare) and once with "severe"
inserted, **pass order randomized per person**; front card re-labeled "Based on…". The severe
stimuli are one-word insertions, marked ADAPTED in `stimuli.ts` (CC-BY permits adaptation;
labeled as modified in the debrief). All copy below is new or changed this round — the
audited copy from rounds 1–3 is otherwise untouched.

**Adapted stimuli (minimal pairs, one word inserted):**
> Do any of these people described below have a **severe** mental disorder?
>
> …please rate whether you agree that what happened to the person named in the scenario was
> **severely** traumatic *(instruction, severe pass)*
>
> What happened to the person named in the scenario was **severely** traumatic. *(rating
> statement, severe pass; adverbial rather than nominal "a severe trauma" to hold the
> construction fixed — flag if you want the nominal instead)*

**Intro (changed lines only):**
> You will read short descriptions of people and situations and make a series of quick
> judgments about them, **in two rounds**. It should take no more than **ten** minutes to
> complete.

Eyebrow: "Concept breadth · Two rounds". Round eyebrows: "Round 1 of 2 · Part 1",
"Round 1 of 2 · Part 2 · Scenario x of 10", etc.

**Round-2 interstitial (all new):**
> **The same examples again**
>
> Round 2 shows you the same descriptions as round 1, but with questions that are slightly different.
> Read each question carefully before answering.

**Debrief — new third paragraph:**
>You responded to the same examples twice, but with slightly different prompts. One prompt was exactly as published, and the other was slightly modified, by adding the word **"severe"**. The
> comparisons with the published samples below use your answers to the unmodified questions.

**Debrief — new “modifier" panel (template):**
> **The effect of adding one degree modifier** — With "severe" in the question, you said Yes to *N* of 5 scenarios
> — your threshold moved *k* rung(s) up the severity scale. Your average "severely traumatic"
> rating was *x.x* per scenario, lower than your "traumatic" ratings by *y.y* points.
> *(Variants: "the same as without it" / "essentially unchanged" when deltas are zero; "down
> the severity scale" / "higher" for reversed movers.)*

**Debrief — materials paragraph, changed sentences:**
> The tasks you just did are **based on** the instruments Haslam's team built … The
> **unmodified** versions are reproduced verbatim from the authors' published materials
> (CC-BY); the **"severe" versions are our modifications of them, and are not part
> of the original experiments**. The **authors'** studies found that…

**Debrief — design note, changed:**
> …presents experimental probes **twice — once as published and once
> with "severe" inserted, in an order chosen at random for each person** — scores here are
> indicative, and not intended as a replication of either experiment.

**Live view — new banner (template):**
> The effect of adding one modifier: **X of N** moved their "mental disorder" threshold up the severity
> scale when the question said **"severe"**; mean "traumatic" ratings shifted **−y.y** points
> under "severely".

Chart subtitles now: "Percent saying 'mental disorder' (upper bar) vs 'severe mental
disorder' (lower bar), by degree of severity" / "Mean agreement: 'traumatic' (upper bar) vs
'severely traumatic' (lower bar), 1–6". Glosses name upper bar = as published (red/green),
lower bar = with "severe" (dark red/dark green); published anchors are labeled as answering
the unmodified questions.

**Admin — new shift panel note:**
> "Threshold up" = fewer Yes rungs with "severe" in the question. Δ rungs = mean
> (bare − severe) ladder score; Δ trauma = mean per-item (bare − severe) rating. Pass order
> was randomized per person — compare the two order rows to eyeball order effects.

**Cards (both sites) — title now "Based on McGrath & Haslam (2020) · Tse & Haslam (2023)";
blurb reworked:**
> How broad are your concepts of trauma and mental disorder? Based on two of the experimental probes Haslam's team built to measure 'concept creep’, plus a manipulation designed to test how our concepts shift when they appear in complex phrases. 

**Metadata description:**
> Based on two of the instruments Haslam's team uses to measure concept creep: the depression
> severity scale (Tse & Haslam 2023) and the trauma subscale of the Harm Concept Breadth
> Scale (McGrath & Haslam 2020) — each answered twice, once as published and once with
> 'severe' inserted.

**Non-copy notes:** the debrief's published anchors and percentile apply to the bare pass
only (the published samples answered unmodified questions — said explicitly in the debrief).
Your 2026-08-27 single-pass test record predates this schema and is skipped by all
dashboards. Sections 1–9 below are the rounds 1–3 record and do not reflect round 4 where
the two conflict.

---

## Round 5 (2026-08-27): Nat's Round-4 edits applied

All implemented verbatim (interstitial, debrief ¶3, "The effect of adding one degree
modifier" panel, "Haslam's team" in debrief ¶1, materials-paragraph rewording, design note
"experimental probes", live banner "The effect of adding one modifier", the new short card
blurb on both sites). One normalization: the curly apostrophe in the card's 'concept creep’
→ straight quote, matching the file's house style.

*(Flag resolved, Nat approved the minimal fix: the card blurb now reads "…how our
judgments shift when the target words appear in complex phrases.")*

---

## Round 6 (2026-08-28): Teresa renamed; response prompts enlarged

Per Nat (a speaker named Teresa will be at the conference): the t08 harassment vignette's
protagonist is renamed **Teresa → Paula** in both occurrences — the only deviation from
verbatim in the bare stimuli, documented at the item in `stimuli.ts` (Paula chosen by me;
swap freely, no data impact — the stored id stays `t08`; chart label now "Paula — harassing
boss"). The debrief's materials sentence now reads "…reproduced verbatim from the authors'
published materials (CC-BY), **except that one person has been renamed**; …".

Display: the two response prompts are now large and bold — the ladder question (23px/700,
ink) and the per-scenario trauma statement (21px/700, ink; it was 15px muted).

## Round 7 (2026-08-28, Nat): debrief wording tweaks

Score panel and modifier panel now count "*N* of 5 **scenarios**" (was "rungs"); debrief ¶1
opens "**The** tasks you just did…" (was "The two tasks"). Note the modifier panel still
says "your threshold moved *k* **rung(s)** up the severity scale" — that phrase describes
movement, not the count; flag if you want it changed too.

---

## 1. Participant intro — `Experiment.tsx:240–262`

> **Applying concepts**
>
> You will read fifteen short descriptions of people and situations and make a series of quick
> judgments about them. It should take no more than five minutes to complete. There are no right
> or wrong answers. We are interested in how *you* define or think
> about two concepts.
>
> Your answers are recorded anonymously.
> At the end you will see what the study is about, your judgments, and how they compare
> with the published version of these surveys.

(The "no right or wrong answers / personal opinions" sentence deliberately echoes both
instruments' own instructions.)

## 2. Part 2 break page — `Experiment.tsx:304–312`

> **Ten scenarios**
>
> The following descriptions may or may not be considered examples of a traumatic event.
> Based on the information you are given, please rate whether you agree that what happened
> to the person named in the scenario was traumatic. *(verbatim HCBS instruction — kept
> here so you see it in context)*
>
> Scenarios appear in random order. Rate each one on a six-point
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
> measure how broad experimental participants' versions of those concepts are, in the two dimensions they
> distinguish.
>
> Part 1 measured **vertical extent**: all five descriptions were examples of depression graded from most to least severe, and your score is how far down the
> severity scale you were willing to describe the case as a "mental disorder". Part 2 measured **horizontal
> extent**: how many of the ten different situations describing varieties of trauma and losses and setbacks you were willing to count as traumatic, and how strongly. 

*(Round-1 Criterion-A flag resolved: the "psychiatric manual" phrasing is gone from this paragraph.)*

Score panels (template text; `Experiment.tsx:469–480`):

> **Part 1 · Vertical — the depression scale** — Your score: *N* of 5 rungs. In the
> original US sample (N = 502), the average respondent said Yes to 3.29 of these five
> descriptions, and 53% said Yes to the second-mildest one. Your concept is
> broader than about *P*% of the people in that study.
>
> **Part 2 · Horizontal — the trauma scenarios** — Your score: *N* of 60 (average *x.x*
> per scenario). In the original US sample (N = 301), the average rating was 4.16 per
> scenario on the same six-point scale. Your concept is broader than about *P*% of the
> people in that study.

**⚠ Anchor sourcing** (documented in `stimuli.ts:119–136`): 3.29 (SD 1.57) = MDD item
mean, Tse & Haslam 2023 Study 1 Table 2; 53% = CB-V-S MDD item (M 0.53) Table 3 — my
reading is that the CB-V-S item is the rung-4 (second-mildest) vignette, which I verified
by matching the vignette texts in the supplement; 4.16 (SD 0.73) = HCBS trauma subscale
mean, McGrath & Haslam 2020 Study 2 Table 3 (Study 3: 4.11–4.12).

Error state (`Experiment.tsx:484–487`):

> Your response could not be saved to the running totals. Everything above still works,
> but the live class results will not include you.

*(Reworded in round 2: with the debrief percentile now computed from the published sample,
a failed save no longer affects any figure on the debrief page — only the live/admin views.)*

> **Where the materials come from**
>
> The depression scale is one of seven scales in Tse and Haslam's Concept
> Breadth–Vertical scale; the full experiment runs the same five-step design for bipolar
> disorder, anxiety, OCD, and more. The trauma scenarios are the complete Trauma subscale
> of McGrath and Haslam's Harm Concept Breadth Scale, which has parallel subscales for
> bullying, prejudice, and mental disorder. Both are reproduced verbatim from the
> authors' published materials (CC-BY). Their studies found that people who score broadly
> on one harm concept tend to score broadly on the others, and that broader
> mental-disorder concepts predict self-diagnosis.

**⚠** Two empirical claims here: (a) cross-concept consistency of breadth — McGrath et
al. 2019 / the HCBS general factor; (b) self-diagnosis over-and-above distress — Tse &
Haslam 2024 (SSM–Mental Health). Both match your prior reading notes, but they're mine to
state and yours to bless.

> One design note: this demonstration presents one ladder and one subscale, back to back,
> with the scenarios in random order — scores here are indicative, and not intended as a replication of either experiment.

Then the two citations with DOIs (Tse & Haslam 2023; McGrath & Haslam 2020).

## 5. Chart labels — `stimuli.ts:64–115` and `LiveView.tsx:57`

My short handles for the trauma vignettes (used in charts/tables only, participants never
see them): *Fay — mother's surgery · Jerry — uncle's death · Kate — partner mugged ·
Colin — laid off · Grace — parents separated · Danny — family moved · Vicky — ostracized
by a friend · Paula — harassing boss (renamed in round 6) · Erin — child-protection work · Walter — refugee
counselor.*

Ladder axis labels (live view): "Degree 1 — most severe" … "Degree 5 — least severe" (harmonized to your "degree" edits; admin dashboard still says "rung").

## 6. Live projector view — `LiveView.tsx` (headers ~150–165, glosses ~230–240 and ~330–340)

> How far do concepts extend? · Live · session *X* · *N* responses in this group
>
> **Part 1 · Vertical — the depression scale** — Percent saying "mental disorder", by degree
> of severity. … Every degree is supposed to be the same condition, in decreasing severity.
> This group represented in red; the black tick is the published result of 53% for degree 4
> alone (N = 502). Mean depth: this group *x.xx*, published 3.29 of 5.
>
> **Part 2 · Horizontal — the trauma scenarios** — Mean agreement that the event was
> traumatic (1–6). … Ten qualitatively different events, ordered by how traumatic this
> group rated them. This group in green; the faint tick is the published per-scenario mean
> of 4.16 (N = 301).

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
> How broad are your concepts of trauma and mental disorder? These are two of the instruments Haslam's
> team built to measure 'concept creep': five descriptions of depression graded
> from most to least severe. How far down the scale, would you say, is an example of 'mental
> disorder'? Then ten scenarios, from hearing about an armed mugging to a teenager moving to a new
> town, rated according to whether what happened was traumatic. You'll see what your own breadth scores are compared with
> the published US samples.

*(Round-1 mugging flag resolved by your "hearing about" edit.)*

**⚠** Subtitle "the Concept Breadth Scales" — the paper's own name for the pair is
"concept breadth scales" (CB-V/CB-H); check you like it as a title next to the HCBS.

## 9. Page metadata — `page.tsx`, `live/page.tsx`, `admin/page.tsx`

> “How far do concepts extend? — a two-part concept-breadth experiment" / “Respond to two of the
> instruments Haslam's team uses to measure concept creep: the depression severity scale
> (Tse & Haslam 2023) and the trauma subscale of the Harm Concept Breadth Scale (McGrath
> & Haslam 2020)."
