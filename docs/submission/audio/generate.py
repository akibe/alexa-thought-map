"""Generate locally narrated audio and exact cue timings from the English script.
Requires kokoro-onnx==0.6.1, soundfile==0.14.0 and the v1.0 model/voices.
Usage: python generate.py /path/to/model-directory
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

out = Path(__file__).resolve().parent
model_dir = Path(sys.argv[1])
script = (out.parent / 'demo-script.en.md').read_text()
blocks = re.split(r'^## \d+:\d+–\d+:\d+ — .*$', script, flags=re.M)[1:]
assert len(blocks) == 7
bounds = [0, 20, 60, 77, 105, 120, 150, 170]
voices = {'Narrator': 'af_heart', 'Speaker': 'am_michael', 'Assistant voice': 'af_bella'}
engine = Kokoro(str(model_dir / 'kokoro-v1.0.onnx'), str(model_dir / 'voices-v1.0.bin'))
rate = 24000
track = np.zeros(170 * rate, dtype=np.float32)
manifest = []
for i, block in enumerate(blocks):
    block = block.split('## Fixture')[0]
    role = 'Narrator'
    utterances = []
    for line in block.splitlines():
        match = re.match(r'\*\*(Narrator|Speaker|Assistant voice):\*\*', line)
        if match:
            role = match[1]
        if line.startswith('> '):
            text = line[2:].strip().strip('“”')
            utterances.append((role, text))
    assert utterances
    generated = []
    for n, (role, text) in enumerate(utterances):
        # Cache synthesis so a layout-only rerun makes no extra model passes.
        path = out / f'block-{i+1:02d}-cue-{n+1:02d}.wav'
        if path.exists():
            samples, sr = sf.read(path, dtype='float32')
        else:
            samples, sr = engine.create(text, voice=voices[role], speed=0.92, lang='en-us')
            sf.write(path, samples, sr)
        assert sr == rate and len(samples) > 0 and np.isfinite(samples).all()
        generated.append((role, text, samples))
    duration = bounds[i+1] - bounds[i]
    speech = sum(len(x[2]) / rate for x in generated)
    # Keep the opener/title quiet and avoid overlap with the next section.
    head = 0.8
    tail = 2.5 if i in (0, 6) else 0.6
    assert speech + head + tail < duration, (i, speech, duration)
    gap = min(1.5, (duration - speech - head - tail) / max(1, len(generated)-1))
    cursor = bounds[i] + head
    for role, text, samples in generated:
        start = round(cursor * rate)
        end = start + len(samples)
        assert end < bounds[i+1] * rate
        track[start:end] = samples
        manifest.append({'block': i+1, 'role': role, 'voice': voices[role], 'text': text,
                         'start': start/rate, 'end': end/rate})
        cursor = end/rate + gap
    sf.write(out / f'segment-{i+1:02d}.wav', track[bounds[i]*rate:bounds[i+1]*rate], rate)
    print(f'block {i+1}: {speech:.2f}s speech in {duration}s window', flush=True)
assert max(abs(track)) <= 1
sf.write(out / 'narration.wav', track, rate, subtype='PCM_16')
(out / 'cues.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
def stamp(seconds):
    ms = round(seconds*1000)
    return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
(out / 'narration.en.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i,c in enumerate(manifest))+'\n')
print(f'Complete: {len(manifest)} cues, 170.0 seconds, peak {max(abs(track)):.3f}', flush=True)
