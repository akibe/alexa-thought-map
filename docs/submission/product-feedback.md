# Go On — product feedback

Prepared October 24, 2026. Factual sections below are based on implementation records and the current dependency manifest. **The participant's reuse intentions are still required before this response is complete.** Those personal answers are kept separate below; they are not inferred from test results.

## Alexa+ developer experience

**Use:** We used the public documentation to design a listening-first Alexa+ experience, then built a custom web simulator that calls our real MCP server. We did not use Amazon's gated Category SDK, MCP Toolkit, CLI, Web Simulator, or an Echo device.

**What helped:** The competition FAQ explicitly supports a real MCP client in a web page. That gave us a concrete route to demonstrate capture, map display and original-thought retrieval before device access.

**Onboarding and what needs work:** Preview access is limited to selected partners. For this particular experience, the remaining integration questions are important: how to keep spoken acknowledgements short, whether original utterances reach the tool unchanged, and how follow-up turns and persistent screens behave. We have not reproduced device defects; these are documentation and validation gaps for our project.

**Request:** Put access prerequisites beside every setup guide and provide an accessible reference simulator that states which voice and display behaviors it does and does not reproduce. Priority: important.

## Amazon Bedrock and AWS SDK for JavaScript

**Use:** We implemented a Bedrock Converse pipeline for topic attributes, inferred shared roots and priority selection, using `@aws-sdk/client-bedrock-runtime` 3.1156.0. The root step loads our packaged reasoning Skill. Model outputs are validated before use; original input remains stored if analysis fails.

**What helped:** The SDK lets the application separate capture from asynchronous analysis and define explicit request limits. Local tests exercise that integration with injected test clients.

**Onboarding and what needs work:** Our recorded live attempt stopped at credential resolution before a signed model request could be sent. We obtained no model output or usage receipt. This is a local setup failure, not an observed Bedrock service defect. The fixed demonstration uses handwritten results and does not invoke Bedrock. We cannot yet give an evidence-based assessment of model quality, latency or service reliability.

**Next step:** Validate the intended account and model access, then evaluate the complete pipeline on consented examples. No live performance or AWS mini-challenge eligibility is claimed here.

## Local development tools

The observations below cover the current project rather than general product ratings. Versions are from the pinned manifest.

| Tool | Purpose and what worked | Onboarding, limitation or improvement |
| --- | --- | --- |
| MCP TypeScript SDK 1.29.0 | Registers capture, map and root-detail tools; real Streamable HTTP initialization, tool calls and resource reads passed local verification. | Dependency retrieval was initially blocked by the local network/cache environment and later resolved. That was not an SDK defect. |
| MCP Apps 1.7.5 | Supplies the interactive map resource and host/AppBridge lifecycle. Real separate-origin resource loading and root selection passed browser checks. | The custom host required explicit CSP-compatible schema validation and nested-frame keyboard handling. A strict-CSP host example would be useful; our integration findings do not establish an upstream defect. |
| Zod 4.6.5 | Defines and validates tool contracts; malformed input/output is rejected in local tests. | The browser host needed jitless configuration under strict CSP. Documenting that setup prominently would help similar integrations. |
| @cfworker/json-schema 4.1.1 | Provides the selected SDK schema validator without generated-function compilation. | Used to resolve a browser bootstrap blocker while preserving strict CSP and validation. No separate package defect was established. |
| Node.js 26+ and built-in SQLite | Runs the server and retains exact original text, timestamps and analysis snapshots. Process-restart persistence was verified. | Requires a recent Node version. The application currently supports one local user and one server process per database; this is our MVP boundary, not a SQLite defect. |
| Node.js test runner | Runs isolated temporary-database and injected-provider checks without paid AWS calls. | It does not replace a real browser or live provider evaluation. Separate browser checks discovered integration defects. |
| npm | Installs pinned dependencies reproducibly with the lockfile. | Initial DNS/cache restrictions prevented dependency retrieval. Authorized installation resolved the local issue. |
| MCP Inspector 2.12.0 | CLI checks exercised real MCP calls and restart persistence outside the custom browser UI. | CLI validation succeeded after dependency setup. The Inspector GUI was not evaluated. |
| Vite 8.3.5 | Builds self-contained simulator, sandbox and map HTML resources. Those resources loaded in the real browser. | No Vite-specific defect was established. Build success alone did not establish AppBridge/CSP correctness. |
| Playwright CLI and Chromium | Exercised real frame behavior, keyboard navigation, stage transitions and original-text retrieval. | Nested-frame inspection exposed defects not visible in unit tests. Browser coverage is bounded to the exercised Chromium environments. |
| Codex | Assisted implementation, documentation and review. This submission preparation also uses Codex. | Early materials overemphasized organization and action suggestions; the participant corrected the missing listening-first motivation. Explicit concept review was necessary alongside technical checks. |
| Orca | Coordinated separate implementation, review and materials tasks and provided an embedded browser. | Runtime access required sandbox permission in this environment. One browser click reported success without firing the expected action; definitive input checks used Playwright. |
| Claude | The design record attributes concept planning and a synthetic reasoning exercise to Claude. | The example exercise used invented inputs and is not a live Bedrock or user-outcome evaluation. Product interface and participant reuse preference are not inferred. |

