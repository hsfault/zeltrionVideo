// 4.0–6.2  THE ANOMALY: dark control room, screens wake by themselves.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeShaft, makeDust, makeBackdrop, makeFloor, ClipTexture, screenMaterial, hash } from '../lib.js';

const CLIPS = ['svc_cards', 'justask', 'testimonials', 'partners', 'shelf', 'svc_orbit', 'listen', 'home', 'arcs', 'about', 'd_inbox', 'svc18', 'zelrise_hero', 'letter', 'd_greet'];

export default function () {
  const S = {};
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.12;
    scene.add(makeBackdrop(0x07090a, 0x000000, { glow: 0x0c0405, glowPos: [0, 0.2], glowSize: 0.5 }));
    scene.fog = new THREE.FogExp2(0x050506, 0.05);
    const floor = makeFloor(0x060606, 0.25); floor.material.envMapIntensity = 0.1; scene.add(floor);
    scene.add(new THREE.AmbientLight(0x101418, 0.8));
    S.screens = [];
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4, metalness: 0.7 });
    const sw = 1.55, shh = sw / (1280 / 612);
    let idx = 0;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      const a = (col - 2) * 0.36; const R = 7.2;
      const g = new THREE.Group(); g.position.set(Math.sin(a) * R, 1.0 + row * 0.98, 1.5 - Math.cos(a) * R); g.lookAt(0, 1.0 + row * 0.98, 1.5);
      const fr = new THREE.Mesh(new RoundedBoxGeometry(sw + 0.1, shh + 0.1, 0.08, 3, 0.02), frameMat); g.add(fr);
      const clip = new ClipTexture(); const mat = screenMaterial({ map: clip.tex, glare: 0.6 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(sw, shh), mat); pl.position.z = 0.042; g.add(pl);
      scene.add(g);
      const center = row === 1 && col === 2;
      S.screens.push({ g, clip, mat, name: CLIPS[idx++], on: 0.05 + [7, 3, 11, 1, 9, 13, 5, 0, 6, 12, 4, 10, 2, 14, 8][row * 5 + col] * 0.075, center });
    }
    // console desk with LED strip
    const desk = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.9, 1.3, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.35, metalness: 0.8 }));
    desk.position.set(0, 0.45, -1.2); scene.add(desk);
    S.strip = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.015, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.1, 0.15) }));
    S.strip.position.set(0, 0.86, -0.55); scene.add(S.strip);
    // node network floating above desk
    S.net = new THREE.Group(); S.net.position.set(0, 2.2, -1.4); scene.add(S.net);
    const nodes = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const r = 0.5 + hash(i) * 0.9; nodes.push(new THREE.Vector3(Math.cos(a) * r, (hash(i + 9) - 0.5) * 0.9, Math.sin(a) * r * 0.5)); }
    S.nodeMeshes = nodes.map((p, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.2, 0.25) })); m.position.copy(p); S.net.add(m); return m; });
    const lp = []; nodes.forEach(p => { lp.push(0, 0, 0, p.x, p.y, p.z); });
    for (let i = 0; i < 18; i++) { const a = nodes[i], b = nodes[(i + 5) % 18]; lp.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    S.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    S.net.add(S.lines);
    S.core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.35) })); S.net.add(S.core);
    S.shafts = []; for (const x of [-2.5, 0, 2.5]) { const sh = makeShaft(6, 1.4, 0xd8e4ff, 0.12); sh.position.set(x, 5.5, -1); scene.add(sh); S.shafts.push(sh); }
    S.glow = new THREE.PointLight(0xff2a35, 3, 8, 1.5); S.glow.position.set(0, 2.2, -1); scene.add(S.glow);
    S.dust = makeDust(600, [10, 6, 10], { color: 0xdde6ff, size: 34, opacity: 0.45, seed: 11 }); S.dust.position.set(0, 2.5, -1); scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(46, W / H, 0.05, 200);
  };

  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const p = E.inOutCubic(lt / 2.2);
    const pos = new THREE.Vector3(lerp(0, 2.4, p), lerp(8.5, 1.75, p), lerp(5.5, 5.6, p)).add(shake(lt, 0.02, 5, 3));
    cam.position.copy(pos); cam.lookAt(lerp(0, 0.2, p), lerp(0.2, 1.95, p), lerp(-2.0, -4.0, p));
    S.dust.material.uniforms.time.value = lt + 4;
    for (const sh of S.shafts) sh.material.uniforms.intensity.value = 0.12 * inv(0.45, 0.9, p);
    const loads = [];
    for (const s of S.screens) {
      const on = inv(s.on, s.on + 0.22, lt);
      s.mat.uniforms.power.value = on; s.mat.uniforms.time.value = lt;
      s.mat.uniforms.tintMix.value = s.center ? 0.0 : 1.0; s.mat.uniforms.invert.value = 1; s.mat.uniforms.scan.value = 0.8; s.mat.uniforms.noiseAmt.value = 0.06;
      s.mat.uniforms.brightness.value = s.center ? 0.55 + 0.25 * Math.max(0, Math.sin(lt * 9)) : 0.9;
      s.mat.uniforms.glitch.value = hash(Math.floor(lt * 12) + s.on * 100) > 0.9 ? 0.6 : 0;
      if (on > 0) loads.push(s.clip.set(s.name, 0.3 + lt * 0.8));
    }
    await Promise.all(loads);
    const pulse = Math.pow(Math.max(0, Math.sin((lt - 0.8) * Math.PI * 2 * 1.0)), 6);
    const live = inv(0.6, 1.0, lt);
    S.core.scale.setScalar(1 + pulse * 1.8 * live); S.glow.intensity = (2 + pulse * 10) * live;
    S.lines.material.opacity = 0.15 + 0.6 * live; S.net.rotation.y = lt * 0.4;
    S.nodeMeshes.forEach((m, i) => m.visible = lt > 0.3 + i * 0.05);
    S.strip.material.color.setRGB(2.2 * (0.6 + 0.4 * pulse), 0.1, 0.15);

    post.bloom = [0.8, 0.55, 0.75]; post.vignette = 0.6; post.grain = 0.07; post.ca = 0.002; post.contrast = 1.06; post.lift = [0.0, 0.01, 0.015];

    // security-cam overlay
    const rec = Math.floor(lt * 3) % 2 === 0;
    hud.text('●', 92, 300, { font: '400 30px "JetBrains Mono"', color: '#FF3B4E', align: 'left', alpha: rec ? 1 : 0.2, glow: 14 });
    hud.text('REC  CAM 04 · CONTROL ROOM', 130, 300, { font: '400 26px "JetBrains Mono"', color: BRAND.cream, align: 'left', alpha: 0.8, track: 3 });
    hud.text('02:47:' + String(16 + Math.floor(lt)).padStart(2, '0') + ':' + String(Math.floor((lt * 30) % 30)).padStart(2, '0'), 990, 300, { font: '400 26px "JetBrains Mono"', color: BRAND.cream, align: 'right', alpha: 0.8 });
    hud.brackets(70, 250, 940, 1400, 50, BRAND.cream, 2, 0.35);
    hud.scrim(1180, 1560, 0.65);
    hud.maskedText('SOMETHING JUST', W / 2, 1300, inv(0.55, 0.9, lt), { font: '600 76px Cinzel', color: BRAND.cream, track: 4 });
    hud.maskedText('CAME ONLINE.', W / 2, 1400, inv(0.85, 1.2, lt), { font: '600 92px Cinzel', color: BRAND.cream, track: 4, glow: 16, glowColor: 'rgba(255,60,80,.6)' });
    const ul = E.outExpo(inv(1.15, 1.7, lt)); hud.line(W / 2 - 280 * ul, 1462, W / 2 + 280 * ul, 1462, '#FF3B4E', 3, 1, 12);
  };
  return S;
}
