// 7.2–9.0  THE NAME: CRT terminal resolves "ZELTRION".
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeDust, makeBackdrop, makeShaft, hash } from '../lib.js';

export default function () {
  const S = {};
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.12;
    scene.add(makeBackdrop(0x070506, 0x000000, { glow: 0x120607, glowPos: [0, 0], glowSize: 0.4 }));
    scene.fog = new THREE.FogExp2(0x030202, 0.04);
    S.tc = document.createElement('canvas'); S.tc.width = 1024; S.tc.height = 768; S.tg = S.tc.getContext('2d');
    S.tex = new THREE.CanvasTexture(S.tc); S.tex.colorSpace = THREE.SRGBColorSpace; S.tex.anisotropy = 8;
    S.crt = new THREE.ShaderMaterial({
      uniforms: { map: { value: S.tex }, time: { value: 0 }, boost: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float time,boost; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
        void main(){ vec2 c=vUv-.5; float r2=dot(c,c); vec2 uv=.5+c*(1.+.12*r2);
          if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
          vec3 col=texture2D(map,uv).rgb; vec3 bl=(texture2D(map,uv+vec2(.004,0.)).rgb+texture2D(map,uv-vec2(.004,0.)).rgb+texture2D(map,uv+vec2(0.,.005)).rgb+texture2D(map,uv-vec2(0.,.005)).rgb)*.25;
          col=col+bl*.35;
          col*=.82+.18*sin(uv.y*768.*3.14159);
          col*=1.-smoothstep(.18,.5,r2*1.4)*.7;
          col+=vec3(.012,.01,.009)*(.6+.4*h(uv*500.+time));
          float roll=smoothstep(.0,.04,abs(fract(uv.y*.8-time*.35)-.5)); col*=.92+.08*roll;
          gl_FragColor=vec4(col*boost,1.); }`,
    });
    const sw = 2.2, sh = 1.65;
    const body = new THREE.Mesh(new RoundedBoxGeometry(sw + 0.5, sh + 0.5, 1.6, 6, 0.16), new THREE.MeshStandardMaterial({ color: 0x1a1817, roughness: 0.55, metalness: 0.2 }));
    body.position.z = -0.8; scene.add(body);
    const inner = new THREE.Mesh(new RoundedBoxGeometry(sw + 0.14, sh + 0.14, 0.1, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 }));
    inner.position.z = 0.0; scene.add(inner);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), S.crt); scr.position.z = 0.051; scene.add(scr);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, clearcoat: 1 }));
    glass.position.z = 0.06;
    S.led = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.25, 0.1) })); S.led.position.set(sw / 2 - 0.05, -sh / 2 - 0.15, 0.02); scene.add(S.led);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 0.4, metalness: 0.5 }));
    desk.position.set(0, -sh / 2 - 0.3, 0); scene.add(desk);
    S.spill = new THREE.PointLight(0xffe8d8, 2.5, 5, 1.6); S.spill.position.set(0, 0, 1.2); scene.add(S.spill);
    const sh1 = makeShaft(6, 1.6, 0xffe0d0, 0.1); sh1.position.set(-1.2, 4, -0.5); sh1.rotation.z = -0.25; scene.add(sh1);
    S.dust = makeDust(400, [6, 4, 5], { color: 0xffe2d0, size: 30, opacity: 0.5, seed: 31 }); S.dust.position.z = 1; scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
  };

  function drawTerm(lt) {
    const g = S.tg; g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0b0807'; g.fillRect(0, 0, 1024, 768);
    const cream = '#F4EBDD', red = '#FF4458';
    const line = (s, y, col = cream, a = 1, size = 34, font = '"JetBrains Mono"', align = 'left', x = 70, glow = 12) => {
      g.save(); g.globalAlpha = clamp(a); g.font = `400 ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = glow; g.fillStyle = col; g.fillText(s, x, y); g.restore();
    };
    const typed = (s, y, t0, dur, col, a = 1) => { const n = Math.floor(clamp((lt - t0) / dur) * s.length); if (lt >= t0) line(s.slice(0, n), y, col, a); return n === s.length; };
    const fadeUnknown = 1 - 0.65 * inv(0.75, 0.95, lt);
    typed('> TRACE COMPLETE', 110, 0.0, 0.18, cream, 0.75);
    typed('> UNKNOWN SYSTEM DETECTED.', 170, 0.18, 0.3, red, fadeUnknown);
    if (lt > 0.62 && lt < 0.78 && Math.floor(lt * 20) % 2 === 0) line('█', 230, cream);
    typed('> IDENTITY:', 230, 0.72, 0.12, cream, 0.9);
    // the name resolves letter by letter
    const name = 'ZELTRION'; const p = inv(0.95, 1.4, lt);
    if (lt > 0.95) {
      let out = ''; const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*';
      for (let i = 0; i < name.length; i++) { const ci = p * (name.length + 2) - i; out += ci >= 2 ? name[i] : ci > 0 ? chars[Math.floor(hash(i * 7 + Math.floor(lt * 40)) * chars.length)] : ' '; }
      g.save(); g.font = '600 150px Cinzel'; g.letterSpacing = '14px'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#fff2e4'; g.shadowBlur = 10; g.fillStyle = cream; g.fillText(out, 512, 470); g.restore();
      // maroon light sweep once resolved
      const sw = inv(1.35, 1.75, lt);
      if (sw > 0 && sw < 1) { const x = lerp(-200, 1224, E.inOutSine(sw)); const gr = g.createLinearGradient(x - 140, 0, x + 140, 0);
        gr.addColorStop(0, 'rgba(200,16,46,0)'); gr.addColorStop(0.5, 'rgba(255,70,90,0.85)'); gr.addColorStop(1, 'rgba(200,16,46,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 380, 1024, 180); g.restore(); }
      const ul = E.outExpo(inv(1.38, 1.7, lt)); g.save(); g.shadowColor = red; g.shadowBlur = 16; g.fillStyle = red; g.fillRect(512 - 330 * ul, 572, 660 * ul, 4); g.restore();
      if (lt > 1.45) line('SOURCE: ZELTRION SOLUTIONS', 640, cream, inv(1.45, 1.6, lt) * 0.7, 26, '"JetBrains Mono"', 'center', 512, 8);
    } else if (lt > 0.84 && Math.floor(lt * 16) % 2 === 0) line('█', 290, cream);
  }

  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    drawTerm(lt); S.tex.needsUpdate = true;
    S.crt.uniforms.time.value = lt; S.crt.uniforms.boost.value = 1.0 + (lt > 1.35 ? 0.4 * Math.exp(-(lt - 1.35) * 5) : 0);
    const p = E.inOutSine(lt / 1.8);
    const pushEnd = lt < 1.0 ? p : lerp(E.inOutSine(1.0 / 1.8), 1, E.outCubic(inv(1.0, 1.4, lt)));
    cam.position.set(lerp(0.9, 0.0, p), lerp(0.35, 0.02, p), lerp(9.4, 7.0, pushEnd)).add(shake(lt, 0.006, 4, 8));
    cam.lookAt(0, 0, 0);
    S.dust.material.uniforms.time.value = lt + 7;
    S.led.visible = Math.floor(lt * 4) % 2 === 0;
    post.bloom = [0.7, 0.4, 0.85]; post.vignette = 0.6; post.grain = 0.075; post.ca = 0.0025; post.contrast = 1.05;
  };
  return S;
}
