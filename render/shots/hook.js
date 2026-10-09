// 0.0–4.0  HOOK: red emergency alert → "…it's yours."
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeShaft, makeDust, makeBackdrop, makeFloor, rng, hash } from '../lib.js';

export default function () {
  const S = {};
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.12;
    scene.add(makeBackdrop(0x0b0405, 0x000000, { glow: 0x200204, glowPos: [0, 0.15], glowSize: 0.5 }));
    scene.fog = new THREE.FogExp2(0x070304, 0.045);
    const floor = makeFloor(0x050304, 0.3); floor.material.envMapIntensity = 0.08; scene.add(floor);
    // server racks with blinking LEDs
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x141116, roughness: 0.45, metalness: 0.7 });
    const r = rng(7); S.leds = [];
    const ledGeo = new THREE.PlaneGeometry(0.035, 0.035);
    for (let side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.6, 1.0), rackMat);
      const x = side * (2.0 + i * 0.05), z = -1 - i * 1.4; rack.position.set(x, 1.8, z); rack.rotation.y = -side * 0.0; scene.add(rack);
      for (let k = 0; k < 26; k++) {
        const red = r() > 0.35;
        const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: red ? 0xff2030 : 0x30ff90 }));
        led.position.set(x - side * 0.555, 0.35 + r() * 3.0, z + (r() - 0.5) * 0.8); led.rotation.y = -side * Math.PI / 2;
        led.userData = { ph: r() * 10, sp: 2 + r() * 8, red }; scene.add(led); S.leds.push(led);
      }
    }
    // emergency beacon at the end of the aisle
    S.beacon = new THREE.Group(); S.beacon.position.set(0, 3.3, -9); scene.add(S.beacon);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.08, 0.12) }));
    S.beacon.add(bulb);
    S.spin = new THREE.Group(); S.beacon.add(S.spin);
    for (const s of [1, -1]) {
      const sh = makeShaft(9, 2.6, 0xff2a2a, 0.5); sh.rotation.z = s * Math.PI / 2; sh.userData.dir = s; S.spin.add(sh); (S.shafts ||= []).push(sh);
    }
    S.fill = new THREE.PointLight(0xff2030, 6, 14, 1.5); S.fill.position.set(0, 2.5, 2); scene.add(S.fill);
    S.sideL = new THREE.PointLight(0xff1a28, 0, 9, 1.4); S.sideL.position.set(-1.0, 2.6, -4.5); scene.add(S.sideL);
    S.sideR = new THREE.PointLight(0xff1a28, 0, 9, 1.4); S.sideR.position.set(1.0, 2.6, -4.5); scene.add(S.sideR);
    scene.add(new THREE.AmbientLight(0x200608, 0.6));
    S.dust = makeDust(700, [8, 6, 14], { color: 0xffc8c0, size: 40, opacity: 0.6, seed: 3 }); S.dust.position.set(0, 2, -4); scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 200);
  };

  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const frozen = lt >= 2.7;
    const tt = frozen ? 2.7 + (lt - 2.7) * 0.04 : lt;           // world "freezes" on the punchline
    S.spin.rotation.y = tt * 4.2;
    S.dust.material.uniforms.time.value = tt;
    // fade a light shaft as it swings toward the lens so it never becomes a flat blob
    for (const sh of S.shafts) {
      const ax = new THREE.Vector3(Math.cos(S.spin.rotation.y) * sh.userData.dir, 0, -Math.sin(S.spin.rotation.y) * sh.userData.dir);
      const toCam = new THREE.Vector3(0, -1.7, 15).normalize();
      sh.material.uniforms.intensity.value = 0.75 * (1 - E.inOutSine(inv(0.05, 0.6, ax.dot(toCam))));
    }
    const pulse = 0.5 + 0.5 * Math.sin(tt * 8.4);
    S.fill.intensity = 8 + pulse * 16;
    S.sideL.intensity = 18 * Math.max(0, Math.cos(S.spin.rotation.y)) ** 2; S.sideR.intensity = 18 * Math.max(0, -Math.cos(S.spin.rotation.y)) ** 2;
    for (const l of S.leds) l.visible = Math.sin(tt * l.userData.sp + l.userData.ph) > -0.3;
    const push = E.inOutSine(lt / 2.7);
    const zc = frozen ? lerp(5.0, 4.2, E.outExpo((lt - 2.7) / 0.5)) : lerp(6.4, 5.0, push);
    const sk = shake(tt, frozen ? 0 : 0.025, 7);
    cam.position.set(sk.x, 1.55 + sk.y, zc);
    cam.fov = frozen ? lerp(38, 30, E.outExpo((lt - 2.7) / 0.35)) : 38; cam.updateProjectionMatrix();
    cam.lookAt(0, 1.75, -6); cam.rotation.z = frozen ? 0 : Math.sin(tt * 0.7) * 0.01;

    post.bloom = [1.1, 0.7, 0.55]; post.vignette = 0.55; post.grain = 0.07; post.ca = 0.0025; post.contrast = 1.08;
    if (frozen) { post.sat = 0.25; post.exposure = 0.55; }

    const cx = W / 2;
    if (!frozen) {
      const blink = Math.floor(lt * 4) % 2 === 0;
      hud.scrim(560, 1380, 0.55);
      hud.text('⚠  SYSTEM ALERT', cx, 330, { font: '700 34px "JetBrains Mono"', color: BRAND.ember, track: 8, glow: 18, alpha: blink ? 1 : 0.35 });
      hud.text('02:47:13 AM', cx, 380, { font: '400 26px "JetBrains Mono"', color: BRAND.cream, alpha: 0.55, track: 4 });
      hud.line(cx - 330, 420, cx + 330, 420, BRAND.ember, 2, 0.5);
      hud.decode('1 BUSINESS DETECTED', cx, 700, clamp(0.55 + lt / 0.5), { font: '600 64px Cinzel', color: BRAND.cream, track: 4, glow: 10 }, 1);
      hud.maskedText('STILL DOING', cx, 820, inv(0.25, 0.55, lt), { font: '600 92px Cinzel', color: BRAND.cream, track: 2 });
      hud.maskedText('EVERYTHING', cx, 930, inv(0.45, 0.75, lt), { font: '600 92px Cinzel', color: BRAND.cream, track: 2 });
      const mp = inv(0.7, 1.0, lt);
      const jit = lt < 1.4 ? (hash(Math.floor(lt * 30)) - 0.5) * 8 : 0;
      hud.maskedText('MANUALLY.', cx + jit, 1080, mp, { font: '700 138px Cinzel', color: '#FF3B4E', glow: 46, glowColor: BRAND.signal, track: 2 });
      // trace bar
      if (lt > 1.45) {
        const p = E.inOutCubic(inv(1.5, 2.35, lt));
        hud.text(p < 1 ? 'TRACING SOURCE…' : 'SOURCE LOCATED', cx, 1260, { font: '400 30px "JetBrains Mono"', color: BRAND.cream, alpha: 0.85, track: 6 });
        hud.rect(cx - 300, 1300, 600, 6, '#3a1418', 1); hud.rect(cx - 300, 1300, 600 * p, 6, BRAND.ember, 1);
        hud.text(String(Math.floor(p * 100)).padStart(3, '0') + '%', cx + 300, 1340, { font: '400 24px "JetBrains Mono"', color: BRAND.ember, align: 'right' });
        if (lt > 2.3) hud.decode('THE PHONE IN YOUR HAND', cx, 1400, inv(2.3, 2.62, lt), { font: '700 38px "JetBrains Mono"', color: '#FF3B4E', glow: 16, track: 3 }, 9);
      }
    } else {
      const k = lt - 2.7;
      hud.scrim(700, 1250, 0.5);
      hud.maskedText('…it’s yours.', cx, 940, inv(0.0, 0.45, k), { font: 'italic 600 168px "Cormorant Garamond"', color: BRAND.cream, glow: 20, glowColor: 'rgba(255,240,230,.5)' });
      hud.text('(yes, you. replying to DMs at 2:47 AM.)', cx, 1110, { font: '400 34px "JetBrains Mono"', color: BRAND.cream, alpha: 0.9 * inv(0.45, 0.75, k) });
    }
  };
  return S;
}
