// 대목장 NPC, 3D toon version (학습만화 tone): big head, thick brows, mustache + goatee, Baekje craftsman outfit.
// Usage: const npc = createDaemokjang({ pose: 'guide' | 'panic' | 'celebrate' }); scene.add(npc);
// Render with OutlineEffect (three/addons/effects/OutlineEffect.js) for the ink outlines.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COL = {
  skin: 0xf6cfa8, skinD: 0xe9b48c, blush: 0xf09a86, hair: 0x2a2420, white: 0xffffff, pupil: 0x1e1a18,
  mouth: 0x8e2f27, tongue: 0xe0796a, cel: 0x3f8a7c, celD: 0x2f6e63, gold: 0xd6a94c, red: 0xc9452c,
  pants: 0xf1ece0, boot: 0x3a2d25, stone: 0xd9d1c2, sweat: 0x8fd0ec,
};
let grad;
function gradientMap() {
  if (grad) return grad;
  const d = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  grad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  return grad;
}
const mats = {};
function M(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (!mats[key]) {
    const { noOutline, ...rest } = opts;
    mats[key] = new THREE.MeshToonMaterial({ color: COL[name], gradientMap: gradientMap(), ...rest });
    if (noOutline) mats[key].userData.outlineParameters = { visible: false };
  }
  return mats[key];
}
function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); return m;
}
const sph = (r, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 16);
const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 32, r, 12, false);

