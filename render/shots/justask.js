// 20.0–21.0  JUST ASK: the site's built-in "Ask Zeltrion" chat.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePanel, screenMaterial, ClipTexture } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, caption, creamPost } from '../ui.js';

export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false }); S.scene = st.scene; S.deco = st.deco; st.deco.position.set(0, 0.5, -12);
    S.clip = new ClipTexture();
    const rect = [0.05, 0.06, 0.75, 0.86]; const asp = (rect[2] * 1280) / (rect[3] * 612);
    S.mat = screenMaterial({ map: S.clip.tex, uvRect: rect, glare: 0.4, round: 0.03, aspect: asp }); S.mat.transparent = true;
    S.panel = makePanel(S.mat, 3.0, 3.0 / asp); S.scene.add(S.panel);
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    await S.clip.set('justask', 0.9 + lt * 2.2);
    const p = E.inOutCubic(lt);
    const a = lerp(-0.32, 0.1, p), d = lerp(9.8, 9.0, p);
    S.panel.position.set(0, 0.55, 0);
    cam.position.set(Math.sin(a) * d, lerp(0.2, 0.7, p), Math.cos(a) * d); cam.lookAt(0, 0.45, 0);
    S.deco.rotation.z = lt * 0.1 + 1;
    creamPost(post);
    chapter(hud, '03', 'ASK ZELTRION', lt);
    caption(hud, ['Questions at 2:47 AM?', 'Just ask.'], lt, 0.12, { y: 1400, size: 80, italicIdx: [1], stagger: 0.25 });
  };
  return S;
}
