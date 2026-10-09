// 9.0–13.0  THE ARCHITECT: founder dossier with holographic scan.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeDust, makeBackdrop, makeShaft, makeFloor, makeRing, loadImageTexture, hash } from '../lib.js';

const IMG_W = 1024, IMG_H = 1536, PH = 4.4, PW = PH * IMG_W / IMG_H, FEET = 0.05;

export default function () {
  const S = {};
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.12;
    scene.add(makeBackdrop(0x0a0607, 0x000000, { glow: 0x3a060c, glowPos: [0.15, 0.2], glowSize: 0.45 }));
    scene.fog = new THREE.FogExp2(0x040203, 0.035);
    const floor = makeFloor(0x060404, 0.25); floor.material.envMapIntensity = 0.06; scene.add(floor);
    const tex = await loadImageTexture('../assets/founder_cut.png');
    const mk = (mirror) => new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scanY: { value: -1 }, time: { value: 0 }, light: { value: 1 }, mirror: { value: mirror ? 1 : 0 }, reveal: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float scanY,time,light,mirror,reveal; varying vec2 vUv;
        void main(){ vec2 uv=vUv; vec4 c=texture2D(map,uv); if(c.a<.02) discard;
          vec2 px=vec2(1./1024.,1./1536.);
          float aR=texture2D(map,uv+vec2(px.x*7.,0.)).a, aL=texture2D(map,uv-vec2(px.x*7.,0.)).a, aU=texture2D(map,uv+vec2(0.,px.y*7.)).a;
          float rimR=clamp(c.a-aR,0.,1.), rimL=clamp(c.a-aL,0.,1.), rimU=clamp(c.a-aU,0.,1.);
          vec3 col=c.rgb*c.rgb*light*.95;
          col+=vec3(1.5,.12,.18)*rimR*1.6+vec3(1.,.85,.75)*(rimL*.35+rimU*.45);
          float d=uv.y-scanY; float band=exp(-abs(d)*55.);
          float grid=step(.92,fract(uv.y*180.))*step(0.,-d)*exp(d*9.);
          col+=vec3(1.6,.1,.16)*(band*1.4+grid*.5)*reveal;
          float a=c.a*reveal;
          if(mirror>.5){ a*=.22*(1.-smoothstep(.02,.32,uv.y)); col*=.8; }
          gl_FragColor=vec4(col,a); }`,
      transparent: true, depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(PW, PH);
    S.fig = new THREE.Mesh(geo, mk(false)); S.fig.position.set(0.55, PH / 2 - FEET * PH, 0); scene.add(S.fig);
    S.mir = new THREE.Mesh(geo, mk(true)); S.mir.scale.y = -1; S.mir.position.set(0.55, -(PH / 2 - FEET * PH), 0); scene.add(S.mir);
    // brand arcs behind (from the logo's two-arc circle)
    S.arcs = new THREE.Group(); S.arcs.position.set(0.55, 2.3, -2.2); scene.add(S.arcs);
    const a1 = makeRing(2.6, 0.035, 0x3fae73, 0.55, 2.4, 0.6); const a2 = makeRing(2.6, 0.035, 0xff3348, 0.75, 2.4, 3.75);
    S.arcs.add(a1, a2);
    // holographic scan rings around the figure
    S.rings = [0, 1, 2].map(i => { const r = makeRing(0.9 + i * 0.06, 0.012, i === 1 ? 0xff3848 : 0xfff0e0, 0.6); r.rotation.x = -Math.PI / 2; r.scale.set(1, 0.55, 1); scene.add(r); return r; });
    const sh = makeShaft(7, 1.8, 0xffe6dc, 0.16); sh.position.set(0.55, 6.6, 0.3); scene.add(sh);
    S.back = new THREE.PointLight(0xff2034, 10, 9, 1.4); S.back.position.set(0.9, 2.5, -1.5); scene.add(S.back);
    S.dust = makeDust(800, [9, 6, 9], { color: 0xffe0d4, size: 40, opacity: 0.55, seed: 41 }); S.dust.position.set(0.5, 2.5, 1); scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 200);
  };

  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const p = E.inOutSine(lt / 4);
    cam.position.set(lerp(-0.15, 0.1, p), lerp(2.25, 2.4, p), lerp(10.6, 9.2, p)).add(shake(lt, 0.01, 3, 14));
    cam.lookAt(0.0, 2.3, 0);
    const scanY = lerp(-0.05, 1.08, E.inOutSine(inv(0.25, 1.65, lt)));
    const reveal = E.outCubic(inv(0.0, 0.5, lt));
    for (const m of [S.fig.material, S.mir.material]) { m.uniforms.scanY.value = scanY; m.uniforms.reveal.value = reveal; m.uniforms.time.value = lt; m.uniforms.light.value = 1.05; }
    const yWorld = scanY * PH - FEET * PH;
    S.rings.forEach((r, i) => { r.position.set(0.55, yWorld + (i - 1) * 0.08, 0); r.material.opacity = 0.6 * (lt > 0.25 && lt < 1.75 ? 1 : 0); r.rotation.z = lt * (i + 1) * 0.8; });
    S.arcs.rotation.z = lt * 0.12; S.arcs.scale.setScalar(lerp(0.9, 1.0, E.outCubic(lt / 2)));
    S.dust.material.uniforms.time.value = lt + 9;
    S.back.intensity = 8 + 4 * Math.sin(lt * 2);
    post.bloom = [0.75, 0.6, 0.7]; post.vignette = 0.55; post.grain = 0.065; post.ca = 0.0018; post.contrast = 1.06;

    // face bracket (projected from the head position in the photo)
    const head = new THREE.Vector3(0.55 + (480 / IMG_W - 0.5) * PW, (1 - 175 / IMG_H) * PH - FEET * PH, 0).project(cam);
    const hx = (head.x * 0.5 + 0.5) * W, hy = (1 - (head.y * 0.5 + 0.5)) * H;
    const fb = inv(1.55, 1.8, lt);
    if (fb > 0) {
      const s = lerp(260, 150, E.outExpo(fb));
      hud.brackets(hx - s / 2, hy - s * 0.6, s, s * 1.2, 26, lt > 1.8 ? BRAND.mint : '#FF3B4E', 3, 1);
      if (lt > 1.8) hud.text('ID VERIFIED', hx, hy + s * 0.6 + 34, { font: '700 22px "JetBrains Mono"', color: BRAND.mint, track: 4, glow: 10 });
    }
    // dossier column
    const X = 72;
    hud.scrim(450, 1380, 0.35);
    hud.decode('FILE 001 · THE ARCHITECT', X, 520, inv(0.1, 0.5, lt), { font: '400 26px "JetBrains Mono"', color: '#FF3B4E', track: 4, glow: 10, align: 'left' }, 3);
    hud.maskedText('NIMRA', X, 625, inv(0.35, 0.7, lt), { font: '600 104px Cinzel', color: BRAND.cream, align: 'left', track: 6, glow: 10, glowColor: 'rgba(255,230,220,.5)' });
    hud.maskedText('AKBAR', X, 735, inv(0.5, 0.85, lt), { font: '600 104px Cinzel', color: BRAND.cream, align: 'left', track: 6, glow: 10, glowColor: 'rgba(255,230,220,.5)' });
    hud.text('Founder & CEO,', X, 815, { font: 'italic 500 46px "Cormorant Garamond"', color: BRAND.cream, align: 'left', alpha: inv(0.8, 1.1, lt) });
    hud.text('Zeltrion Solutions', X, 865, { font: 'italic 500 46px "Cormorant Garamond"', color: BRAND.cream, align: 'left', alpha: inv(0.9, 1.2, lt) });
    const row = (label, value, y, t0, col = BRAND.cream) => {
      if (lt < t0) return;
      hud.line(X, y - 34, X + 420, y - 34, BRAND.cream, 1, 0.25);
      hud.text(label, X, y, { font: '400 22px "JetBrains Mono"', color: BRAND.cream, align: 'left', alpha: 0.55, track: 3 });
      hud.decode(value, X, y + 40, inv(t0, t0 + 0.35, lt), { font: '700 28px "JetBrains Mono"', color: col, align: 'left', track: 2, glow: col === BRAND.cream ? 0 : 12 }, t0 * 10);
    };
    row('SPECIALTY', 'AI · AUTOMATION · GROWTH', 990, 1.3);
    row('SLEEP SCHEDULE', 'CLASSIFIED', 1100, 1.85);
    row('THREAT LEVEL', 'EXTREME*', 1210, 2.4, '#FF3B4E');
    if (lt > 2.55) {
      const bp = E.outExpo(inv(2.55, 3.0, lt));
      for (let i = 0; i < 10; i++) hud.rect(X + 190 + i * 24, 1236, 18, 14, i < bp * 10 ? '#FF3B4E' : '#3a1418', 1);
    }
    hud.text('*to your competitors.', X, 1310, { font: 'italic 500 40px "Cormorant Garamond"', color: BRAND.cream, align: 'left', alpha: inv(3.05, 3.3, lt) });
    // end: scan floods red into the breach
    const out = inv(3.7, 4.0, lt); if (out > 0) { post.flash = out * out * 0.6; post.flashColor = [0.9, 0.08, 0.12]; }
  };
  return S;
}
