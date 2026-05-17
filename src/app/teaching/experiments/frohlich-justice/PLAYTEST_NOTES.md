# Frohlich experiment — playtest notes

## 2026-05-17 — playtest with K.

### Comprehension test
- **Confusing that one distribution can satisfy multiple principles.** K. expected the 4 candidate distributions to map 1:1 onto the 4 principles. Instead D4 was the answer for both "maximize the floor" and "max average w/ range constraint." Reads like a logic puzzle rather than a comprehension check.
- **Distributions in the comprehension test don't match the participant's ranking from the earlier exercise.** Hard to hold the ranking in working memory when the test reshuffles the options.
- This mirrors the original Frohlich/Oppenheimer/Eavey design, but needs framing — without it, it feels like a faulty build.

### Veil of ignorance
- K. felt the intro didn't really explain the veil of ignorance before testing on it.
- Confirmed: the original paper deliberately doesn't explain it (didn't want to prime participants). But we should decide whether to keep that or add scaffolding — likely the latter for a teaching context.

### Second ranking
- "Re-rank the four" didn't preserve the participant's original ranking order — appeared in default order. K. couldn't remember her own ranking to compare against.
- **Fix:** initialize the second ranking with the participant's first ranking (so "re-rank" actually means re-rank, with the option to change).

### Discussion phase
- Discussion references distributions (D7 etc.) that the participant hasn't seen in this build. Feature of the original, but currently wonky here — needs fixing.
- By the time K. was in discussion, she couldn't remember the options anymore. **Add reminders / persistent display of the principles + distributions during discussion.**
- Prior bug (historical, already known): in an earlier build, participants would agree to a principle in discussion, then reverse themselves on the vote and confabulate. Watch for regressions.

### Voting
- K. wanted a choice that wasn't available: essentially "max average with floor AND range constraint" — i.e. combining principles Rawls disallows combining. Or voting on D7 directly.
- Nat's take: keep this realistic — people *will* want to combine principles and pick a known distribution. Don't artificially restrict.

## TODO
- [x] Make second-ranking screen initialize with participant's first ranking (final ranking now inherits rank2 too)
- [x] Add framing for comprehension test (principles can overlap on distributions) — added heads-up paragraph to Comprehension stage AND italic note on TableWalkthrough explaining why D4 appears twice
- [x] Decide on veil-of-ignorance scaffolding — added explicit explanation to Intro (with a note that the original deliberately omitted it). Teaching > replication for this build.
- [x] Show principles + distribution table persistently during discussion (collapsible `ReferencePanel` on Discussion + VoteSetup)
- [x] Fix D7-etc. references in discussion — full GROUP_DISTRIBUTIONS pool now visible via ReferencePanel; DiscussionIntro flags the larger pool upfront
- [x] ~~Allow combined-principle / direct-distribution votes~~ — decided against; sticking to the four canonical principles preserves the comparison with Frohlich et al.
