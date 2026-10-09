"""Small synthesis toolkit for the reel's score and sound design (numpy/scipy, 48 kHz)."""
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------- oscillators ----------------
def sine(f, dur, phase=0.0):
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * t_(dur) + phase)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph + phase)


def saw(f, dur, phase=0.0):
    n = int(dur * SR)
    fr = np.full(n, f) if np.isscalar(f) else f[:n]
    ph = (np.cumsum(fr) / SR + phase) % 1.0
    s = 2 * ph - 1
    # polyBLEP to tame aliasing
    dt = fr / SR
    a = ph < dt
    x = ph[a] / dt[a]; s[a] -= x + x - x * x - 1
    b = ph > 1 - dt
    x = (ph[b] - 1) / dt[b]; s[b] -= x * x + x + x + 1
    return s


def square(f, dur, pw=0.5):
    return np.sign(sine(f, dur)) * 0.8


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def pink(dur):
    n = int(dur * SR)
    w = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR); f[0] = 1
    p = np.fft.irfft(w / np.sqrt(f), n)
    return p / (np.abs(p).max() + 1e-9)


# ---------------- envelopes ----------------
def env_exp(dur, decay, attack=0.002):
    t = t_(dur)
    e = np.exp(-t / decay)
    if attack > 0:
        e *= np.clip(t / attack, 0, 1)
    return e


def env_adsr(dur, a, d, s, r):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-6)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-6)
    rel = t > dur - r
    e[rel] *= np.clip((dur - t[rel]) / max(r, 1e-6), 0, 1)
    return e


def bell_curve(dur, peak=0.5, sharp=2.0):
    t = np.linspace(0, 1, int(dur * SR))
    return np.where(t < peak, (t / peak) ** sharp, ((1 - t) / (1 - peak)) ** sharp)


# ---------------- filters ----------------
def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, x)


def sweep_filter(x, fc_curve, kind='low', q=0.707, block=256):
    """Time-varying biquad (RBJ), coefficients updated per block."""
    y = np.zeros_like(x); z1 = z2 = 0.0
    fc_curve = np.asarray(fc_curve)
    for i in range(0, len(x), block):
        fc = float(np.clip(fc_curve[min(i, len(fc_curve) - 1)], 20, SR * 0.45))
        w0 = 2 * np.pi * fc / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
        if kind == 'low':
            b = np.array([(1 - c) / 2, 1 - c, (1 - c) / 2])
        elif kind == 'high':
            b = np.array([(1 + c) / 2, -(1 + c), (1 + c) / 2])
        else:  # band (constant peak)
            b = np.array([al, 0, -al])
        a = np.array([1 + al, -2 * c, 1 - al])
        b /= a[0]; a /= a[0]
        seg = x[i:i + block]
        out, zf = signal.lfilter(b, a, seg, zi=np.array([z1, z2]) if True else None)
        z1, z2 = zf
        y[i:i + block] = out
    return y


def sat(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


# ---------------- space ----------------
_ir_cache = {}


def ir(length=2.8, decay=0.9, bright=6000, seed=1, predelay=0.012):
    key = (length, decay, bright, seed, predelay)
    if key in _ir_cache:
        return _ir_cache[key]
    r = np.random.default_rng(seed); n = int(length * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        nz = r.standard_normal(n) * np.exp(-t * 6.9 / (decay * length))
        nz = lp(nz, bright)
        nz[:int(predelay * SR)] = 0
        # early reflections
        for k in range(10):
            d = int((0.008 + r.random() * 0.06) * SR)
            if d < n: nz[d] += (r.random() - 0.5) * 1.6 * (1 - k / 10)
        out.append(nz / np.sqrt(np.sum(nz ** 2)))
    _ir_cache[key] = np.stack(out)
    return _ir_cache[key]


def reverb(x, wet=0.3, **kw):
    """mono or stereo in -> stereo out"""
    h = ir(**kw)
    if x.ndim == 1:
        x = np.stack([x, x])
    w = np.stack([signal.fftconvolve(x[c], h[c])[:x.shape[1]] for c in range(2)])
    return x * (1 - wet) + w * wet * 1.6


def pan(x, p):
    """p in [-1,1] scalar or array -> stereo"""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def stereo_widen(x, amt=0.004):
    d = int(amt * SR)
    return np.stack([x, np.concatenate([np.zeros(d), x[:-d]])])


# ---------------- timeline bus ----------------
class Bus:
    def __init__(self, dur):
        self.x = np.zeros((2, int(dur * SR) + SR))

    def add(self, sig, at, gain=1.0, p=0.0):
        if sig.ndim == 1:
            sig = pan(sig, p)
        i = int(round(at * SR))
        if i < 0:
            sig = sig[:, -i:]; i = 0
        n = min(sig.shape[1], self.x.shape[1] - i)
        if n > 0:
            self.x[:, i:i + n] += sig[:, :n] * gain
