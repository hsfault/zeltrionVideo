"""Arrange the original score + sound design for 'The System Is Live' (40 s) and write audio/mix.wav.
Timings mirror render/timeline.json (120 BPM grid; beat = 0.5 s)."""
import json, sys
import numpy as np
import soundfile as sf
from synth import *
from sounds import *

DUR = 40.0
M = Bus(DUR)     # music
X = Bus(DUR)     # sound design
B = 0.5          # beat
S16 = B / 4

D_MIN = [62, 65, 69]; BB = [58, 62, 65]; F_MAJ = [60, 65, 69]; C_MAJ = [60, 64, 67]; G_MIN = [62, 67, 70]; A_MAJ = [61, 64, 69]; D_MAJ = [62, 66, 69, 74]
ROOT = {'Dm': 26, 'Bb': 22, 'F': 29, 'C': 24, 'Gm': 31, 'A': 33, 'D': 26}
CH = {'Dm': D_MIN, 'Bb': BB, 'F': F_MAJ, 'C': C_MAJ, 'Gm': G_MIN, 'A': A_MAJ, 'D': D_MAJ}
kicks = []   # for sidechain


def rv(x, wet=0.35, length=2.6, decay=0.85, bright=6000):
    return reverb(x, wet, length=length, decay=decay, bright=bright)


# ======================= MUSIC =======================
def ostinato(t0, t1, cut0, cut1, gain=0.5, pattern=(0, 0, 12, 0, 0, 3, 0, 7), root=26):
    n = int(round((t1 - t0) / S16))
    for i in range(n):
        t = t0 + i * S16; u = i / max(n - 1, 1)
        m = root + pattern[i % len(pattern)]
        M.add(reese(m, S16 * 0.9, cutoff=cut0 + (cut1 - cut0) * u), t, gain * (1.0 if i % 4 == 0 else 0.75))


def hats16(t0, t1, gain=0.12, open_off=False):
    n = int(round((t1 - t0) / S16))
    for i in range(n):
        g = gain * (1.0 if i % 2 == 0 else 0.55)
        M.add(hat(), t0 + i * S16, g, p=0.25 * np.sin(i))
        if open_off and i % 4 == 2:
            M.add(hat(True), t0 + i * S16, gain * 1.6, p=-0.2)


def chord_pad(name, t, dur, gain=0.18, cutoff=1800, attack=0.3, octave=0):
    ms = [m + octave for m in CH[name]]
    p = pad(ms, dur + 0.6, cutoff=cutoff, attack=attack, release=0.6)
    M.add(stereo_widen(p, 0.007), t, gain)


def drum_kick(t, g=0.9):
    M.add(kick(), t, g); kicks.append(t)


# ---- A: hook (0 – 2.7), tape-stopped on the punchline
ostinato(0.0, 3.2, 380, 700, 0.24)
hats16(0.0, 3.2, 0.07)
chord_pad('Dm', 0.0, 3.2, 0.12, 900, 0.05, -12)
for t in (0.0, 1.0, 2.0):
    M.add(taiko(), t, 0.35)
M.x = tape_stop(M.x, 2.7, 0.42)

# ---- B: anomaly → name (4.0 – 8.55)
ostinato(4.0, 8.55, 400, 1300, 0.24)
hats16(4.0, 8.5, 0.08)
for t in np.arange(4.0, 8.5, 1.0):
    M.add(taiko(), t, 0.38)
for t in (5.75, 5.875, 7.75, 7.875):
    M.add(tom(41), t, 0.35)
chord_pad('Dm', 4.0, 2.0, 0.14, 1200, 0.4, -12); chord_pad('Bb', 6.0, 1.0, 0.14, 1300, 0.2, -12); chord_pad('Gm', 7.0, 1.55, 0.14, 1400, 0.2, -12)
# ---- C: architect (9.0 – 13.0)
ostinato(9.0, 13.0, 600, 1600, 0.27)
hats16(9.0, 13.0, 0.09, open_off=True)
for i, t in enumerate(np.arange(9.0, 13.0, B)):
    if i % 2 == 0: M.add(taiko(), t, 0.4)
    if i % 4 == 2: M.add(snare(), t, 0.4)
