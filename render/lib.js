// Shared helpers: easing, procedural materials, devices, particles, clip textures, HUD drawing.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const W = 1080, H = 1920;
export const BRAND = {
  cream: '#F7F3EC', maroon: '#63080F', green: '#043417',
  signal: '#C8102E',     // light-emitting tint of the maroon for dark scenes
  ember: '#E0445A',
  mint: '#5FBF8A',       // light-emitting tint of the dark green for "OK" states
};

// ---------- math / easing ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
export const E = {
  outCubic: t => 1 - Math.pow(1 - clamp(t), 3),
  inCubic: t => Math.pow(clamp(t), 3),
  inOutCubic: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  outExpo: t => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  inExpo: t => { t = clamp(t); return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
  inOutExpo: t => { t = clamp(t); if (t === 0 || t === 1) return t; return t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; },
  outQuint: t => 1 - Math.pow(1 - clamp(t), 5),
  inOutSine: t => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
  outBack: (t, s = 1.4) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; },
};
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
export function shake(t, amp, freq = 9, seed = 0) {
  return new THREE.Vector3(noise1(t * freq + seed) * amp, noise1(t * freq + seed + 50) * amp, 0);
}
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------- assets ----------
let MANIFEST = null;
export async function loadManifest() { MANIFEST = await (await fetch('../assets/site/manifest.json')).json(); return MANIFEST; }
const bitmapCache = new Map();
async function loadBitmap(url) {
  if (bitmapCache.has(url)) { const v = bitmapCache.get(url); bitmapCache.delete(url); bitmapCache.set(url, v); return v; }
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { imageOrientation: 'flipY' });
  bitmapCache.set(url, bmp);
  while (bitmapCache.size > 90) { const k = bitmapCache.keys().next().value; bitmapCache.get(k).close?.(); bitmapCache.delete(k); }
  return bmp;
}
// A texture slot that streams frames of an extracted website clip.
export class ClipTexture {
  constructor() {
    this.tex = new THREE.Texture();
    this.tex.flipY = false; this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.magFilter = THREE.LinearFilter;
    this.tex.generateMipmaps = true; this.tex.anisotropy = 8;
    this.key = null;
  }
  // srcTime: seconds into the clip (clamped to the clip length)
  async set(name, srcTime) {
    const n = MANIFEST[name];
    const i = Math.min(n, Math.max(1, Math.floor(srcTime * 30) + 1));
    const key = name + i;
    if (key === this.key) return this.tex;
    const bmp = await loadBitmap(`../assets/site/${name}/${String(i).padStart(4, '0')}.jpg`);
    this.tex.image = bmp; this.tex.needsUpdate = true; this.key = key;
    return this.tex;
  }
}
export async function loadImageTexture(url, srgb = true) {
  const bmp = await loadBitmap(url);
  const t = new THREE.Texture(bmp); t.flipY = false; t.needsUpdate = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8;
  return t;
}
export async function loadHtmlImage(url) {
  const img = new Image(); img.src = url; await img.decode(); return img;
}

