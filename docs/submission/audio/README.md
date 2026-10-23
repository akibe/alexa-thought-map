# Go On narration assets

Generated locally on October 24, 2026 from the spoken blocks in [the English script](../demo-script.en.md). The narration is synthetic; the staged speaker and acknowledgments are not real speech recognition or Alexa output.

- `narration.wav`: 170.0-second mono 24 kHz PCM master, including planned pauses.
- `narration.en.srt`: 34 cues timed to the generated utterances.
- `cues.json`: corresponding global timings, words, roles and voice IDs.
- `segment-01.wav` through `segment-07.wav`: aligned blocks for editing.
- `block-*-cue-*.wav`: individual synthesis results used by the build.
- `generate.py`: reproducible local assembly; checks finite samples, timing bounds and clipping.

Voices: Kokoro v1.0 `af_heart` (narrator), `am_michael` (staged speaker), `af_bella` (staged acknowledgments). They are standard model voices; no voice cloning was performed. Generation speed: 0.92. The output peak was 0.593, with no clipping; speech fit all seven time windows. This is a structural audio check, not a human listening review.

## Rebuild

Use an isolated Python 3.12 environment with `kokoro-onnx==0.6.1` and `soundfile==0.14.0`. Obtain `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the project's documented [model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1), then:

```sh
python docs/submission/audio/generate.py /path/to/model-directory
```

The model downloads are deliberately kept outside the application repository. No application dependency was changed. No paid speech API was used. Cached per-utterance WAVs are reused; if the script or voices change, regenerate the corresponding cached cues before rebuilding.

## Credits and license sources

- Model and voice data: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0 as stated by its model card. [Voice inventory](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
- Local inference wrapper: [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT. Its README identifies the model license as Apache-2.0.
- Runtime: ONNX Runtime 1.31.0; WAV writing: SoundFile 0.14.0.

Sources checked October 24, 2026. Suggested production credit: “Synthetic narration generated locally with Kokoro v1.0 (Apache-2.0), using kokoro-onnx (MIT).” This identifies the tools; it does not imply endorsement by their authors.

Apple system-voice recordings are not included: [macOS Tahoe license §2F](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf) limits their use and excludes public sharing. No background music or third-party stock footage is used by this audio package.