for name, t in (('Dm', 9.0), ('Bb', 10.0), ('Gm', 11.0), ('A', 12.0)):
    chord_pad(name, t, 1.0, 0.16, 2000, 0.15, -12)
    M.add(subbass(ROOT[name], 1.0), t, 0.45)
# ---- D: build (13.0 – 15.75)
ostinato(13.0, 15.75, 900, 4200, 0.3)
for t in np.arange(13.0, 15.6, B): drum_kick(t, 0.75)
roll = list(np.arange(13.0, 14.0, B / 2)) + list(np.arange(14.0, 15.0, B / 4)) + list(np.arange(15.0, 15.62, B / 8))
for t in roll:
    M.add(snare(), t, 0.12 + 0.45 * ((t - 13.0) / 2.6) ** 2)
chord_pad('A', 13.0, 2.7, 0.15, 2600, 0.6, -12)

# ---- E: the drop (16.0 – 28.0)
prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb']
for bar, name in enumerate(prog):
    t0 = 16.0 + bar * 2.0
    M.add(hp(noise(1.6), 5000) * env_exp(1.6, 0.6) * 0.25, t0, 1.0, p=0.1)   # crash
    for b in range(4):
        tb = t0 + b * B
        drum_kick(tb, 0.95)
        if b % 2 == 1: M.add(rv(clap(), 0.25, length=1.2), tb, 0.55)
        M.add(hat(True), tb + B / 2, 0.22, p=0.2)
    hats16(t0, t0 + 2.0, 0.09)
    for b in range(8):   # offbeat sub + mid bass
        M.add(subbass(ROOT[name], B / 2 * 0.95), t0 + b * B / 2, 0.55)
        M.add(reese(ROOT[name] + 12, B / 2 * 0.9, 900), t0 + b * B / 2, 0.22)
    chord_pad(name, t0, 2.0, 0.2, 3400, 0.01)
    arp = CH[name] + [CH[name][0] + 12]
    for i in range(16):
        M.add(pluck(arp[(i * 2 + i // 4) % len(arp)] + 12, 0.22), t0 + i * S16, 0.12, p=0.35 * np.sin(i * 1.3))
# lift into the reveal
for t in np.arange(27.0, 28.0, B / 4): M.add(snare(), t, 0.1 + 0.3 * (t - 27.0))

# ---- F: reveal (28.0 – 34.0)
chord_pad('Dm', 28.45, 1.95, 0.13, 900, 1.2, -12)
for t, m in ((30.4, 'D'),):
    chord_pad(m, t, 3.6, 0.2, 2600, 0.02)
    chord_pad(m, t, 3.6, 0.12, 1500, 0.02, -12)
    M.add(subbass(26, 2.5), t, 0.5)
arpD = [62, 66, 69, 74, 78, 74, 69, 66]
for i, t in enumerate(np.arange(30.9, 33.9, B / 2)):
    M.add(pluck(arpD[i % 8] + 12, 0.3, 3500), t, 0.11, p=0.4 * np.sin(i))
for t in np.arange(31.0, 34.0, B): drum_kick(t, 0.45)
for t in np.arange(31.0, 34.0, B): M.add(hat(True), t + B / 2, 0.12)

# ---- G: final transmission (34.95 – 40.0)
for bar, (name, t0, d) in enumerate((('Dm', 35.0, 1.0), ('Bb', 36.0, 1.0), ('F', 37.0, 1.0), ('C', 38.0, 1.0))):
    for b in range(2):
        tb = t0 + b * B; drum_kick(tb, 0.9)
        if b == 1: M.add(rv(clap(), 0.25, length=1.2), tb, 0.5)
        M.add(hat(True), tb + B / 2, 0.2)
    hats16(t0, t0 + d, 0.08)
    for b in range(4):
        M.add(subbass(ROOT[name], B / 2 * 0.95), t0 + b * B / 2, 0.55)
    chord_pad(name, t0, d, 0.18, 3200, 0.01)
    arp = CH[name] + [CH[name][0] + 12]
    for i in range(8): M.add(pluck(arp[i % 4] + 12, 0.2), t0 + i * S16, 0.11)
chord_pad('D', 39.0, 0.9, 0.22, 3000, 0.01)
M.add(subbass(26, 0.9), 39.0, 0.55)

# ======================= SOUND DESIGN =======================
def big(t, size=1.0, wet=0.4, g=1.0, tone=None):
    X.add(rv(impact(size, 3.5, True, tone), wet, length=3.2, decay=0.9, bright=5000), t, g * 0.3)

def swoosh(t_peak, dur=0.4, g=0.5, f0=250, f1=5000, p0=-0.6, p1=0.6):
    w = whoosh(dur, f0, f1, 1.4, 0.6)
    X.add(np.stack([w * np.cos((np.linspace(p0, p1, len(w)) + 1) * np.pi / 4), w * np.sin((np.linspace(p0, p1, len(w)) + 1) * np.pi / 4)]), t_peak - dur * 0.6, g)

# hook
big(0.0, 1.2, 0.4, 1.0); X.add(sub_drop(1.8), 0.0, 0.350); X.add(glitch(0.32, 1), 0.0, 0.5)
X.add(rv(braam(2.2, 26), 0.35, length=3.0), 0.72, 0.3)
for t in (0.27, 0.47): X.add(rv(taiko(), 0.3), t, 0.55)
for k, t in enumerate((0.2, 0.95, 1.7, 2.45)): X.add(whoosh(0.7, 140, 700, 2.0, 0.5), t, 0.18, p=(-0.5 if k % 2 else 0.5))
X.add(data_chirps(0.9, 30, 2, 1200, 3800), 1.45, 0.25, p=0.2)
for k in range(22): X.add(tick(2400 + k * 40, 0.025), 1.5 + k * 0.04, 0.12)
X.add(riser(0.85, 400, 6000), 1.5, 0.15)
X.add(glitch(0.3, 5), 2.3, 0.45); X.add(rv(confirm((50, 45), 0.12), 0.3), 2.34, 0.6)
X.add(lp(noise(0.25), 200) * env_exp(0.25, 0.06) * 0.8, 2.7, 0.6)   # stop thump
X.add(pink(1.0) * 0.004, 2.75, 1.0)                               # room tone
X.add(tick(1800, 0.03), 3.15, 0.15)
X.add(reverse_swell(0.5, 0.8), 3.5, 0.45)
# control room
big(4.0, 0.9, 0.35, 0.8); X.add(glitch(0.25, 7), 4.0, 0.4); swoosh(4.0, 0.5, 0.35, 3000, 300)
for k in range(15):
    col = [7, 3, 11, 1, 9, 13, 5, 0, 6, 12, 4, 10, 2, 14, 8].index(k)
    X.add(crt_on(0.45), 4.05 + k * 0.075, 0.28, p=((col % 5) - 2) * 0.35)
X.add(rv(tom(36), 0.3), 4.55, 0.5)
big(4.85, 0.7, 0.4, 0.6); X.add(rv(braam(1.6, 26, 0.7), 0.35), 4.85, 0.180)
for t in (5.05, 6.05): X.add(heartbeat(), t, 0.5)
# scan
swoosh(6.2, 0.45, 0.4)
tt = t_(1.0); X.add(np.sin(2 * np.pi * np.cumsum(np.geomspace(300, 1300, len(tt))) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * tt)) * bell_curve(1.0, 0.7, 1.0) * 0.12, 6.2, 1.0)
for k in range(7): X.add(tick(3000, 0.025), 6.2 + k * 0.12, 0.14, p=0.3)
swoosh(6.42, 0.35, 0.3, 600, 6000, -0.8, 0.8); swoosh(6.9, 0.35, 0.3, 600, 6000, 0.8, -0.8)
X.add(data_chirps(0.95, 26, 9, 1500, 5000), 6.25, 0.12, p=-0.3)
# terminal
X.add(glitch(0.3, 11), 7.2, 0.45); X.add(static(0.35), 7.2, 0.35)
X.add(typing(0.18, 85, 1), 7.2, 0.5); X.add(typing(0.3, 85, 2), 7.38, 0.5); X.add(typing(0.12, 85, 3), 7.92, 0.5)
X.add(static(0.55) * np.linspace(1, 0, int(0.55 * SR)), 7.38, 0.45)
X.add(data_chirps(0.45, 45, 4, 800, 2600) * np.linspace(0.4, 1, int(0.45 * SR)), 8.15, 0.3)
big(8.55, 1.35, 0.5, 1.1, tone=mtof(50)); X.add(sub_drop(2.0, 80, 26), 8.55, 0.300); X.add(latch(), 8.55, 0.35)
# architect
swoosh(9.0, 0.5, 0.45, 4000, 200); X.add(rv(taiko(), 0.3), 9.0, 0.5)
X.add(data_chirps(0.35, 40, 12), 9.1, 0.18, p=-0.4)
for t in (9.35, 9.5): X.add(rv(tom(33), 0.35), t, 0.45)
sw = sweep_filter(noise(1.4), np.geomspace(300, 3200, int(1.4 * SR)), 'band', 3.0) * bell_curve(1.4, 0.85, 1.2)
X.add(sw / np.abs(sw).max() * 0.25, 9.25, 1.0); X.add(servo(1.4, 90, 160), 9.25, 0.3)
for k, t in enumerate((10.3, 10.85, 11.4)): X.add(data_chirps(0.35, 45, 20 + k), t, 0.2, p=-0.4); X.add(tick(2000, 0.03), t, 0.2, p=-0.4)
X.add(latch(), 10.55, 0.3); X.add(rv(confirm((76, 81)), 0.35), 10.8, 0.5)
for k in range(2):
    s = lp(square(mtof(74 - 4 * k), 0.12), 2500) * env_adsr(0.12, 0.005, 0.02, 0.8, 0.03)
    X.add(rv(s, 0.3), 11.42 + k * 0.14, 0.18)
for k in range(10): X.add(tick(1600 + k * 120, 0.02), 11.55 + k * 0.045, 0.14, p=-0.4)
X.add(rv(braam(0.7, 26, 0.45), 0.3), 12.05, 0.225)        # "…to your competitors." DUN.
X.add(reverse_swell(0.32, 0.9), 12.68, 0.5)
# breach
big(13.0, 1.0, 0.35, 0.85); swoosh(13.0, 0.5, 0.5); X.add(rv(confirm((79, 84)), 0.3), 13.05, 0.45)
X.add(rv(braam(1.8, 26, 0.9), 0.35), 13.85, 0.180)
X.add(riser(2.75, 150, 12000), 13.0, 0.45)
endZ = -(46 - 1) * 1.6 - 0.3 + 1.2
for i in range(46):
    zi = -i * 1.6
    # invert cam z(u) = 2.5 + endZ*(0.18u + 0.82u^2.3)
    us = np.linspace(0, 1, 4000); zc = 2.5 + endZ * (0.18 * us + 0.82 * us ** 2.3)
    k = np.argmin(np.abs(zc - zi)); u = us[k]
    if abs(zc[k] - zi) < 0.2 and 0 < u < 0.99:
        X.add(whoosh(0.16, 1200, 7000, 2.0, 0.6), 13.0 + u * 2.75 - 0.1, 0.13 + 0.1 * u, p=(0.5 if i % 2 else -0.5))
swoosh(15.72, 0.55, 0.55, 300, 9000)
X.add(reverse_swell(0.25, 0.6), 15.75, 0.4)
# drop + website montage
big(16.0, 1.25, 0.35, 1.0); X.add(sub_drop(1.6, 90, 30), 16.0, 0.300); swoosh(16.0, 0.6, 0.45, 5000, 300)
for t in (18.5, 19.25, 20.0, 21.0, 23.5, 24.5, 25.5, 26.5):
    swoosh(t, 0.35, 0.75, 500, 7000, -0.7 if int(t * 2) % 2 else 0.7, 0.7 if int(t * 2) % 2 else -0.7)
    X.add(lp(noise(0.2), 180) * env_exp(0.2, 0.05), t, 0.4)
for k in range(5): X.add(tick(2200, 0.03), 18.5 + k * 0.3, 0.3)
swoosh(19.35, 0.3, 0.6, 600, 6000, -0.9, 0); swoosh(19.38, 0.3, 0.6, 600, 6000, 0.9, 0)
for t, m in ((20.15, 88), (20.4, 91)):
    X.add(rv(sine(np.geomspace(mtof(m - 5), mtof(m), int(0.08 * SR)), 0.08) * env_exp(0.08, 0.03), 0.3), t, 0.25)
for t, p in ((21.32, -0.8), (21.64, 0.8)): swoosh(t + 0.1, 0.3, 0.7, 800, 6000, 0, p)
X.add(rv(fm_bell(mtof(86), 2.0, 3.5, 2.0), 0.4), 22.0, 0.15); X.add(rv(fm_bell(mtof(93), 2.0, 3.5, 2.0), 0.4), 22.04, 0.08)
X.add(rv(tom(40), 0.25), 22.36, 0.4); swoosh(22.62, 0.3, 0.3, 1500, 9000, -0.5, 0.6)
X.add(rv(fm_bell(mtof(98), 1.5, 2.0, 1.2), 0.5), 22.72, 0.07)
pg = bp(noise(0.25), 1500, 6000) * bell_curve(0.25, 0.3, 1.5); X.add(pg, 24.0, 0.25)
swoosh(25.0, 1.0, 0.7, 300, 3000, -0.9, 0.9)
X.add(typing(0.62, 30, 8), 25.5, 0.6); X.add(glitch(0.08, 13), 26.15, 0.3)
swoosh(26.2, 0.3, 0.3, 2000, 400); X.add(rv(confirm((86, 93)), 0.35), 26.2, 0.4)
X.add(glitch(0.1, 17), 27.3, 0.3); X.add(riser(1.0, 300, 9000), 27.0, 0.3)
# reveal
X.add(heartbeat(), 28.05, 0.6)
swoosh(28.85, 0.8, 0.45, 200, 2500, -0.9, 0); swoosh(29.0, 0.8, 0.45, 200, 2500, 0.9, 0)
rot = whoosh(1.9, 200, 1800, 1.2, 0.8) * (0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(np.linspace(9, 2, int(1.9 * SR))) / SR))
X.add(stereo_widen(rot, 0.01), 28.5, 0.3)
X.add(reverse_swell(1.9, 1.3), 28.5, 0.5)
X.add(shepard_riser(1.9, 110, 0.6) * np.linspace(0, 1, int(1.9 * SR)) ** 1.5 * 0.5, 28.5, 0.3)
big(30.4, 1.45, 0.5, 1.1, tone=mtof(62)); X.add(latch(), 30.4, 0.5); X.add(sub_drop(2.2, 85, 28), 30.4, 0.300)
for m, d in ((74, 0), (78, 0.02), (81, 0.04)): X.add(rv(fm_bell(mtof(m), 3.5, 2.0, 1.4), 0.45, length=3.5), 30.4 + d, 0.07)
sh = reverse_swell(0.8, 0.5); X.add(lp(sh, 9000) * 0.5, 31.5, 0.25)
X.add(rv(fm_bell(mtof(98), 2.0, 3.0, 1.5), 0.5), 32.55, 0.05); swoosh(32.8, 0.7, 0.18, 2000, 10000, -0.6, 0.6)
X.add(reverse_swell(0.4, 0.7), 33.6, 0.35)
# final transmission
X.add(crt_off(), 34.0, 0.6)
hum = (sine(100, 0.6) + 0.3 * sine(200, 0.6) + 0.1 * sine(300, 0.6)) * bell_curve(0.6, 0.3, 1.0) * 0.08; X.add(hum, 34.35, 1.0)
big(35.0, 1.15, 0.4, 0.95); X.add(rv(braam(1.5, 26, 0.8), 0.35), 35.0, 0.203)
big(35.25, 0.8, 0.4, 0.55, tone=mtof(74))
X.add(typing(0.55, 40, 21), 35.95, 0.35)
X.add(rv(confirm((81, 86)), 0.4), 36.7, 0.55)
swoosh(37.25, 0.5, 0.2, 800, 4000)
X.add(tick(1500, 0.03), 38.2, 0.15)
big(39.0, 1.3, 0.45, 1.0, tone=mtof(62))
X.add(rv((sine(mtof(86), 0.35) * 0.6 + sine(mtof(98), 0.35) * 0.2) * env_adsr(0.35, 0.005, 0.05, 0.8, 0.1), 0.45, length=3.0), 39.05, 0.22)
for m, d in ((74, 0), (78, 0.02), (81, 0.04)): X.add(rv(fm_bell(mtof(m), 1.0, 2.0, 1.4), 0.45), 39.0 + d, 0.06)

# ======================= MIX =======================
n = int(DUR * SR)
mus, sfx = M.x[:, :n], X.x[:, :n]
# sidechain duck the music under kicks (except the kicks themselves are in the bus; gentle pump)
duck = np.ones(n)
for kt in kicks:
    i = int(kt * SR); L = int(0.22 * SR)
    seg = 1 - 0.45 * np.exp(-np.arange(L) / (0.07 * SR))
    j = min(L, n - i)
    if j > 0: duck[i:i + j] = np.minimum(duck[i:i + j], seg[:j])
mus = mus * duck
mus = reverb(mus.mean(0), 0.12, length=1.8, decay=0.7) * 0.5 + mus * 0.75
# hard silences that the picture calls for
def gate(x, t0, t1, fade=0.01):
    i0, i1, f = int(t0 * SR), int(t1 * SR), int(fade * SR)
    x[:, i0:i1] *= 0
    x[:, i0 - f:i0] *= np.linspace(1, 0, f)
gate(mus, 15.75, 16.0); gate(mus, 28.0, 28.4); gate(mus, 8.6, 9.0, 0.06)
mix = mus * 0.85 + sfx * 0.95
mix = hp(mix, 28)  # keep sub-bass in check for phone speakers
# glue compression (simple RMS) + lookahead peak limiter
rms = np.sqrt(signal.sosfilt(signal.butter(1, 8, fs=SR, output='sos'), (mix ** 2).mean(0)) + 1e-9)
gain = np.minimum(1, (0.25 / rms) ** 0.35)
mix = mix * gain
peak = np.abs(mix).max(0)
look = int(0.004 * SR)
pk = np.maximum.accumulate(np.concatenate([peak, np.zeros(look)])[::-1])[::-1][:n] if False else peak
env = np.maximum(peak, 1e-6)
from scipy.ndimage import maximum_filter1d, uniform_filter1d
env = maximum_filter1d(peak, look * 2 + 1)
g = np.minimum(1, 0.89 / env); g = uniform_filter1d(g, look)
mix = mix * g
# end: clean tail with a short fade, hard cut at 40.0
f = int(0.25 * SR); mix[:, -f:] *= np.linspace(1, 0, f)
mix = np.clip(mix, -1, 1)
sf.write(sys.argv[1] if len(sys.argv) > 1 else 'audio/mix.wav', mix.T.astype(np.float32), SR, subtype='PCM_24')
print('peak', np.abs(mix).max(), 'rms', np.sqrt((mix ** 2).mean()))
