// Reusable environments: bright cream studio (website shots) and dark thriller void.
import * as THREE from 'three';
import { makeBackdrop, makeRing, makeDust, BRAND } from './lib.js';

export function creamStudio({ floor = true, arcs = true, fogNear = 30 } = {}) {
  const scene = new THREE.Scene();
  const bd = makeBackdrop(0xf3eee6, 0xd9d0c3, { glow: 0x2a2620, glowPos: [0, 0.25], glowSize: 0.6 }); scene.add(bd);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xb8a898, 1.1));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.2); key.position.set(-4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe0d8, 1.4); rim.position.set(5, 3, -5); scene.add(rim);
  if (floor) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0xe7dfd3, roughness: 0.85, metalness: 0 }));
    f.rotation.x = -Math.PI / 2; f.position.y = -0.001; scene.add(f);
  }
  const deco = new THREE.Group(); scene.add(deco);
  if (arcs) {
    const a1 = new THREE.Mesh(new THREE.RingGeometry(9.0, 9.06, 200, 1, 0.55, 2.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.green), transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    const a2 = new THREE.Mesh(new THREE.RingGeometry(9.0, 9.06, 200, 1, 3.75, 2.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.maroon), transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    deco.add(a1, a2); deco.position.set(0, 2.5, -14);
  }
  scene.fog = new THREE.Fog(0xe9e2d8, fogNear, 90);
  return { scene, backdrop: bd, deco, key, rim };
}

export function darkVoid({ glow = 0x2a0306, top = 0x060405, bottom = 0x000000, dust = true, glowY = 0.1, glowSize = 0.55 } = {}) {
  const scene = new THREE.Scene();
  const bd = makeBackdrop(top, bottom, { glow, glowPos: [0, glowY], glowSize }); scene.add(bd);
  let d = null;
  if (dust) { d = makeDust(900, [16, 10, 16], { color: 0xffe2d0, size: 38, opacity: 0.55 }); scene.add(d); }
  scene.fog = new THREE.FogExp2(0x050304, 0.03);
  return { scene, backdrop: bd, dust: d };
}
