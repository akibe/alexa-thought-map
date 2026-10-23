#!/usr/bin/env python3
"""Check the delivered film, caption timing and retained working footage."""
import hashlib, json, re, subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
FILM = HERE/'go-on-demo.mp4'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(FILM)]))
duration = float(probe['format']['duration'])
assert duration == 170 and duration < 180
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
assert video['codec_name'] == 'h264' and (video['width'], video['height']) == (1920, 1080)
assert audio['codec_name'] == 'aac'
assert any(s['codec_name'] == 'mov_text' for s in probe['streams'])
reference = json.loads((HERE.parent/'audio/cues.json').read_text())
cues = json.loads((HERE/'sources/speech-cues.json').read_text())
assert cues == reference and len(cues) == 34
assert len(re.findall(r' --> ', (HERE/'captions.en.srt').read_text())) == 34
assert all(0 <= c['start'] < c['end'] <= duration for c in cues)
capture = (HERE/'sources/capture-result.log').read_text()
evidence = json.loads(capture.split('### Result\n', 1)[1].split('\n', 1)[0])
assert evidence['bubbles'] == 16 and evidence['finalTitle'] == 'One place to begin.'
assert all(re.match(r'^http://127\.0\.0\.1:318[01]/', request['url']) for request in evidence['requests'])
decode = subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-i', str(FILM), '-f', 'null', '-'], capture_output=True, text=True)
assert decode.returncode == 0 and not decode.stderr, decode.stderr
(HERE/'qa/decode.log').write_text('PASS: complete video, audio and subtitle decode; no FFmpeg errors.\n')
for second in [2, 6, 16, 23, 28, 36, 49, 61, 65, 70, 75, 80, 87, 96, 107, 111, 126, 145, 153, 166, 169]:
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(second), '-i', str(FILM), '-frames:v', '1', str(HERE/f'qa/frame-{second:03}.png')], check=True)
report = {'duration_seconds': duration, 'width': video['width'], 'height': video['height'], 'fps': video['r_frame_rate'], 'video_codec': video['codec_name'], 'audio_codec': audio['codec_name'], 'audio_sample_rate': audio['sample_rate'], 'caption_cues': len(cues), 'caption_source': '../audio/cues.json', 'decode': 'pass', 'real_demo_bubbles': evidence['bubbles'], 'capture_seconds': evidence['elapsed'], 'capture_requests_loopback_only': True, 'sha256': hashlib.sha256(FILM.read_bytes()).hexdigest(), 'bytes': FILM.stat().st_size}
(HERE/'qa/verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
