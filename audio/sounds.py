"""Instruments and designed sound effects."""
import numpy as np
from synth import *


# ================= drums =================
def kick(punch=1.0, dur=0.45):
    t = t_(dur)
    f = 45 + 110 * np.exp(-t / 0.035) * punch
    body = sine(f, dur) * env_exp(dur, 0.18, 0.001)
    click = hp(noise(dur), 2500) * env_exp(dur, 0.004) * 0.35
    return sat(body * 1.2 + click, 1.6) * 0.9


def clap(dur=0.35):
    n = noise(dur); e = np.zeros(len(n)); t = t_(dur)
    for k, d in enumerate([0, 0.011, 0.022]):
        e += (t >= d) * np.exp(-(t - d) / (0.006 if k < 2 else 0.09)) * (t >= d)
    return bp(n, 900, 3200) * e * 0.8


def hat(open_=False):
    dur = 0.3 if open_ else 0.06
    return hp(noise(dur), 7000, 4) * env_exp(dur, 0.12 if open_ else 0.018) * 0.35


def tom(m=38, dur=0.9):
    t = t_(dur); f = mtof(m) * (1 + 0.6 * np.exp(-t / 0.05))
    return sat(sine(f, dur) * env_exp(dur, 0.32, 0.002) + lp(noise(dur), 600) * env_exp(dur, 0.05) * 0.4, 1.3)


def taiko(dur=1.4):
    t = t_(dur); f = 58 * (1 + 0.5 * np.exp(-t / 0.04))
    skin = sine(f, dur) * env_exp(dur, 0.45, 0.002)
    slap = bp(noise(dur), 200, 1500) * env_exp(dur, 0.03) * 0.7
    return sat(skin + slap, 1.5)


def snare(dur=0.25):
    t = t_(dur)
    return (bp(noise(dur), 1500, 7000) * env_exp(dur, 0.06) * 0.7 + sine(190 * (1 + 0.3 * np.exp(-t / 0.02)), dur) * env_exp(dur, 0.05) * 0.5)


# ================= tonal =================
def supersaw(m, dur, voices=7, detune=0.18, cutoff=3200, attack=0.02, release=0.2):
    s = 0
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
        s = s + saw(mtof(m + d), dur, phase=rng.random())
    s /= voices
    return lp(s, cutoff, 2) * env_adsr(dur, attack, 0.1, 0.85, release)


def pad(ms, dur, cutoff=2200, attack=0.4, release=0.8, detune=0.12):
    return sum(supersaw(m, dur, 5, detune, cutoff, attack, release) for m in ms) / len(ms)


def pluck(m, dur=0.25, bright=5000):
    s = saw(mtof(m), dur) * 0.6 + square(mtof(m) * 2, dur) * 0.15
    fc = 300 + bright * np.exp(-t_(dur) / 0.06)
    return sweep_filter(s, fc, 'low', 1.2) * env_exp(dur, 0.12, 0.002)


def subbass(m, dur):
    s = sine(mtof(m), dur) + 0.25 * sine(mtof(m) * 2, dur)
    return sat(s * env_adsr(dur, 0.005, 0.05, 0.9, 0.04), 1.4) * 0.8


def reese(m, dur, cutoff=600):
    s = saw(mtof(m) * 1.003, dur) + saw(mtof(m) * 0.997, dur) + 0.6 * sine(mtof(m), dur)
    return sat(lp(s, cutoff, 2), 1.5) * env_adsr(dur, 0.004, 0.05, 0.7, 0.03) * 0.5


def braam(dur=2.4, root=26, bright=1.0):
    """Big low brass 'BRAAM' (detuned saws + square, opening filter, saturation)."""
    t = t_(dur)
    s = 0
    for m, g in [(root, 1.0), (root + 12, 0.8), (root + 19, 0.45), (root - 12, 0.5)]:
        for d in (-0.08, 0.0, 0.09):
            s = s + saw(mtof(m + d), dur, rng.random()) * g
    fc = 120 + 1600 * bright * np.clip(t / 0.18, 0, 1) * np.exp(-t / 1.2)
    s = sweep_filter(s, fc, 'low', 0.9)
    s = sat(s * 0.6, 2.5)
    return s * env_adsr(dur, 0.06, 0.4, 0.75, 1.0)


