# Classroom Experiments Roadmap

**Updated 2026-08-06.** Supersedes `~/Claude/Projects in Progress/xphi-experiment-buildout/README.md`
(2026-07-25), whose Knobe handoff sections are done and committed (`1796da9`). The ranked study
lists below are carried forward from that document — **every DOI in it was resolved against the
Crossref API, not web search**, after a search-summarised retrieval came back with corrupted
citations. Keep that rule: new candidates get a Crossref-verified DOI before they enter this file.

---

## 1. The vision

A repository of dozens of runnable classic experiments — first for Nat's own classes, then as
instructor content on ux-phi. Experiments are an unusually good pedagogical instrument: students
are participants first and analysts second, the class's own data lands next to the published
figures, and every design compromise (demand characteristics, substitution heuristics, stimulus
matching) becomes teachable the moment it is felt from the inside.

End state: adding an experiment means writing **a stimuli/spec file plus a registry entry**, not
~1,500 lines; a ux-phi instructor attaches any experiment to a course week, students launch it
with a tag, and the class aggregate appears in the course dashboard automatically.

Two audiences, one build: `/teaching/experiments` stays the public, self-serve face; ux-phi
consumes the same data server-to-server via `/api/experiments/class-summary`.

---

## 2. What exists (2026-08-06)

| Experiment | Route | Paradigm | Class-summary |
|---|---|---|---|
| Knobe (2003) side-effect effect | `/teaching/experiments/knobe-side-effect` | between-subjects vignette, Likert + binary | ✅ |
| Reuter & Brun (2022) truth ambiguity | `/teaching/experiments/reuter-truth` | 3-part within-visit, counterbalanced vignettes + free text | ✅ |
| Frohlich et al. (1987) distributive justice | `/teaching/experiments/frohlich-justice` | solo playtest + simulated deliberation | — |
| Esper (1966) transmission chain | `/teaching/experiments/chain` | live multiplayer, Redis rooms | ✅ (special-cased) |
| Allen et al. (2021) colour blindness | `/teaching/experiments/allen-colour-blind` | between-subjects vignette + simulated-swatch naming + prediction | ✅ |
| Brown & Lenneberg (1954) codability | `/teaching/philosophy-of-language/games/brown-lenneberg` | multi-trial with delay | ✅ |
| Heider (1972) focal colours | `…/games/heider-focal-colors` | multi-trial with delay | ✅ |
| Gilbert et al. (1990) unbelieving | `…/games/gilbert-unbelieving` | interruption paradigm | — |
| Hansen & Liao (2026) conceptual inflation | `…/games/conceptual-inflation` | within-subjects battery | — |
| Zollman (2010) network epistemology | static tutorial + dashboards | agent-based model, no data collection | n/a |

Shared architecture (the "Knobe pattern", 7 files per experiment): server `page.tsx` with
`session`/`tag` search params → client phase-machine `Experiment.tsx` → POST route (hand-rolled
validation → private Vercel Blob at `<slug>/<session>/<id>.json`) → cookie-gated `submissions`
GET → `admin-login` POST → admin gate page → client `AdminDashboard.tsx` with in-file stats and
CSV export. Registration = one card in `/teaching/experiments/page.tsx` + slug/adapter in
`class-summary/route.ts`. Launch tags (`?tag=`) are stored opaque, forward-only, and free text
never leaves the instructor dashboard.

---

## 3. Before scaling: the refactor that makes "dozens" cheap

Six experiments now copy-paste the dashboard and blob plumbing (~450–800 lines each). Do this
once, on its own branch with its own review, **before** Tier A:

1. **`src/lib/xphi/stats.ts`** — lift `erfc` + `chiSquare2x2` from the Knobe dashboard (validated
   against Knobe's published χ² = 27.2); add the goodness-of-fit-vs-50% variant (now in
   `reuter-truth`), **Fisher's exact test** (class-sized cells routinely trip the
   expected-count-below-5 warning, and today the dashboard can only tell you to run it elsewhere),
   Cohen's *w*, Cramér's V.
