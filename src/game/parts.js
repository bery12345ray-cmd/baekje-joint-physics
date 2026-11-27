// 실제 탑 부재의 모양. 물리 충돌은 sim.js의 상자(size)로 하고, 여기서는 그 상자에 맞춰 보이는 모양만 만든다.
// 모든 모양은 부재 중심을 원점으로, 가로 w · 높이 h · 깊이 d 상자 안에 들어가게 그린다(지붕 기와와 상륜만 조금 위로 넘친다).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PART_NAMES = {
  jidae: '지대석', gidan: '기단 면석·갑석', tapsin1: '1층 탑신석(우주)', tapsin: '탑신석', batchim: '옥개받침', okgae: '옥개석',
  jangsik: '장식석', noban: '노반', bokbal: '복발·보주',
  mgidan: '미륵사지 단층 기단', mgidung: '민흘림 돌기둥', msimju: '심주석', mbyeok: '문 낸 벽석', mchangbang: '창방·평방', mbatchim: '3단 층급받침', mokgae: '미륵사지 지붕돌', mtapsin: '미륵사지 몸돌',
  wbase: '석조 기단', gidung: '기둥', simju: '심주', gongpo: '창방·공포', cheoma: '처마 서까래', giwa: '기와지붕', sangryun: '상륜',
};

function uvBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] * 0.8, uv.getY(i) * dims[f][1] * 0.8); }
  return g;
}
function planarUV(g) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + p.getZ(i) * 0.5) * 0.8; uv[i * 2 + 1] = (p.getY(i) + p.getZ(i) * 0.5) * 0.8; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}

// 처마가 들린 지붕(옥개석·처마·기와): 아래 처마선 a, 꼭대기 평면 t, 처마 두께 e, 귀솟음 lift, 바닥 y0, 꼭대기 y1
export function eaveRoof({ a, t, e, lift, y0, y1, n = 10 }) {
  const ring = (half, y, withLift) => {
    const pts = [];
    for (let s = 0; s < 4; s++) for (let i = 0; i < n; i++) {
      const u = -1 + 2 * i / n; let x, z;
      if (s === 0) { x = u; z = -1; } else if (s === 1) { x = 1; z = u; } else if (s === 2) { x = -u; z = 1; } else { x = -1; z = -u; }
      const L = withLift ? lift * Math.pow(Math.abs(x * z), 2.2) : 0;
      pts.push([x * half, y + L, z * half]);
    }
    return pts;
  };
  const R0 = ring(a, y0, true), R1 = ring(a, y0 + e, true), R2 = ring(t, y1, false), pos = [];
  const tri = (p, q, r) => pos.push(...p, ...q, ...r);
  const N = R0.length;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    tri([0, y0, 0], R0[j], R0[i]);                         // 바닥
    tri(R0[i], R0[j], R1[j]); tri(R0[i], R1[j], R1[i]);    // 처마 옆면
    tri(R1[i], R1[j], R2[j]); tri(R1[i], R2[j], R2[i]);    // 경사면
    tri([0, y1, 0], R2[i], R2[j]);                         // 꼭대기
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); return planarUV(g);
}
// 위가 살짝 좁은 네모 탑신
function frustum(wb, wt, h) {
  const g = new THREE.CylinderGeometry(wt / Math.SQRT2, wb / Math.SQRT2, h, 4, 1); g.rotateY(Math.PI / 4);
  return planarUV(g.toNonIndexed());
}

