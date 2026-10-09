// 34.0–40.0  FINAL TRANSMISSION: CRT-off into darkness, "THE SYSTEM IS LIVE.", URL, follow.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, makeEmblem, makeBackdrop, makeDust, makeShaft, loadHtmlImage } from '../lib.js';
import { LOGO } from './emblem.js';

export default function () {
  const S = {};
  S.init = async (ctx) => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.3;
    scene.add(makeBackdrop(0x0b0607, 0x000000, { glow: 0x1c0306, glowPos: [0, 0.3], glowSize: 0.4 }));
    const D = 12, F = 30; const ppu = H / (2 * D * Math.tan(THREE.MathUtils.degToRad(F / 2)));
    S.em = makeEmblem(ctx.emblemJson, { depth: 60, bevel: 6 }); S.em.scale.setScalar(250 / 670 / ppu);
    S.root = new THREE.Group(); S.root.position.set(0, (960 - 520) / ppu, 0); S.root.add(S.em); scene.add(S.root);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.SpotLight(0xfff2e6, 160, 40, 0.5, 0.6, 1.2); key.position.set(-4, 6, 9); key.target = S.root; scene.add(key);
    S.rim = new THREE.PointLight(0xff3040, 25, 20, 1.6); S.rim.position.set(3, 3, -2); scene.add(S.rim);
    const rc = new THREE.PointLight(0xe8f0ff, 15, 20, 1.6); rc.position.set(-3, 1, -2); scene.add(rc);
    const sh = makeShaft(9, 2.4, 0xffe8dc, 0.12); sh.position.set(0, 7.5, -1); scene.add(sh);
    S.dust = makeDust(900, [10, 14, 8], { color: 0xffe0d4, size: 40, opacity: 0.5, seed: 71 }); scene.add(S.dust);
    S.logo = await loadHtmlImage('../assets/zeltrion_logo_alpha.png');
    S.camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200); S.camera.position.set(0, 0, 12); S.camera.lookAt(0, 0, 0);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cx = W / 2;
    S.root.rotation.y = Math.sin(lt * 0.9) * 0.45; S.root.rotation.x = Math.sin(lt * 0.6) * 0.08;
    const ev = E.outCubic(inv(0.55, 1.1, lt)); S.root.scale.setScalar(lerp(0.6, 1, ev)); S.root.visible = ev > 0;
    S.rim.intensity = 25 + 12 * Math.sin(lt * 3);
    S.dust.material.uniforms.time.value = lt;
    post.bloom = [0.8, 0.6, 0.7]; post.vignette = 0.6; post.grain = 0.06; post.ca = 0.0015; post.contrast = 1.05;
    const LY = 960;
    // CRT power-off of the cream logo frame into a single line
    if (lt < 0.42) {
      const k = E.inExpo(inv(0.0, 0.32, lt)); const hh = lerp(H, 4, k), ww = lerp(W, W * 0.9, k);
      hud.rect(0, 0, W, H, '#000', 1);
      hud.g.save(); hud.g.beginPath(); hud.g.rect((W - ww) / 2, LY - hh / 2, ww, hh); hud.g.clip();
      hud.rect(0, 0, W, H, BRAND.cream, 1);
      hud.g.translate(0, LY); hud.g.scale(1, Math.max(0.002, hh / H)); hud.g.translate(0, -LY);
      hud.image(S.logo, LOGO.x, LOGO.y, 1536 * LOGO.s * 1.03, 1536 * LOGO.s * 1.03);
      hud.g.restore();
      if (k > 0.8) hud.line(0, LY, W, LY, '#fff6ec', 4, 1, 30);
    } else {
      // the line contracts and stays as a divider
      const lw = lerp(W * 0.9, 620, E.outExpo(inv(0.42, 0.9, lt)));
      const la = lerp(1, 0.55, inv(0.6, 1.2, lt));
      hud.line(cx - lw / 2, LY, cx + lw / 2, LY, '#fff1e4', 3, la, 24);
      hud.maskedText('THE SYSTEM', cx, LY - 75, inv(0.95, 1.35, lt), { font: '600 80px Cinzel', color: BRAND.cream, track: 14 });
      const lp = inv(1.2, 1.55, lt);
      hud.maskedText('IS LIVE.', cx + 30, LY + 105, lp, { font: '700 140px Cinzel', color: BRAND.cream, track: 6, glow: 18, glowColor: 'rgba(255,230,220,.45)' });
      if (lp > 0.3) { const pulse = 0.5 + 0.5 * Math.sin(lt * 6); const w = hud.measure('IS LIVE.', '700 140px Cinzel', 6);
        hud.g.save(); hud.g.globalAlpha = 0.6 + 0.4 * pulse; hud.g.shadowColor = '#ff2a3c'; hud.g.shadowBlur = 30; hud.g.fillStyle = '#FF3348';
        hud.g.beginPath(); hud.g.arc(cx + 30 - w / 2 - 50, LY + 100, 20, 0, 7); hud.g.fill(); hud.g.restore(); }
      // URL
      const up = inv(1.85, 2.15, lt);
      if (up > 0) {
        const pw = 700, ph = 104, py = 1215;
        hud.pill(cx - pw / 2, py, pw, ph, BRAND.maroon, 'rgba(247,243,236,0.55)', up, 2);
        hud.g.save(); hud.g.beginPath(); hud.g.rect(cx - pw / 2, py, pw, ph); hud.g.clip();
        const url = 'zeltrionsolutions.com'; const n = Math.floor(clamp(inv(1.95, 2.5, lt)) * url.length);
        const tw = hud.measure(url, '600 46px Inter', 1);
        hud.text(url.slice(0, n), cx - tw / 2, py + ph / 2 + 1, { font: '600 46px Inter', color: BRAND.cream, align: 'left', track: 1 });
        if (lt < 2.9 && Math.floor(lt * 6) % 2 === 0) hud.rect(cx - tw / 2 + hud.measure(url.slice(0, n), '600 46px Inter', 1) + 4, py + 30, 3, 46, BRAND.cream);
        hud.g.restore();
      }
      hud.text('● ALERT RESOLVED  ·  MANUAL MODE: OFF', cx, 1395, { font: '700 27px "JetBrains Mono"', color: BRAND.mint, track: 2, glow: 12, alpha: inv(2.7, 2.85, lt) * (lt < 3.0 && Math.floor(lt * 20) % 2 ? 0.4 : 1) });
      hud.maskedText('Follow for what comes next.', cx, 1475, inv(3.2, 3.55, lt), { font: 'italic 500 56px "Cormorant Garamond"', color: BRAND.cream });
      hud.text('P.S. your competitors watched this twice.', cx, 1550, { font: '400 24px "JetBrains Mono"', color: BRAND.cream, alpha: 0.6 * inv(4.2, 4.5, lt) });
    }
  };
  return S;
}