// ---------- head ----------
const H = new THREE.Vector3(0, 2.36, 0), R = 0.64;
function onHead(m, dx, dy, lift = 0) { // place a feature on the head surface, facing out
  const dir = new THREE.Vector3(dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))).normalize();
  m.position.copy(H).addScaledVector(dir, R + lift);
  m.lookAt(H.clone().addScaledVector(dir, 5));
  return m;
}
function head(expr) {
  const g = new THREE.Group();
  g.add(mesh(sph(R, 48, 36), M('skin'), H.toArray()));
  for (const s of [-1, 1]) g.add(mesh(sph(0.13), M('skin'), [s * (R - 0.02), H.y - 0.06, -0.02], [0, 0, 0], [0.55, 1, 0.8]));
  // hair cap (tilted back) + topknot with gold band
  const capG = new THREE.SphereGeometry(R + 0.025, 48, 24, 0, Math.PI * 2, 0, 1.32);
  g.add(mesh(capG, M('hair'), H.toArray(), [-0.42, 0, 0]));
  g.add(mesh(sph(0.2), M('hair'), [0, H.y + R + 0.1, -0.12]));
  g.add(mesh(new THREE.TorusGeometry(0.15, 0.045, 12, 32), M('gold'), [0, H.y + R - 0.02, -0.1], [Math.PI / 2 - 0.35, 0, 0]));
  // headband ring: front higher than back, knot and tails at the back right
  const a = 0.38, d = 0.24, n = new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
  const C = H.clone().addScaledVector(n, d), rr = Math.sqrt((R + 0.03) ** 2 - d * d);
  g.add(mesh(new THREE.TorusGeometry(rr, 0.065, 14, 64), M('red'), C.toArray(), [-(Math.PI / 2 + a), 0, 0]));
  const u = new THREE.Vector3(1, 0, 0), w = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
  const ring = phi => C.clone().addScaledVector(u, rr * Math.cos(phi)).addScaledVector(w, rr * Math.sin(phi));
  const K = ring(-0.55);
  g.add(mesh(sph(0.09), M('red'), K.toArray()));
  g.add(mesh(cap(0.055, 0.32), M('red'), [K.x + 0.2, K.y - 0.02, K.z - 0.12], [0.3, 0, -1.15], [1, 1, 0.45]));
  g.add(mesh(cap(0.055, 0.26), M('red'), [K.x + 0.16, K.y - 0.17, K.z - 0.08], [0.2, 0, -0.55], [1, 1, 0.45]));

  // eyes
  const eye = (s, kind) => {
    const e = new THREE.Group();
    if (kind === 'closed') {
      const arc = new THREE.TorusGeometry(0.085, 0.026, 8, 24, Math.PI);
      e.add(mesh(arc, M('hair'), [0, -0.03, 0.01]));
    } else {
      const wide = kind === 'wide';
      e.add(mesh(sph(0.12), M('white'), [0, 0, 0], [0, 0, 0], wide ? [1.05, 1.3, 0.35] : [0.95, 1.2, 0.35]));
      const pr = wide ? 0.045 : 0.07;
      e.add(mesh(sph(pr), M('pupil', { noOutline: true }), [s * -0.01, wide ? 0 : -0.015, 0.04], [0, 0, 0], [1, 1.12, 0.5]));
      if (!wide) e.add(mesh(sph(0.022), M('white', { noOutline: true }), [0.025, 0.025, 0.07]));
    }
    return onHead(e, s * 0.3, 0.02, -0.02);
  };
  const ek = expr === 'joy' ? 'closed' : expr === 'panic' ? 'wide' : 'open';
  g.add(eye(-1, ek), eye(1, ek));
  // brows (thick, angled per expression)
  for (const s of [-1, 1]) {
    const b = new THREE.Group();
    const tilt = expr === 'panic' ? s * -0.5 : expr === 'joy' ? s * -0.1 : s * -0.22;
    b.add(mesh(cap(0.045, 0.17), M('hair'), [0, 0, 0], [0, 0, Math.PI / 2 + tilt], [1, 1, 0.55]));
    g.add(onHead(b, s * 0.31, expr === 'panic' ? 0.3 : 0.25, 0.0));
  }
  if (expr === 'guide') { const b = g.children[g.children.length - 1]; b.position.y += 0.04; } // one brow raised: knowing look
  // nose, cheeks
  g.add(onHead(mesh(sph(0.095), M('skinD'), [0, 0, 0], [0, 0, 0], [1, 0.9, 0.8]), 0, -0.14, 0.02));
  for (const s of [-1, 1]) g.add(onHead(mesh(sph(0.1), M('blush', { noOutline: true }), [0, 0, 0], [0, 0, 0], [1.3, 0.75, 0.2]), s * 0.43, -0.2, -0.02));
  // mouth
  const mouth = new THREE.Group();
  if (expr === 'panic') {
    mouth.add(mesh(sph(0.1), M('mouth'), [0, 0, 0], [0, 0, 0], [0.8, 1.15, 0.3]));
    mouth.add(mesh(sph(0.05), M('tongue', { noOutline: true }), [0, -0.05, 0.02], [0, 0, 0], [1.2, 0.6, 0.4]));
    g.add(onHead(mouth, 0, -0.44, -0.01));
  } else {
    const big = expr === 'joy';
    const half = new THREE.SphereGeometry(big ? 0.15 : 0.11, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    mouth.add(mesh(half, M('mouth'), [0, 0, 0], [0, 0, 0], [1, big ? 1.1 : 0.85, 0.3]));
    mouth.add(mesh(sph(big ? 0.07 : 0.05), M('tongue', { noOutline: true }), [0, big ? -0.09 : -0.06, 0.02], [0, 0, 0], [1.3, 0.6, 0.4]));
    g.add(onHead(mouth, 0, -0.38, -0.02));
  }
  // mustache (curled ends) + goatee
  for (const s of [-1, 1]) {
    const pts = [[0, 0, 0], [s * 0.1, -0.03, -0.01], [s * 0.2, -0.04, -0.06], [s * 0.27, 0.02, -0.11], [s * 0.26, 0.07, -0.13]];
    const mg = new THREE.Group(); mg.add(mesh(tube(pts, 0.042), M('hair')));
    g.add(onHead(mg, 0, -0.27, 0.0));
  }
  const goatee = new THREE.Group();
  goatee.add(mesh(new THREE.ConeGeometry(0.13, 0.36, 24), M('hair'), [0, -0.12, 0], [Math.PI, 0, 0], [1, 1, 0.7]));
  g.add(onHead(goatee, 0, -0.72, -0.06));
  return g;
}

// ---------- body ----------
function body() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.LatheGeometry([[0, 0.12], [0.15, 0.14], [0.22, 0.32], [0.21, 0.6], [0.17, 0.8], [0, 0.82]].map(p => new THREE.Vector2(...p)), 32), M('pants'), [s * 0.22, 0, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 24), M('red'), [s * 0.22, 0.17, 0]));
    g.add(mesh(cap(0.12, 0.16), M('boot'), [s * 0.23, 0.1, 0.06], [Math.PI / 2, 0, 0], [1.05, 1, 0.85]));
  }
  const prof = [[0, 0.64], [0.6, 0.64], [0.63, 0.7], [0.57, 1.0], [0.53, 1.2], [0.52, 1.45], [0.46, 1.66], [0.26, 1.8], [0.12, 1.84], [0, 1.84]];
  g.add(mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(...p)), 48), M('cel'), [0, 0, 0], [0, 0, 0], [1, 1, 0.82]));
  g.add(mesh(new THREE.CylinderGeometry(0.615, 0.635, 0.12, 48, 1, true), M('gold', { side: THREE.DoubleSide }), [0, 0.71, 0], [0, 0, 0], [1, 1, 0.82]));
  g.add(mesh(new THREE.CylinderGeometry(0.565, 0.575, 0.14, 48, 1, true), M('red', { side: THREE.DoubleSide }), [0, 1.08, 0], [0, 0, 0], [1, 1, 0.84]));
  // crossing collar
  g.add(mesh(tube([[0.22, 1.82, 0.08], [0.14, 1.66, 0.3], [0.04, 1.5, 0.4]], 0.045), M('gold')));
  g.add(mesh(tube([[-0.24, 1.82, 0.06], [-0.12, 1.62, 0.33], [0.06, 1.38, 0.43], [0.2, 1.16, 0.44]], 0.05), M('gold')));
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 24), M('skin'), [0, 1.82, 0]));
  // lotus roof-tile buckle
  const buckle = new THREE.Group();
  buckle.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 32), M('gold'), [0, 0, 0], [Math.PI / 2, 0, 0]));
  for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; buckle.add(mesh(sph(0.025), M('red', { noOutline: true }), [Math.cos(t) * 0.065, Math.sin(t) * 0.065, 0.02], [0, 0, 0], [1, 1, 0.4])); }
  buckle.position.set(0.2, 1.08, 0.46); buckle.rotation.y = 0.35; g.add(buckle);
  for (const [x, rz] of [[0.17, 0.08], [0.24, -0.15]]) g.add(mesh(cap(0.03, 0.2), M('red'), [x, 0.9, 0.46], [0.1, 0, rz], [1, 1, 0.5]));
  return g;
}