def fm_bell(f, dur=3.0, ratio=1.41, index=3.0):
    t = t_(dur); ie = index * np.exp(-t / 0.6)
    mod = np.sin(2 * np.pi * f * ratio * t) * ie
    return np.sin(2 * np.pi * f * t + mod) * env_exp(dur, 0.9, 0.003)


def shepard_riser(dur, base=110, rate=1.0):
    t = t_(dur); out = 0
    for k in range(6):
        pos = (k / 6 + t / dur * rate) % 1.0
        f = base * 2 ** (pos * 6)
        amp = np.sin(np.pi * pos) ** 2
        out = out + np.sin(2 * np.pi * np.cumsum(f) / SR) * amp
    return out / 3


# ================= designed SFX =================
def impact(size=1.0, dur=3.5, metal=True, tone=None):
    t = t_(dur)
    boom = sine(32 + 70 * np.exp(-t / 0.08), dur) * env_exp(dur, 0.7 * size, 0.001)
    body = lp(noise(dur), 260) * env_exp(dur, 0.25 * size) * 1.5
    crack = hp(noise(dur), 3000) * env_exp(dur, 0.012) * 0.6
    s = sat(boom * 1.3, 1.8) + body + crack
    if metal:
        fr = [173, 412, 687, 1013, 1588, 2310]
        s = s + sum(np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / (0.9 / (1 + i * 0.4))) for i, f in enumerate(fr)) * 0.09
    if tone is not None:
        s = s + fm_bell(tone, dur, 2.0, 1.5) * 0.15
    return s * 0.8


def sub_drop(dur=2.0, f0=95, f1=28):
    t = t_(dur); f = f1 + (f0 - f1) * np.exp(-t / (dur * 0.35))
    return sat(sine(f, dur) * env_exp(dur, dur * 0.45, 0.005), 1.3)


def whoosh(dur=0.6, f0=300, f1=4000, q=1.5, peak=0.55):
    n = pink(dur) + noise(dur) * 0.1
    fc = np.geomspace(f0, f1, len(n))
    s = sweep_filter(n, fc, 'band', q) * bell_curve(dur, peak, 2.2)
    return s / (np.abs(s).max() + 1e-9)


def riser(dur=2.5, f0=200, f1=9000):
    n = noise(dur); fc = np.geomspace(f0, f1, len(n))
    s = sweep_filter(n, fc, 'band', 2.5) * (t_(dur) / dur) ** 1.6
    s = s / (np.abs(s).max() + 1e-9)
    sh = shepard_riser(dur, 80, 0.9) * (t_(dur) / dur) ** 1.3 * 0.5
    return s * 0.8 + sh


def reverse_swell(dur=1.2, size=1.0):
    x = impact(size, dur * 2.5, metal=True)
    x = reverb(x, 0.8, length=2.5, decay=0.9)[0]
    x = x[:int(dur * SR)][::-1]
    return x / (np.abs(x).max() + 1e-9) * (t_(dur) / dur) ** 0.6


def glitch(dur=0.3, seed=0):
    r = np.random.default_rng(seed); out = np.zeros(int(dur * SR)); i = 0
    while i < len(out):
        L = int(r.uniform(0.008, 0.04) * SR); kind = r.integers(0, 3)
        tt = np.arange(L) / SR
        if kind == 0: seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 3000) * tt))
        elif kind == 1: seg = r.standard_normal(L)
        else: seg = np.sin(2 * np.pi * r.uniform(800, 6000) * tt)
        seg = np.round(seg * 6) / 6 * r.uniform(0.2, 1)
        reps = r.integers(1, 4)
        for _ in range(reps):
            n = min(L, len(out) - i)
            if n <= 0: break
            out[i:i + n] = seg[:n]; i += n
    return bp(out, 300, 9000) * 0.5


def data_chirps(dur=0.8, rate=40, seed=1, lo=900, hi=4200):
    r = np.random.default_rng(seed); out = np.zeros(int(dur * SR))
    t = 0.0
    while t < dur:
        L = 0.012 + r.random() * 0.02; f = r.uniform(lo, hi)
        s = np.sin(2 * np.pi * f * t_(L)) * np.hanning(int(L * SR))
        i = int(t * SR); n = min(len(s), len(out) - i); out[i:i + n] += s[:n] * r.uniform(0.3, 1)
        t += 1 / rate * r.uniform(0.6, 1.4)
    return out * 0.4