## Narration production tools

**Use:** Kokoro v1.0 through kokoro-onnx 0.6.1 and ONNX Runtime 1.31.0 generated the English narration locally. Python 3.12, NumPy and SoundFile 0.14.0 assembled the track and timed captions; uv provided an isolated environment. Standard model voices were used, without voice cloning or a paid speech API.

**What worked:** All 34 utterances fit the planned seven time windows. The 170-second PCM master passed checks for finite samples, bounds and clipping. The cue manifest preserves the text and exact generated timing for subtitle synchronization.

**Onboarding and what needs work:** The model and voice data were downloaded separately from application dependencies. Speech still requires listening review; signal checks do not establish pronunciation or pacing quality. Keeping the synthesis model outside the app avoids making narration tooling a runtime requirement.

**Sources:** [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) and [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). These tools create the presentation audio, not the application analysis.

## Video production tools

**Use:** Playwright CLI/Chromium recorded the running local MCP simulator. Python and Pillow generated original title, conversation and comparison cards. FFmpeg assembled the recorded footage, English narration and captions into H.264/AAC MP4; ffprobe inspected its duration and streams.

**What worked:** A retained continuous browser take shows actual map operations and original-thought retrieval. The edit keeps that footage at real speed, and uses the generated audio cue times for subtitles. Original graphics and synthetic examples avoid reliance on stock footage or background music.

**Onboarding and what needs work:** Recording included a lead-in that required an explicit trim to align operations with narration. An unsupported comparison glyph was found during frame inspection. Audio loudness needed adjustment after measurement. These are production findings, not application or Amazon defects.

## Friction log

### 1. Preview boundary for a listening-first Alexa+ experience

- **Task / steps:** Read Alexa+ setup information and competition FAQs to plan voice capture and screen behavior.
- **Expected:** A clear, accessible route to validate the proposed interaction.
- **Observed:** The listed gated Alexa+ preview tools are unavailable to hackathon participants; the FAQ permits a web simulation instead.
- **Impact:** High for device-integration confidence, but not a submission blocker.
- **Workaround:** Built a custom real-MCP web simulator and explicitly labeled the fixed-data demonstration.
- **Suggestion:** Place access requirements and simulator fidelity limits on each setup path.
- **Evidence:** [Official FAQ](https://amazonappdev2026.devpost.com/details/faqs), rechecked October 24.

### 2. Strict CSP blocked the custom host's schema validation

- **Task / steps:** Start the actual demo, open the simulator and initialize its MCP connection.
- **Expected:** Load the MCP App after protocol initialization.
- **Observed:** Generated-function schema compilation violated CSP; the host showed “Local MCP connection unavailable” before resource loading.
- **Impact:** High; blocked the local demonstration.
- **Resolution:** Selected the CfWorker validator and configured Zod jitless before SDK initialization. Independent browser retesting passed the lifecycle with no CSP violations in the exercised flow.
- **Suggestion:** Provide a minimal strict-CSP host example with a compatible validator setup.
- **Attribution:** A resolved integration compatibility issue; not evidence of an Amazon service defect.

### 3. Keyboard focus escaped an open dialog inside the App frame

- **Task / steps:** Open a root with Enter, then press Tab in the nested App frame.
- **Expected:** Keep focus inside the open modal; Escape closes it and restores its opener.
- **Observed:** Tab moved focus to the host's Show map button, leaving the dialog open.
- **Impact:** Medium; keyboard users could lose their place.
- **Resolution:** Added explicit Tab/Shift+Tab containment and opener restoration. Independent browser tests verified both directions, Escape/click-close and ordinary navigation after closing.
- **Suggestion:** Include nested-frame dialog keyboard cases in host/App accessibility examples.
- **Attribution:** A resolved application integration defect, not an established SDK defect.

Evidence for logs 2–3: [browser acceptance report](../browser-acceptance.md), including reproduction and retest records. Severity is our project-impact assessment. No bonus entitlement is claimed.

## Participant answer still needed — exclude this section from the pasted feedback

The organizer asks whether the participant would build with the used tools/services again, with a yes/no and reason. Suggested technical grounds for a participant answer are:

- Local MCP/storage/build/test stack: reproducible local operation and inspectable original data.
- Alexa+/Bedrock: further experimentation may be worthwhile, but device behavior and live inference remain to be validated.
- Development assistants: faster parallel production, with human concept review and independent technical verification still necessary.

These are **review prompts, not the participant's answer**. Once confirmed, add the actual reuse statement to the relevant groups above. The final video-production tools are included above.
