# Winawer et al. (2007), "Russian blues" — page-cited source spec

**Status: source spec complete; classroom adaptation decisions flagged for Nat's hand-audit (see §7).**

## 0. Citation

Winawer J, Witthoft N, Frank MC, Wu L, Wade AR, Boroditsky L (2007). "Russian blues
reveal effects of language on color discrimination." *Proceedings of the National Academy
of Sciences* 104(19): 7780–7785.

**DOI: `10.1073/pnas.0701644104`**

DOI resolved via the Crossref REST API (`api.crossref.org`), not from a web-search summary.
Crossref returns: title as above; container `Proceedings of the National Academy of
Sciences`; volume 104, issue 19, pages 7780-7785; published-print 2007-05-08; authors
Winawer Jonathan, Witthoft Nathan, Frank Michael C., Wu Lisa, Wade Alex R.,
Boroditsky Lera. All six author names and the page range match the PDF masthead.

Source PDF read for this spec: `Winawer.Russian Blues.pdf` (6 pp.), Dropbox/Teaching/
University of Reading/Modules/Colour 2017/Readings/. Page numbers below are the
*journal* page numbers printed on the PDF (7780–7785).

---

## 1. The claim, in the authors' words (p. 7780, abstract)

> "English and Russian color terms divide the color spectrum differently. Unlike English,
> Russian makes an obligatory distinction between lighter blues ('goluboy') and darker
> blues ('siniy'). We investigated whether this linguistic difference leads to differences
> in color discrimination. We tested English and Russian speakers in a speeded color
> discrimination task using blue stimuli that spanned the siniy/goluboy border. We found
> that Russian speakers were faster to discriminate two colors when they fell into
> different linguistic categories in Russian (one siniy and the other goluboy) than when
> they were from the same linguistic category (both siniy or both goluboy). Moreover, this
> category advantage was eliminated by a verbal, but not a spatial, dual task. These
> effects were stronger for difficult discriminations (i.e., when the colors were
> perceptually close) than for easy discriminations (i.e., when the colors were further
> apart). English speakers tested on the identical stimuli did not show a category
> advantage in any of the conditions."

