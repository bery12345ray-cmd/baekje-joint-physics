// 탑 둘레의 백제 마을과 정림사 가람. 탑 일러스트와 같은 화풍(낮은 채도 면 + 먹선 윤곽).
// 정림사지 배치(국가유산청 국가유산포털·위키백과 「부여 정림사지」): 남쪽에서 북쪽으로 중문·오층석탑·금당·강당이 일직선,
// 둘레는 회랑(북쪽이 더 넓은 사다리꼴), 중문 앞에 연못 둘. 오늘날: 금당·회랑은 터만 남고, 강당 자리에 석조여래좌상 보호각(1993),
// 가까이에 정림사지박물관(2006 개관).
// 좌표: 탑이 원점, 북쪽 = -z(화면 안쪽), 남쪽 = +z(카메라 쪽).
import * as THREE from 'three';
import { eaveRoof } from './parts.js';

const INK = new THREE.LineBasicMaterial({ color: 0x4a463e, transparent: true, opacity: 0.8 });
const mat = (color, rough = 0.9) => new THREE.MeshStandardMaterial({ color, roughness: rough });
// 마을 재료는 탑과 따로 둔다(불이 나면 마을만 검게 탄다)
export const VMAT = {
  stone: mat(0xbdb9ad), plinth: mat(0xa9a599), plaster: mat(0xefe8d6), red: mat(0xa8452c, 0.8), wood: mat(0x8a6a44),
  giwa: mat(0x5a5750, 0.8), straw: mat(0xc2ab78, 1), green: mat(0x3f7d6e, 0.8), gold: mat(0xd9b45a, 0.6),
  water: new THREE.MeshStandardMaterial({ color: 0x8fa9a6, roughness: 0.25, metalness: 0.1 }), lawn: mat(0x9fb08a, 1), modern: mat(0xd8d2c4, 0.8), glass: mat(0x6f7f86, 0.4),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5f7d55, roughness: 1, flatShading: true }), rubble: mat(0x3a352e, 1),
};
VMAT.giwa.side = VMAT.straw.side = THREE.DoubleSide; // 지붕 안쪽 면도 칠해 빈틈이 보이지 않게
const V0 = Object.fromEntries(Object.entries(VMAT).map(([k, m]) => [k, m.color.clone()]));
export function resetVillageMats() { for (const [k, c] of Object.entries(V0)) { VMAT[k].color.copy(c); if (VMAT[k].emissive) VMAT[k].emissive.setHex(0); } }

