# Zeltrion Solutions — "The System Is Live" (Instagram Reel)

A 40-second, 1080×1920, 30 fps cinematic thriller reel for **zeltrionsolutions.com**. Everything in it was built
from code: real-time 3D, motion graphics, an original score and designed sound effects. The website and dashboard
footage is the real site, taken from the supplied screen recordings.

**Final video:** `out/zeltrion-the-system-is-live.mp4` (H.264 High, AAC 320k, about −14 LUFS, ready for Instagram).

## Creative concept

The supplied brief ("The System Is Live") was kept as the spine: an unknown system comes online, gets traced, and is
revealed as Zeltrion. Three changes were made to stop the scroll and drive shares:

1. **Hook that calls the viewer out (0–4 s).** A red emergency alert reads *"1 business detected still doing
   everything MANUALLY."* The trace resolves to *"the phone in your hand"*. The music tape-stops, and the payoff line
   is *"…it's yours."* Pattern interrupt, then humor, then a reason to keep watching.
2. **The Architect (9–13 s).** The founder (Nimra Akbar, from the supplied portrait and the About page) appears as a
   thriller dossier with a holographic scan. Running gags: *Sleep schedule: CLASSIFIED* and *Threat level: EXTREME\*
   (\*to your competitors)*.
3. **Callbacks that loop.** *"Questions at 2:47 AM? Just ask."* calls back the 2:47 AM alert. The end card shows
   *"● ALERT RESOLVED · MANUAL MODE: OFF"*, which closes the opening alert and invites a rewatch.

| Time | Sequence | What happens |
|---|---|---|
| 0–4 | Hook | Server-aisle alarm, beacon light, "MANUALLY.", trace, tape-stop gag |
| 4–6.2 | The anomaly | 3D control room, 15 surveillance screens of the real site wake up by themselves |
| 6.2–7.2 | The scan | Laser beams sweep a 4,200-node grid |
| 7.2–9 | The name | CRT terminal: "UNKNOWN SYSTEM DETECTED" → "ZELTRION" decodes |
| 9–13 | The Architect | Founder dossier, rim-lit cut-out, scanning rings, brand arcs |
| 13–16 | Breach | Light streak through an opening corridor into a cream whiteout (beat drop) |
| 16–28 | The website | 3D laptop homepage, services, Ask Zeltrion, process deck, Zelrise logo build, the library, a wall of every page, the letter form on a phone, the admin dashboard ("Even the admin panel has manners.") |
| 28–34 | Reveal | The ZS emblem, traced from the official logo, is extruded in 3D and assembles. It locks, then cross-fades to the untouched official logo |
| 34–40 | Final transmission | CRT power-off, "THE SYSTEM IS LIVE.", URL, follow CTA, P.S. joke |

Brand rules followed: cream `#F7F3EC`, maroon `#63080F` and dark green `#043417`, with lighter light-emitting tints of the same
hues in dark scenes. The flat logo is never redrawn: the final lock-up composites the supplied artwork, and the
Zelrise animation uses masked layers of the original file. Every website shot is real footage.

## Sound

The score and sound effects are synthesized from scratch (`audio/`), so there are no licensing issues. The score is
an original D-minor thriller piece at 120 BPM with an anthem drop at 16 s, synced to the picture. The sound design
includes braams, sub drops, impacts with metallic tails, Shepard-tone risers, reverse swells, a tape stop, CRT
power-on/off, data chirps, typing, radio static, latch and servo sounds, and FM bells.

## Rebuild

```bash
# 1. clip extraction from the two screen recordings (site + admin)
tools/extract_clips.sh "<site recording>.mp4" "<admin recording>.mp4"
python3 -c "import os,json;d='assets/site';json.dump({n:len(os.listdir(f'{d}/{n}')) for n in sorted(os.listdir(d)) if os.path.isdir(f'{d}/{n}')},open(f'{d}/manifest.json','w'))"
# (optional) regenerate derived logo assets
python3 tools/vectorize_logo.py /tmp/emblem_debug.png && python3 tools/prep_logos.py
# 2. picture (Three.js in headless Chromium; split the range across processes)
cd render && npm i && node capture.mjs ../frames 0 600 & node capture.mjs ../frames 600 1200
# 3. sound
cd audio && python3 score.py mix.wav
# 4. encode
tools/encode.sh frames audio/mix.wav out/zeltrion-the-system-is-live.mp4
```

`render/timeline.json` is the master timeline (shots, cuts and transition FX). Each shot lives in `render/shots/*.js`.
To preview any moment, call `window.renderAt(t)` in `render/index.html`.
