// 25.5–26.5  CONTACT: the letter form on a phone, then "Your letter is on its way."
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makePhone, screenMaterial, ClipTexture, softShadow } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, caption, creamPost } from '../ui.js';
export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false }); S.scene = st.scene; S.deco = st.deco; st.deco.position.set(0, 1, -12);
    S.clip = new ClipTexture();
    S.mat = screenMaterial({ map: S.clip.tex, glare: 0.5 });
    S.phone = makePhone(S.mat, { h: 2.9 }); S.scene.add(S.phone);
    const sw = S.phone.userData.w - 0.07, sh = S.phone.userData.h - 0.07; S.cw = (sw / sh) * 612 / 1280;
    S.camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const sent = lt >= 0.66;
    if (!sent) { await S.clip.set('letter', 2.0 + lt * 15); S.mat.uniforms.uvRect.value.set(0.445 - S.cw / 2, 0, S.cw, 1); }
    else { await S.clip.set('sent', 0.6 + (lt - 0.66) * 2); S.mat.uniforms.uvRect.value.set(0.5 - S.cw / 2, 0, S.cw, 1); }
    S.mat.uniforms.glitch.value = Math.abs(lt - 0.66) < 0.035 ? 0.8 : 0; S.mat.uniforms.time.value = lt;
    const p = E.outCubic(inv(0, 0.7, lt));
    S.phone.position.set(0, 0.72 + Math.sin(lt * 2) * 0.05, 0);
    S.phone.rotation.set(lerp(0.25, 0.05, p), lerp(-1.0, 0.18, p), lerp(0.12, -0.04, p));
    cam.position.set(0, 0.6, lerp(8.4, 7.6, E.inOutSine(lt))); cam.lookAt(0, 0.6, 0);
    S.deco.rotation.z = lt * 0.12 + 4;
    creamPost(post);
    chapter(hud, '08', 'CONTACT', lt);
    caption(hud, ['Write to us.', 'We’ll call you.'], lt, 0.1, { y: 1500, size: 74, italicIdx: [1], stagger: 0.2 });
  };
  return S;
}
