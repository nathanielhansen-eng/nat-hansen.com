# Turing tell loop: prior art scan (2026-09-30)

One pass of web searches, not exhaustive. Purpose: check whether a classroom
loop where judges' highlighted tells patch the next bot generation already exists.

## Closest relatives

| Thing | What it does | What it lacks vs. the tell loop |
|---|---|---|
| Human or Not? (AI21, 2023) — https://arxiv.org/pdf/2305.20010 | 2-min chats, guess human/bot; >1.5M players. 68% correct overall; 73% vs humans, 60% vs bots. Player strategies catalogued (typos, personal questions, current events). | No tell capture, no feedback into the bot. |
| Jones & Bergen 2023, "Does GPT-4 pass the Turing test?" — https://arxiv.org/abs/2310.20216 | Public turingtest.live; judges' stated reasons coded (linguistic style 35%, socioemotional 27%). Persona prompts. Experience with LLMs and number of games correlate with accuracy. | Prompt revision by the researchers, by hand; reasons free-text, not span-level. |
| Jones & Bergen 2025, "LLMs Pass the Turing Test" — https://arxiv.org/abs/2503.23674 | Three-party test; GPT-4.5 + persona judged human 73%. Persona prompt is what matters. | Fixed prompts, no loop. |
| SpotTheBot (wehnsdaefflae) — https://github.com/wehnsdaefflae/SpotTheBot | Community texts vs AI versions; players tag suspicious words/phrases with labels ("generic", "irrelevant"). | Static texts, not dialogue; tags published, not fed back into generation. Closest UI precedent for span highlighting. |
| Spot The Bot (Deriu et al., EMNLP 2020) — https://aclanthology.org/2020.emnlp-main.326 | Dialogue-system evaluation: annotators judge per entity whether it is a bot, used to rank chatbots. | Evaluation framework, no loop. |
| Aarhus "The Turing Test" classroom activity — https://educate.au.dk/en/activities/the-turing-test | Students answer course questions; class judges student vs chatbot answers; teacher notes findings. | Written answers, no dialogue; findings discussed, not patched in. |
| Bot or Not (Illingworth) — https://samillingworth.itch.io/bot-or-not | Ten quotes, guess human/AI. | Solo, no loop. |
| Bot Buster (Northeastern) — https://news.northeastern.edu/2025/03/04/can-you-identify-ai | Card game; humans imitate AI, judge finds the real one. | Inverted design; no loop. |
| Adversarial humanizers, e.g. https://arxiv.org/pdf/2506.07001 | Optimise text against an automated detector. | Detector is a model, which is the Goodhart failure we're designing around. |

## Gap

Not found: a loop where human judges' span-level tells are distilled into the next
bot generation, run live in a classroom, with detection rate tracked per generation.
The parts exist separately (span tagging: SpotTheBot; coded judge reasons: Jones &
Bergen; classroom judging: Aarhus). The closed human-in-the-loop curve looks new.

Useful for design: Jones & Bergen's finding that judges get better with practice
means a within-class curve mixes two learners (bot and class). Counter: compare
each generation against a frozen Gen 0 control witness in the same round.