function mesh(geo, m, x = 0, y = 0, z = 0, ink = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true;
  if (ink) o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), INK));
  return o;
}
const box = (w, h, d, m, x, y, z, ink) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, ink);
// 직사각형 기와(또는 초가)지붕: 정사각 처마지붕을 z로 늘린다
function roof(w, d, h, m, lift = 0.25) {
  const g = eaveRoof({ a: 0.5, t: 0.14, e: 0.05, lift: lift / Math.max(w, 0.1), y0: 0, y1: h / w, n: 10 });
  const o = mesh(g, m); o.scale.set(w, w, d); return o;
}
// 기와 법당: 돌 기단 + 붉은 기둥 + 흰 벽 + 녹색 창방 + 기와지붕
function hall(w, d, h, { bays = 5, plinth = 0.5 } = {}) {
  const g = new THREE.Group();
  g.add(box(w + 0.8, plinth, d + 0.8, VMAT.plinth, 0, plinth / 2, 0));
  g.add(box(w, h, d, VMAT.plaster, 0, plinth + h / 2, 0));
  for (let i = 0; i <= bays; i++) for (const s of [-1, 1]) g.add(box(0.18, h, 0.18, VMAT.red, -w / 2 + (w / bays) * i, plinth + h / 2, s * (d / 2 + 0.02), false));
  g.add(box(w + 0.2, 0.22, d + 0.2, VMAT.green, 0, plinth + h + 0.11, 0));
  const r = roof(w + 1.8, d + 1.8, Math.min(w, d) * 0.42, VMAT.giwa); r.position.y = plinth + h + 0.2; g.add(r);
  return g;
}
// 초가집(백성의 집): 흙벽 + 둥근 초가지붕
function house(w, d, h) {
  const g = new THREE.Group();
  g.add(box(w + 0.4, 0.25, d + 0.4, VMAT.plinth, 0, 0.12, 0));
  g.add(box(w, h, d, VMAT.plaster, 0, 0.25 + h / 2, 0));
  g.add(box(0.55, h * 0.75, 0.05, VMAT.wood, 0, 0.25 + h * 0.375, d / 2 + 0.03, false));
  const r = roof(w + 1, d + 1, Math.min(w, d) * 0.5, VMAT.straw, 0.05); r.position.y = 0.25 + h; g.add(r); g.userData.roof = r;
  return g;
}
function tileHouse(w, d, h) {
  const g = hall(w, d, h, { bays: 3, plinth: 0.3 }); return g;
}
function tree(s = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 7), VMAT.wood, 0, 1.1 * s, 0, false));
  for (const [y, r] of [[2.4, 1.1], [3.2, 0.85], [3.9, 0.55]]) g.add(mesh(new THREE.ConeGeometry(r * s, 1.2 * s, 8), VMAT.leaf, 0, y * s, 0, false));
  return g;
}
function pond(w, d) {
  const g = new THREE.Group();
  g.add(box(w + 0.5, 0.18, d + 0.5, VMAT.plinth, 0, 0.09, 0));
  g.add(box(w, 0.06, d, VMAT.water, 0, 0.19, 0, false));
  return g;
}
// 회랑: 지붕 덮인 긴 복도(기둥 줄 + 기와지붕)
function corridor(len, { h = 1.7 } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.3, 1.6, VMAT.plinth, 0, 0.15, 0));
  for (let x = -len / 2 + 0.4; x <= len / 2 - 0.3; x += 1.4) g.add(box(0.14, h, 0.14, VMAT.red, x, 0.3 + h / 2, 0, false));
  g.add(box(len, h, 0.12, VMAT.plaster, 0, 0.3 + h / 2, -0.55, false));
  const r = roof(len + 0.6, 2.4, 0.9, VMAT.giwa, 0.1); r.position.y = 0.3 + h; g.add(r);
  return g;
}

