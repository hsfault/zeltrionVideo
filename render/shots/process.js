// 21.0–22.0  HOW WE WORK: a deck of real process cards flipping on the beat.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePanel, screenMaterial, ClipTexture } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, creamPost } from '../ui.js';

const RA = 0.72 * 1280 / 612;
const CARDS = [['listen', 0.4, 'LISTEN'], ['plan', 0.3, 'PLAN'], ['builds', 0.3, 'BUILD']];
const FLY = [0.3, 0.62];

export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false }); S.scene = st.scene; S.deco = st.deco; st.deco.position.set(0, 0, -12);
    S.cards = CARDS.map(([name, off]) => { const clip = new ClipTexture(); const mat = screenMaterial({ map: clip.tex, uvRect: [0.02, 0, 0.72, 1], glare: 0.4, round: 0.025, aspect: RA }); mat.transparent = true; const p = makePanel(mat, 3.0, 3.0 / RA); S.scene.add(p); return { clip, mat, p, name, off }; });
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const loads = [];
    S.cards.forEach((c, k) => {
      const flyT = k < 2 ? inv(FLY[k], FLY[k] + 0.22, lt) : 0;
      let removed = 0; for (let j = 0; j < Math.min(k, 2); j++) removed += E.outCubic(inv(FLY[j] + 0.06, FLY[j] + 0.28, lt));
      const sl = k - removed;
      const dir = k === 0 ? -1 : 1; const f = E.inCubic(flyT);
      c.p.position.set(dir * f * 6, 0.45 + sl * 0.2 + f * 0.6, -sl * 0.55);
      c.p.rotation.set(-0.06 - sl * 0.04, -0.18 + dir * f * 0.9, dir * f * 0.35);
      c.p.visible = flyT < 1;
      if (c.p.visible) loads.push(c.clip.set(c.name, c.off + lt * 1.0));
    });
    await Promise.all(loads);
    cam.position.set(0.5, 0.9, lerp(9.8, 9.1, E.inOutSine(lt))); cam.lookAt(0, 0.45, 0);
    S.deco.rotation.z = lt * 0.1 + 2;
    creamPost(post);
    chapter(hud, '04', 'HOW WE WORK', lt);
    const cur = FLY.filter(f => lt > f + 0.05).length;
    const words = CARDS.map(c => c[2]); const xs = [-300, 0, 300];
    words.forEach((w, i) => hud.text(w, W / 2 + xs[i], 1450, { font: '600 52px Cinzel', color: i === cur ? BRAND.maroon : '#c9bcb0', track: 6 }));
    const uw = hud.measure(words[cur], '600 52px Cinzel', 6); hud.line(W / 2 + xs[cur] - uw / 2, 1495, W / 2 + xs[cur] + uw / 2, 1495, BRAND.maroon, 3);
  };
  return S;
}
