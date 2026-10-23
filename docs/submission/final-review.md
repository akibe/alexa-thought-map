# Go On — final submission package review

Reviewed October 24, 2026 JST. **English narrative and audio text are consistent with the documented fixed-demo evidence; final video acceptance remains pending.** This is a package review, not a fresh application acceptance run or final participant approval. Only this report and [the Japanese review handoff](review.ja.md) were written by this reviewer.

## Concrete findings and required actions

| Priority | Finding and evidence | Required action / owner |
| --- | --- | --- |
| Before video acceptance | The initial `video/build.py` created word-proportioned captions independently of the Kokoro audio cues. Comparison with `audio/cues.json` found the final caption in the comparison block ending about **7.07 seconds late**; the illustrated speaker text used the same independent cues. The video worker corrected the source during review to load the recorded cues and assert text equality. Source correction alone does not verify a rebuilt export. | Video worker: rebuild captions, cards and final MP4 from the actual audio cues; verify their alignment in the export. Both coordinator and video worker were notified through Orca. |
| Before feedback submission | [Product feedback](product-feedback.md) covers the application/development stack but initially omits the now-used narration and film tools. The audio README and generation code establish Kokoro, kokoro-onnx, ONNX Runtime, Python/NumPy and SoundFile; the film builder establishes Pillow and FFmpeg. The participant reuse section is expressly unanswered. | Coordinator: add factual production-tool feedback, including observed purpose, positives and actual limitations; obtain the participant's reuse answer for the used tools/services. Do not invent service defects or a reuse intention. |
| Factual correction | Product feedback, friction log 1, initially says “Device/developer-console integration is unavailable to participants.” The FAQ establishes lack of access to the **listed gated Alexa+ preview tools**, rather than every device/developer-console integration. | Coordinator: narrow that sentence to “The listed gated Alexa+ preview tools are unavailable to hackathon participants.” |
| Reproduction correction | [Judge guide](judge-guide.en.md), optional normal-mode check, initially says “Open the same simulator URL.” Its earlier fallback is port 3100, but the normal-mode command does not set `PORT` and therefore returns to default port 3000. | Coordinator: state `http://127.0.0.1:3000/simulator` explicitly in that paragraph, or repeat matching port overrides. |

These findings are based on the files read during active parallel production. Recheck their current versions when closing them; this reviewer did not edit their owners' files.

## Evidence checked

| Artifact / check | Result and boundary |
| --- | --- |
| [English submission](submission.en.md) and [script](demo-script.en.md) against the [project README](../../README.md), [browser acceptance](../browser-acceptance.md), and [fixture](../../demo/section8-map.en.json) | Original motivation, brief acknowledgments, user-controlled reveal, original words, topic-to-root regrouping and optional focus are preserved. Fixed handwritten analysis is explicit. No unsupported live Bedrock, voice/Alexa/Echo, multi-day usage or measured user-outcome claim was found. |
| Counts | Narrative: **719 prose words / 757 including headings and title copy**. Short pitch: **28 words / 173 characters**. Complete spoken track: **262 words** across seven contiguous blocks ending at **170 seconds**. |
| [Audio cues](audio/cues.json) against the spoken script | All **34** cue texts match in order after removing typographic quotation marks around quoted fixture sentences. All cue times fit their assigned blocks and do not overlap; final speech ends at **167.5 seconds**. |
| Audio files | WAV-header inspection: `audio/narration.wav` is exactly **170.0 seconds**, mono PCM at **24 kHz**. Seven segment lengths are **20 / 40 / 17 / 28 / 15 / 30 / 20 seconds**. This confirms structure and duration, not pronunciation, naturalness or listening quality. |
| Voice provenance | [Audio README](audio/README.md), generator and cues consistently identify standard Kokoro voices: narrator `af_heart`, speaker `am_michael`, acknowledgments `af_bella`. [Upload text](upload.en.md) credits Kokoro/kokoro-onnx. No Apple voice or voice-cloning claim is introduced. |
| Judge commands | `npm ci`, `BEDROCK_ENABLED=0 npm run demo`, port overrides, `npm test`, build and isolated normal-mode commands agree with `package.json`, `src/server.js`, `src/demo.js` and the README, subject to the URL correction above. Demo mode bypasses the provider and uses its own disposable database; normal mode with Bedrock disabled remains pending. Commands were source-checked, not rerun or installed in a clean environment by this reviewer. |
| Versions | All seven pinned runtime/dev package versions match the lockfile. Tool versions quoted in product feedback match the manifest. |
| Links | All relative Markdown links in the submission, script, judge guide, product feedback and upload text resolve to local files. Official FAQ, overview/rules and the two primary Kokoro credit sources were opened successfully. No final repository/video URL was supplied or inferred. |
| Upload description | Describes a working local MCP simulation, staged voice and fixed synthetic results, consistent with the documented demo. “This video combines…” must be checked against the actual final export before publishing. |

The [official FAQ](https://amazonappdev2026.devpost.com/details/faqs) supports a custom web front end and says Alexa+ needs no physical device; its access restriction names the gated preview tools. The [official submission overview](https://amazonappdev2026.devpost.com/) still requires product feedback, a code repository and demo video. These primary pages were checked during this review; no authenticated form was accessed.

The [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) identifies Apache-2.0 and the [kokoro-onnx repository](https://github.com/thewh1teagle/kokoro-onnx) identifies its MIT license. This verifies the cited credit sources, not a complete redistribution/license audit.

## Final video gate and submission gaps

At the first review checkpoint, `video/visuals.mp4` and continuous real-browser source footage existed, while **`video/go-on-demo.mp4` did not**. The source capture log records local MCP requests and 16 rendered bubbles; it does not establish the final muxed film's audio, captions or readability. Do not wait on this review to keep producing the film.

The video owner/coordinator still needs to verify the final MP4 has an audible narration track, correct English captions, duration strictly below 180 seconds, readable original/root/action text, persistent synthetic/fixed-result labels, and an explicit cut from staged voice to the 16 preloaded statements. Check the displayed application is actual footage, the transcript/summary comparison is labeled editorial, and cross-day imagery is a design concept. Watch and listen to the completed export end to end; a duration probe alone is insufficient.

The repository currently has **no configured Git remote and no root LICENSE file**. That is a source-access/publication gap, not a reason to invent a URL or apply a license without the owner's choice. Public licensed GitHub access or the documented private-reviewer route, a real public YouTube/Vimeo URL, participant/form answers and actual submission confirmation remain separate from local package readiness. See [requirements](requirements.md) and [upload routing](upload.en.md).

The necessary participant inputs are collected in [review.ja.md](review.ja.md). There is no need to reopen the accepted provisional name or original concept, obtain live AWS/Echo proof for this fixed demonstration, or add speculative features. No application changes, paid calls, publication, invitations or submission were performed by this reviewer.
