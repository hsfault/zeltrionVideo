// 18.5–20.0  SERVICES: real services pages on floating glass panels.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePanel, screenMaterial, ClipTexture, softShadow } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, creamPost } from '../ui.js';

const AREAS = [['I', 'Technology & Innovation'], ['II', 'Marketing & Growth'], ['III', 'Sales & Business Growth Systems'], ['IV', 'Creative & Design'], ['V', 'Training & Education']];
const ASP = 1280 / 612;

export default function () {
  const S = {};
  const RECT = [0.035, 0, 0.7, 1], RA = 0.7 * 1280 / 612;
  const mkp = (w) => { const clip = new ClipTexture(); const mat = screenMaterial({ map: clip.tex, uvRect: RECT, glare: 0.4, round: 0.025, aspect: RA }); mat.transparent = true; const p = makePanel(mat, w, w / RA); return { clip, mat, p }; };
  S.init = async () => {
    const st = creamStudio({ floor: false }); S.scene = st.scene; S.deco = st.deco; st.deco.position.set(0, 0, -12);
    S.a = mkp(3.0); S.scene.add(S.a.p);
    S.b = mkp(2.3); S.scene.add(S.b.p);
    S.c = mkp(2.3); S.scene.add(S.c.p);
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const second = lt >= 0.75;
    S.a.p.visible = !second; S.b.p.visible = S.c.p.visible = second;
    if (!second) {
      await S.a.clip.set('svc18', 0.2 + lt * 1.2);
      const p = E.outCubic(lt / 0.75);
      S.a.p.position.set(0, 0.35, 0); S.a.p.rotation.set(-0.08, lerp(-0.5, -0.28, p), 0.02);
      cam.position.set(lerp(-0.4, 0.1, p), 0.5, lerp(9.6, 8.9, p)); cam.lookAt(0, 0.35, 0);
    } else {
      const k = lt - 0.75; const p = E.outExpo(k / 0.5);
      await Promise.all([S.b.clip.set('svc_orbit', 0.4 + k * 1.6), S.c.clip.set('svc_page', 0.2 + k * 1.6)]);
      S.b.p.position.set(lerp(-5, -0.12, p), 1.5, 0); S.b.p.rotation.set(0, lerp(0.6, 0.22, p), 0);
      S.c.p.position.set(lerp(5, 0.12, p), -0.15, 0.3); S.c.p.rotation.set(0, lerp(-0.6, -0.22, p), 0);
      cam.position.set(0, 0.45, lerp(9.8, 9.4, E.outCubic(k / 0.75))); cam.lookAt(0, 0.45, 0);
    }
    S.deco.rotation.z = lt * 0.1;
    creamPost(post);
    chapter(hud, '02', 'SERVICES', lt);
    hud.text('18 SERVICES · 5 AREAS · 1 TEAM', 80, 352, { font: '400 24px "JetBrains Mono"', color: '#2b2522', align: 'left', alpha: inv(0.15, 0.35, lt) * 0.7, track: 3 });
    const i = Math.min(4, Math.floor(lt / 0.3)); const li = (lt - i * 0.3) / 0.3;
    const [num, name] = AREAS[i];
    hud.text(num, W / 2, 1425, { font: '600 40px Cinzel', color: BRAND.maroon, alpha: 1 });
    hud.maskedText(name, W / 2, 1505, clamp(li * 2.2), { font: '600 64px "Cormorant Garamond"', color: '#1f1a17' });
    for (let d = 0; d < 5; d++) hud.rect(W / 2 - 70 + d * 30, 1568, 18, 4, d === i ? BRAND.maroon : '#cdbfb2');
  };
  return S;
}