// ---------- screen material (website content on device screens) ----------
const SCREEN_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const SCREEN_FS = `uniform sampler2D map; uniform sampler2D chrome; uniform float chromeFrac; uniform vec4 uvRect;
uniform float invert; uniform float brightness, tintMix, scan, noiseAmt, time, power, glare, round, aspect, opacity, glitch;
uniform vec3 tint; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 uv=vUv;
  // rounded-corner mask
  vec2 q=abs(uv-.5)*vec2(aspect,1.); vec2 b=vec2(aspect,1.)*.5-round; float sd=length(max(q-b,0.))-round;
  float mask = round>0. ? 1.-smoothstep(-.002,.002,sd) : 1.;
  if(mask<=0.) discard;
  if(glitch>0.){ float row=floor(uv.y*28.); float g=step(1.-glitch*.6,h(vec2(row,floor(time*24.)))); uv.x+= g*(h(vec2(row,time))-.5)*.15*glitch; }
  vec3 col;
  if(chromeFrac>0. && uv.y>1.-chromeFrac){ col=texture2D(chrome,vec2(uv.x,(uv.y-(1.-chromeFrac))/chromeFrac)).rgb; }
  else { vec2 s=vec2(uv.x, uv.y/(1.-chromeFrac)); col=texture2D(map, uvRect.xy+s*uvRect.zw).rgb; }
  float l=dot(col,vec3(.299,.587,.114));
  vec3 tc = invert>0.5 ? tint*(pow(1.-l,1.3)*1.3+.04) : tint*pow(l,1.4)*1.2;
  col=mix(col, tc, tintMix);
  col*=1.-scan*.35*(.5+.5*sin(uv.y*1400.));
  col+=(h(uv*900.+fract(time)*31.)-.5)*noiseAmt;
  // CRT-style power on: a bright line opens vertically
  float open=smoothstep(.12,.55,power); float halfH=mix(.004,.5,open);
  float inside=step(abs(uv.y-.5),halfH);
  col=mix(vec3(1.4), col, smoothstep(.25,.75,power))*inside*step(.001,power);
  col*=brightness;
  // glass glare
  float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),3.);
  float streak=smoothstep(.35,.0,abs(uv.x*.7+uv.y-1.05))*.08;
  col+=glare*(f*.25+streak);
  gl_FragColor=vec4(col, opacity*mask);
}`;
export function screenMaterial(opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: opts.map || null }, chrome: { value: opts.chrome || null }, chromeFrac: { value: opts.chromeFrac || 0 },
      uvRect: { value: new THREE.Vector4(...(opts.uvRect || [0, 0, 1, 1])) },
      brightness: { value: opts.brightness ?? 1.0 }, tintMix: { value: 0 }, tint: { value: new THREE.Color(0.9, 0.08, 0.12) },
      invert: { value: 0 }, scan: { value: 0 }, noiseAmt: { value: 0 }, time: { value: 0 }, power: { value: 1 }, glare: { value: opts.glare ?? 1 },
      round: { value: opts.round || 0 }, aspect: { value: opts.aspect || 1 }, opacity: { value: 1 }, glitch: { value: 0 },
    },
    vertexShader: SCREEN_VS, fragmentShader: SCREEN_FS, transparent: !!opts.transparent, side: THREE.FrontSide,
  });
  return m;
}

// Browser chrome strip (address bar with the real URL) as a texture.
export function browserChromeTexture(w = 1280, h = 96, url = 'zeltrionsolutions.com') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#E9E3DA'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#D9D1C5'; g.fillRect(0, h - 2, w, 2);
  ['#E0605A', '#E4B44C', '#5DB561'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(34 + i * 30, h / 2, 9, 0, 7); g.fill(); });
  const px = 200, pw = w - 400, ph = 52, py = (h - ph) / 2;
  g.fillStyle = '#FBF8F3'; roundRect(g, px, py, pw, ph, 26); g.fill();
  g.fillStyle = '#6E6A63'; g.font = '500 26px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('🔒  ' + url, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---------- devices ----------
function keyboardTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 420; const g = c.getContext('2d');
  g.fillStyle = '#9EA0A4'; g.fillRect(0, 0, 1024, 420);
  const rows = [14, 14, 13, 12, 11]; let y = 18;
  for (let r = 0; r < 5; r++) {
    const n = rows[r], kw = (1024 - 40) / n; let x = 20;
    for (let k = 0; k < n; k++) { g.fillStyle = '#1C1D20'; roundRect(g, x + 3, y, kw - 6, 62, 8); g.fill(); x += kw; }
    y += 70;
  }
  g.fillStyle = '#1C1D20'; roundRect(g, 300, y + 2, 424, 40, 8); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeLaptop(screenMat, { width = 3.2, aspect = 16 / 9, openAngle = 1.86 } = {}) {
  const root = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xb9bcc2, metalness: 1, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.25, metalness: 0.2 });
  const sh = width / aspect;
  const bw = width + 0.18, bd = sh + 0.55;
  const base = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.1, bd, 4, 0.05), alu); base.position.y = 0.05; root.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.86, bd * 0.42), new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.6, metalness: 0.3 }));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.101, -bd * 0.12); root.add(kb);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(bw * 0.36, 0.004, bd * 0.26, 2, 0.002), new THREE.MeshPhysicalMaterial({ color: 0xa9acb1, metalness: 1, roughness: 0.45 }));
  pad.position.set(0, 0.101, bd * 0.27); root.add(pad);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.1, -bd / 2 + 0.03); root.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(bw, sh + 0.2, 0.06, 4, 0.03), alu); lid.position.set(0, (sh + 0.2) / 2, -0.03); hinge.add(lid);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(bw - 0.04, sh + 0.16, 0.012, 3, 0.006), dark); bezel.position.set(0, (sh + 0.2) / 2, 0.004); hinge.add(bezel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(width, sh), screenMat); scr.position.set(0, (sh + 0.2) / 2 + 0.01, 0.0115); hinge.add(scr);
  hinge.rotation.x = -(openAngle - Math.PI / 2);
  root.userData = { hinge, screen: scr, sh, width };
  return root;
}
export function makePhone(screenMat, { h = 2.0 } = {}) {
  const w = h * 0.47, root = new THREE.Group();
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, metalness: 1, roughness: 0.25, clearcoat: 1 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.09, 6, 0.045), frame); root.add(body);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(w - 0.02, h - 0.02, 0.092, 6, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, metalness: 0, clearcoat: 1 }));
  root.add(glass);
  const sw = w - 0.07, shh = h - 0.07;
  screenMat.uniforms.round.value = 0.075 / shh; screenMat.uniforms.aspect.value = sw / shh; screenMat.transparent = true;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, shh), screenMat); scr.position.z = 0.0475; root.add(scr);
  const island = new THREE.Mesh(new RoundedBoxGeometry(w * 0.3, 0.075, 0.01, 3, 0.035), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, h / 2 - 0.1, 0.05); root.add(island);
  root.userData = { screen: scr, w, h };
  return root;
}
export function makeMonitor(screenMat, { width = 3.6, aspect = 1280 / 614 } = {}) {
  const root = new THREE.Group(); const sh = width / aspect;
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xc4c6ca, metalness: 1, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 });
  const back = new THREE.Mesh(new RoundedBoxGeometry(width + 0.22, sh + 0.22, 0.09, 4, 0.04), alu); root.add(back);
  const bez = new THREE.Mesh(new RoundedBoxGeometry(width + 0.16, sh + 0.16, 0.02, 3, 0.01), dark); bez.position.z = 0.04; root.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(width, sh), screenMat); scr.position.z = 0.0515; root.add(scr);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.1, 0.08, 3, 0.03), alu); neck.position.set(0, -sh / 2 - 0.45, -0.12); neck.rotation.x = -0.12; root.add(neck);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.04, 0.85, 3, 0.02), alu); foot.position.set(0, -sh / 2 - 1.02, 0.05); root.add(foot);
  root.userData = { screen: scr, sh, width };
  return root;
}
// Floating glass panel with website content.
export function makePanel(screenMat, w, h, { thickness = 0.03, frameColor = 0xfdfbf7 } = {}) {
  const root = new THREE.Group();
  const slab = new THREE.Mesh(new RoundedBoxGeometry(w + 0.06, h + 0.06, thickness, 4, Math.min(0.03, thickness / 2)),
    new THREE.MeshPhysicalMaterial({ color: frameColor, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 }));
  root.add(slab);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat); scr.position.z = thickness / 2 + 0.001; root.add(scr);
  root.userData = { screen: scr, slab };
  return root;
}
// Soft contact shadow (multiply-ish dark blob)
let shadowTex = null;
export function softShadow(w, h, opacity = 0.35) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false, color: 0x2a1a14 }));
  return m;
}

