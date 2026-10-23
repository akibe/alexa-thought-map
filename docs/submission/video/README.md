# Go On — finished competition video

[Play/download the English MP4](go-on-demo.mp4) · [English SRT](captions.en.srt) · [Title thumbnail](thumbnail.png)

Delivered October 24, 2026: **170.000 seconds (2:50), 1920×1080, 24 fps, H.264 video, 48 kHz AAC English narration**. The MP4 has burned-in English captions and an English selectable subtitle track. File size: 5,265,889 bytes. It is a completed local video artifact; upload, publication and submission remain with the owner.

## What the film shows

| Time | Material and provenance |
| --- | --- |
| 0:00–0:20 | Original typography: an interrupted thought, invented advice panel, then Go On. Labeled Illustrated scenario. |
| 0:20–1:00 | Staged synthetic conversation, with exact fixture utterances 1, 2, 5, 9, 10, 13 and two performed acknowledgments. Labeled No speech recognition. |
| 1:00–2:00 | **Actual continuous browser footage**: Open fixed demo, all thoughts, topics, shared roots, real root-detail retrieval and focus. At real speed. Labels disclose web simulation, synthetic data, fixed analysis and no live inference throughout. |
| 2:00–2:22 | Original editorial comparison panels. Explicitly film graphics, not app features. |
| 2:22–2:30 | A second real-speed excerpt from the same browser take: Read thoughts and return to focus. |
| 2:30–2:38 | Implemented architecture with the fixed demo's no-model-call limitation and unverified live/voice/device scope. |
| 2:38–2:50 | Original title, accepted English copy, synthetic-narration credit and unverified-scope label. |

The spoken request does not trigger the browser: it is an explicitly staged cut to **16 preloaded, handwritten synthetic statements and analysis** from [section8-map.en.json](../../../demo/section8-map.en.json). The actual App retains its Thought Map wordmark and SYNTHETIC · FIXED DEMO provenance. Go On is the film/submission title. Possible roots are hypotheses, not proven causes. Cross-day use is described as a design aim that still needs testing.

## Working footage and boundaries

Started the existing built server with:

```sh
PORT=3180 SANDBOX_PORT=3181 BEDROCK_ENABLED=0 node src/server.js --demo
```

This mode creates its own disposable SQLite database and constructs no Bedrock provider. The recording used the real `/simulator`, AppBridge, separate-origin sandbox, MCP tool/resource HTTP requests and actual App controls. No responses were mocked and no map was substituted. The server logged the isolated temporary database; it was removed on normal shutdown.

[Continuous browser source](sources/demo-continuous.webm) retains the complete take, including lead-in and trailing holds. [Capture code](sources/capture.js) and [capture result](sources/capture-result.log) preserve the timed operations. The capture reports 68.004 seconds, 16 rendered bubbles, final title One place to begin, and five post-start requests, all on loopback ports 3180/3181. The host was already initialized when capture began.

After seven seconds of the timed take, a **display-only resize harness** puts the existing host iframe at 1280×800. This changes browser presentation only; original resource, data, controls, MCP bridge and source remain intact. The film fits that viewport into 1360×850 inside its 1080p canvas. The original simulator opening is shown first. No application file was edited.

Recording begins 7.44 seconds before the timed take. The first film excerpt uses raw source 7.44–67.44 seconds; the Read thoughts excerpt uses 67.44–75.44 seconds. These are cuts at real speed, with no claim about model latency. The raw take's extra end hold is retained for reproducibility.

## Rebuild

Requirements: Python with Pillow (used 12.3.0), FFmpeg/ffprobe, macOS Avenir Next font at `/System/Library/Fonts/Avenir Next.ttc`, retained raw footage and the sibling [audio package](../audio/README.md). No app dependency was added. Fonts are read from the host and are not copied into this repository.

From repository root:

```sh
python3 docs/submission/video/build.py
python3 docs/submission/video/verify.py
```

