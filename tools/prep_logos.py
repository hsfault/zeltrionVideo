"""Make transparent (colour-to-alpha from white) versions of the supplied logos and split Zelrise into animatable layers.
Pixels are never redrawn: each layer is a masked copy of the original artwork."""
import numpy as np
from PIL import Image

def to_alpha(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255.0
    alpha = np.clip((1.0 - a.min(axis=2)) / 0.92, 0, 1)            # distance from white
    alpha[alpha < 0.03] = 0
    rgb = np.where(alpha[..., None] > 0, (a - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0)
    return np.dstack([np.clip(rgb, 0, 1), alpha])

def save(arr, path):
    Image.fromarray((arr * 255).astype(np.uint8), "RGBA").save(path)

z = to_alpha("assets/src/zeltrion_logo.jpg"); save(z, "assets/zeltrion_logo_alpha.png")
# wordmark block of the Zeltrion logo (ZELTRION / SOLUTIONS / tagline) for separate animation
H, W = z.shape[:2]
wm = z.copy(); wm[:860] = 0; save(wm, "assets/zeltrion_wordmark_alpha.png")

r = to_alpha("assets/src/zelrise_logo.jpg"); save(r, "assets/zelrise_logo_alpha.png")
H, W = r.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
rgb = r[..., :3]
blue = (rgb[..., 2] > rgb[..., 0] + 0.1)
arrow = (xx > 845) & (yy < 360) & blue
tassel = (xx > 800) & (xx < 850) & (yy < 325) & (yy > 180) & ~blue
cap = ((yy < 262) & (xx < 870) & ~blue) | tassel
mono = (yy >= 262) & (yy < 672) & ~arrow & ~tassel
# the right maroon swoosh rises above y=262 near x 930-1000
mono |= (yy > 300) & (yy < 672) & (xx > 870) & ~blue
word = (yy >= 672) & (yy < 862)
tag = (yy >= 862) & (yy < 935)
rule = (yy >= 935) & (yy < 995)
by = yy >= 995
for name, m in dict(cap=cap, arrow=arrow, mono=mono, word=word, tag=tag, rule=rule, by=by).items():
    layer = r.copy(); layer[~m] = 0; save(layer, f"assets/zelrise_{name}.png")
print("ok")
