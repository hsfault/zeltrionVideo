// 22.0–23.5  ZELRISE: the education brand logo assembles in layered 2.5D (original artwork, masked layers).
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, loadImageTexture } from '../lib.js';
import { creamStudio } from '../env.js';
import { chapter, creamPost } from '../ui.js';

const LW = 3.7, LH = LW * 1122 / 1402;
const LAYERS = { mono: 0, cap: 0.45, arrow: 0.6, word: 0.18, tag: 0.12, rule: 0.08, by: 0.08 };

export default function () {
  const S = {};
  S.init = async () => {
    const st = creamStudio({ floor: false, arcs: false }); S.scene = st.scene;
    S.root = new THREE.Group(); S.root.position.y = 0.55; S.scene.add(S.root);
    S.L = {};
    for (const [name, z] of Object.entries(LAYERS)) {
      const tex = await loadImageTexture(`../assets/zelrise_${name}.png`);
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, opacity: { value: 0 }, reveal: { value: 1 }, center: { value: 0 }, sweep: { value: -1 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform sampler2D map; uniform float opacity,reveal,center,sweep; varying vec2 vUv;
          void main(){ vec4 c=texture2D(map,vUv); float x = center>.5 ? abs(vUv.x-.5)*2. : vUv.x;
            float m=1.-smoothstep(reveal-.04,reveal,x); float sw=exp(-pow((vUv.x+vUv.y*.4-sweep)*9.,2.))*.9;
            gl_FragColor=vec4(c.rgb+sw*c.a, c.a*opacity*m); }`,
        transparent: true, depthWrite: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), mat); m.position.z = z; S.root.add(m); S.L[name] = m;
    }
    // streak trail for the arrow
    S.trail = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.04), new THREE.MeshBasicMaterial({ color: 0x126a8f, transparent: true, opacity: 0 }));
    S.trail.rotation.z = 0.72; S.root.add(S.trail);
    S.camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera; const L = S.L;
    const set = (n, o, extra = {}) => { const u = L[n].material.uniforms; u.opacity.value = o; for (const k in extra) u[k].value = extra[k]; };
    const pm = E.outCubic(inv(0.0, 0.45, lt));
    L.mono.scale.setScalar(lerp(0.82, 1, pm)); L.mono.rotation.y = lerp(0.5, 0, pm); set('mono', pm);
    const pc = inv(0.22, 0.58, lt);
    L.cap.position.y = lerp(1.6, 0, E.outBack(pc, 1.6)); L.cap.rotation.z = lerp(-0.35, 0, E.outCubic(pc)); set('cap', clamp(pc * 4));
    const pa = E.outExpo(inv(0.42, 0.72, lt));
    L.arrow.position.set(lerp(-1.1, 0, pa), lerp(-1.1, 0, pa), LAYERS.arrow); set('arrow', clamp(pa * 3));
    S.trail.material.opacity = 0.7 * (pa > 0 && pa < 1 ? (1 - pa) : 0); S.trail.position.set(lerp(-0.3, 0.6, pa), lerp(-0.2, 1.0, pa), LAYERS.arrow - 0.01);
    set('word', 1, { reveal: E.inOutCubic(inv(0.5, 0.92, lt)) * 1.05, sweep: lerp(-0.5, 1.6, inv(0.85, 1.35, lt)) });
    set('tag', inv(0.8, 1.05, lt)); set('rule', 1, { reveal: E.outCubic(inv(0.88, 1.15, lt)) * 1.05, center: 1 }); set('by', inv(1.0, 1.25, lt));
    const p = E.inOutCubic(inv(0, 1.25, lt));
    const yaw = lerp(0.32, 0, p), d = lerp(10.8, 10.0, E.inOutSine(lt / 1.5));
    cam.position.set(Math.sin(yaw) * d, 0.55 + lerp(-0.6, 0, p), Math.cos(yaw) * d); cam.lookAt(0, 0.55, 0);
    creamPost(post); post.exposure = 1.0;
    chapter(hud, '05', 'ZELRISE · COURSES', lt);
    hud.text('The education brand of Zeltrion', W / 2, 1560, { font: 'italic 500 48px "Cormorant Garamond"', color: '#2b2522', alpha: inv(1.0, 1.25, lt) });
  };
  return S;
}