The design rationale, p. 7780–7781: the task is *objective* ("subjects were asked to
provide the correct answer to an unambiguous question"), *simultaneous* ("all stimuli
involved in a perceptual decision ... were present on the screen simultaneously and
remained in full view until the subjects responded"), and *implicit* ("we used the implicit
measure of reaction time, a subtle aspect of behavior that subjects do not generally
modulate explicitly"). These three features are the reply to Pinker's critique of earlier
memory/similarity studies, quoted at length on p. 7780.

---

## 2. Participants (p. 7784, "Participants")

> "Twenty-six native Russian speakers (28.9 ± 10.2 years old, mean ± SEM) and 24 native
> English speakers (26.3 ± 9.2 years old) were recruited from the Boston area and tested
> at the Massachusetts Institute of Technology (MIT) (Cambridge, MA). The age of English
> acquisition for Russian speakers ranged from 7 to 21 years."

Exclusions (p. 7782, "Analysis"): "Subjects were excluded entirely from analysis if the
above criteria resulted in loss of 25% or more of the trials, leading to the exclusion of
three English and five Russian speakers." → analysed N = 21 Russian, 21 English
(consistent with the reported df of 20 in the within-group ANOVAs).

---

## 3. Stimuli (p. 7784, "Color Stimuli")

> "Twenty computer-simulated color chips were created for this study, ranging from goluboy
> or light blue to siniy or dark blue (Fig. 1). The Commission Internationale de
> l'Eclairage (CIE) Yxy coordinates ranged from 84, 0.214, 0.255 (stimulus 1) to 5.3,
> 0.154, 0.09 (stimulus 20). The stimuli differed primarily in the luminance axis (Y) and
> the y chromaticity axis, consistent with reports on Russian color categorization (e.g.,
> see ref. 1; for review, see refs. 2 and 27). The color squares were 2.5 cm per side, and
> subjects viewed the screen from 60 cm."

**Note: the paper gives only the two endpoints.** It does not publish the 18 intermediate
Yxy triples, nor the white-point luminance needed to convert Y (evidently cd/m², not
relative-to-100) into a displayable value. The intermediate stimuli and the sRGB rendering
are therefore a *reconstruction*; see §6.

### 3.1 Task (p. 7784, "Color Discrimination Task")

> "In each color discrimination trial, subjects were shown a triad of color squares. One of
> the colors presented on the bottom was physically identical to the top color square
> (Fig. 1). The task was to indicate which of the bottom squares matched the top square by
> pressing a key on the right or left side of the keyboard. The nonmatching/distracter
> color square was either very similar to the other two (two steps apart in our continuum
> of 20, a near-color comparison) or more different (four steps apart, a far-color
> comparison)."

Fig. 1 caption (p. 7781): "The 20 blue colors used in this study are shown at the top of
the figure. An example triad of color squares used in this study is shown at the bottom of
the figure. Subjects were instructed to pick which one of the two bottom squares matched
the color of the top square."

Instructions (p. 7784): "Subjects were instructed to make all judgments as quickly and
accurately as possible. All subjects received the same instructions in English. Testing
took place in a quiet, darkened room."

---

## 4. Design (p. 7784, "Materials and Design"; p. 7785, "The Interference Conditions")

> "Each subject completed one block of 136 color discrimination trials without any
> secondary task ('no interference'), one block while performing a secondary
> verbal-interference task, and one block while performing a control, spatial-interference
> task. The order of the blocks was varied randomly across subjects. After completing the
> color discrimination trials, subjects were tested in a separate color-naming task to
> determine their individual linguistic borders. Subjects were shown the 20 stimuli (twice
> each) in random order and asked to classify each color with a key press, either siniy vs.
> goluboy (for Russian speakers) or dark blue vs. light blue (for English speakers)."

**Factors** (p. 7782): distance (near color vs. far color) × interference (none vs. spatial
vs. verbal) × category (between vs. within). 2 × 3 × 2, all within-subject.

**Verbal interference** (p. 7785):

> "In verbal-interference blocks, subjects were given an eight-digit number series to
> rehearse during the color task. This series was presented for 3 sec, and subjects were
> instructed to rehearse it silently. Subjects rehearsed the number series while completing
> eight color discrimination trials; their recall was then tested by choosing between the
> original series and a foil which differed by one digit."

**Spatial interference** (p. 7785):

> "In spatial-interference blocks, subjects viewed a 4 × 4 square grid of which four random
> squares were shaded black. Subjects were instructed to remember the grid pattern by
> maintaining a picture of it in their mind until tested. As with the verbal-interference
> condition, a two-choice test was given after eight intervening color discrimination
> trials. The incorrect grid differed in the location of one shaded square."

**Interference difficulty was matched** (p. 7785): "The spatial- and verbal-interference
tasks were pretested for difficulty in the absence of a primary task and found to result in
equal accuracy (grids, 95 ± 1% correct; numbers, 96% ± 1% correct; two-tailed t (10) =
0.94; P = 0.35)."

**Counterbalancing** (p. 7785): "Each of the three blocks consisted of 136 color trials,
with 17 interference stimuli used in each of the two interference blocks. Each color
appeared equally often on the left and right and equally often as the match and the
distracter."

→ Original total: 3 × 136 = **408 color trials**, plus 40 color-naming trials, plus 34
interference probes.

---

## 5. Analysis and results

### 5.1 Boundary elicitation (p. 7781, "Boundaries")

> "To determine each subject's linguistic color boundary within the range of blues used in
> this work, we administered a brief color classification task at the end of the experiment
> (after the main color discrimination blocks). ... All subjects classified the lightest
> stimulus (stimulus 1 in Fig. 1) as goluboy or light blue and stimulus 20 as siniy or dark
> blue. Each subject's boundary was identified as the transition point in these
> classification responses. If the transition fell between two stimuli or was ambiguous,
> the slower reaction time was used to disambiguate the boundary, because colors closest to
> boundaries tend to be categorized more slowly in simple classification tasks (e.g., ref.
> 24). The locations of the goluboy/siniy boundary (Russian speakers) and the light blue/
> dark blue boundary (English speakers) were nearly identical: **8.7 ± 2.2 vs. 8.6 ± 2.5**,
> respectively (mean ± SD)."

This is a load-bearing result for the classroom adaptation: **English speakers drew
essentially the same boundary as Russian speakers.** The difference is not that English
speakers *cannot* draw it (p. 7783: "English speakers, of course, also can subdivide blue
stimuli into light and dark. In fact, English speakers as a group drew nearly the same
boundary as did the Russian speakers in our work. The critical difference in this case is
not that English speakers cannot distinguish between light and dark blues, but rather that
Russian speakers **cannot avoid** distinguishing them: they must do so to speak Russian in
a conventional manner.").

### 5.2 Trial classification and exclusions (p. 7781–7782, "Analysis")

> "Each subject's data were analyzed relative to their own linguistic boundary. Trials were
> classified as within-category if the test stimuli fell on the same side of that subject's
> boundary (e.g., both goluboy or both light blue) and were classified as cross-category if
> they fell on opposite sides of the boundary or if one of the two stimuli was the
> boundary. For each subject, the nine near-color and the nine far-color comparisons
> closest to that subject's boundary were included in the analysis. This ensured that the
> set of stimuli used was centered relative to each subject's category boundary.
>
> Additionally, trials were excluded if the response to the interference stimulus was
> incorrect during the interference blocks, if the response to the color task was
> incorrect, or if the reaction time for the color discrimination was >3 sec; 12% of trials
> were so excluded."

### 5.3 Table 1 (p. 7783) — mean RT in msec (SEM), all conditions

| | Russian near Between | Russian near Within | Russian far Between | Russian far Within | English near Between | English near Within | English far Between | English far Within |
|---|---|---|---|---|---|---|---|---|
| None | 1,164 (66) | 1,288 (77) | 998 (55) | 999 (55) | 900 (51) | 914 (52) | 758 (36) | 735 (32) |
| Spatial | 1,162 (58) | 1,270 (56) | 1,096 (64) | 1,096 (53) | 911 (41) | 922 (46) | 819 (37) | 835 (43) |
| Verbal | 1,325 (55) | 1,260 (50) | 1,146 (62) | 1,132 (50) | 952 (41) | 955 (46) | 831 (41) | 821 (35) |

("Between" = cross-category.)

### 5.4 Key inferential results

**Russian speakers, category × interference interaction** (p. 7782): "there was a category
advantage under both the no-interference and the spatial-interference conditions, but not
under the verbal interference condition (Fig. 2) [category × interference interaction; F
(2, 40) = 5.3; P = 0.009]. This effect was completely due to the near-color condition (Fig.
3), supported by a significant three-way interaction among category, interference, and
distance [F (2, 40) = 3.3; P = 0.049]."

**Russian speakers, near-color planned t tests** (p. 7782):

| Condition | cross | within | category advantage | t(20) | P |
|---|---|---|---|---|---|
| No interference | 1,164 | 1,288 | **+124 ms** | 2.59 | 0.0176 |
| Spatial interference | 1,162 | 1,270 | **+109 ms** | 2.18 | 0.041 |
| Verbal interference | 1,325 | 1,260 | **−64 ms** (trend to reversal) | 1.87 | 0.076 |

> "Moreover, the category advantage was significantly larger in no interference blocks than
> in verbal interference blocks [124 vs. −64 msec; t (20) = 2.93; P = 0.0082] and in
> spatial-interference blocks than in verbal-interference blocks [109 vs. −64 msec; t (20)
> = 3.23; P = 0.004]. No difference in category advantage was found between the spatial-
> and no-interference conditions [t (20) = 0.24; P = 0.81] nor between any conditions in
> the far color trials (P > 0.78)."

Footnote on the reversal (p. 7782): "There is in fact a trend toward a reversal of the
normal pattern under verbal interference such that cross-category trials are performed more
slowly than within-category trials. Although this is not a significant effect, it is
consistent with the reversal in category advantage under verbal interference reported in
another work (23) and may suggest an obligatory attempt to make a verbal distinction even
when a dual task interferes with such an attempt."

**English speakers** (p. 7783): "Unlike Russian speakers, English speakers did not show any
category advantage [**F (1, 20) = 0.150; P = 0.703**] nor any category × interference
interaction [**F (2, 40) = 0.422; P = 0.659**] (Fig. 2) ... The only significant effect in
this analysis was a main effect of interference, such that English speakers were fastest
with no interference and slowest with verbal interference [**1,113, 1,156, and 1,216 msec**
for no interference, spatial interference, and verbal interference, respectively; **F (2,
40) = 5.170; P = 0.010**]."

*(Auditor's note: these three English marginal means, 1,113/1,156/1,216, are larger than any
English cell in Table 1. They are consistent in ordering with Table 1 but not in level. See
§5.6.)*

**Cross-group comparison** (p. 7783): "In near-color trials, the difference in the category
advantage between no interference and verbal interference was significantly greater for
Russian than English speakers [189 vs. −15 msec, respectively; t (40) = 2.17; P = 0.036].
Likewise, the difference in category advantage between spatial interference and verbal
interference was significantly greater for Russian speakers than English speakers [173 vs.
−14 msec, respectively; t (40) = 2.142; P = 0.038]."

**Accuracy** (p. 7783): "accuracy was high (96.5 ± 2.1% and 95.7 ± 3.2% for English and
Russian speakers, respectively)." One unexpected accuracy result: for near colors under no
interference, Russian speakers were *more* accurate within-category than cross-category
(93% vs. 87%), i.e. a category *disadvantage* in accuracy; the authors argue at length
(p. 7783) that a speed/accuracy tradeoff cannot explain the RT pattern.

### 5.5 Conclusions (p. 7780 abstract; p. 7783 Discussion)

> "These results demonstrate that (i) categories in language affect performance on simple
> perceptual color tasks and (ii) the effect of language is online (and can be disrupted by
> verbal interference)."

p. 7784: "Our results suggest that linguistic representations normally meddle in even
surprisingly simple objective perceptual decisions."

### 5.6 ⚠ Discrepancy in the published text — FLAG FOR NAT

The "Detailed Analyses" paragraph on p. 7782 reads, **verbatim**:

> "For each group, there was a highly significant main effect of distance: in Russian
> speakers [926 vs. 1,245 msec, near color vs. far color; F (1, 20) = 267; P < 0.001] and
> English speakers [800 vs. 1,078 msec; F (1, 20) = 144.1; P < 0.001]. Additionally, a
> mixed-design ANOVA ... showed that Russian speakers were slower overall than English
> speakers [1,085 vs. 938 msec; F (1, 40) = 6.93; P = 0.012]."

This cannot be read consistently with Table 1 or with the immediately preceding sentence
("Subjects were much faster at far-color discriminations than near-color discriminations"):

- As labelled, Russian near = 926 and Russian far = 1,245, i.e. *far is slower* — the
  opposite of the sentence it is illustrating.
- Averaging Table 1 gives Russian near = 1,245, Russian far = 1,078, English near = 926,
  English far = 800. So the four numbers are right, but 1,078 and 926 are swapped between
  the two language groups.
- The reported overall means reproduce the *swapped* assignment exactly:
  mean(1,245, 926) = 1,085.5 ≈ "1,085" and mean(1,078, 800) = 939 ≈ "938". Computing from
  Table 1 instead gives Russian 1,161 and English 863.

So the paragraph appears to contain a transposition error, and the reported grand means
inherit it. **The direction of the effect is not in doubt** (near is slower than far; the
Russians are slower than the English) — only these four marginal figures are.

**Consequence for this build:** the student-facing debrief cites *only* the Table 1
near-color cell means and the planned t tests (§5.4), which are internally consistent, match
Fig. 3, and are the numbers the paper's argument actually rests on. It does not cite
1,085/938 or the distance marginals. Nat should confirm he is happy with that choice, and
may want to check the published erratum record.

---

## 6. Stimulus reconstruction — sRGB hex values

### 6.1 Method

The paper publishes only endpoints: stimulus 1 = Yxy (84, 0.214, 0.255); stimulus 20 = Yxy
(5.3, 0.154, 0.09). Reconstruction steps:

1. **Chromaticity:** linear interpolation of (x, y) across the 20 steps. Both endpoint
   chromaticities lie *inside* the sRGB gamut triangle, as does the whole interpolated line
   (max out-of-gamut excursion −0.006 in linear R at stimulus 20, i.e. sub-one-unit in
   8-bit; clamped).
2. **Luminance normalisation:** the published Y values are evidently cd/m² on the authors'
   CRT, not relative luminance (Y = 84 at chromaticity (0.214, 0.255) is far above what any
   sRGB display can produce — max relative luminance at that chromaticity is 0.489). The
   ramp was therefore scaled so that stimulus 1 sits exactly on the sRGB gamut boundary
   (relative Y = 0.4893), i.e. one paper-Y unit = 0.005824 relative luminance, implying a
   notional display white of ~172 paper-Y units. This preserves all 20 chromaticities
   exactly and preserves the *ratio* structure of the luminance ramp's endpoints.
3. **Luminance interpolation: linear in CIE L\***, not linear in Y. Justification: the
   paper's design requires the 2-step (near) and 4-step (far) comparisons to be roughly
   equally discriminable *along the whole continuum* — otherwise near comparisons at the
   light end would be invisible and the boundary-centring procedure would be incoherent.
   Linear-in-Y gives ΔL\* ≈ 1 per step at the light end and ≈ 5 at the dark end;
   linear-in-L\* gives a constant ΔL\* ≈ 2.90 per step. **Independent check:** the 20
   swatches are embedded in the PDF of Fig. 1 as individual 100×100 solid-colour images
   (CMYK-converted for print). Their sRGB channel values fall on a near-perfectly *linear*
   ramp (green channel 184→79 in even ~5.5 steps), which matches the linear-in-L\*
   reconstruction and is flatly inconsistent with linear-in-Y. The print swatches are not
   used directly because CMYK conversion crushes the dark end (stimulus 20 prints as
   `#184F8E`, a mid blue, rather than the dark saturated blue its Yxy coordinates specify).
4. XYZ → linear sRGB (D65, IEC 61966-2-1 matrix) → sRGB transfer function → 8-bit.

Resulting perceptual step sizes (CIE76 ΔE between the final quantised colours): near
(2-step) comparisons range 7.1–10.0 ΔE; far (4-step) comparisons range 14.5–19.2 ΔE. The
near/far ratio is ~1:1.9 throughout, and difficulty increases mildly toward the dark end.

### 6.2 The 20 stimuli

| # | Y (paper) | x | y | sRGB hex |
|---|---|---|---|---|
| 1 | 84.00 | 0.2140 | 0.2550 | `#4BC6FF` |
| 2 | 76.27 | 0.2108 | 0.2463 | `#46BCFB` |
| 3 | 69.02 | 0.2077 | 0.2376 | `#41B3F7` |
| 4 | 62.25 | 0.2045 | 0.2289 | `#3CAAF3` |
| 5 | 55.94 | 0.2014 | 0.2203 | `#37A1EE` |
| 6 | 50.07 | 0.1982 | 0.2116 | `#3298E9` |
| 7 | 44.63 | 0.1951 | 0.2029 | `#2C90E4` |
| 8 | 39.59 | 0.1919 | 0.1942 | `#2787DF` |
| 9 | 34.95 | 0.1887 | 0.1855 | `#227ED9` |
| 10 | 30.69 | 0.1856 | 0.1768 | `#1C76D4` |
| 11 | 26.79 | 0.1824 | 0.1682 | `#166DCE` |
| 12 | 23.23 | 0.1793 | 0.1595 | `#1065C7` |
| 13 | 20.01 | 0.1761 | 0.1508 | `#085DC1` |
| 14 | 17.09 | 0.1729 | 0.1421 | `#0154BA` |
| 15 | 14.48 | 0.1698 | 0.1334 | `#004CB4` |
| 16 | 12.14 | 0.1666 | 0.1247 | `#0044AD` |
| 17 | 10.07 | 0.1635 | 0.1161 | `#003CA5` |
| 18 | 8.25 | 0.1603 | 0.1074 | `#00349E` |
| 19 | 6.67 | 0.1572 | 0.0987 | `#002C96` |
| 20 | 5.30 | 0.1540 | 0.0900 | `#00248E` |

### 6.3 ⚠ Uncalibrated-display caveat — FLAG FOR NAT

Students run this on uncalibrated laptop and phone screens, in an uncontrolled room, at an
unknown viewing distance — not in the paper's "quiet, darkened room" at 60 cm with a 2.5 cm
square. Consequences, all stated in the debrief:

- Absolute ΔE between stimuli varies by display; a stimulus pair that is 8 ΔE on a
  calibrated sRGB monitor may be noticeably more or less discriminable elsewhere.
- Night-shift / true-tone / auto-brightness features shift the whole ramp.
- Wide-gamut (P3) displays will render these sRGB values slightly more saturated.
- Browser RT includes input-event latency and display refresh quantisation (~8–16 ms) that
  the paper's setup controlled better.

None of this biases the *within-subject* within-vs-cross contrast, which is the DV of
interest, because every participant's within and cross trials are drawn from the same
continuum on the same display. It does add noise, and it does make absolute RT levels
non-comparable to the paper's.

---

## 7. Classroom adaptation — DESIGN DECISIONS FOR NAT'S AUDIT

Every departure from the source paradigm is listed here.

### D1. Language group: run the English-control arm as-is. ⚠ AUDIT

Classroom participants are overwhelmingly English speakers without the siniy/goluboy
distinction. The build runs **the paper's blue continuum unchanged**, so the class occupies
the paper's *English speaker* cell.

Rationale: (a) it is a faithful replication of an arm the class can actually be, rather than
a new experiment; (b) the paper's own boundary result (§5.1) shows English speakers *do*
draw a light-blue/dark-blue boundary at almost exactly the Russian location, 8.6 vs 8.7, so
the within/cross classification is well-defined for English speakers — the claim is that
they don't *use* it online, not that they lack it; (c) the pedagogically interesting result
is precisely the contrast between the class's own (predicted) null and the published Russian
data; (d) there are still two positive effects the class should replicate — the large
near/far distance effect and the main effect of interference on English speakers
(1,113/1,156/1,216 ms, F(2,40) = 5.170, P = 0.010).

**Alternative not taken:** adding a blue/green continuum, where English *does* mark a
boundary. That is a different study (Witthoft, Winawer, Wu, Frank, Wade & Boroditsky 2003,
Proc. 25th Annual Meeting of the Cognitive Science Society — the paper's ref. 21, cited on
p. 7784 as having "shown [a verbal dual task] to selectively interfere with blue/green
discriminations among English speakers using the same triad presentations used here"). It
would roughly double the trial count and require a second reconstructed stimulus set with no
published coordinates at all. Flagged as the obvious follow-up if Nat wants a positive
classroom effect rather than a null.

### D2. Trial count: 72 color trials, down from 408. ⚠ AUDIT

3 blocks × 24 trials, vs. the paper's 3 × 136. Cells per block: 6 near-cross, 6 near-within,
6 far-cross, 6 far-within. The full 2 × 3 × 2 factorial is preserved; only cell *n* is cut.
Target completion time ≈ 4 minutes including the boundary task.

Justification for what was cut: the paper's 136 trials/block are needed to estimate a ~100 ms
effect *per subject*. The classroom DV is estimated *across* participants at the class level
(the instructor dashboard pools trials), so per-participant cell n can be small. What could
not be cut without destroying the design — all three interference levels, both distances,
both category types — was kept.

### D3. Spatial-interference control retained. ⚠ AUDIT (cost: ~1 extra minute)

The brief permitted dropping spatial interference. It was kept because without it a
slowdown under verbal interference is uninterpretable: spatial interference is exactly the
control that distinguishes "language is involved online" from "any dual task costs time."
Since it is the theoretical crux of the paper (and of the classroom discussion), 24 extra
trials seemed a good trade.

### D4. Interference probe parameters kept verbatim.

8-digit series, presented 3 s, silent rehearsal, 2AFC recall against a foil differing by one
digit; 4×4 grid with 4 shaded squares, 2AFC against a foil differing in one square's
location; probe every 8 color trials (so 3 probes per interference block, vs. the paper's
17). All exactly as p. 7785.

### D5. Boundary elicitation: 20 trials, one pass, not two. ⚠ AUDIT

The paper showed the 20 stimuli twice each (40 trials). The build shows each once, labelled
"lighter blue" / "darker blue". The boundary is the transition point in the responses. The
paper's RT-based tie-break for ambiguous transitions is *not* implemented; instead, if
responses are non-monotonic the build takes the midpoint of the longest run boundary and
records `boundaryAmbiguous: true` so the dashboard can report it. This halves the reliability
of the per-participant boundary estimate — flagged.

### D6. Trial construction is centred on the *nominal* boundary 8.5, but analysis uses the
participant's *own* boundary.

The paper classifies each trial relative to each subject's elicited boundary (§5.2), but the
boundary is elicited *after* the main blocks, so trials cannot be pre-balanced per
participant. The build therefore constructs a fixed, side- and role-balanced pair pool
centred on stimulus 8/9 (the published English group mean boundary, 8.6):

- near cross: {7,9}, {8,10}
- near within: {5,7}, {6,8}, {9,11}, {10,12}
- far cross: {5,9}, {6,10}, {7,11}, {8,12}
- far within: {3,7}, {4,8}, {9,13}, {10,14}

Every trial record stores the raw stimulus indices, so within/cross is *recomputed* at
analysis time against the participant's own elicited boundary, paper-faithfully. The
dashboard reports both the nominal-boundary and own-boundary classifications (a toggle).
Note this means a participant whose boundary lands far from 8.5 will contribute an
unbalanced set of within/cross trials — the same situation the paper handled by selecting
the nine boundary-nearest comparisons.

Counterbalancing achieved per 24-trial block, verified by enumerating the generator:

| Constraint | Status |
|---|---|
| Trials per block | 24 (6 per design cell) |
| Match on left vs right | 12 / 12 exactly, and 3 / 3 within every cell |
| Cross vs within (nominal boundary) | 6 / 6 at each distance |
| Distance (2-step vs 4-step) | exact by construction |
| Match side decorrelated from which pair member is the target | yes, in all four cells |
| ⚠ Each colour equally often match and distracter (p. 7785) | **not exact.** Drawing 6 trials from a 4-pair pool leaves stimuli 11 and 13 always in the distracter role, and stimuli 7/8 and 9/10 unbalanced by 2. Sides are exact; only the match/distracter role is affected. |

The residual role imbalance is stable across all three blocks and is symmetric across the
within-category pools on either side of the boundary, so it should not bias the
cross-vs-within contrast. Flagged rather than fixed because fixing it exactly would
require 8 or 12 trials per cell (96 or 144 trials total), which breaks the time budget.

### D6a. Sign convention, verified.

Category advantage = mean(within-category RT) − mean(cross-category RT), per Fig. 3's
caption (p. 7782): "Category advantage is calculated as the difference between the average
reaction time for within-category trials and that for cross-category trials." Positive =
faster across the boundary. Recomputing from Table 1 reproduces the paper's own published
deltas exactly: +124, +109, −64 for the Russian near-color cells, and 124 − (−64) = 189 for
the no-interference-minus-verbal contrast the paper reports as "189". The build uses this
convention in the debrief, the dashboard and the class-summary endpoint.

**One subtlety the dashboard exposes.** The paper's category advantage is the mean of
*per-subject* differences, not the difference of the *group* cell means; the two diverge
when subjects contribute unequal numbers of trials to each cell (which they will here,
since exclusions and each participant's own boundary vary). The dashboard therefore shows
both: the Cross and Within columns are pooled cell means over all kept trials, while the
Advantage column is the mean of per-participant differences with a one-sample t test — so
Advantage will not exactly equal Within minus Cross, by design. The paper shows the same
divergence: its English near-color cells give 14 − 3 = 11 ms by difference-of-means, but
the text reports −15 ms for the per-subject computation (p. 7783). Both are ≈ 0, which is
the actual claim.

### D7. Exclusion criteria implemented as published.

Trials dropped if the color response was incorrect, if the RT exceeded 3000 ms, or (in
interference blocks) if the interference probe covering that trial was answered incorrectly.
The dashboard reports the resulting exclusion rate for comparison with the paper's 12%. The
participant-level ≥25% exclusion rule is reported but not enforced, so that no student's data
silently vanishes.

### D8. Response mode.

Keyboard (F / J, mirroring the paper's "a key press on the right or left side of the
keyboard") with click/tap fallback for tablets. Fallback presses are recorded in the trial
record as `inputMode`, since touch latency differs systematically from key latency.

### D9. Prose glosses. ⚠ AUDIT

The intro text and the debrief text are the author's (Claude's) prose summaries of the paper.
Per the standing rule in this project, they need Nat's line-by-line check before class use.
The debrief quotes only the figures in §5.4 and the DOI in §0. Specific things to check:
the one-sentence gloss of what "goluboy"/"siniy" mean; the gloss of "the effect is online";
the framing of the class's expected null result as *informative* rather than as a failure;
and the claim that English speakers draw the same boundary they don't use.