2. **`src/lib/xphi/blob.ts`** — the validate → `put` and paginated `list`+`get` pairs, plus the
   `sanitizeSession`/`sanitizeTag` idioms, currently duplicated per experiment.
3. **`<VignetteStudy>`** — a component driven by a stimuli spec: conditions with random
   assignment, vignette segments with `{d: …}` diff-highlighting for the debrief, question types
   (Likert, binary, ternary, free text), per-question RTs, optional interstitials and
   counterbalancing, a debrief with paper-figure bars. Everything in Tier A becomes a data file.
4. **A data-driven registry** — one `src/lib/xphi/registry.ts` feeding the index page cards, the
   class-summary allowlist, and (for spec-driven studies) a **generic summary shape**
   (records + aggregate as condition × answer counts), so new experiments get the ux-phi
   dashboard card without a hand-written adapter.
5. **A generic admin core** — session picker, share-link builder, CSV, stats strip; per-experiment
   dashboards keep only their bespoke tables.

The bespoke experiments (chain, frohlich, gilbert, conceptual-inflation) don't have to migrate;
the point is that *new* builds stop paying the copy-paste tax.

---

## 4. Build queue

Ordering within tiers barely matters; pick to fit the week's teaching.

### Tier A — stimuli swaps on the (refactored) Knobe scaffold

Between-subjects, one or two fixed responses. Roughly a stimuli file each.

| Study | DOI | Note |
|---|---|---|
| Beebe & Buckwalter 2010 — epistemic side-effect effect | `10.1111/j.1468-0017.2010.01398.x` | **first** — same vignette family as Knobe, reads as a follow-up in class |
| Nichols & Knobe 2007 — abstract/concrete determinism | `10.1111/j.1468-0068.2007.00666.x` | |
| Nahmias et al. 2006 — Is Incompatibilism Intuitive? | `10.1111/j.1933-1592.2006.tb00603.x` | |
| Hitchcock & Knobe 2009 — cause and norm | `10.5840/jphil20091061128` | |
| Kneer & Machery 2019 — no luck for moral luck | `10.1016/j.cognition.2018.09.003` | |
| Strohminger & Nichols 2014 — essential moral self | `10.1016/j.cognition.2013.12.005` | |
| Buckwalter & Turri 2015 — ought implies can | `10.1371/journal.pone.0136589` | |
| Phillips, Misenheimer & Knobe 2011 — concept of happiness | `10.1177/1754073911402385` | |

### Tier B — one new capability each, with precedent in the existing builds

