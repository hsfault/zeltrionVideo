// 24.5–25.5  EVERY PAGE: a fly-over across a wall of real pages.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePanel, screenMaterial, ClipTexture } from '../lib.js';
import { creamStudio } from '../env.js';
import { creamPost, chapter } from '../ui.js';
const ASP = 1280 / 612;
const NAMES = ['testimonials', 'partners', 'about', 'arcs', 'step', 'departments', 'conversation', 'footer', 'svc_cards', 'better', 'founder_sec', 'plan',
  'd_team', 'svc_intro', 'zelrise_hero', 'listen', 'justask', 'svc_page', 'shelf', 'home', 'builds', 'd_detail', 'sent', 'svc_orbit'];
export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false, arcs: false }); S.scene = st.scene;
    S.grid = new THREE.Group(); S.scene.add(S.grid); S.cells = [];
    const w = 1.7, h = w / ASP, gx = 0.16, gy = 0.16;
    NAMES.forEach((n, i) => {
      const c = i % 4, r = Math.floor(i / 4);
      const clip = new ClipTexture(); const mat = screenMaterial({ map: clip.tex, glare: 0.2 });
      const p = makePanel(mat, w, h, { thickness: 0.02 });
      p.position.set((c - 1.5) * (w + gx), (2.5 - r) * (h + gy), 0); S.grid.add(p);
      S.cells.push({ clip, n, off: 0.2 + (i % 5) * 0.15, p });
    });
    S.grid.rotation.set(-0.55, 0.42, 0.14);
    S.camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    await Promise.all(S.cells.map(c => c.clip.set(c.n, c.off + lt)));
    const p = E.inOutSine(lt);
    S.cells.forEach((c, i) => { c.p.position.z = 0.25 * Math.sin(lt * 3 + i); });
    cam.position.set(lerp(-1.6, 1.4, p), lerp(-2.4, 1.6, p), lerp(5.2, 4.6, p)); cam.lookAt(lerp(-0.9, 0.7, p), lerp(-1.4, 1.0, p), 0);
    creamPost(post); post.vignette = 0.55;
    chapter(hud, '07', 'EVERY PAGE', lt);
    const a = inv(0.05, 0.25, lt);
    hud.pill(W / 2 - 360, 880, 720, 230, 'rgba(247,243,236,0.92)', null, a);
    hud.maskedText('EVERY PAGE.', W / 2, 950, inv(0.08, 0.35, lt), { font: '600 72px Cinzel', color: BRAND.maroon, track: 6 });
    hud.maskedText('EVERY DETAIL.', W / 2, 1045, inv(0.3, 0.6, lt), { font: '600 72px Cinzel', color: BRAND.green, track: 6 });
  };
  return S;
}