// 일러스트처럼 먹선으로 윤곽을 두른다
const INK = new THREE.LineBasicMaterial({ color: 0x4a463e, transparent: true, opacity: 0.85 });
// ---------- 블렌더에서 만든 부재(public/models/<부재>.glb) ----------
// models/manifest.json에 적힌 부재만 불러온다. 없으면 아래 코드로 그린 모양을 그대로 쓴다(물리 상자는 어느 쪽이든 같다).
// 블렌더 재료 이름 → 게임 재료: stone·wood·red·plaster·green·gold·tile
const MODELS = {};
export async function loadPartModels(base = 'models/') {
  try {
    const r = await fetch(base + 'manifest.json', { cache: 'no-cache' }); if (!r.ok) return 0;
    const list = await r.json(), loader = new GLTFLoader();
    await Promise.all(list.map(async p => { try { MODELS[p] = (await loader.loadAsync(base + p + '.glb')).scene; } catch (e) { console.warn('model', p, e); } }));
    return Object.keys(MODELS).length;
  } catch { return 0; }
}
export const hasModel = part => !!MODELS[part];
function modelPart(part, [w, h, d], M, { ink, tone }) {
  const src = MODELS[part], inner = src.clone(true), G = new THREE.Group();
  const box = new THREE.Box3().setFromObject(inner), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const stone = (tone && M['granite_' + tone]) || M.granite;
  const pick = n => { n = (n || '').toLowerCase(); return n.startsWith('stone_dark') ? (M.granite_dark || stone) : n.startsWith('stone') ? stone : n.startsWith('wood') ? M.pine : n.startsWith('red') ? M.dan : n.startsWith('plaster') ? M.plaster : n.startsWith('green') ? M.green : n.startsWith('gold') ? (M.gold || M.goldPaint) : n.startsWith('tile') ? (M.giwa || M.tile) : null; };
  inner.traverse(o => { if (!o.isMesh) return; const m = pick(o.material && o.material.name); if (m) o.material = m; o.castShadow = o.receiveShadow = true;
    if (ink) o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 32), INK)); });
  inner.position.set(-c.x, -c.y, -c.z);
  const fit = new THREE.Group(); fit.add(inner); fit.scale.set(w / (sz.x || 1), h / (sz.y || 1), d / (sz.z || 1)); G.add(fit);
  return G;
}
export function buildPart(part, size, M, opts = {}) {
  if (MODELS[part]) return modelPart(part, size, M, { ink: opts.ink !== false, tone: opts.tone });
  return buildPartCode(part, size, M, opts);
}
function buildPartCode(part, [w, h, d], M, { corner = [1, 1], ink = true, wall = 0, peak = 0, tone } = {}) {
  const G = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    if (ink) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), INK); m.add(e); } G.add(m); return m; };
  const box = (bw, bh, bd, mat, x, y, z) => add(uvBox(bw, bh, bd), mat, x, y, z);
  const stone = (tone && M['granite_' + tone]) || M.granite; // 탑마다 돌 빛깔(무량사 갈색, 남매탑 담홍색)
  switch (part) {
    case 'jidae': box(w, h, d, stone); break;
    case 'wbase':
    case 'gidan': { // 면석 + 모서리 우주와 탱주 + 위를 덮는 갑석
      const cap = Math.min(0.12, h * 0.28), body = h - cap, fw = w * 0.92;
      box(fw, body, fw, stone, 0, -h / 2 + body / 2, 0);
      box(w, cap, d, stone, 0, h / 2 - cap / 2, 0);
      const s = 0.16, out = fw / 2 + 0.025;
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(s, body, s, stone, x * (out - s / 2), -h / 2 + body / 2, z * (out - s / 2));
      for (const k of [-1, 1]) for (const side of [0, 1]) { const p = k * fw / 6, q = fw / 2 + 0.012;
        if (side) { box(0.12, body, 0.03, stone, p, -h / 2 + body / 2, q); box(0.12, body, 0.03, stone, p, -h / 2 + body / 2, -q); }
        else { box(0.03, body, 0.12, stone, q, -h / 2 + body / 2, p); box(0.03, body, 0.12, stone, -q, -h / 2 + body / 2, p); } }
      if (part === 'wbase') box(w * 0.5, 0.04, w * 0.5, stone, 0, h / 2 + 0.0, 0); // 심초석 자리
      break;
    }
    case 'tapsin1': { // 1층 탑신: 빈틈없이 닫힌 몸돌, 네 모서리에 배흘림 우주, 각 면 가운데 면석 이음줄
      const wb = w * 0.9, wt = w * 0.86;
      add(frustum(wb, wt, h), stone);
      const s = Math.min(0.24, w * 0.11);
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { // 위로 갈수록 가늘어지는 모서리 기둥(민흘림)
        const o = (wb + wt) / 4 - s / 2 + 0.03;
        add(frustum(s * 1.06, s * 0.88, h), stone, x * o, 0, z * o);
      }
      const m = (wb + wt) / 4 + 0.004;
      for (const k of [-1, 1]) { box(0.025, h * 0.96, 0.012, M.seam || stone, 0, 0, k * m); box(0.012, h * 0.96, 0.025, M.seam || stone, k * m, 0, 0); }
      break;
    }
    case 'tapsin': { // 위로 갈수록 좁아지는 탑신 + 우주
      add(frustum(w * 0.96, w * 0.9, h), stone);
      const s = Math.min(0.16, w * 0.08);
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(s, h, s, stone, x * (w * 0.465 - s / 2 + 0.02), 0, z * (w * 0.465 - s / 2 + 0.02));
      break;
    }
    case 'batchim': { // 층단 받침 두 단
      const t = h / 2; box(w * 0.84, t, d * 0.84, stone, 0, -h / 2 + t / 2, 0); box(w, t, d, stone, 0, h / 2 - t / 2, 0);
      break;
    }
    case 'okgae': add(eaveRoof({ a: w / 2, t: w * 0.27, e: h * 0.36, lift: h * 0.42, y0: -h / 2, y1: h / 2 }), stone); break;
    case 'noban': box(w * 0.94, h * 0.8, d * 0.94, stone, 0, -h * 0.1, 0); box(w, h * 0.2, d, stone, 0, h * 0.4, 0); break;
    case 'bokbal': {
      const r = Math.min(w, d) * 0.46;
      const dome = add(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), stone, 0, -h / 2, 0); dome.scale.y = 0.75;
      add(new THREE.CylinderGeometry(r * 0.28, r * 0.32, h * 0.22, 12), stone, 0, -h / 2 + r * 0.75 + h * 0.08, 0);
      add(new THREE.SphereGeometry(r * 0.42, 16, 12), stone, 0, h / 2 - r * 0.42, 0);
      break;
    }
    case 'simju':
    case 'gidung': { // 둥근 기둥(단청 붉은 칠) + 주두
      const r = Math.min(w, d) * 0.45;
      add(new THREE.CylinderGeometry(r * 0.94, r, h - 0.06, 14), part === 'simju' ? M.pine : M.dan, 0, -0.03, 0);
      box(w, 0.06, d, M.pine, 0, h / 2 - 0.03, 0);
      break;
    }
    case 'gongpo': { // 네 변의 창방 + 공포(소로) 줄
      const t = 0.18, bh = h * 0.6;
      for (const k of [-1, 1]) { box(w, bh, t, M.green, 0, -h / 2 + bh / 2, k * (d / 2 - t / 2)); box(t, bh, d - 2 * t, M.green, k * (w / 2 - t / 2), -h / 2 + bh / 2, 0); }
      const n = Math.max(3, Math.round(w / 0.45));
      for (let i = 0; i <= n; i++) { const p = -w / 2 + 0.06 + (w - 0.12) * i / n;
        for (const k of [-1, 1]) { box(0.1, h - bh, 0.12, M.goldPaint, p, h / 2 - (h - bh) / 2, k * (d / 2 - 0.06)); box(0.12, h - bh, 0.1, M.goldPaint, k * (w / 2 - 0.06), h / 2 - (h - bh) / 2, p); } }
      box(w - 2 * t, 0.03, d - 2 * t, M.pine, 0, -h / 2 + 0.015, 0);
      if (wall > 0) { // 기둥 사이 흰 벽과 가운데 문(창방에 매달아 함께 흔들린다)
        const iw = w - 0.36, y = -h / 2 - wall / 2, dw = Math.min(0.7, iw * 0.3), dh = wall * 0.74;
        for (const k of [-1, 1]) { box(iw, wall, 0.06, M.plaster, 0, y, k * (d / 2 - 0.2)); box(0.06, wall, iw, M.plaster, k * (w / 2 - 0.2), y, 0);
          box(dw, dh, 0.03, M.door, 0, -h / 2 - wall + dh / 2, k * (d / 2 - 0.16)); box(0.03, dh, dw, M.door, k * (w / 2 - 0.16), -h / 2 - wall + dh / 2, 0); }
      }
      break;
    }
    case 'cheoma': add(eaveRoof({ a: w * 0.46, t: w * 0.36, e: h * 0.45, lift: h * 0.5, y0: -h / 2, y1: h / 2 }), M.pine); break;
    case 'giwa': { // 기와지붕: 처마 끝이 들리고 가운데로 솟는다(충돌 상자보다 위로 넘친다)
      const top = peak ? w * 0.34 : 0.42; add(eaveRoof({ a: w / 2, t: peak ? w * 0.02 : w * 0.27, e: 0.06, lift: 0.22, y0: -h / 2, y1: -h / 2 + top, n: 14 }), M.giwa || M.tile);
      break;
    }
    case 'sangryun': { // 찰주 + 노반 + 보륜 아홉 + 수연 + 보주
      add(new THREE.CylinderGeometry(0.035, 0.04, h, 8), M.gold);
      box(w, 0.1, d, M.gold, 0, -h / 2 + 0.05, 0);
      for (let i = 0; i < 9; i++) add(new THREE.TorusGeometry(0.1 - i * 0.004, 0.022, 6, 16), M.gold, 0, -h / 2 + 0.2 + i * 0.07, 0).rotation.x = Math.PI / 2;
      const flame = add(new THREE.SphereGeometry(0.1, 12, 8), M.gold, 0, h / 2 - 0.17, 0); flame.scale.set(1, 0.45, 1);
      add(new THREE.SphereGeometry(0.06, 12, 10), M.gold, 0, h / 2 - 0.06, 0);
      break;
    }
    default: return null;
  }
  return G;
}
