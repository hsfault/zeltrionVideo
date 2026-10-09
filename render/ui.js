// Shared typographic treatments for the website chapters (cream scenes).
import { BRAND, E, inv, clamp, lerp, W } from './lib.js';

export function chapter(hud, num, title, lt, { dark = false } = {}) {
  const a = inv(0.02, 0.2, lt);
  const col = dark ? BRAND.cream : BRAND.maroon;
  const w = E.outExpo(inv(0.0, 0.35, lt));
  hud.line(80, 300, 80 + 70 * w, 300, col, 3, a);
  hud.text(num, 170, 301, { font: '700 26px "JetBrains Mono"', color: col, align: 'left', alpha: a, track: 4 });
  hud.decode(title, 230, 301, inv(0.05, 0.4, lt), { font: '400 26px "JetBrains Mono"', color: dark ? BRAND.cream : '#2b2522', align: 'left', alpha: a * 0.9, track: 5 }, num.length);
}
// Big serif caption, lines revealed with a mask; style: 'serif' | 'caps'
export function caption(hud, lines, lt, t0, { y = 1450, size = 76, color = BRAND.maroon, gap = 1.1, italicIdx = [], stagger = 0.12, alpha = 1, glow = 0 } = {}) {
  lines.forEach((ln, i) => {
    const p = inv(t0 + i * stagger, t0 + i * stagger + 0.35, lt);
    const italic = italicIdx.includes(i);
    hud.maskedText(ln, W / 2, y + i * size * gap, p, {
      font: `${italic ? 'italic ' : ''}${italic ? 600 : 500} ${size}px "Cormorant Garamond"`, color: italic ? BRAND.maroon : '#1f1a17', alpha, glow,
      glowColor: 'rgba(255,250,240,.9)',
    });
  });
}
export function creamPost(post) {
  post.bloom = [0.3, 0.5, 1.15]; post.vignette = 0.42; post.grain = 0.035; post.ca = 0.0009; post.contrast = 1.07; post.exposure = 0.96;
}
