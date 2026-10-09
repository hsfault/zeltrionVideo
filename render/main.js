// Deterministic frame renderer: window.renderAt(t) draws the reel at time t (seconds).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H, Hud, loadManifest, clamp, hash } from './lib.js';

const TL = await (await fetch('./timeline.json')).json();
await loadManifest();
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('italic 500 40px "Cormorant Garamond"');
await document.fonts.load('500 40px "Cormorant Garamond"'); await document.fonts.load('400 40px "JetBrains Mono"'); await document.fonts.load('600 40px Inter');

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.6, 0.9);
const hud = new Hud();

const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, tHud: { value: hud.tex }, time: { value: 0 },
    exposure: { value: 1 }, sat: { value: 1 }, contrast: { value: 1 }, lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) },
    vignette: { value: 0.35 }, grain: { value: 0.05 }, ca: { value: 0.0012 },
    zoom: { value: 0 }, glitch: { value: 0 }, flash: { value: 0 }, flashColor: { value: new THREE.Vector3(1, 1, 1) },
    fade: { value: 0 }, hudAlpha: { value: 1 }, seed: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tHud; uniform float time, exposure, sat, contrast, vignette, grain, ca, zoom, glitch, flash, fade, hudAlpha, seed;
  uniform vec3 lift, gain, flashColor; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  vec3 neutral(vec3 c){ float x=min(c.r,min(c.g,c.b)); float off= x<0.08 ? x-6.25*x*x : 0.04; c-=off;
    float peak=max(c.r,max(c.g,c.b)); const float sc=0.76; if(peak<sc) return c; float d=1.-sc; float np=1.-d*d/(peak+d-sc);
    c*=np/peak; float g=1.-1./(0.15*(peak-np)+1.); return mix(c,vec3(np),g); }
  vec3 toSRGB(vec3 c){ c=max(c,0.); return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-.055, step(.0031308,c)); }
  vec3 grade(vec3 lin){ vec3 c=neutral(lin*exposure); c=toSRGB(c);
    float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,sat); c=(c-.5)*contrast+.5; c=c*gain+lift*(1.-c); return clamp(c,0.,1.); }
  vec3 comp(vec2 uv){ vec3 b=grade(texture2D(tDiffuse,uv).rgb); vec4 hd=texture2D(tHud,uv)*hudAlpha; return hd.rgb+b*(1.-hd.a); }
  vec3 sampleCA(vec2 uv){ vec2 d=(uv-.5); float k=ca+glitch*.012; return vec3(comp(uv+d*k).r, comp(uv).g, comp(uv-d*k).b); }
  void main(){
    vec2 uv=vUv;
    if(glitch>0.){ float row=floor(uv.y*36.); float r=h(vec2(row,seed)); if(r>1.-glitch*.45){ uv.x+=(h(vec2(row,seed+3.))-.5)*.12*glitch; }
      float blk=step(1.-glitch*.12,h(vec2(floor(uv.y*9.),floor(uv.x*5.)+seed))); uv+=blk*vec2(.02,0.)*glitch; }
    vec3 col;
    if(zoom>0.001){ col=vec3(0.); vec2 c=vec2(.5); for(int i=0;i<14;i++){ float s=1.-zoom*.22*float(i)/13.; col+=sampleCA(c+(uv-c)*s); } col/=14.; }
    else col=sampleCA(uv);
    vec2 v=vUv-.5; col*=1.-vignette*smoothstep(.25,.95,length(v*vec2(1.,.75))*1.25);
    float n=h(vUv*vec2(1080.,1920.)+seed*17.)-.5; float lum=dot(col,vec3(.333)); col+=n*grain*(1.-abs(lum-.5)*1.2);
    col=mix(col,flashColor,clamp(flash,0.,1.));
    col*=1.-fade;
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
  }`,
};
const finalPass = new ShaderPass(FINAL);
finalPass.uniforms.tHud.value = hud.tex;   // ShaderPass clones uniforms; keep the live HUD texture
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(finalPass);

// assets shared by shots
const emblemJson = await (await fetch('../assets/emblem.json')).json();
const ctx = { THREE, renderer, hud, envMap, emblemJson, W, H, post: null, bloom: null };

const shotModules = {};
for (const s of TL.shots) shotModules[s.id] = null;
async function getShot(id) {
  if (!shotModules[id]) {
    const mod = await import(`./shots/${id}.js`);
    const inst = mod.default(); await inst.init(ctx); shotModules[id] = inst;
  }
  return shotModules[id];
}

function fxAt(t) {
  const o = { zoom: 0, glitch: 0, flash: 0, flashColor: [1, 1, 1] };
  for (const f of TL.fx) {
    const lt = t - f.t; if (lt < 0 || lt > f.dur) continue; const k = 1 - lt / f.dur;
    if (f.type === 'zoom') o.zoom = Math.max(o.zoom, f.amt * k * k);
    if (f.type === 'glitch') o.glitch = Math.max(o.glitch, f.amt * (k > 0.15 ? 1 : k / 0.15) * (hash(Math.floor(t * 30) * 3.1) > 0.25 ? 1 : 0.2));
    if (f.type === 'flash') { const v = f.amt * k * k * k; if (v > o.flash) { o.flash = v; o.flashColor = f.color; } }
  }
  return o;
}

window.renderAt = async (t) => {
  const s = TL.shots.find(s => t >= s.start && t < s.end) || TL.shots[TL.shots.length - 1];
  const shot = await getShot(s.id);
  hud.clear();
  const post = { exposure: 1, sat: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1], vignette: 0.35, grain: 0.05, ca: 0.0012, fade: 0, hudAlpha: 1, flash: 0, zoom: 0, glitch: 0, bloom: [0.6, 0.6, 0.9] };
  ctx.post = post;
  await shot.update(ctx, t - s.start, t, s.end - s.start);
  hud.upload();
  const fx = fxAt(t);
  renderPass.scene = shot.scene; renderPass.camera = shot.camera;
  shot.scene.environment = shot.scene.environment || envMap;
  bloom.strength = post.bloom[0]; bloom.radius = post.bloom[1]; bloom.threshold = post.bloom[2];
  const u = finalPass.uniforms;
  u.time.value = t; u.seed.value = Math.floor(t * 30) * 0.618 % 97;
  u.exposure.value = post.exposure; u.sat.value = post.sat; u.contrast.value = post.contrast;
  u.lift.value.set(...post.lift); u.gain.value.set(...post.gain);
  u.vignette.value = post.vignette; u.grain.value = post.grain; u.ca.value = post.ca;
  u.zoom.value = Math.max(fx.zoom, post.zoom); u.glitch.value = Math.max(fx.glitch, post.glitch);
  u.flash.value = Math.max(fx.flash, post.flash); u.flashColor.value.set(...(fx.flash >= post.flash ? fx.flashColor : (post.flashColor || [1, 1, 1])));
  u.fade.value = post.fade; u.hudAlpha.value = post.hudAlpha;
  composer.render();
  return true;
};
window.grab = (q = 0.95) => canvas.toDataURL('image/jpeg', q);
window.TL = TL;
window.READY = true;