def tick(f=2600, dur=0.03, g=1.0):
    return (np.sin(2 * np.pi * f * t_(dur)) * env_exp(dur, 0.005) + hp(noise(dur), 4000) * env_exp(dur, 0.002) * 0.5) * g


def key_click(seed=0):
    r = np.random.default_rng(seed); dur = 0.04
    s = bp(noise(dur), r.uniform(1800, 3500), 9000) * env_exp(dur, 0.004) + sine(r.uniform(140, 200), dur) * env_exp(dur, 0.008) * 0.4
    return s * r.uniform(0.6, 1.0)


def typing(dur, cps=28, seed=3):
    r = np.random.default_rng(seed); out = np.zeros(int(dur * SR)); t = 0
    while t < dur - 0.05:
        k = key_click(int(r.integers(0, 1e6))); i = int(t * SR); n = min(len(k), len(out) - i); out[i:i + n] += k[:n]
        t += 1 / cps * r.uniform(0.6, 1.4)
    return out


def static(dur, crackle=1.0):
    n = bp(noise(dur), 500, 3800) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t_(dur)))
    imp = (rng.random(int(dur * SR)) > 0.9985).astype(float) * rng.standard_normal(int(dur * SR)) * 1.5 * crackle
    return (n * 0.5 + lp(hp(imp, 800), 6000)) * 0.5


def crt_on(dur=0.5):
    t = t_(dur)
    thunk = lp(noise(dur), 400) * env_exp(dur, 0.03) * 1.2 + sine(60, dur) * env_exp(dur, 0.06)
    whine = np.sin(2 * np.pi * (6000 + 2500 * t / dur) * t) * env_exp(dur, 0.25, 0.02) * 0.06
    zap = hp(noise(dur), 2500) * env_exp(dur, 0.02) * 0.4
    return thunk + whine + zap


def crt_off(dur=0.6):
    t = t_(dur); f = 90 + 2400 * np.exp(-t / 0.08)
    return sine(f, dur) * env_exp(dur, 0.18, 0.001) * 0.6 + lp(noise(dur), 900) * env_exp(dur, 0.04) * 0.6


def heartbeat():
    dur = 0.7
    a = sine(52 * (1 + 0.4 * np.exp(-t_(dur) / 0.03)), dur) * env_exp(dur, 0.09, 0.004)
    b = np.zeros_like(a); d = int(0.24 * SR); b[d:] = a[:-d] * 0.7
    return sat((a + b) * 1.5, 1.4)


def latch(dur=0.5):
    t = t_(dur)
    c1 = hp(noise(dur), 2000) * env_exp(dur, 0.004)
    c2 = np.zeros_like(c1); d = int(0.035 * SR); c2[d:] = c1[:-d] * 0.7
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) for f in (2210, 3570, 5120)) * 0.08
    body = lp(noise(dur), 300) * env_exp(dur, 0.03) * 0.9
    return c1 + c2 + ring + body


def servo(dur=0.4, f0=180, f1=420):
    f = np.geomspace(f0, f1, int(dur * SR))
    s = saw(f, dur) * 0.4 + saw(f * 2.01, dur) * 0.2
    return bp(s, 200, 3000) * bell_curve(dur, 0.5, 1.2) * 0.4


def confirm(notes=(81, 86), gap=0.09):
    out = np.zeros(int(0.9 * SR))
    for k, m in enumerate(notes):
        s = (sine(mtof(m), 0.6) * 0.7 + sine(mtof(m) * 2, 0.6) * 0.15) * env_exp(0.6, 0.18, 0.003)
        i = int(k * gap * SR); out[i:i + len(s)] += s
    return out * 0.5


def tape_stop(x, start, dur):
    """x stereo; slow playback to a halt from `start` over `dur` seconds; silence afterwards."""
    i0 = int(start * SR); n = int(dur * SR)
    u = np.arange(n) / n; rate = (1 - u) ** 1.6
    pos = i0 + np.cumsum(rate)
    out = x.copy()
    for c in range(2):
        out[c, i0:i0 + n] = np.interp(pos, np.arange(x.shape[1]), x[c]) * (1 - u ** 3)
        out[c, i0 + n:] = 0
    return out
