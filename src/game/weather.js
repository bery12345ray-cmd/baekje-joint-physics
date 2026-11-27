// 재해 시험의 겉모습: 폭풍우(어두운 하늘·빗줄기), 홍수(차오르는 물), 폭설(내리는 눈·윗면에 쌓이는 눈), 강풍(바람 줄기·흔들리는 나무).
// 물리는 sim.js가 맡고, 여기서는 sim.quake의 값(세기·수위·적설·돌풍·바람 방향)을 읽어 그리기만 한다. 저사양 모드면 입자 수를 줄인다.
import * as THREE from 'three';

const R = 13, TOP = 15; // 입자가 도는 둘레(탑 중심에서 반지름)와 높이
const N = { rain: 1800, snow: 1600, wind: 140 };
const rnd = (a, b) => a + Math.random() * (b - a);

export function makeWeather(scene) {
  const g = new THREE.Group(); g.renderOrder = 7; scene.add(g);
  // 빗줄기: 짧은 선분
  const rainPos = new Float32Array(N.rain * 6), rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb9c6cc, transparent: true, opacity: 0.55, depthWrite: false }));
  // 눈송이
  const snowPos = new Float32Array(N.snow * 3), snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.11, transparent: true, opacity: 0.9, depthWrite: false }));
  // 바람 줄기: 바람 방향으로 흐르는 긴 선
  const windPos = new Float32Array(N.wind * 6), windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
  const wind = new THREE.LineSegments(windGeo, new THREE.LineBasicMaterial({ color: 0xf4f0e6, transparent: true, opacity: 0.35, depthWrite: false }));
  // 홍수 물: 흙탕물 원판
  const water = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.MeshStandardMaterial({ color: 0x7c7259, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.82 }));
  water.rotation.x = -Math.PI / 2; water.renderOrder = 4;
  for (const o of [rain, snow, wind, water]) { o.visible = false; o.frustumCulled = false; g.add(o); }
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf6f8fa, roughness: 0.95 });
  const seed = () => {
    for (let i = 0; i < N.rain; i++) { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R, x = Math.cos(a) * r, z = Math.sin(a) * r, y = rnd(0, TOP); rainPos.set([x, y, z, x, y - 0.45, z], i * 6); }
    for (let i = 0; i < N.snow; i++) { const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R; snowPos.set([Math.cos(a) * r, rnd(0, TOP), Math.sin(a) * r], i * 3); }
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
    // 폭설: 흩날리며 내리는 눈 + 드러난 윗면에 쌓이는 눈(sim이 정한 깊이만큼)
    snow.visible = kind === 'snow';
    if (snow.visible) {
      const n = Math.floor(N.snow * k * (0.4 + 0.6 * frac)); snowGeo.setDrawRange(0, n); const t = performance.now() / 1000;
      for (let i = 0; i < n; i++) {
        const o = i * 3; let y = snowPos[o + 1] - (1.1 + 0.8 * frac) * dt;
        if (y < 0) y += TOP;
        snowPos[o] += (dx * (0.6 + 1.6 * frac) + Math.sin(t * 1.3 + i) * 0.35) * dt; snowPos[o + 2] += (dz * (0.6 + 1.6 * frac) + Math.cos(t * 1.1 + i) * 0.35) * dt; snowPos[o + 1] = y;
        if (Math.hypot(snowPos[o], snowPos[o + 2]) > R) { snowPos[o] *= -0.95; snowPos[o + 2] *= -0.95; }
      }
      snowGeo.attributes.position.needsUpdate = true;
      const depth = q.snow || 0;
      for (const b of blocks) {
        if (!b.snowA || !b.mesh) continue;
        if (!b.cap) { b.cap = new THREE.Mesh(new THREE.BoxGeometry(b.size[0] * 0.98, 1, b.size[2] * 0.98), capMat); b.cap.castShadow = false; b.cap.receiveShadow = true; b.mesh.add(b.cap); }
        const h = Math.max(0.005, depth * 0.25); b.cap.scale.y = h; b.cap.position.y = b.size[1] / 2 + h / 2;
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
  return W;
}
