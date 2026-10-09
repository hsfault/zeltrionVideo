// 28.0–34.0  THE REVEAL: the traced ZS emblem assembles in 3D, locks, and resolves into the official flat logo.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makeEmblem, makeBackdrop, makeDust, loadHtmlImage, hash } from '../lib.js';

// official logo layout on screen (HUD); the 3D emblem is aligned to it
export const LOGO = { x: 50, y: 410, s: 980 / 1536, emX: 775, emY: 515 };
const D = 20, FOV = 18;

export default function () {
  const S = {};
  S.init = async (ctx) => {
    const scene = new THREE.Scene(); S.scene = scene;
    S.bd = makeBackdrop(0x0a0607, 0x000000, { glow: 0x1e0507, glowPos: [0, 0.05], glowSize: 0.5 }); scene.add(S.bd);
    const em = makeEmblem(ctx.emblemJson, { depth: 40, bevel: 5 });
    const ppu = H / (2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    const s = LOGO.s / ppu; em.scale.setScalar(s);
    const sx = LOGO.x + LOGO.emX * LOGO.s, sy = LOGO.y + LOGO.emY * LOGO.s;
    S.home = new THREE.Vector3((sx - W / 2) / ppu, -(sy - H / 2) / ppu, 0);
    S.root = new THREE.Group(); S.root.position.copy(S.home); S.root.add(em); scene.add(S.root);
    S.em = em; S.parts = em.userData.parts; S.mats = em.userData.mats;
    // arcs rotate around the emblem centre: re-parent them into pivots at the origin
    const sorted = [...S.parts];
    S.Z = sorted.filter(p => p.userData.color === 'maroon').sort((a, b) => b.userData.area - a.userData.area)[0];
    S.arcM = sorted.filter(p => p.userData.color === 'maroon').sort((a, b) => b.userData.area - a.userData.area)[1];
    const greens = sorted.filter(p => p.userData.color === 'green');
    S.arcG = greens.reduce((a, b) => (b.userData.bbox[2] > a.userData.bbox[2] ? b : a));
    S.Sp = greens.filter(p => p !== S.arcG);
    S.pivM = new THREE.Group(); S.pivG = new THREE.Group(); em.add(S.pivM, S.pivG); S.pivM.add(S.arcM); S.pivG.add(S.arcG);
    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    S.key = new THREE.SpotLight(0xfff0e0, 140, 60, 0.5, 0.6, 1.2); S.key.position.set(-6, 9, 12); S.key.target = S.root; scene.add(S.key);
    S.rimR = new THREE.PointLight(0xff3040, 30, 30, 1.6); S.rimR.position.set(5, 2, -4); scene.add(S.rimR);
    S.rimC = new THREE.PointLight(0xe8f0ff, 22, 30, 1.6); S.rimC.position.set(-5, -2, -3); scene.add(S.rimC);
    S.sweep = new THREE.PointLight(0xffffff, 0, 14, 1.5); scene.add(S.sweep);
    S.hemi = new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 0); scene.add(S.hemi);
    S.dust = makeDust(700, [14, 14, 10], { color: 0xffe4d8, size: 44, opacity: 0.55, seed: 61 }); S.dust.position.copy(S.home); scene.add(S.dust);
    S.logo = await loadHtmlImage('../assets/zeltrion_logo_alpha.png');
    S.off = document.createElement('canvas'); S.off.width = 1536; S.off.height = 1536; S.og = S.off.getContext('2d');
    S.camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
  };

  function drawLogo(hud, lt, alpha) {
    // composite on an offscreen canvas: emblem always, wordmark revealed centre-out, then a light glint
    const g = S.og; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1536, 1536);
    g.save(); g.beginPath(); g.rect(0, 0, 1536, 860); g.clip(); g.drawImage(S.logo, 0, 0); g.restore();
    const rw = E.inOutCubic(inv(3.5, 4.3, lt));
    if (rw > 0) { const half = 768 * rw * 1.05; g.save(); g.beginPath(); g.rect(768 - half, 860, half * 2, 676); g.clip(); g.globalAlpha = clamp(rw * 2); g.drawImage(S.logo, 0, (1 - E.outCubic(rw)) * 30); g.restore(); }
    const sw = inv(4.5, 5.3, lt);
    if (sw > 0 && sw < 1) {
      const x = lerp(-300, 1836, E.inOutSine(sw)); const gr = g.createLinearGradient(x - 160, 0, x + 160, 300);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,240,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, 1536, 1536); g.restore();
    }
    const push = 1 + 0.03 * E.inOutSine(inv(3.4, 6.0, lt));
    const w = 1536 * LOGO.s * push, cx = LOGO.x + 768 * LOGO.s, cy = LOGO.y + 768 * LOGO.s;
    hud.image(S.off, cx - w / 2, cy - w / 2, w, w, alpha);
  }

  S.update = async (ctx, lt, t) => {
    const { hud, post } = ctx; const cam = S.camera;
    // part choreography
    const pz = E.outExpo(inv(0.45, 1.6, lt)), ps = E.outExpo(inv(0.6, 1.75, lt)), pa = E.outExpo(inv(0.5, 2.25, lt));
    const Zh = S.Z.userData.home;
    S.Z.position.set(Zh.x - 1100 * (1 - pz), Zh.y + 260 * (1 - pz), 500 * (1 - pz)); S.Z.rotation.set(0.4 * (1 - pz), -1.4 * (1 - pz), 0.35 * (1 - pz));
    for (const p of S.Sp) { const h = p.userData.home; p.position.set(h.x + 1100 * (1 - ps), h.y - 260 * (1 - ps), 500 * (1 - ps)); p.rotation.set(-0.4 * (1 - ps), 1.4 * (1 - ps), -0.35 * (1 - ps)); }
    S.pivM.rotation.z = -2.6 * (1 - pa); S.pivG.rotation.z = 2.6 * (1 - pa); S.pivM.position.z = -300 * (1 - pa); S.pivG.position.z = -300 * (1 - pa);
    const vis = lt > 0.42; S.root.visible = vis;
    // camera: orbit + dolly-zoom into the exact front view used by the flat logo
    const c = E.inOutCubic(inv(0.45, 3.0, lt));
    const yaw = lerp(0.75, 0, c), pitch = lerp(0.28, 0, c);
    const fov = lerp(34, FOV, c);
    const keep = (D * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / Math.tan(THREE.MathUtils.degToRad(fov / 2)) * lerp(0.5, 1, E.inOutSine(c));
    cam.fov = fov; cam.updateProjectionMatrix();
    const target = new THREE.Vector3(0, 0, 0).lerp(new THREE.Vector3(0, 0, 0), 1);
    const center = S.home.clone();
    cam.position.set(center.x + Math.sin(yaw) * Math.cos(pitch) * keep, center.y + Math.sin(pitch) * keep, Math.cos(yaw) * Math.cos(pitch) * keep);
    cam.lookAt(center.clone().lerp(target, c));
    // light sweep across the lacquer
    S.sweep.position.set(lerp(-6, 6, inv(1.2, 2.6, lt)) + S.home.x, S.home.y + 1.5, 3); S.sweep.intensity = 28 * Math.sin(Math.PI * inv(1.2, 2.6, lt));
    // world turns to cream when the emblem locks (30.4s)
    const cr = E.outCubic(inv(2.4, 2.75, lt));
    const u = S.bd.material.uniforms;
    u.top.value.setRGB(lerp(0.0035, 0.93, cr), lerp(0.002, 0.9, cr), lerp(0.002, 0.85, cr));
    u.bottom.value.setRGB(lerp(0, 0.88, cr), lerp(0, 0.85, cr), lerp(0, 0.8, cr));
    u.glowAmt.value = 1 - cr;
    S.hemi.intensity = 0.55 * cr; S.rimR.intensity = 30 * (1 - cr) + 4; S.scene.environmentIntensity = lerp(0.25, 0.5, cr); S.dust.material.uniforms.opacity.value = 0.55 * (1 - cr);
    S.dust.material.uniforms.time.value = lt;
    post.bloom = [lerp(0.9, 0.25, cr), 0.6, lerp(0.65, 1.2, cr)]; post.vignette = lerp(0.6, 0.3, cr); post.grain = lerp(0.07, 0.035, cr); post.ca = 0.0015;
    // crossfade 3D → official flat logo
    const f = inv(3.0, 3.4, lt);
    if (f > 0) { hud.rect(0, 0, W, H, BRAND.cream, f); drawLogo(hud, lt, f); }
    post.fade = 1 - inv(0.1, 0.5, lt);
  };
  return S;
}
