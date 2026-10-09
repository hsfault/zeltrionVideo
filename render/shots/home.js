// 16.0–18.5  FIRST CONTACT: the real homepage on a 3D laptop, pull-back + orbit.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makeLaptop, screenMaterial, ClipTexture, browserChromeTexture, softShadow } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, caption, creamPost } from '../ui.js';

export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ arcs: false }); S.scene = st.scene; S.deco = st.deco;
    S.clip = new ClipTexture();
    const chromePx = 96, aspect = 1280 / (612 + chromePx);
    S.mat = screenMaterial({ map: S.clip.tex, chrome: browserChromeTexture(1280, chromePx), chromeFrac: chromePx / (612 + chromePx), brightness: 1.0, glare: 0.5 });
    S.lap = makeLaptop(S.mat, { width: 3.2, aspect }); S.scene.add(S.lap);
    const sh = softShadow(5.2, 4.2, 0.45); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; S.scene.add(sh);
    S.lap.updateMatrixWorld(true);
    S.scrC = new THREE.Vector3(); S.lap.userData.screen.getWorldPosition(S.scrC);
    S.scrN = new THREE.Vector3(0, 0, 1).applyQuaternion(S.lap.userData.screen.getWorldQuaternion(new THREE.Quaternion()));
    S.camera = new THREE.PerspectiveCamera(40, W / H, 0.02, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    await S.clip.set('home', 0.4 + lt * 1.0);
    const p = E.inOutCubic(inv(0.0, 2.4, lt));
    // start: close on the screen (ZS emblem area), end: 3/4 orbit view of the laptop
    const start = S.scrC.clone().add(S.scrN.clone().multiplyScalar(2.0)).add(new THREE.Vector3(0, 0.1, 0));
    const ang = lerp(0, 0.62, p), dist = lerp(2.0, 8.4, E.inOutCubic(inv(0.0, 2.2, lt)));
    const tgt = S.scrC.clone().lerp(new THREE.Vector3(0.45, 0.85, -0.35), p);
    const pos = new THREE.Vector3(Math.sin(ang) * dist, lerp(start.y, 3.1, p), Math.cos(ang) * dist + lerp(S.scrC.z, 0, p));
    cam.position.copy(pos); cam.lookAt(tgt); cam.rotation.z += lerp(-0.04, 0, p);
    S.deco.rotation.z = lt * 0.05;
    creamPost(post);
    chapter(hud, '01', 'THE WEBSITE', lt);
    caption(hud, ['Where strategy', 'meets intelligence.'], lt, 0.9, { y: 1440, size: 84, italicIdx: [1] });
  };
  return S;
}