| Study | Needs | DOI |
|---|---|---|
| Weinberg, Nichols & Stich 2001 — epistemic intuitions | vignette battery (cf. conceptual-inflation) | `10.5840/philtopics2001291/217` |
| Starmans & Friedman 2012 — folk knowledge | vignette battery | `10.1016/j.cognition.2012.05.017` |
| Machery et al. 2004 — semantics, cross-cultural style | Gödel/Jonah, careful instructions | `10.1016/j.cognition.2003.10.003` |
| Swain et al. 2008 — Truetemp order effects | order randomisation + sequence logging | `10.1111/j.1933-1592.2007.00118.x` |
| Machery et al. 2017 — Gettier across cultures | battery + language variants | `10.1111/nous.12110` |
| Knobe & Prinz 2008 / Sytsma & Machery 2010 — consciousness attribution | within-subjects scales | `10.1007/s11097-007-9066-y` / `10.1007/s11098-009-9439-x` |
| Cushman, Young & Hauser 2006 — three principles of harm | dilemma set + justification free text | `10.1111/j.1467-9280.2006.01834.x` |
| Coleman & Kay 1981 — prototype semantics of "lie" | 8-story battery, 7-point scale; a Gorilla version already exists (Projects index #3) | verify via Crossref before building |
| Reuter & Sytsma 2020 — unfelt pain | vignette battery; natural pairing with reuter-truth | `10.1007/s11229-018-1770-3` |

Machery et al. 2004 appeared in **none** of the five surveyed syllabi despite launching the field
— the survey under-represents experimental philosophy of language, which is exactly this site's
comparative advantage. Weight phil-language builds accordingly.

### Zed's Illusion of Color class — requested 2026-08-18 (autumn 2026)

Two requests from Zed, alongside the Berkeley Three Dialogues sim. Both slot into the existing
colour cluster (brown-lenneberg, heider-focal-colors, winawer-russian-blues).

| Build | Source | Note |
|---|---|---|
| Roberson triads (Categorical Perception, Exp 4) | Roberson, Davies & Davidoff 2000, `10.1037/0096-3445.129.3.369` (Crossref-verified) | The double-dissociation centerpiece: 2×8 triads across the English green–blue boundary (7.5G→7.5B, all V5/C8, boundary 7.5BG) vs the Berinmo *nol–wor* boundary (5Y→5G, V5/C8); "which two look most alike?"; predicted = cross-boundary pair split. Class plays both sets; English speakers should show CP at green–blue and sit at chance on *nol–wor* — the class replicates one cell of the paper's 2×2 and the Berinmo published means fill in the rest. Roberson's Exps 2a–2c (recognition memory w/ response-bias control) are optional follow-ons on the B&L/Heider delay engine. Paper text extracted; PDF in `Modules/Colour 2017/Readings/`. |
| Interactive Munsell array — focal + boundary naming across languages | Berlin & Kay 1969 / WCS 330-chip array | The chart task Nat ran in earlier PP3LAN classes. Originals found in `Dropbox/Academic Work/Lazy Man/`: `colorchartgroupclean.jpeg` (hand-traced boundaries + R/O/Y/G/B/P labels), `ColorChartBengali.jpeg` and `colorchartportugeuse.jpeg` (focal chips), drawn over `munsellcolorchart.jpg`; they appear as figures in `PP3LAN Lecture Week 8 Day 1.tex`, which records the classroom procedure. No interactive version existed — the web build is new. Render the WCS array from published chip coordinates (WCS data archive has L\*a\*b\* per chip → sRGB); student picks a language, names each region's term, clicks focal chips, traces boundaries; admin/class view overlays focal choices and boundary lines across the languages spoken in the class, next to Berlin & Kay's published foci. Monitor-gamut caveat belongs on the debrief (Munsell chips ≠ sRGB swatches — itself a teaching point). |

### Tier C — new interaction machinery

- **Awad et al. 2018, Moral Machine** (`10.1038/s41586-018-0637-6`) — paired-comparison UI with
  sprite rendering.
- **McHugh et al. 2017, moral dumbfounding** (`10.1525/collabra.79`) — free text + adversarial
  follow-up probing; best LLM-interviewer candidate given the `book-chat` and
  `frohlich-justice` discussion patterns.
- **Francis et al. 2017** (`10.1038/s41598-017-13909-9`) — VR; only the 2D push-vs-switch
  contrast ports.
- Not browser-viable, stimuli only: Greene et al. 2001 (fMRI), Schwitzgebel et al. 2020 (real
  meat-purchasing behaviour).

### Chain-engine tasks (plug-in `ChainTaskModule`s, ~1 day each)

- Sentence telephone (serial reproduction of a sentence).
- Bartlett 1932, *Remembering* — "War of the Ghosts" retelling.
- Drawing ↔ description alternation.

### Original studies (the platform as instrument, not replication)

- **Allen et al. 2021, colour blindness** (`10.1111/mila.12370`) — BUILT, awaiting Nat's audit. The
  paper is qualitative (17 interviews, NCS print stimuli, EnChroma glasses), so it does not port;
  the build inverts it into a third-person study of what a mostly-sighted class *predicts* about
  colour-blind experience, and tests a claim the paper asserts but never measures (that the
  standard view is what "colour blindness" suggests to people). Spec:
  `docs/cold-experiments/allen-colour-blind-spec.md`, whose §7 is the open audit queue.
- Uptake and speech-act success (Projects index #4) — own design, needs an experiment page.
- Traditional texts vs. simulations RCT (Projects index #28) — ux-phi personas are the
  manipulation; the experiments framework supplies the measurement layer.

---

## 5. The ux-phi instructor layer

What exists: `GET /api/experiments/class-summary?experiment=<slug>&session=<id>` (optional
`EXPERIMENTS_SUMMARY_TOKEN` bearer gate; `?sessions=1` discovery mode; `?tag=` highlights a
student's own response), consumed by the ux-phi course dashboard's Experiments tab since
2026-08-06 (`e9fbe0c`).

To make experiments first-class instructor content at dozens-scale:

1. **Generic aggregates** (§3.4) so a new spec-driven experiment needs zero ux-phi-side code.
2. **An instructor catalog** on ux-phi: the experiment list with paradigm blurbs, "what your
   class will see", time-to-run, and the discussion payload (what the debrief teaches), sourced
   from the registry rather than hand-maintained.
3. **Course attachment**: instructor picks experiment + session id for a course week; ux-phi
   generates the tagged launch link; results land in the class dashboard next to the week's sims.
4. **Privacy contract, stated once**: anonymous by construction, tags opaque and account-bound on
   the ux-phi side only, free text visible to instructors only, aggregates never include
   demographics.

Sequencing: 1 belongs to the refactor; 2–3 are ux-phi-repo work and can trail the next two or
three experiment builds; 4 is a paragraph in both repos' docs once written.

---

## 6. Standing protocol (every build)

**Sourcing.** Crossref for DOIs, never search summaries. Stimuli verbatim from the primary text,
machine-diffed against the paper. Silently correct obvious typographical slips and note them in
the component header (Knobe's "seargent"); keep content-affecting errors verbatim with `[sic]`
(Reuter & Brun's misgendered Rolex anaphor). Buildability triage: between-subjects vignette with
binary/Likert DV ≈ a day; fMRI, corpus, and real-behaviour studies don't port.

**Honesty in the debrief.** Where the classroom design deviates from the paper (within-subjects
sequencing, question order), say so on the debrief and admin pages — it's a teaching point, not a
footnote. Debrief glosses of the literature are queued for Nat's hand-audit before class use.

**No demand characteristics.** The participant screen carries no condition colour and no hint of
the manipulation; colours and comparisons appear only after the response is locked in.

**React/Next discipline.** Random assignment and `Date.now()` live in click handlers, never in
render or `useState` initialisers (SSR would roll and discard them, and React 19's purity lint
rejects them); `searchParams`/`cookies()` are awaited; admin pages get `robots: noindex` and
`dynamic = "force-dynamic"`.

**Verification before "done".** Stats routines validated by reconstructing the paper's cells;
malformed payloads fired at the POST route; `npm run build` + lint clean; and after deploy,
**one real submission checked end-to-end in the dashboard** (the blob write is the only step a
local build can't prove).

---

## 7. Log

| Date | Event |
|---|---|
| 2026-06-28 | Chain engine + Esper task shipped (`02e795a`) |
| 2026-07-25 | Knobe (2003) built on loaner machine; syllabus survey + DOI lists compiled |
| 2026-07-31 | Knobe committed to main (`1796da9`) |
| 2026-08-06 | class-summary endpoint + launch tags (`e9fbe0c`); Reuter & Brun (2022) shipped (`d2ad3ef`, `7196709`); this roadmap |
| 2026-08-17 | Allen et al. (2021) colour blindness built on `exp/allen-colour-blind`; first *original* design in the cold-experiment scaffold, and the first `docs/cold-experiments/` spec committed |
