# Go On — final submission package review

Reviewed October 24, 2026 JST. **Documentary corrections are resolved; English narrative, audio text and export structure are consistent with the documented fixed-demo evidence. Final perceptual video/audio acceptance remains pending.** This is a package review, not a fresh application acceptance run or final participant approval. Only this report and [the Japanese review handoff](review.ja.md) were written by this reviewer.

## Concrete findings and required actions

| Priority | Finding and evidence | Required action / owner |
| --- | --- | --- |
| Corrected; export viewing remains | The initial `video/build.py` created word-proportioned captions independently of the Kokoro audio cues. Comparison with `audio/cues.json` found the final caption in the comparison block ending about **7.07 seconds late**; illustrated speaker text used the same independent cues. | Video worker corrected the source to consume recorded cues and assert text equality. Rechecked: regenerated `video/sources/speech-cues.json` equals all 34 actual cues, and `video/captions.en.srt` matches their text and millisecond-rounded timings. Verify perceived sync in the completed export. |
| Tool coverage corrected; participant answer pending | [Product feedback](product-feedback.md) initially omitted the now-used narration and film tools. | Coordinator added Kokoro/kokoro-onnx/ONNX Runtime, Python/NumPy/SoundFile/uv, and Playwright/Pillow/FFmpeg/ffprobe production feedback. Current text describes actual purpose and limitations. The participant's reuse answer is still needed; do not infer it from technical checks. |
| Corrected | Product feedback, friction log 1, initially said “Device/developer-console integration is unavailable to participants.” The FAQ establishes lack of access to the **listed gated Alexa+ preview tools**, rather than every device/developer-console integration. | Coordinator narrowed the sentence to “The listed gated Alexa+ preview tools are unavailable to hackathon participants.” Current file checked. |
| Corrected | [Judge guide](judge-guide.en.md), optional normal-mode check, initially said “Open the same simulator URL.” Its earlier fallback is port 3100, but the normal-mode command returns to default port 3000. | Coordinator now states `http://127.0.0.1:3000/simulator` explicitly. Current file checked. |

These findings record discovery and resolution during active parallel production. The remaining technical check is the final film's perceived playback/readability after the video worker's finishing pass; this reviewer did not edit its owner's files.

## Evidence checked

| Artifact / check | Result and boundary |
| --- | --- |
| [English submission](submission.en.md) and [script](demo-script.en.md) against the [project README](../../README.md), [browser acceptance](../browser-acceptance.md), and [fixture](../../demo/section8-map.en.json) | Original motivation, brief acknowledgments, user-controlled reveal, original words, topic-to-root regrouping and optional focus are preserved. Fixed handwritten analysis is explicit. No unsupported live Bedrock, voice/Alexa/Echo, multi-day usage or measured user-outcome claim was found. |
| Counts | Narrative: **719 prose words / 757 including headings and title copy**. Short pitch: **28 words / 173 characters**. Complete spoken track: **262 words** across seven contiguous blocks ending at **170 seconds**. |
| [Audio cues](audio/cues.json) against the spoken script | All **34** cue texts match in order after removing typographic quotation marks around quoted fixture sentences. All cue times fit their assigned blocks and do not overlap; final speech ends at **167.5 seconds**. |
| Audio files | WAV-header inspection: `audio/narration.wav` is exactly **170.0 seconds**, mono PCM at **24 kHz**. Seven segment lengths are **20 / 40 / 17 / 28 / 15 / 30 / 20 seconds**. This confirms structure and duration, not pronunciation, naturalness or listening quality. |
| Voice provenance | [Audio README](audio/README.md), generator and cues consistently identify standard Kokoro voices: narrator `af_heart`, speaker `am_michael`, acknowledgments `af_bella`. [Upload text](upload.en.md) credits Kokoro/kokoro-onnx. No Apple voice or voice-cloning claim is introduced. |
| Judge commands | `npm ci`, `BEDROCK_ENABLED=0 npm run demo`, port overrides, `npm test`, build and isolated normal-mode commands agree with `package.json`, `src/server.js`, `src/demo.js` and the README. The URL correction above is applied. Demo mode bypasses the provider and uses its own disposable database; normal mode with Bedrock disabled remains pending. Commands were source-checked, not rerun or installed in a clean environment by this reviewer. |
| Versions | All seven pinned runtime/dev package versions match the lockfile. Tool versions quoted in product feedback match the manifest. |
| Links | All relative Markdown links in the submission, script, judge guide, product feedback and upload text resolve to local files. Official FAQ, overview/rules and the two primary Kokoro credit sources were opened successfully. No final repository/video URL was supplied or inferred. |
| Upload description | Describes a working local MCP simulation, staged voice and fixed synthetic results, consistent with the documented demo. “This video combines…” must be checked against the actual final export before publishing. |

