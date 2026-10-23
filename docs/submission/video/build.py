#!/usr/bin/env python3
"""Build the 170-second film from retained footage, editorial cards and English cues."""
from pathlib import Path
import json, re, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SRC = HERE / 'sources'
CARDS = SRC / 'cards'
CARDS.mkdir(exist_ok=True)
W, H = 1920, 1080
BG, INK, MUTED, ACCENT = '#11251f', '#f5f2e7', '#b6c7ba', '#c6db9c'
FONT = '/System/Library/Fonts/Avenir Next.ttc'

def font(size):
    return ImageFont.truetype(FONT, size)

def wrap(draw, value, size, width):
    lines, line = [], ''
    for word in value.split():
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=font(size)) > width and line:
            lines.append(line); line = word
        else:
            line = candidate
    return lines + ([line] if line else [])

def text(draw, value, xy, size=56, color=INK, width=1600, spacing=1.3):
    x, y = xy
    lines = wrap(draw, value, size, width)
    for line in lines:
        draw.text((x, y), line, font=font(size), fill=color)
        y += size * spacing
    return y

def centered(draw, value, y, size=72, color=INK):
    for line in value.split('\n'):
        x = (W - draw.textlength(line, font=font(size))) / 2
        draw.text((x, y), line, font=font(size), fill=color)
        y += size * 1.35

def mark(draw, x=960, y=240, r=46):
    for dx, dy in [(1, 0), (0, 1), (.707, .707), (.707, -.707)]:
        draw.line((x-dx*r, y-dy*r, x+dx*r, y+dy*r), fill=ACCENT, width=4)

def title_card(draw):
    mark(draw)
    centered(draw, 'Go On', 355, 154)
    centered(draw, 'An AI that listens.', 560, 68)
    centered(draw, 'For thoughts still taking shape.', 670, 44, MUTED)

blocks = []
for part in re.split(r'^## ', (HERE.parent / 'demo-script.en.md').read_text(), flags=re.M)[1:]:
    match = re.match(r'(\d+):(\d+)–(\d+):(\d+)', part)
    if not match:
        continue
    a, b, c, d = map(int, match.groups())
    lines = re.findall(r'^> (.+)$', part, flags=re.M)
    blocks.append({'start': 60*a+b, 'end': 60*c+d, 'lines': lines})
assert len(blocks) == 7 and blocks[-1]['end'] == 170

# Captions use audio sentence timings when provided; the silent build has a paced reading track.
audio_cues = HERE.parent / 'audio' / 'cues.json'
cues = []
for block in blocks:
    words = sum(len(line.split()) for line in block['lines'])
    available = block['end'] - block['start'] - 2
    cursor = block['start'] + 1
    for line in block['lines']:
        duration = available * len(line.split()) / words
        cues.append({'start': cursor, 'end': cursor+duration-.12, 'text': line})
        cursor += duration
if audio_cues.exists():
    recorded = json.loads(audio_cues.read_text())
    normalize = lambda value: value.replace('“', '').replace('”', '')
    assert [normalize(c['text']) for c in cues] == [normalize(c['text']) for c in recorded], 'Audio/script mismatch'
    cues = recorded
assert all(0 <= c['start'] < c['end'] <= 170 for c in cues)
assert all(a['end'] <= b['start'] for a, b in zip(cues, cues[1:]))
(SRC / 'speech-cues.json').write_text(json.dumps(cues, indent=2) + '\n')

