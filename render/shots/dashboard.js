// 26.5–28.0  BEHIND THE SCENES: the real admin dashboard on a 3D display.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makeMonitor, screenMaterial, ClipTexture, softShadow } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, caption, creamPost } from '../ui.js';
export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ arcs: false }); S.scene = st.scene;
    S.clip = new ClipTexture(); S.mat = screenMaterial({ map: S.clip.tex, glare: 0.45 });
    S.mon = makeMonitor(S.mat, { width: 3.6 }); S.scene.add(S.mon);
    const sh = S.mon.userData.sh; S.mon.position.y = sh / 2 + 1.04;
    const shadow = softShadow(3.0, 2.0, 0.4); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; S.scene.add(shadow);
    S.lamp = new THREE.PointLight(0xffd9b0, 6, 8, 1.6); S.lamp.position.set(-2.5, 3.5, 2); S.scene.add(S.lamp);
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const second = lt >= 0.8;
    if (!second) await S.clip.set('d_greet', 0.4 + lt * 1.2); else await S.clip.set('d_inbox', 0.3 + (lt - 0.8) * 1.4);
    S.mat.uniforms.glitch.value = Math.abs(lt - 0.8) < 0.04 ? 0.8 : 0; S.mat.uniforms.time.value = lt;
    const p = E.inOutCubic(lt / 1.5);
    const a = lerp(0.55, 0.05, p), d = lerp(8.6, 6.4, p), cy = S.mon.position.y;
    cam.position.set(Math.sin(a) * d, cy + lerp(0.6, 0.15, p), Math.cos(a) * d); cam.lookAt(lerp(0.3, -0.1, p), cy - 0.05, 0);
    creamPost(post);
    chapter(hud, '09', 'BEHIND THE SCENES', lt);
    if (!second) caption(hud, ['Even the admin panel', 'has manners.'], lt, 0.12, { y: 1460, size: 72, italicIdx: [1], stagger: 0.2 });
    else caption(hud, ['Every enquiry,', 'in one place.'], lt, 0.82, { y: 1460, size: 72, italicIdx: [1], stagger: 0.15 });
  };
  return S;
}