// arm: shoulder pivot -> upper sleeve -> elbow pivot -> wide forearm sleeve -> gold cuff -> hand.
// elbow and hand are target points relative to the shoulder; the segments are aimed at them.
const DOWN = new THREE.Vector3(0, -1, 0);
function arm(side, elbow, hand, kind = 'fist') {
  const S = new THREE.Group(); S.position.set(side * 0.5, 1.66, 0);
  S.add(mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.42, 24), M('cel'), [0, -0.21, 0]));
  S.add(mesh(sph(0.15), M('cel'), [0, 0, 0]));
  const E = new THREE.Group(); E.position.y = -0.42; S.add(E);
  E.add(mesh(sph(0.16), M('cel'), [0, 0, 0]));
  E.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 24), M('cel'), [0, -0.2, 0]));
  E.add(mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.09, 24), M('gold'), [0, -0.38, 0]));
  const Hd = new THREE.Group(); Hd.position.y = -0.5; E.add(Hd);
  if (kind === 'palm') {
    Hd.add(mesh(sph(0.14), M('skin'), [0, -0.03, 0], [0, 0, 0], [0.95, 1.25, 0.55]));
    Hd.add(mesh(cap(0.045, 0.08), M('skin'), [side * -0.13, 0.04, 0.02], [0, 0, side * 0.7]));
  } else {
    Hd.add(mesh(sph(0.13), M('skin'), [0, 0, 0], [0, 0, 0], [1, 1.1, 0.85]));
    Hd.add(mesh(sph(0.055), M('skin'), [side * -0.11, 0.03, 0.05]));
  }
  const e = new THREE.Vector3(...elbow), h = new THREE.Vector3(...hand);
  S.quaternion.setFromUnitVectors(DOWN, e.clone().normalize());
  const ePos = e.clone().normalize().multiplyScalar(0.42);
  const foreWorld = h.clone().sub(ePos).normalize();
  const foreLocal = foreWorld.applyQuaternion(S.quaternion.clone().invert());
  E.quaternion.setFromUnitVectors(DOWN, foreLocal);
  return { S, E, Hd };
}
function square() { // gold carpenter's L-square
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(0.07, 0.95, 0.03, 3, 0.012), M('gold'), [0, 0, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.5, 0.07, 0.03, 3, 0.012), M('gold'), [0.215, -0.44, 0]));
  for (let i = 0; i < 9; i++) g.add(mesh(new THREE.BoxGeometry(0.035, 0.008, 0.035), M('red', { noOutline: true }), [-0.01, 0.38 - i * 0.09, 0.005]));
  return g;
}
function sparkle(s, pos) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.OctahedronGeometry(0.13, 0), M('gold'), [0, 0, 0], [0, 0, 0], [0.28, 1, 0.28]));
  g.add(mesh(new THREE.OctahedronGeometry(0.13, 0), M('gold'), [0, 0, 0], [0, 0, 0], [1, 0.28, 0.28]));
  g.position.set(...pos); g.scale.setScalar(s); return g;
}

