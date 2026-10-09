// 13.0–16.0  BREACH: light streak races through a geometric corridor into a cream opening.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeDust, makeBackdrop, rng } from '../lib.js';

function slitTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#070405'; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 90; i++) {
    const y = r() * 1024, w = 20 + r() * 140, x = r() * (256 - w);
    g.fillStyle = r() > 0.55 ? 'rgba(255,236,220,0.9)' : 'rgba(230,30,55,0.95)'; g.fillRect(x, y, w, 3 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default function () {
  const S = {};
  const N = 46, GAP = 1.6, FW = 1.9, FH = 3.6;
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.15;
    scene.add(makeBackdrop(0x050203, 0x000000));
    scene.fog = new THREE.Fog(0x050203, 6, 34);
    const metal = new THREE.MeshStandardMaterial({ color: 0x0d0a0b, roughness: 0.3, metalness: 0.9 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.08, 0.14) });
    const glowCream = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.78, 0.68) });
    const slitMats = [1, 2, 3].map(s => new THREE.MeshBasicMaterial({ map: slitTexture(s), color: new THREE.Color(1.3, 1.3, 1.3) }));
    S.panels = [];
    for (let i = 0; i < N; i++) {
      const z = -i * GAP; const seg = new THREE.Group(); seg.position.z = z; scene.add(seg);
      const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), metal); m.position.set(x, y, 0); seg.add(m); };
      bar(FW + 0.3, 0.15, 0, FH / 2); bar(FW + 0.3, 0.15, 0, -FH / 2); bar(0.15, FH, -FW / 2, 0); bar(0.15, FH, FW / 2, 0);
      const gm = i % 5 === 0 ? glowCream : glow;
      const strip = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gm); m.position.set(x, y, 0.1); seg.add(m); };
      strip(FW, 0.02, 0, FH / 2 - 0.08); strip(FW, 0.02, 0, -FH / 2 + 0.08); strip(0.02, FH - 0.16, -FW / 2 + 0.08, 0); strip(0.02, FH - 0.16, FW / 2 - 0.08, 0);
      // side & ceiling panels hinged at the frame, they swing open as we pass
      for (const side of [-1, 1]) {
        const hinge = new THREE.Group(); hinge.position.set(side * (FW / 2 + 0.1), 0, 0); seg.add(hinge);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(GAP * 0.96, FH), slitMats[(i + (side > 0 ? 1 : 0)) % 3]);
        p.position.set(0, 0, -GAP / 2); p.rotation.y = side * Math.PI / 2; hinge.add(p);
        S.panels.push({ hinge, side, z });
      }
      const floorP = new THREE.Mesh(new THREE.PlaneGeometry(FW, GAP), new THREE.MeshStandardMaterial({ color: 0x0a0708, roughness: 0.2, metalness: 0.8 }));
      floorP.rotation.x = -Math.PI / 2; floorP.position.set(0, -FH / 2, -GAP / 2); seg.add(floorP);
    }
    // light behind the panels
    for (const side of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(N * GAP, FH * 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.25, 0.25) })); l.rotation.y = side * Math.PI / 2; l.position.set(side * (FW / 2 + 1.7), 0, -N * GAP / 2); scene.add(l); }
    // the cream opening
    S.portal = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.0, 2.8) }));
    S.portal.position.z = -(N - 1) * GAP - 0.3; scene.add(S.portal);
    // the streak
    S.streak = new THREE.Group(); scene.add(S.streak);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.6, 0.6) })); core.rotation.x = Math.PI / 2; S.streak.add(core);
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.0, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.05, 0.1), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.z = 1; S.streak.add(halo);
    S.dust = makeDust(900, [4, 5, 20], { color: 0xffd0c8, size: 30, opacity: 0.5, seed: 51 }); scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 200);
  };

  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const u = clamp(lt / 2.75);
    const endZ = S.portal.position.z + 1.2;
    const z = endZ * (0.18 * u + 0.82 * Math.pow(u, 2.3));
    cam.position.set(Math.sin(lt * 1.3) * 0.12, Math.sin(lt * 0.9) * 0.08, 2.5 + z);
    cam.fov = lerp(52, 72, E.inCubic(u)); cam.updateProjectionMatrix();
    cam.lookAt(0, 0, cam.position.z - 10); cam.rotation.z = Math.sin(lt * 0.8) * 0.06 * (1 - u);
    S.streak.position.set(0.25 * Math.sin(lt * 3), -0.6 + 0.2 * Math.sin(lt * 2.2), cam.position.z - 4 - 6 * E.outCubic(u));
    for (const p of S.panels) {
      const d = p.z - cam.position.z;   // negative = ahead
      const open = E.inOutCubic(inv(-9, -3.5, d));
      p.hinge.rotation.y = -p.side * open * 1.15;
    }
    S.dust.position.z = cam.position.z - 8; S.dust.material.uniforms.time.value = lt;
    post.bloom = [1.0, 0.7, 0.75]; post.vignette = 0.6; post.grain = 0.06; post.ca = 0.003 + 0.01 * E.inCubic(u); post.contrast = 1.08;
    post.zoom = 0.25 * E.inCubic(inv(1.6, 2.75, lt));
    const white = inv(2.55, 2.8, lt); if (white > 0) { post.flash = white; post.flashColor = [0.97, 0.95, 0.92]; }

    hud.scrim(1220, 1480, 0.6 * (1 - inv(0.55, 0.7, lt)));
    hud.text('ACCESS GRANTED', W / 2, 1350, { font: '700 46px "JetBrains Mono"', color: BRAND.mint, track: 10, glow: 22, alpha: inv(0.05, 0.12, lt) * (1 - inv(0.55, 0.7, lt)) * (Math.floor(lt * 14) % 3 === 0 && lt < 0.3 ? 0.3 : 1) });
    const ep = inv(0.85, 1.25, lt), eo = 1 - inv(1.9, 2.3, lt);
    hud.scrim(1180, 1520, 0.6 * ep * eo);
    hud.text('ENTERING', W / 2, 1300, { font: '600 64px Cinzel', color: BRAND.cream, track: lerp(40, 22, E.outCubic(ep)), alpha: ep * eo, glow: 14 });
    hud.text('THE SYSTEM', W / 2, 1390, { font: '600 64px Cinzel', color: BRAND.cream, track: lerp(40, 22, E.outCubic(ep)), alpha: ep * eo, glow: 14 });
  };
  return S;
}