def srt_time(value):
    ms = round(value*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

(HERE / 'captions.en.srt').write_text('\n\n'.join(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n" + '\n'.join(textwrap.wrap(c['text'], 70)) for i, c in enumerate(cues, 1)) + '\n')

def scene(t, caption):
    im = Image.new('RGB', (W, H), BG)
    dr = ImageDraw.Draw(im)
    dr.line((90, 920, 1830, 920), fill='#385147', width=2)
    if t < 20:
        text(dr, 'ILLUSTRATED SCENARIO', (90, 48), 24, MUTED)
        if t < 4:
            text(dr, 'At next week\'s talk,\nhow do I introduce…'.replace('\n', ' '), (180, 320), 88, width=1450)
            text(dr, 'I was still thinking.', (185, 650), 42, MUTED)
        elif t < 10:
            text(dr, 'At next week\'s talk, how do I introduce…', (180, 270), 76, MUTED, 1400)
            dr.rounded_rectangle((410, 400, 1730, 720), 30, fill='#e2e8d9')
            text(dr, 'Here is what you should say.', (470, 475), 62, BG, 1170)
            text(dr, 'An answer arrives before the thought is finished.', (470, 585), 36, '#385147', 1170)
        elif t >= 13:
            title_card(dr)
        else:
            centered(dr, 'What if an AI waited?', 420, 88)
    elif t < 60:
        text(dr, 'STAGED CONVERSATION · SYNTHETIC EXAMPLE · NO SPEECH RECOGNITION', (90, 48), 24, MUTED)
        mark(dr, 165, 285, 26)
        text(dr, 'Go on.', (230, 235), 62, ACCENT)
        current = next((c['text'] for c in cues if c['start'] <= t < c['end']), '')
        if current:
            text(dr, current, (230, 390), 79, INK, 1430)
        else:
            text(dr, 'A little room to keep thinking.', (230, 410), 58, MUTED, 1400)
        text(dr, 'Illustrated voice interaction · not running speech capture', (230, 790), 30, MUTED)
    elif t < 120 or 142 <= t < 150:
        text(dr, 'Go On', (50, 330), 44, ACCENT, 200)
        text(dr, 'ACTUAL\nLOCAL\nMCP APP'.replace('\n', ' '), (50, 420), 25, MUTED, 150)
        text(dr, 'WEB SIMULATION · SYNTHETIC DATA · FIXED ANALYSIS · NO LIVE INFERENCE', (280, 20), 23, MUTED)
        if 60 <= t < 67:
            text(dr, 'Switching to 16 preloaded synthetic statements. Voice command staged.', (280, 930), 27, ACCENT, 1420)
        elif 77 <= t < 105:
            text(dr, 'A POSSIBLE CONNECTION · NOT A PROVEN CAUSE', (280, 930), 26, ACCENT)
        elif t >= 142:
            text(dr, 'Read thoughts · original wording preserved', (280, 930), 27, ACCENT)
    elif t < 150:
        text(dr, 'EDITORIAL COMPARISON · FILM GRAPHICS, NOT APP FEATURES', (90, 48), 24, MUTED)
        text(dr, 'Keep the words. See a different relationship.', (90, 150), 70, INK, 1700)
        columns = [
            ('01 / TRANSCRIPT', 'Too many job titles.\nA new project.\nWhat is the going rate?', 'The same tangle in text.'),
            ('02 / SUMMARY', 'Work and self-presentation concerns.', 'An editor-written simplification.'),
            ('03 / MAP', 'Job titles + project pricing', 'A possible shared root:\n“I have not chosen how to describe my work.”')]
        for i, (label, main, note) in enumerate(columns):
            x = 90 + i*590
            dr.rounded_rectangle((x, 320, x+550, 850), 24, fill='#1d3930', outline='#466052', width=2)
            text(dr, label, (x+30, 360), 26, ACCENT, 480)
            y = text(dr, main.replace('\n', ' '), (x+30, 450), 49, INK, 475)
            text(dr, note.replace('\n', ' '), (x+30, max(655, y+30)), 32, MUTED, 475)
    elif t < 158:
        text(dr, 'IMPLEMENTED PATH · THIS FIXED DEMO MAKES NO MODEL CALLS', (90, 48), 25, MUTED)
        text(dr, 'Capture. Preserve. Reconnect.', (140, 220), 85)
        for i, (heading, detail) in enumerate([('MCP capture', 'Receive words'), ('SQLite', 'Preserve originals'), ('Async Bedrock', 'Analysis path'), ('MCP App', 'Explore the map')]):
            x = 140 + i*435
            dr.rounded_rectangle((x, 430, x+390, 650), 24, fill='#254237')
            text(dr, heading, (x+25, 460), 39, ACCENT, 345)
            text(dr, detail, (x+25, 555), 28, INK, 345)
        text(dr, 'Unverified: live Bedrock quality, speech recognition, Alexa+ and Echo.', (140, 740), 34, INK, 1630)
        text(dr, 'Cross-day use is a design aim and still needs testing.', (140, 810), 32, MUTED, 1600)
    else:
        title_card(dr)
        text(dr, 'SIMULATED EXPERIENCE · LIVE BEDROCK, VOICE & ALEXA+/ECHO UNVERIFIED', (240, 835), 24, MUTED, 1480)
        text(dr, 'Synthetic narration: Kokoro v1.0 (Apache-2.0) · kokoro-onnx (MIT)', (430, 885), 22, MUTED, 1450)
    if caption:
        # Caption area is outside every actual UI frame and provenance label.
        lines = wrap(dr, caption, 39, 1710)
        assert len(lines) <= 2, caption
        for n, line in enumerate(lines):
            centered(dr, line, 964+n*49, 39)
    return im

changes = {0., 4., 10., 13., 20., 60., 67., 77., 105., 120., 142., 150., 158., 170.}
for cue in cues:
    changes.update((round(cue['start'], 3), round(cue['end'], 3)))
times = sorted(changes)
concat = []
for i, (start, end) in enumerate(zip(times, times[1:])):
    middle = (start+end)/2
    caption = next((c['text'] for c in cues if c['start'] <= middle < c['end']), '')
    target = CARDS / f'{i:03}.png'
    scene(middle, caption).save(target)
    concat += [f"file '{target}'", f'duration {end-start:.3f}']
concat.append(f"file '{target}'")
(SRC / 'cards.ffconcat').write_text('\n'.join(concat)+'\n')
thumb = Image.new('RGB', (W, H), BG)
title_card(ImageDraw.Draw(thumb))
thumb.save(HERE / 'thumbnail.png')

raw = SRC / 'demo-continuous.webm'
assert raw.exists(), 'Capture the actual local demo first'
# Continuous browser footage is kept at real speed. The second excerpt opens Read thoughts.
graph = '[1:v]split=2[a][b];[a]trim=start=7.44:duration=60,setpts=PTS-STARTPTS+60/TB,scale=1360:850[a1];[b]trim=start=67.44:duration=8,setpts=PTS-STARTPTS+142/TB,scale=1360:850[b1];[0:v][a1]overlay=280:70:eof_action=pass:enable=between(t\\,60\\,120)[x];[x][b1]overlay=280:70:eof_action=pass:enable=between(t\\,142\\,150),format=yuv420p[out]'
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', str(SRC/'cards.ffconcat'), '-i', str(raw), '-filter_complex', graph, '-map', '[out]', '-t', '170', '-r', '24', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-movflags', '+faststart', str(HERE/'visuals.mp4')]
subprocess.run(cmd, check=True)
audio = HERE.parent / 'audio' / 'narration.wav'
assert audio.exists(), 'Supply the licensed 170-second narration master'
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning', '-i', str(HERE/'visuals.mp4'), '-i', str(audio), '-i', str(HERE/'captions.en.srt'), '-map', '0:v:0', '-map', '1:a:0', '-map', '2:s:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:s', 'mov_text', '-metadata', 'title=Go On — An AI that listens.', '-metadata:s:s:0', 'language=eng', '-t', '170', '-movflags', '+faststart', str(HERE/'go-on-demo.mp4')], check=True)
print('Built go-on-demo.mp4, exact English SRT, thumbnail and reproducible editorial cards.')