// 중층(2층) 금당: 아래 법당 위에 한 칸 작은 위층과 지붕을 한 번 더 얹는다
function twoStoryHall(w, d, h) {
  const g = hall(w, d, h, { bays: 5, plinth: 0.8 });
  const up = hall(w * 0.62, d * 0.62, h * 0.7, { bays: 3, plinth: 0.01 }); up.position.y = 0.8 + h + 0.2 + Math.min(w, d) * 0.42 * 0.45; g.add(up);
  return g;
}
// 땅속에서 하나씩 솟아오르게(미래 복원): 순서대로 늦춰서 올린다
function riseUp(items) {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  for (const it of items) { it.y0 = it.obj.position.y; it.obj.position.y = it.y0 - 7; }
  const tick = now => {
    let busy = false;
    items.forEach((it, i) => {
      const k = Math.min(1, Math.max(0, (now - t0 - i * 140) / 900)); if (k < 1) busy = true;
      it.obj.position.y = it.y0 - 7 * Math.pow(1 - k, 3);
    });
    if (busy) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 각 건물은 items에 { obj, kind } 로 담는다(재해 때 무너지거나 탈 것들)
export function buildVillage(mode, stage) {
  const root = new THREE.Group(), items = [];
  const put = (obj, x, z, rot = 0, kind = 'wood') => { obj.position.set(x, 0, z); obj.rotation.y = rot; root.add(obj); items.push({ obj, kind, x, z }); return obj; };
  if (stage === 2) {
    if (mode === 'baekje') {
      // 정림사 가람: 중문 → (오층석탑) → 금당 → 강당, 둘레 회랑(북쪽이 넓은 사다리꼴), 중문 앞 연못 둘
      put(hall(3.4, 2.4, 1.9, { bays: 3, plinth: 0.4 }), 0, 7.2);                 // 중문
      put(hall(7.5, 5.2, 2.6, { bays: 5, plinth: 0.7 }), 0, -7.5);                // 금당
      put(hall(11.5, 5.2, 2.6, { bays: 7, plinth: 0.6 }), 0, -15.2);              // 강당
      put(corridor(7.5), -5.2, 7.2); put(corridor(7.5), 5.2, 7.2);              // 남쪽 회랑(중문 양옆)
      put(corridor(23), -9.6, -4, Math.PI / 2 - 0.06);                            // 서쪽 회랑(북쪽이 넓어짐)
      put(corridor(23), 9.6, -4, -Math.PI / 2 + 0.06);                            // 동쪽 회랑
      put(pond(4.5, 2.8), -4.2, 11.2, 0, 'stone'); put(pond(4.5, 2.8), 4.2, 11.2, 0, 'stone'); // 연지
    } else if (mode === 'future') {
      // 미래 복원(정림사지박물관 복원 계획 참고): 오늘의 잔디 절터 위에 중문·회랑·중층 금당·강당·승방을 다시 세운다
      root.add(box(34, 0.04, 40, VMAT.lawn, 0, 0.02, -3, false));
      root.add(box(14, 0.05, 6, VMAT.plinth, 0, 0.03, 14.5, false));                              // 중문 앞 마당(포장)
      const order = [];
      const P = (...a) => { const o = put(...a); order.push(items[items.length - 1]); return o; };
      P(pond(4.5, 2.8), -4.2, 11.2, 0, 'stone'); P(pond(4.5, 2.8), 4.2, 11.2, 0, 'stone');
      P(hall(3.6, 2.4, 2.0, { bays: 3, plinth: 0.45 }), 0, 7.2);                                 // 중문
      P(corridor(7.5), -5.2, 7.2); P(corridor(7.5), 5.2, 7.2);                                   // 남회랑
      P(corridor(23), -9.6, -4, Math.PI / 2 - 0.06); P(corridor(23), 9.6, -4, -Math.PI / 2 + 0.06); // 동·서 회랑
      P(twoStoryHall(7.5, 5.2, 2.4), 0, -7.5);                                                   // 중층 금당
      P(hall(11.5, 5.2, 2.6, { bays: 7, plinth: 0.6 }), 0, -15.2);                               // 강당
      P(corridor(3.6), -7.9, -15.6); P(corridor(3.6), 7.9, -15.6);                               // 강당과 회랑을 잇는 북회랑
      P(hall(3.2, 9, 2.0, { bays: 3, plinth: 0.4 }), -14.2, -14.5); P(hall(3.2, 9, 2.0, { bays: 3, plinth: 0.4 }), 14.2, -14.5); // 승방(동·서)
      const mu = new THREE.Group(); mu.add(box(9, 3, 6, VMAT.modern, 0, 1.5, 0)); mu.add(box(9.6, 0.3, 6.6, VMAT.stone, 0, 3.15, 0)); mu.add(box(4, 1.8, 0.1, VMAT.glass, 0, 1.1, 3.02, false));
      put(mu, 19, -1, -Math.PI / 2, 'modern');                                                    // 정림사지박물관(지금 있음)
      for (const [x, z] of [[-14, 5], [-17, -4], [14.5, 8], [-12, 15], [12, 16]]) put(tree(0.9), x, z, 0, 'tree');
      riseUp(order);
      return { root, items, labels: [['중문', 0, 4.2, 7.2], ['중층 금당', 0, 8.6, -7.5], ['강당', 0, 6.2, -15.2], ['승방', 14.2, 4.6, -14.5], ['회랑', -9.6, 3.4, -2], ['정림사지박물관', 19, 4.4, -1]] };
    } else {
      // 오늘날 정림사지: 잔디, 금당·회랑은 터(기단과 초석)만, 강당 자리에 석조여래좌상 보호각(1993), 정림사지박물관(2006)
      root.add(box(22, 0.04, 26, VMAT.lawn, 0, 0.02, -3, false));
      put(box(3.6, 0.35, 2.6, VMAT.plinth, 0, 0.18, 7.2), 0, 0, 0, 'stone');                    // 중문 터
      const gd = new THREE.Group(); gd.add(box(8.3, 0.6, 6, VMAT.plinth, 0, 0.3, 0)); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) gd.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.15, 10), VMAT.stone, -3.4 + i * 1.36, 0.68, -2.2 + j * 1.46, false));
      put(gd, 0, -7.5, 0, 'stone');                                                                // 금당 터와 초석
      put(hall(9, 5, 3.2, { bays: 5, plinth: 0.6 }), 0, -15.2, 0, 'modern');                       // 석조여래좌상 보호각(1993)
      for (const [x, z, w, d] of [[-5.2, 7.2, 7.5, 0.5], [5.2, 7.2, 7.5, 0.5], [-9.6, -4, 0.5, 23], [9.6, -4, 0.5, 23]]) put(box(w, 0.25, d, VMAT.plinth, 0, 0.12, 0), x, z, 0, 'stone'); // 회랑 터
      put(pond(4.5, 2.8), -4.2, 11.2, 0, 'stone'); put(pond(4.5, 2.8), 4.2, 11.2, 0, 'stone');
      const mu = new THREE.Group(); mu.add(box(9, 3, 6, VMAT.modern, 0, 1.5, 0)); mu.add(box(9.6, 0.3, 6.6, VMAT.stone, 0, 3.15, 0)); mu.add(box(4, 1.8, 0.1, VMAT.glass, 0, 1.1, 3.02, false));
      put(mu, 16.5, -6, -Math.PI / 2, 'modern');                                                  // 정림사지박물관(2006)
      for (const [x, z] of [[-13, 4], [-13.5, -10], [13, 6], [12.5, -16]]) put(tree(0.9), x, z, 0, 'tree');
      return { root, items, labels: [['석조여래좌상 보호각 (1993)', 0, 5.2, -15.2], ['금당 터', 0, 1.6, -7.5], ['연못', -4.2, 1.2, 11.2], ['정림사지박물관 (2006)', 16.5, 4.4, -6]] };
    }
  }
  if (mode === 'baekje') {
    // 둘레 백제 마을: 초가집과 기와집, 나무
    const homes = stage === 2
      ? [[-14.5, 9, 0.2], [-16, 2, 0.1], [-15, -6, -0.1], [-16.5, -13, 0.15], [14.5, 10, -0.2], [15.5, 2.5, 0], [16, -6, 0.1], [15, -13, -0.1], [-6, 15.5, 0.05], [7, 16, -0.05]]
      : [[-9, 5, 0.2], [-10.5, -2, 0.1], [-8, -9, -0.15], [8.5, -8.5, 0.1], [10, -1.5, -0.1], [-3, -12, 0.05], [4, -12.5, -0.1], [-13, 10, 0.1], [12, 9, -0.2]];
    homes.forEach(([x, z, r], i) => put(i % 4 === 1 ? tileHouse(3, 2.2, 1.5) : house(2.8 + (i % 3) * 0.4, 2.2, 1.4), x, z, r, i % 4 === 1 ? 'wood' : 'thatch'));
    const trees = stage === 2 ? [[-12, 13], [12, 14], [-18, -17], [18, -17], [-11.5, -19]] : [[-6, 9], [11, -6], [-12, -6], [13, 2], [0, -16]]; // 카메라 앞을 가리지 않게
    for (const [x, z] of trees) put(tree(1), x, z, 0, 'tree');
  }
  return { root, items, labels: [] };
}