The [official FAQ](https://amazonappdev2026.devpost.com/details/faqs) supports a custom web front end and says Alexa+ needs no physical device; its access restriction names the gated preview tools. The [official submission overview](https://amazonappdev2026.devpost.com/) still requires product feedback, a code repository and demo video. These primary pages were checked during this review; no authenticated form was accessed.

The [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) identifies Apache-2.0 and the [kokoro-onnx repository](https://github.com/thewh1teagle/kokoro-onnx) identifies its MIT license. This verifies the cited credit sources, not a complete redistribution/license audit.

## Final video gate and submission gaps

At the first review checkpoint, `video/visuals.mp4` and continuous real-browser source footage existed, while `video/go-on-demo.mp4` did not. The final MP4 became available during review. This reviewer independently probed it: **170.000 seconds**, **1920×1080 H.264 at 24 fps**, with **mono 24 kHz AAC audio** and a **mov_text subtitle stream**. The source capture log records local MCP requests and 16 rendered bubbles. These checks establish export structure and a duration below three minutes, not final listening quality or perceived subtitle sync.

The coordinator reports that the video worker passed decode/playback checks and is finishing an unsupported-glyph correction and audio normalization. That report is the coordinator's evidence; this reviewer did not independently watch/listen to the entire film. Treat any finishing-pass replacement as a new export to recheck. The [video production record](video/README.md) records the video owner's own checks.

The video owner/coordinator still needs to verify the final finishing-pass MP4 has comfortable audible narration, correct English captions, duration strictly below 180 seconds, readable original/root/action text, persistent synthetic/fixed-result labels, and an explicit cut from staged voice to the 16 preloaded statements. Check the displayed application is actual footage, the transcript/summary comparison is labeled editorial, and cross-day imagery is a design concept. Watch and listen to the completed export end to end; a duration probe alone is insufficient.

The review initially found no configured Git remote and no root LICENSE file. A subsequent coordinator read confirmed a root MIT LICENSE (copyright 2026 akibe); the license-file absence is resolved. No Git remote is configured, so source access/publication remains unverified. Public licensed GitHub access or the documented private-reviewer route, a real public YouTube/Vimeo URL, participant/form answers and actual submission confirmation remain separate from local package readiness. See [requirements](requirements.md) and [upload routing](upload.en.md).

The necessary participant inputs are collected in [review.ja.md](review.ja.md). There is no need to reopen the accepted provisional name or original concept, obtain live AWS/Echo proof for this fixed demonstration, or add speculative features. No application changes, paid calls, publication, invitations or submission were performed by this reviewer.

## Coordinator closeout — final normalized export

After reviewer settlement, video task `task_91e4feff5cc7` completed successfully. Its final export is `video/go-on-demo.mp4`, SHA-256 `4953e969199ec3afcc13ab54de4a186b5b9a2c47ffc08d0c51a4d0d964b0407d`: 170 seconds, 1920×1080 at 24 fps, H.264 with 48 kHz AAC and 34 English subtitle cues. The video's finishing pass supersedes the reviewer's earlier 24 kHz probe.

The video worker rechecked complete decode, native browser playback and the delivered audio level (−16.61 LUFS). The coordinator inspected the contact sheet and full-size root/detail and corrected comparison frames: original words, root sentence, action, captions and provenance are readable, and the missing glyph is corrected. Caption data matches actual synthesis timings. Evidence and final measurements are in [video/README.md](video/README.md) and its QA files.

Technical production and documentary corrections are complete for the local artifacts. A human end-to-end listening/creative check, participant reuse answers, source-sharing/license choice, public video URL and actual form submission remain open. The package is not claimed submitted or fully participant-approved. Both active worker terminals were released after accepted completion; no reclaimable terminal remains in this Run.

## Continuation audit

The preceding goal turn made concrete progress: English narrative, narrated video, captions, reviewer instructions and cross-artifact review were delivered. This continuation inspected current files and found a newly present root MIT license, then reconciled the stale license gap. Japanese feedback review was added to the existing handoff. No repository URL, participant reuse answer, applicant facts or publication confirmation has arrived in this thread; those remain unresolved inputs rather than inferred approvals.