// ---------- atmosphere ----------
export function makeDust(count, box, { color = 0xffe8d8, size = 30, opacity = 0.6, seed = 1 } = {}) {
  const r = rng(seed); const pos = new Float32Array(count * 3), rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = (r() - .5) * box[0]; pos[i * 3 + 1] = (r() - .5) * box[1]; pos[i * 3 + 2] = (r() - .5) * box[2]; rnd[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: opacity }, focus: { value: 6 }, box: { value: new THREE.Vector3(...box) } },
    vertexShader: `attribute float rnd; uniform float time,size,focus; uniform vec3 box; varying float vA; varying float vBlur;
      void main(){ vec3 p=position; p.y+=sin(time*.4+rnd*30.)*.15+time*.05*(rnd-.3); p.x+=cos(time*.3+rnd*20.)*.12;
        p=mod(p+box*.5,box)-box*.5;
        vec4 mv=modelViewMatrix*vec4(p,1.); float d=-mv.z; float blur=clamp(abs(d-focus)/focus,0.,1.5);
        vBlur=blur; vA=(.35+.65*rnd)*(1.-blur*.45); gl_PointSize=size*(.35+rnd*.65)*(1.+blur*2.5)/max(d,.3); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying float vA; varying float vBlur;
      void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,mix(.6,0.,clamp(vBlur,0.,1.)),d); gl_FragColor=vec4(color*a*vA*opacity,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
// Volumetric-looking light shaft (cone), additive.
export function makeShaft(len, radius, color = 0xffeedd, intensity = 0.25) {
  const geo = new THREE.CylinderGeometry(radius * 0.08, radius, len, 48, 1, true); geo.translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, len: { value: len } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=position.y; vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 color; uniform float intensity,len; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float t=clamp(-vY/len,0.,1.); float edge=pow(abs(dot(normalize(vN),normalize(vV))),1.8); gl_FragColor=vec4(color*intensity*edge*(1.-t)*(1.-t)*smoothstep(0.,.05,t),1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, m);
}
// Full-screen-ish gradient backdrop (as a big sphere around the scene)
export function makeBackdrop(top, bottom, { radius = 60, glow = null, glowPos = [0, 0.1], glowSize = 0.5 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) }, glow: { value: new THREE.Color(glow || bottom) }, glowAmt: { value: glow ? 1 : 0 }, glowY: { value: glowPos[1] }, glowSize: { value: glowSize } },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,bottom,glow; uniform float glowAmt,glowY,glowSize; varying vec3 vP;
      void main(){ float t=smoothstep(-.6,.7,vP.y); vec3 c=mix(bottom,top,t); float g=exp(-pow(length(vec2(vP.x*1.,vP.y-glowY))/glowSize,2.)); c+=glow*g*glowAmt; gl_FragColor=vec4(c,1.); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), m); mesh.renderOrder = -10; return mesh;
}
// Glossy dark reflective floor
export function makeFloor(color = 0x0a0809, rough = 0.28, size = 80) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.6 }));
  m.rotation.x = -Math.PI / 2; return m;
}
// Thin glowing ring (for HUD-in-3D scanning rings / brand arcs)
export function makeRing(radius, width, color, opacity = 1, arc = Math.PI * 2, start = 0) {
  const g = new THREE.RingGeometry(radius - width / 2, radius + width / 2, 160, 1, start, arc);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
}

// ---------- 3D extruded ZS emblem from the traced official logo ----------
export function makeEmblem(json, { depth = 34, bevel = 4 } = {}) {
  const group = new THREE.Group(); const [cx, cy] = json.center; const parts = [];
  const mats = {
    maroon: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(BRAND.maroon), roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color(0xff8090) }),
    green: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(BRAND.green), roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color(0x80ffb0) }),
  };
  for (const p of json.pieces) {
    const shape = new THREE.Shape(p.pts.map(([x, y]) => new THREE.Vector2(x - cx, -(y - cy))));
    for (const hl of p.holes) shape.holes.push(new THREE.Path(hl.map(([x, y]) => new THREE.Vector2(x - cx, -(y - cy)))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -depth / 2); geo.computeBoundingBox();
    const c = new THREE.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, 0);
    const mesh = new THREE.Mesh(geo, mats[p.color]);
    const pivot = new THREE.Group(); pivot.position.set(c.x, c.y, 0); pivot.add(mesh);
    pivot.userData = { color: p.color, bbox: p.bbox, home: pivot.position.clone(), area: p.area };
    group.add(pivot); parts.push(pivot);
  }
  group.userData = { parts, mats };
  return group;
}

// ---------- HUD (2D canvas composited after tone mapping) ----------
export class Hud {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.premultiplyAlpha = true; this.tex.flipY = true;
  }
  clear() { this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, W, H); this.g.globalAlpha = 1; }
  // text with optional glow, tracking, alignment; returns width
  text(str, x, y, { font = '600 60px Cinzel', color = BRAND.cream, align = 'center', base = 'middle', alpha = 1, glow = 0, glowColor = null, track = 0, maxW = null } = {}) {
    const g = this.g; if (alpha <= 0) return 0;
    g.save(); g.globalAlpha = clamp(alpha); g.font = font; g.textAlign = align; g.textBaseline = base; g.letterSpacing = track + 'px';
    if (glow > 0) { g.shadowColor = glowColor || color; g.shadowBlur = glow; }
    g.fillStyle = color; g.fillText(str, x, y, maxW || undefined);
    if (glow > 0) { g.shadowBlur = glow * 0.35; g.fillText(str, x, y, maxW || undefined); }
    const w = g.measureText(str).width; g.restore(); return w;
  }
  measure(str, font, track = 0) { const g = this.g; g.save(); g.font = font; g.letterSpacing = track + 'px'; const w = g.measureText(str).width; g.restore(); return w; }
  // text revealed by a moving mask (wipe up from baseline) — for decisive premium reveals
  maskedText(str, x, y, p, opts = {}) {
    const g = this.g; const size = parseInt((opts.font || '60px').match(/(\d+)px/)[1]);
    g.save(); g.beginPath(); g.rect(0, y - size * 0.75, W, size * 1.5); g.clip();
    const off = (1 - E.outExpo(p)) * size * 1.2;
    this.text(str, x, y + off, { ...opts, alpha: (opts.alpha ?? 1) * clamp(p * 3) });
    g.restore();
  }
  // decode/scramble effect: characters resolve left to right
  decode(str, x, y, p, opts = {}, seed = 0) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*';
    const n = str.length; let out = '';
    for (let i = 0; i < n; i++) {
      const ci = p * (n + 4) - i;
      if (str[i] === ' ' || ci >= 4) out += str[i];
      else if (ci > 0) out += chars[Math.floor(hash(i * 13.7 + Math.floor(p * 60) + seed) * chars.length)];
      else out += ' ';
    }
    return this.text(out, x, y, opts);
  }
  type(str, x, y, p, opts = {}, cursor = true) {
    const n = Math.floor(clamp(p) * str.length + 0.0001); const s = str.slice(0, n);
    const w = this.text(s, x, y, { align: 'left', ...opts });
    if (cursor && p < 1.15 && p > 0) { const on = Math.floor(performance.now ? (p * 20) : 0) % 2 === 0 || p < 1; if (on) this.rect(x + w + 6, y - (opts.cursorH || 20), opts.cursorW || 14, (opts.cursorH || 20) * 2, opts.color || BRAND.cream, opts.alpha ?? 1); }
    return w;
  }
  rect(x, y, w, h, color, alpha = 1) { const g = this.g; g.save(); g.globalAlpha = clamp(alpha); g.fillStyle = color; g.fillRect(x, y, w, h); g.restore(); }
  line(x1, y1, x2, y2, color, width = 2, alpha = 1, glow = 0) {
    const g = this.g; g.save(); g.globalAlpha = clamp(alpha); g.strokeStyle = color; g.lineWidth = width; if (glow) { g.shadowColor = color; g.shadowBlur = glow; }
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
  }
  brackets(x, y, w, h, len, color, width = 3, alpha = 1) {
    const g = this.g; g.save(); g.globalAlpha = clamp(alpha); g.strokeStyle = color; g.lineWidth = width; g.beginPath();
    g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y);
    g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len);
    g.moveTo(x + w, y + h - len); g.lineTo(x + w, y + h); g.lineTo(x + w - len, y + h);
    g.moveTo(x + len, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - len); g.stroke(); g.restore();
  }
  pill(x, y, w, h, fill, stroke, alpha = 1, lw = 2) {
    const g = this.g; g.save(); g.globalAlpha = clamp(alpha); roundRect(g, x, y, w, h, h / 2);
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } g.restore();
  }
  image(img, x, y, w, h, alpha = 1) { const g = this.g; g.save(); g.globalAlpha = clamp(alpha); g.drawImage(img, x, y, w, h); g.restore(); }
  // dark gradient scrim for legibility
  scrim(y0, y1, alpha = 0.6, color = '0,0,0') {
    const g = this.g; const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, `rgba(${color},0)`); gr.addColorStop(0.5, `rgba(${color},${alpha})`); gr.addColorStop(1, `rgba(${color},0)`);
    g.save(); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); g.restore();
  }
  upload() { this.tex.needsUpdate = true; }
}
