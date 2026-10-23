# Go On

**An AI that listens.**

**For thoughts still taking shape.**

## Short pitch

Go On gives unfinished thoughts room to unfold. Brief acknowledgments while you talk; a map when you say “Show me.” Your words stay intact, while their relationships change.

## Inspiration

I was still thinking when the answer arrived.

I would start telling an AI what was on my mind, and it would offer a solution to the first thing I said. Reading the answer, I would lose the next thought. Something useful had become an interruption.

I did not need a better answer yet. I needed somewhere to put thoughts that had not even become questions.

Go On starts with that need. What if an AI held back its answers, acknowledged briefly, and let me continue?

## What it does

Go On is an experience designed for Alexa+. It separates time to speak from time to see. You can wander, change your mind, or leave something unfinished. While listening, the assistant gives brief acknowledgments and the screen stays quiet. You decide when to say “Show me.”

Then the map unfolds. Scattered words gather by topic. Those groups loosen and regroup around possible shared roots: underlying situations that might connect several concerns. If there is an actionable starting point, one root comes forward with a small next step. The other thoughts remain.

In our synthetic example, job titles and project pricing begin in different topics. They meet under “I have not chosen how to describe my work.” Meanwhile, “I have not been drawing lately.” moves toward “I cannot say no, so there is no room left.” These are hypotheses to examine, not hidden truths the AI has discovered.

A transcript can leave the tangle intact. A summary can smooth away words that mattered. Go On keeps the original words available while changing how they sit together. The aim is to make room for another view of your own thinking.

## How we built it

The prototype uses Node.js, SQLite, and the MCP JavaScript SDK over Streamable HTTP. Separate tools receive thoughts and request a map. Capture saves the exact received text and timestamp, returning only receipt information. Interpretation runs asynchronously, apart from capture.

The implemented analysis path loads a root-reasoning Agent Skill as instructions for Amazon Bedrock. It asks what would need to change for each concern to ease, then groups shared conditions into roots. Structured validation checks the output shape and statement IDs. The map is an MCP App; selecting a root retrieves its connected originals.

The demonstrated experience is our own web simulator with 16 synthetic statements and handwritten, fixed analysis. It exercises real MCP communication and the running map interface. It makes no model calls. Our video treatment stages speech and acknowledgments to illustrate the intended interaction. Live Bedrock quality, speech recognition, and Alexa+/Echo behavior remain unverified.

## Challenges we ran into

The hardest design question was how to offer an interpretation without letting a polished explanation overwrite someone's thoughts. A topic is not necessarily a cause. We keep the originals accessible, allow statements to remain outside roots, and leave the reveal under the person's control.

Integration also exposed concrete browser issues: generated schema-validation code conflicted with strict Content Security Policy, and keyboard focus escaped a dialog inside the embedded App. Both were corrected and independently retested in the local browser.

## Accomplishments that we're proud of

We built a working local MCP App that makes the regrouping visible. Browser checks confirmed that the same 16 thought nodes remain through scatter, topics, roots, and focus. Root details expose the original statements; three unmatched statements stay represented. Keyboard navigation, reduced-motion behavior, and fixed-demo restart were also checked.

## What we learned

“What topic is this?” and “What would need to change?” offer different ways to arrange the same words. The fixed example makes that distinction tangible, while leaving the proposed connections open to question.

We also learned to separate an expressive demonstration from evidence of understanding. Keeping words intact is something we can verify. Whether a connection helps someone reconsider their own thoughts is something we still need to test.

## What's next for Go On

Next, we want to evaluate live Bedrock results, review ambiguous or mistaken roots with voluntarily provided examples, and test the listening rhythm on Alexa+. Thoughts accumulating across days are part of the design; restart persistence does not establish a tested multi-day experience. Access, retention, deletion, and shared-device behavior also need decisions before wider use.

Before an AI offers an answer, leave time for a person to catch up with their own thoughts.

---

## Editorial handoff — exclude from submission fields

**2026-10-24: English adaptation ready for review and video production.** The Japanese review source is [submission.ja.md](submission.ja.md); this version follows the current instruction to complete the English materials. Go On is the accepted provisional submission title. The title-card copy is **An AI that listens. / For thoughts still taking shape.** This status records draft readiness, not final participant approval or submission.

The body above the divider is paste-ready copy with no missing-input markers. Its headings follow useful Devpost-style sections; the authenticated form has not been inspected. Match sections to the actual fields when submitting.

Word count: **719 words of prose**, including the **28-word / 173-character short pitch**; **757 words** including the title, title-card copy, and section headings. Apostrophes and hyphenated terms count as one word.

Evidence was reconciled with the [current project README](../../README.md), [bounded browser acceptance record](../browser-acceptance.md), [requirements checklist](requirements.md), and [English fixed fixture](../../demo/section8-map.en.json). This copy review did not rerun the application or backend tests. The fixed example preserves seven topics, two roots, and unmatched IDs 3, 8, and 16; its next action is “Write a one-sentence introduction using one job title.”

The [English video script](demo-script.en.md) uses the same wording and disclosure boundaries. Final recording/export, measured runtime, repository access, participant information, feedback, and publication/submission remain separate work. No account, publication, or submission action is authorized by this document.
