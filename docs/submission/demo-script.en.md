# Go On — English demo script

**Ready for review and video production · 2026-10-24.** Adapted from the Japanese review source [demo-script.ja.md](demo-script.ja.md), under the current instruction to complete the English materials. Go On is the accepted provisional title. This replaces the previous English script; final participant review and the measured audio/export duration are separate checks.

**Planned total: 2:50 (170 seconds), including pauses and the final card.** English speech and screens. The timed blocks below contain every spoken word, including the staged speaker, acknowledgments, and “Show me.” Production directions and screen text are not spoken unless included in a blockquote.

**Spoken total: 262 words.** At 120–140 words per minute, the complete speech takes approximately 112–131 seconds, leaving 39–58 seconds for pauses, operations, and cards within the 170-second plan. This is a word-count estimate, not measured audio. Per-block counts are **24 / 61 / 24 / 41 / 30 / 48 / 34**, in order below; the 15-second focus block needs a brisker read than the quieter opening. Apostrophes and hyphenated terms count as one word.

## 0:00–0:20 — Still thinking

**Picture:** An unfinished sentence: “At next week's talk, how do I introduce…” An invented advice panel covers its continuation. Use no other product's branding. Label **Illustrated scenario** throughout. Clear the advice, leave two seconds of quiet, and reveal the title card:

**Go On / An AI that listens. / For thoughts still taking shape.**

**Narrator:**

> I was still thinking.
> Then came an answer. A solution.
> And I lost what I was about to say.
> What if an AI waited?

## 0:20–1:00 — Room to continue

**Picture:** A quiet, illustrated listening screen. No advice or map yet. Label **Staged conversation · Synthetic example · No speech recognition** throughout. The two acknowledgments are performed audio illustrating the intended rhythm. Leave breathing room between thoughts.

**Speaker:**

> I cannot decide how to introduce myself at next week's talk.
> I have too many job titles to describe myself in one sentence.

**Assistant voice:**

> Mm-hm.

**Speaker:**

> I do not know the going rate for this new project.
> I actually want to do more music work.

**Assistant voice:**

> I'm listening.

**Speaker:**

> I cannot say no when someone asks me for help.
> Next month is already fully booked.

## 1:00–1:17 — “Show me”

**Picture:** Cut on the speaker's request. Show **Switching to a fixed demo: 16 preloaded synthetic statements · Voice command staged**. Record the actual simulator's **Open fixed demo** operation, followed by its Scatter and Topics stages. The six spoken lines did not create or generate these 16 statements.

**Speaker:**

> Show me.

**Narrator:**

> Only when I ask does the map appear.
> Here, sixteen invented statements use fixed, handwritten analysis.
> First, the words gather by topic.

**Persistent label from this point through the map footage:** **Web simulation · Synthetic data · Fixed analysis · No live inference**. Retain the App's own **SYNTHETIC · FIXED DEMO** marking.

## 1:17–1:45 — Same words, different connections

**Picture:** Use the actual Roots stage. Follow the job-title and project-pricing statements as their topic boundaries change. Open root 1, hold its full sentence and connected originals, then close details before advancing. Include those operations within the 28-second block. Add **A possible connection**; preserve the actual root text.

**Narrator:**

> Then the topic boundaries loosen.
> Job titles and project pricing meet under a possible root:
> “I have not chosen how to describe my work.”
> A connection to consider, not a hidden truth.
> The words stay. What changes is how they relate.

## 1:45–2:00 — One place to begin

**Picture:** Actual Focus stage, showing the saved root and next action. Keep the other thoughts represented. The small step is part of the fixed example, with no claim that it resolves the connected concerns.

**Narrator:**

> From all those concerns, one starting point comes forward.
> “Write a one-sentence introduction using one job title.”
> The other thoughts remain.
> I do not have to solve everything to begin.

## 2:00–2:30 — Keep the words

**Picture:** An **Editorial comparison** of a transcript excerpt, an editor-written summary, and the map, using the same example. These comparison panels are film graphics, not app features. Enlarge two or three phrases rather than shrinking all 16 statements. Return to the actual **Read thoughts** view to show the originals.

**Narrator:**

> A transcript can give me the same tangle in text.
> A summary can smooth away words that matter to me.
> Go On keeps those words, and rearranges their connections.
> The aim is to see my own thinking from another angle.
> A map of what is on my mind.

## 2:30–2:50 — Leave room

**Picture:** Brief architecture card: **Implemented path: MCP capture → SQLite → asynchronous Bedrock analysis → MCP App**. Beneath it: **This fixed demo makes no model calls. Live Bedrock quality, voice, and Alexa+/Echo unverified.** Then a quiet final title card, held through 2:50. Label any day-to-day imagery **Design concept**. Include any required credits within this block.

**Narrator:**

> The design leaves room for thoughts to accumulate across days.
> That experience still needs testing.
> Before an AI answers, leave time to catch up with your own thoughts.
> Go On. An AI that listens.

## Fixture and production handoff — not spoken

Use [demo/section8-map.en.json](../../demo/section8-map.en.json) as the wording and membership source. The six staged utterances above are exact IDs **1, 2, 5, 9, 10, 13**. All 16 inputs and all analysis are preloaded handwritten synthetic content, not transcribed audio or model output.

The running fixture has seven topics and these two roots:

| Root sentence | Statement IDs | Saved next action |
| --- | --- | --- |
| I have not chosen how to describe my work. | 1, 2, 4, 5, 9, 11, 14, 15 | Write a one-sentence introduction using one job title. |
| I cannot say no, so there is no room left. | 6, 7, 10, 12, 13 | Choose one short slot in this week for myself. |

IDs **3, 8, 16** remain unmatched. Do not replace the fixture's sentences with the older English script's paraphrases or imply that every thought belongs to a root. Root 1 is the saved focus; its selection is not an inference performed during filming.

For working footage, follow the [README](../../README.md): run `npm run demo`, open `http://127.0.0.1:3000/simulator`, and choose **Open fixed demo**. Use the actual stage controls or Replay. The [browser acceptance record](../browser-acceptance.md) establishes bounded local interface behavior; it does not certify the final film. Use a wide shot of the running simulator to establish context, then readable map crops that retain provenance labels. Add labels outside important map text. Any speed changes must be labeled, and replay must not imply model latency.

The sequence intentionally cuts from illustrated speech to a preloaded fixture. Do not edit it into apparent live capture or pretend the spoken “Show me” controls the browser. The app's working portions are the real MCP connection, saved map, stage transitions, root selection, and retrieval of originals. Cross-day accumulation is a design aim, not demonstrated multi-day use.

Before delivery, read the complete spoken track against these time blocks, adjust pauses to fit, and check the exported duration is strictly below 3:00. Check English captions against the recorded speech, actual fixture text, readable labels, and the [submission narrative](submission.en.md). Final audio, actual duration, video export and upload are not established by this script. Publication remains with the submission owner.
