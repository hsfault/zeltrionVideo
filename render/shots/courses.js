// 23.5–24.5  COURSES: "Every course, a book." — push into the shelf, the book opens.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePanel, screenMaterial, ClipTexture } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, creamPost } from '../ui.js';
const ASP = 1280 / 612;
export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false }); S.scene = st.scene; S.deco = st.deco; st.deco.position.set(0, 0, -12);
    const RA = 0.64 * 1280 / 612;
    S.clip = new ClipTexture(); S.mat = screenMaterial({ map: S.clip.tex, uvRect: [0.18, 0, 0.64, 1], glare: 0.3, round: 0.025, aspect: RA }); S.mat.transparent = true;
    S.p = makePanel(S.mat, 3.0, 3.0 / RA); S.p.position.y = 0.45; S.scene.add(S.p);
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const second = lt >= 0.5;
    if (!second) await S.clip.set('shelf', 0.3 + lt * 1.2); else await S.clip.set('book_open', 0.1 + (lt - 0.5) * 3.2);
    const p = E.inOutCubic(lt);
    S.p.rotation.set(lerp(0.12, 0, p), lerp(0.35, -0.08, p), 0);
    cam.position.set(lerp(0.6, 0, p), lerp(-0.3, 0.45, p), lerp(9.6, 6.6, E.inCubic(lt) * 0.6 + p * 0.4)); cam.lookAt(0, lerp(0.35, 0.5, p), 0);
    S.deco.rotation.z = lt * 0.1 + 3;
    creamPost(post);
    chapter(hud, '06', 'THE LIBRARY', lt);
    hud.maskedText('Every course,', W / 2, 1400, inv(0.05, 0.35, lt), { font: '500 80px "Cormorant Garamond"', color: '#1f1a17' });
    hud.maskedText('a book.', W / 2, 1490, inv(0.18, 0.48, lt), { font: 'italic 600 80px "Cormorant Garamond"', color: BRAND.maroon });
  };
  return S;
}