`build.py` reads the finished [English script](../demo-script.en.md), checks all 34 spoken lines against `../audio/cues.json`, and uses those exact audio timings for both the staged conversation text and captions. It generates original editable PNG cards, the SRT, thumbnail, visual master and final MP4. `sources/speech-cues.json` records the actual timing inputs. `visuals.mp4` is a silent intermediate; **go-on-demo.mp4 is the delivery file**.

To rerecord, start the isolated server above, then run these commands from this directory with the installed Playwright CLI:

```sh
playwright-cli -s=go-on-video open http://127.0.0.1:3180/simulator --headed
playwright-cli -s=go-on-video resize 1280 800
playwright-cli -s=go-on-video snapshot
playwright-cli -s=go-on-video video-start sources/demo-continuous.webm --size=1280x800
playwright-cli -s=go-on-video run-code "$(cat sources/capture.js)" > sources/capture-result.log
playwright-cli -s=go-on-video video-stop
playwright-cli -s=go-on-video close
```

`capture.js` uses exact observed control names and frame structure. Re-measure the new raw recording's lead-in before changing `trim=start` in `build.py`; 7.44 seconds belongs to this saved take. Stop only the server launched for this recording with Ctrl-C.

## Quality verification

- [Machine verification](qa/verification.json): 170 seconds, 1080p24 H.264/AAC, 34 caption cues exactly equal to the audio inputs, valid chronological bounds, retained working-demo assertions and SHA-256.
- [Complete decode](qa/decode.log): FFmpeg decoded the entire delivered video, audio and subtitle streams with no errors.
- [Native Chrome playback](qa/browser-playback.log): the exported MP4 opened as a native video, reported 170 seconds and 1920×1080, advanced playback from 0.000 to 2.462 seconds, and reported no media error (`readyState:4`). Playback was muted for this check. This preceded the final audio normalization; the H.264 stream was copied unchanged and the normalized deliverable passed complete decode again.
- [Final audio measurement](qa/loudness.log): the delivered AAC measures **−16.61 LUFS integrated, −1.47 dBTP true peak, 5.50 LU loudness range**. Final mux uses `loudnorm=I=-16:TP=-1.5:LRA=11` and 48 kHz AAC; raw narration and cue times are unchanged. These are the scan's input measurements of the delivered file, not its hypothetical re-normalized output.
- Inspected a whole-film contact sheet and selected exported full-size frames, including root sentence and eight original thoughts at [1:27](qa/frame-087.png), corrected comparison typography at [2:06](qa/frame-126.png), and the title/disclosure/caption at [2:46](qa/frame-166.png). The unsupported editorial arrow glyph found during inspection was replaced before final render.
- Twenty-one final exported frames are retained under `qa/frame-*.png`, including the first/last scenes and all major demo stages. Captions are outside the actual UI frame and use 39px type; the running App's own labels remain visible. There is no screenshot-only substitute for the working segment.

Final film SHA-256: `4953e969199ec3afcc13ab54de4a186b5b9a2c47ffc08d0c51a4d0d964b0407d`.

The existing [browser acceptance](../../browser-acceptance.md) and current captured operations support bounded local UI behavior. **Live Bedrock output/quality, speech recognition, Alexa+/Echo and multi-day usage are not verified.** This production did not repeat the full application test suite or a human end-to-end listening review. Final creative acceptance and publication approval remain with the participant.

## Tools and rights inventory

Original film graphics: Pillow and installed macOS typography. Working UI recording: installed Playwright CLI and Chrome. Editing/encoding/verification: Python, FFmpeg and ffprobe. Narration: coordinator-supplied local Kokoro v1.0, standard voices `af_heart`, `am_michael`, `af_bella`, via kokoro-onnx; see [audio credits and reproducible generation](../audio/README.md). No voice cloning, paid speech service, music, stock footage, image generation or external provider inference was used in this film. An exploratory Apple system-voice test was deleted and is excluded from all delivered assets.

Only `docs/submission/video/**` was created by this worker. The worker's browser and both server sessions were closed; its isolated demo directory was removed and ports 3180, 3181 and 3182 refused connections afterward. No source edits, commits, upload or publication were performed.