export function createDaemokjang({ pose = 'guide' } = {}) {
  const root = new THREE.Group(); root.name = 'daemokjang';
  root.add(body());
  if (pose === 'guide') {
    const r = arm(-1, [-0.14, -0.4, 0.06], [-0.06, -0.78, 0.34]);
    const sq = square(); sq.position.set(0.02, -0.12, 0.06); sq.rotation.set(-0.15, 0.25, 0.05); r.Hd.add(sq);
    const l = arm(1, [0.4, -0.02, 0.12], [0.58, 0.46, 0.22], 'palm');
    root.add(r.S, l.S, head('guide'));
  } else if (pose === 'panic') {
    const hd = head('panic'); hd.rotation.z = 0.05; root.add(hd);
    root.add(arm(-1, [-0.33, 0.02, 0.26], [-0.07, 0.5, 0.4]).S, arm(1, [0.33, 0.02, 0.26], [0.07, 0.5, 0.4]).S);
    const sq = square(); sq.position.set(-0.95, 0.3, 0.3); sq.rotation.set(0.2, 0.3, 1.1); root.add(sq);
    for (const [p, r] of [[[0.95, 0.75, 0.2], [0.4, 0.3, 0.6]], [[1.1, 0.25, 0.1], [0.1, 0.5, -0.4]]]) root.add(mesh(new RoundedBoxGeometry(0.34, 0.22, 0.24, 3, 0.04), M('stone'), p, r));
    for (const [x, y, s] of [[0.85, 2.95, 1], [-0.85, 2.8, 0.8]]) {
      const drop = new THREE.Group();
      drop.add(mesh(sph(0.07), M('sweat'), [0, 0, 0])); drop.add(mesh(new THREE.ConeGeometry(0.068, 0.12, 20), M('sweat'), [0, 0.09, 0]));
      drop.position.set(x, y, 0.3); drop.scale.setScalar(s); root.add(drop);
    }
  } else {
    const hd = head('joy'); hd.rotation.z = -0.04; root.add(hd);
    const l = arm(-1, [-0.3, 0.3, 0.06], [-0.5, 0.76, 0.12]);
    const r = arm(1, [0.3, 0.3, 0.06], [0.5, 0.76, 0.12]);
    const sq = square(); sq.position.set(0.05, -0.3, 0.05); sq.rotation.set(0, 0, 0.15); r.Hd.add(sq);
    root.add(l.S, r.S);
    root.add(sparkle(1.1, [-1.2, 2.75, 0.2]), sparkle(0.8, [1.3, 2.2, 0.2]), sparkle(0.6, [-1.1, 1.55, 0.2]), sparkle(0.55, [1.05, 3.3, 0.1]));
  }
  return root;
}
