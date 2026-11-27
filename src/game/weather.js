// 재해 시험의 겉모습: 폭풍우(어두운 하늘·빗줄기), 홍수(차오르는 물), 폭설(내리는 눈·윗면에 쌓이는 눈), 강풍(바람 줄기·흔들리는 나무).
// 물리는 sim.js가 맡고, 여기서는 sim.quake의 값(세기·수위·적설·돌풍·바람 방향)을 읽어 그리기만 한다. 저사양 모드면 입자 수를 줄인다.
import * as THREE from 'three';

const R = 13, TOP = 15; // 입자가 도는 둘레(탑 중심에서 반지름)와 높이
const N = { rain: 1800, snow: 1600, wind: 140 };
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- 쌓인 눈 ----------
// 1) 위를 향한 면이 눈 깊이에 따라 푸른 기 도는 흰색으로 덮인다: 재료 셰이더에 섞는다(snowify). 모든 재료가 SNOW 값 하나를 함께 본다.
export const SNOW = { value: 0 };
export function snowify(mat) {
  if (!mat || mat.isMeshBasicMaterial || mat.userData.snowify) return;
  mat.userData.snowify = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uSnow = SNOW;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSnow;
float snHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float snNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(snHash(i), snHash(i + vec2(1.0, 0.0)), f.x), mix(snHash(i + vec2(0.0, 1.0)), snHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (uSnow > 0.001) {
  vec3 snN = inverseTransformDirection(normal, viewMatrix);
  vec3 snP = (inverse(viewMatrix) * vec4(-vViewPosition, 1.0)).xyz;
  float up = smoothstep(0.2, 0.85, snN.y);
  float patchy = snNoise(snP.xz * 1.6) * 0.6 + snNoise(snP.xz * 5.1) * 0.4;
  float f = clamp(uSnow * 1.5 - patchy * 0.45, 0.0, 1.0) * up;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.94, 0.99), f);
  roughnessFactor = mix(roughnessFactor, 0.92, f);
}`);
  };
  mat.needsUpdate = true;
}
// 2) 부재마다 부드러운 눈 덮개: 부재의 보이는 모양 위로 내리꽂은 광선이 닿은 높이를 따라 깔고(지붕돌 경사도 따라간다),
//    가장자리로 갈수록 얇아져 둥글게 끝나며 조금 밖으로 내민다. 부재의 자식이라 부재가 떨어지면 같이 떨어진다.
const NG = 13, capMat = new THREE.MeshStandardMaterial({ color: 0xf1f5fb, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
const _ray = new THREE.Raycaster(), _v = new THREE.Vector3(), _d = new THREE.Vector3();
function buildCap(b) {
  const m = b.mesh, [w, h, d] = b.size; m.updateMatrixWorld(true);
  const targets = []; m.traverse(o => { if (o.isMesh && o !== b.cap && o.material && o.material.visible !== false) targets.push(o); });
  if (!targets.length) return null;
  _d.set(0, -1, 0).transformDirection(m.matrixWorld);
  const n = NG * NG, pos = new Float32Array(n * 3), base = new Float32Array(n), ok = new Uint8Array(n), wgt = new Float32Array(n);
  for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
    const k = i * NG + j, x = (i / (NG - 1) - 0.5) * w * 0.99, z = (j / (NG - 1) - 0.5) * d * 0.99;
    _ray.set(m.localToWorld(_v.set(x, h / 2 + 1.5, z)), _d);
    const hit = _ray.intersectObjects(targets, false)[0]; if (!hit) continue;
    const y = m.worldToLocal(hit.point.clone()).y; ok[k] = 1; base[k] = y;
    pos.set([x * 1.035, y, z * 1.035], k * 3); // 가장자리를 살짝 밖으로(처마 끝에 걸친 눈)
  }
  // 가장자리(격자 끝이나 광선이 비껴간 곳)에서 몇 칸 떨어졌는가 → 두께 비율(둥근 단면)
  for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
    const k = i * NG + j; if (!ok[k]) continue;
    let dm = Math.min(i, NG - 1 - i, j, NG - 1 - j, 3);
    for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) { const ii = i + a, jj = j + c; if (ii >= 0 && jj >= 0 && ii < NG && jj < NG && !ok[ii * NG + jj]) dm = Math.min(dm, Math.max(Math.abs(a), Math.abs(c)) - 1); }
    wgt[k] = [0, 0.55, 0.85, 1][Math.max(0, dm)];
  }
  const idx = [];
  for (let i = 0; i < NG - 1; i++) for (let j = 0; j < NG - 1; j++) {
    const a = i * NG + j, b1 = a + 1, c = a + NG, e = c + 1;
    if (ok[a] && ok[b1] && ok[c] && ok[e]) idx.push(a, b1, c, c, b1, e); // 위에서 볼 때 반시계: 법선이 위로
  }
  if (!idx.length) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const cap = new THREE.Mesh(geo, capMat); cap.receiveShadow = true; cap.castShadow = false; cap.userData = { base, wgt, t: -1 };
  m.add(cap); return cap;
}
function growCap(cap, t) {
  if (Math.abs(cap.userData.t - t) < 0.003) return;
  cap.userData.t = t; const p = cap.geometry.attributes.position, { base, wgt } = cap.userData;
  for (let k = 0; k < base.length; k++) p.array[k * 3 + 1] = base[k] + 0.004 + t * wgt[k];
  p.needsUpdate = true; cap.geometry.computeVertexNormals(); cap.geometry.computeBoundingSphere();
}
// 3) 내리는 눈송이: 둥글고 가장자리가 흐린 점(방사형 그라디언트), 크기·빠르기가 다른 세 겹
function flakeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(250,252,255,.85)'); gr.addColorStop(1, 'rgba(240,246,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FLAKES = [{ share: 0.5, size: 0.07, fall: 0.8, sway: 0.25 }, { share: 0.32, size: 0.12, fall: 1.1, sway: 0.35 }, { share: 0.18, size: 0.2, fall: 1.45, sway: 0.5 }];


export function makeWeather(scene) {
  const g = new THREE.Group(); g.renderOrder = 7; scene.add(g);
  // 빗줄기: 짧은 선분
  const rainPos = new Float32Array(N.rain * 6), rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb9c6cc, transparent: true, opacity: 0.55, depthWrite: false }));
  // 눈송이: 세 겹(작고 느린 것 · 중간 · 크고 빠른 것)
  const tex = flakeTex();
  const layers = FLAKES.map(L => { const n = Math.round(N.snow * L.share), pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, color: 0xffffff, size: L.size, transparent: true, opacity: 0.92, depthWrite: false, alphaTest: 0.02 }));
    return { ...L, n, pos, geo, pts }; });
  const snow = new THREE.Group(); for (const L of layers) snow.add(L.pts);
  // 바람 줄기: 바람 방향으로 흐르는 긴 선
  const windPos = new Float32Array(N.wind * 6), windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
  const wind = new THREE.LineSegments(windGeo, new THREE.LineBasicMaterial({ color: 0xf4f0e6, transparent: true, opacity: 0.35, depthWrite: false }));
  // 홍수 물: 흙탕물 원판
  const water = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.MeshStandardMaterial({ color: 0x7c7259, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.82 }));
  water.rotation.x = -Math.PI / 2; water.renderOrder = 4;
  for (const o of [rain, snow, wind, water]) { o.visible = false; o.frustumCulled = false; g.add(o); }
  const seed = () => {
    for (let i = 0; i < N.rain; i++) { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R, x = Math.cos(a) * r, z = Math.sin(a) * r, y = rnd(0, TOP); rainPos.set([x, y, z, x, y - 0.45, z], i * 6); }
    for (const L of layers) for (let i = 0; i < L.n; i++) { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R; L.pos.set([Math.cos(a) * r, rnd(0, TOP), Math.sin(a) * r], i * 3); }
    for (let i = 0; i < N.wind; i++) { const x = rnd(-R, R), z = rnd(-R, R), y = rnd(0.3, 11); windPos.set([x, y, z, x + 1.4, y, z], i * 6); }
  };
  seed();
  const W = { kind: null, dark: 0 };
  W.update = (dt, q, { mag = 1, perf = false, trees = [], blocks = [] } = {}) => {
    const kind = q ? q.kind : null, k = perf ? 0.35 : 1;
    if (kind !== W.kind) { W.kind = kind; if (kind) seed(); }
    const frac = q ? Math.max(0, Math.min(1, (mag - 1) / 6)) : 0;
    const [dx, dz] = q ? q.dir : [1, 0], gust = q && q.gust || 1;
    // 폭풍우: 빗줄기 + 어두운 하늘(W.dark를 game.js가 빛·배경에 쓴다)
    const wantDark = kind === 'storm' ? 0.35 + 0.45 * frac : kind === 'snow' ? 0.15 : 0;
    W.dark += (wantDark - W.dark) * Math.min(1, dt * 1.5);
    rain.visible = kind === 'storm';
    if (rain.visible) {
      const n = Math.floor(N.rain * k * (0.35 + 0.65 * frac)); rainGeo.setDrawRange(0, n * 2);
      const vy = 16 + 10 * frac, sx = dx * (3 + 6 * frac), sz = dz * (3 + 6 * frac);
      for (let i = 0; i < n; i++) {
        const o = i * 6; let y = rainPos[o + 1] - vy * dt;
        if (y < 0) { y += TOP; const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R; rainPos[o] = Math.cos(a) * r - sx * 0.3; rainPos[o + 2] = Math.sin(a) * r - sz * 0.3; }
        rainPos[o] += sx * dt; rainPos[o + 2] += sz * dt; rainPos[o + 1] = y;
        rainPos[o + 3] = rainPos[o] - sx * 0.04; rainPos[o + 4] = y - 0.5; rainPos[o + 5] = rainPos[o + 2] - sz * 0.04;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    // 폭설: 흩날리는 둥근 눈송이 + 위를 향한 면이 하얗게(SNOW) + 부재마다 부드러운 눈 덮개가 두꺼워진다
    snow.visible = kind === 'snow';
    if (snow.visible) {
      const t = performance.now() / 1000;
      for (const L of layers) {
        const n = Math.floor(L.n * k * (0.4 + 0.6 * frac)); L.geo.setDrawRange(0, n);
        const drift = 0.4 + 1.4 * frac, fall = L.fall * (0.85 + 0.5 * frac);
        for (let i = 0; i < n; i++) {
          const o = i * 3, ph = i * 1.7; let y = L.pos[o + 1] - fall * (0.8 + 0.4 * Math.sin(ph)) * dt;
          if (y < 0) y += TOP;
          L.pos[o] += (dx * drift + Math.sin(t * 0.9 + ph) * L.sway) * dt; L.pos[o + 2] += (dz * drift + Math.cos(t * 0.7 + ph) * L.sway) * dt; L.pos[o + 1] = y;
          if (Math.hypot(L.pos[o], L.pos[o + 2]) > R) { L.pos[o] *= -0.95; L.pos[o + 2] *= -0.95; }
        }
        L.geo.attributes.position.needsUpdate = true;
      }
      const depth = Math.min(1, (q.snow || 0) / 1.6); // 0~1: sim의 눈 깊이(최대 1.6)를 비율로
      SNOW.value = Math.max(SNOW.value, depth);
      const capT = 0.012 + 0.19 * depth;
      let built = 0;
      for (const b of blocks) {
        if (!b.snowA || !b.mesh) continue;
        if (b.cap === undefined) { if (built++ >= 1) continue; b.cap = buildCap(b); } // 처음 한 번 모양을 따 둔다(광선이 많아 한 프레임에 하나씩)
        if (b.cap) growCap(b.cap, capT);
      }
    }
    // 바람 줄기(강풍·폭풍우·폭설의 약한 바람) + 흔들리는 나무
    const windy = kind === 'wind' || kind === 'storm' || kind === 'snow', wpow = kind === 'snow' ? 0.3 : 1;
    wind.visible = windy && kind !== 'snow';
    if (wind.visible) {
      const n = Math.floor(N.wind * k * (0.3 + 0.7 * frac)); windGeo.setDrawRange(0, n * 2);
      const v = (8 + 14 * frac) * gust, len = 0.8 + 2.2 * frac;
      for (let i = 0; i < n; i++) {
        const o = i * 6; let x = windPos[o] + dx * v * dt, z = windPos[o + 2] + dz * v * dt;
        if (x * dx + z * dz > R) { x -= dx * 2 * R + rnd(-2, 2) * dz; z -= dz * 2 * R + rnd(-2, 2) * dx; }
        windPos[o] = x; windPos[o + 2] = z; windPos[o + 3] = x - dx * len; windPos[o + 4] = windPos[o + 1]; windPos[o + 5] = z - dz * len;
      }
      windGeo.attributes.position.needsUpdate = true;
      wind.material.opacity = 0.18 + 0.3 * frac;
    }
    const t = performance.now() / 1000;
    for (const tr of trees) {
      const amp = windy ? (0.03 + 0.16 * frac * wpow) * (0.7 + 0.3 * gust) : 0, s = Math.sin(t * (2.2 + frac * 2) + tr.x * 0.7) * amp;
      tr.obj.rotation.z += ((-dx * (amp * 0.6 + s)) - tr.obj.rotation.z) * Math.min(1, dt * 6);
      tr.obj.rotation.x += ((dz * (amp * 0.6 + s)) - tr.obj.rotation.x) * Math.min(1, dt * 6);
    }
    // 홍수: 물이 sim의 수위까지 차오른다
    const L = kind === 'flood' ? q.level || 0 : 0;
    water.visible = L > 0.01 || (W.water > 0.01);
    W.water = kind === 'flood' ? L : Math.max(0, (W.water || 0) - dt * 0.8);
    if (water.visible) { water.position.y = W.water; water.material.opacity = 0.7 + 0.12 * Math.sin(t * 1.7); }
  };
  // 탑을 다시 세우면(부재가 새로 만들어지면) 눈을 걷는다. 시험이 끝나도 다시 세우기 전까지는 쌓인 눈이 그대로 남는다.
  W.clearSnow = () => { SNOW.value = 0; };
  return W;
}
