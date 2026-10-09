// 6.2–7.2  THE SCAN: a beam sweeps a node grid, nodes light as it passes.
import * as THREE from 'three';
import { W, H, BRAND, E, clamp, inv, lerp, shake, makeDust, makeBackdrop, hash } from '../lib.js';

export default function () {
  const S = {};
  S.init = async () => {
    const scene = new THREE.Scene(); S.scene = scene; scene.environmentIntensity = 0.12;
    scene.add(makeBackdrop(0x040203, 0x000000));
    scene.fog = new THREE.FogExp2(0x020101, 0.11);
    const NX = 70, NZ = 60, sp = 0.2; const count = NX * NZ;
    const geo = new THREE.BoxGeometry(0.13, 0.06, 0.13);
    S.mat = new THREE.ShaderMaterial({
      uniforms: { beamX: { value: -10 }, beamZ: { value: 10 }, time: { value: 0 } },
      vertexShader: `varying vec3 vWP; varying vec3 vN; varying float vId; attribute float id;
        void main(){ vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.); vWP=wp.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); vId=id; gl_Position=projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float beamX,beamZ,time; varying vec3 vWP; varying vec3 vN; varying float vId;
        float h(float n){ return fract(sin(n*91.3)*4375.5); }
        void main(){
          vec3 base=vec3(.025,.022,.024)+vec3(.05)*max(dot(vN,normalize(vec3(-.3,1.,.4))),0.);
          float top=step(.5,vN.y);
          float n1=exp(-abs(vWP.x-beamX)*7.); float n2=exp(-abs(vWP.z-beamZ)*7.);
          float tw=.45+.55*step(.35,h(vId+floor(time*6.)));
          float lit=max(step(vWP.x,beamX)*step(.55,h(vId*1.7)), step(beamZ,vWP.z)*step(.6,h(vId*3.1)));
          vec3 red=vec3(1.6,.08,.12);
          vec3 em=red*(n1*2.2+n2*2.2)*(.25+top) + red*lit*tw*.45*top + vec3(1.2,.9,.8)*lit*step(.97,h(vId*7.3))*top*1.5;
          gl_FragColor=vec4(base+em,1.);
        }`,
    });
    const mesh = new THREE.InstancedMesh(geo, S.mat, count);
    const ids = new Float32Array(count); const m = new THREE.Matrix4(); let i = 0;
    for (let x = 0; x < NX; x++) for (let z = 0; z < NZ; z++) {
      const hgt = 1 + Math.floor(hash(i * 3.3) * 3) * 0.6;
      m.compose(new THREE.Vector3((x - NX / 2) * sp, 0, (z - NZ / 2) * sp - 2), new THREE.Quaternion(), new THREE.Vector3(1, hgt, 1));
      mesh.setMatrixAt(i, m); ids[i] = i; i++;
    }
    geo.setAttribute('id', new THREE.InstancedBufferAttribute(ids, 1));
    scene.add(mesh);
    // beams: bright line + vertical light sheet
    const sheetMat = () => new THREE.ShaderMaterial({
      uniforms: { a: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float a; varying vec2 vUv; void main(){ float f=pow(1.-vUv.y,3.)*smoothstep(0.,.15,vUv.x)*smoothstep(1.,.85,vUv.x); gl_FragColor=vec4(vec3(.55,.03,.05)*f*a,1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    S.beam1 = new THREE.Group(); scene.add(S.beam1);
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.45) })); l1.position.set(0, 0.06, -2); S.beam1.add(l1);
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), sheetMat()); s1.rotation.y = Math.PI / 2; s1.position.set(0, 1.15, -2); S.beam1.add(s1);
    S.beam2 = new THREE.Group(); scene.add(S.beam2);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(14, 0.018, 0.018), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.45) })); l2.position.set(0, 0.06, 0); S.beam2.add(l2);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), sheetMat()); s2.position.set(0, 1.15, 0); S.beam2.add(s2);
    S.dust = makeDust(500, [8, 3, 8], { color: 0xffb0b0, size: 26, opacity: 0.5, seed: 21 }); S.dust.position.set(0, 1, -1.5); scene.add(S.dust);
    S.camera = new THREE.PerspectiveCamera(42, W / H, 0.02, 100);
  };
  S.update = async (ctx, lt) => {
    const { hud, post } = ctx; const cam = S.camera;
    const p = E.inOutSine(lt / 1.0);
    cam.position.set(lerp(-1.6, 0.9, p), lerp(0.75, 0.6, p), lerp(2.2, 1.9, p)).add(shake(lt, 0.008, 6));
    cam.lookAt(lerp(-0.4, 0.4, p), 0, -1.8);
    const bx = lerp(-7, 7, E.inOutSine(inv(0.0, 0.65, lt)));
    const bz = lerp(4, -8, E.inOutSine(inv(0.35, 1.0, lt)));
    S.mat.uniforms.beamX.value = bx; S.mat.uniforms.beamZ.value = bz; S.mat.uniforms.time.value = lt;
    S.beam1.position.x = bx; S.beam2.position.z = bz;
    S.beam1.visible = lt < 0.68; S.beam2.visible = lt > 0.33;
    S.dust.material.uniforms.time.value = lt + 6;
    post.bloom = [0.85, 0.45, 0.72]; post.vignette = 0.6; post.grain = 0.07; post.ca = 0.003; post.contrast = 1.1;

    const pct = Math.min(100, Math.floor(E.inOutSine(lt / 0.95) * 100));
    hud.text('SCANNING NETWORK', 90, 300, { font: '400 30px "JetBrains Mono"', color: BRAND.cream, align: 'left', track: 6, alpha: 0.9 });
    hud.text(String(pct).padStart(3, '0') + '%', 990, 300, { font: '700 30px "JetBrains Mono"', color: '#FF3B4E', align: 'right', glow: 12 });
    hud.rect(90, 330, 900, 3, '#3a1418'); hud.rect(90, 330, 9 * pct, 3, '#FF3B4E');
    for (let k = 0; k < 7; k++) {
      const appear = k * 0.12; if (lt < appear) continue;
      const hex = '0x' + Math.floor(hash(k * 7.1 + Math.floor(lt * 20)) * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
      hud.text(`NODE ${String(k * 137 + 211).padStart(4, '0')}  ${hex}  ${k < 6 ? 'OK' : 'ANOMALY'}`, 90, 380 + k * 40, { font: '400 24px "JetBrains Mono"', color: k < 6 ? BRAND.cream : '#FF3B4E', align: 'left', alpha: k < 6 ? 0.55 : 1, glow: k < 6 ? 0 : 10 });
    }
  };
  return S;
}
