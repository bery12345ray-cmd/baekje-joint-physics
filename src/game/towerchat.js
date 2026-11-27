// 셋째 마당 대화창: "곰돌이 모양 탑 만들어줘"처럼 말하면 부재 목록(설계)을 만들어 준다.
// 1) 개발 서버에 Claude API 키가 있으면 /api/build 로 AI가 설계한다(server/build.ts).
// 2) 키가 없거나 배포본(GitHub Pages)이면 아래 내장 생성기가 낱말을 보고 만든다.
// 설계 형식: [{ mat: 'granite'|'pine'|'brick', size: [w,h,d], pos: [x, y(가운데 높이), z] }]

const B = (mat, w, h, d, x, y, z) => ({ mat, shape: 'block', size: [w, h, d], pos: [x, y, z], rot: 0, parent: null });

function bear() {
  const d = [];
  d.push(B('granite', 3.4, 0.3, 2.4, 0, 0.15, 0));                       // 받침돌
  for (const x of [-0.6, 0.6]) d.push(B('pine', 0.8, 1.1, 0.9, x, 0.85, 0)); // 다리
  d.push(B('pine', 2.2, 1.9, 1.5, 0, 2.35, 0));                           // 몸통
  d.push(B('brick', 1.2, 1.0, 0.1, 0, 2.2, 0.8));                         // 배(밝은 무늬)
  for (const x of [-1.4, 1.4]) d.push(B('pine', 0.6, 1.6, 0.7, x, 2.5, 0)); // 팔(받침돌 위에서 몸통 옆으로)
  for (const x of [-1.4, 1.4]) d.push(B('granite', 0.6, 0.4, 0.7, x, 0.5, 0)); // 팔 받침
  d.push(B('pine', 1.9, 1.5, 1.4, 0, 4.05, 0));                           // 머리
  d.push(B('brick', 0.7, 0.45, 0.35, 0, 3.75, 0.85));                     // 주둥이
  for (const x of [-0.7, 0.7]) d.push(B('pine', 0.5, 0.5, 0.45, x, 5.05, 0)); // 귀
  return { design: d, reply: '곰돌이 탑을 세웠어요. 소나무로 몸과 머리, 문양전으로 배와 주둥이를 만들었어요. 머리가 무거워서 지진에 약할 수 있어요.' };
}
function pyramid(n = 6) {
  const d = []; let y = 0;
  for (let i = 0; i < n; i++) { const w = 6 - i * (5 / n), h = 0.6; d.push(B('granite', w, h, w, 0, y + h / 2, 0)); y += h; }
  return { design: d, reply: `${n}단 돌 피라미드예요. 아래가 넓고 무게중심이 낮아서 지진에 아주 강해요.` };
}
function snowman() {
  return { design: [B('granite', 3, 2, 3, 0, 1, 0), B('granite', 2.2, 1.6, 2.2, 0, 2.8, 0), B('brick', 1.5, 1.3, 1.5, 0, 4.25, 0), B('pine', 1.3, 0.2, 1.3, 0, 5.0, 0), B('pine', 0.8, 0.7, 0.8, 0, 5.45, 0)],
    reply: '눈사람 탑이에요. 세 덩이를 위로 갈수록 작게 쌓고 나무 모자를 씌웠어요.' };
}
function rocket() {
  const d = [B('granite', 3, 0.4, 3, 0, 0.2, 0)];
  for (const [x, z] of [[-1.1, 0], [1.1, 0], [0, -1.1], [0, 1.1]]) d.push(B('brick', 0.4, 1.6, 0.4, x, 1.2, z));
  let y = 0.4; for (let i = 0; i < 5; i++) { d.push(B(i < 2 ? 'granite' : 'pine', 1.6 - i * 0.1, 1.3, 1.6 - i * 0.1, 0, y + 0.65, 0)); y += 1.3; }
  d.push(B('pine', 0.9, 0.9, 0.9, 0, y + 0.45, 0)); d.push(B('pine', 0.4, 0.8, 0.4, 0, y + 1.3, 0));
  return { design: d, reply: '로켓 모양 탑이에요. 날개 넷이 아래를 받치고, 몸체는 위로 갈수록 가벼운 나무예요.' };
}
function heart() {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'], d = [B('granite', 5, 0.3, 1.6, 0, 0.15, 0)];
  rows.slice().reverse().forEach((r, j) => [...r].forEach((c, i) => { if (c === '1') d.push(B('brick', 0.62, 0.6, 0.6, (i - 3) * 0.64, 0.3 + 0.3 + j * 0.6, 0)); }));
  return { design: d, reply: '하트 모양으로 문양전을 쌓았어요. 가운데 아래 한 장이 위를 다 받치고 있어서 아슬아슬해요.' };
}
function castle() {
  const d = [B('granite', 7, 0.4, 7, 0, 0.2, 0)];
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let i = 0; i < 3; i++) d.push(B('granite', 1.2, 1.0, 1.2, x, 0.4 + 0.5 + i, z));
  for (const [x, z, w, dd] of [[0, -3, 4.6, 0.6], [0, 3, 4.6, 0.6], [-3, 0, 0.6, 4.6], [3, 0, 0.6, 4.6]]) for (let i = 0; i < 2; i++) d.push(B('brick', w, 0.8, dd, x, 0.4 + 0.4 + i * 0.8, z));
  d.push(B('granite', 2.4, 2.4, 2.4, 0, 1.6, 0)); d.push(B('pine', 1.8, 1.6, 1.8, 0, 3.6, 0)); d.push(B('pine', 1.0, 1.0, 1.0, 0, 4.9, 0));
  return { design: d, reply: '네 귀에 망루가 있는 성채예요. 담은 문양전, 망루와 가운데 탑 아래는 돌이에요.' };
}
function stairsTower(n = 5) { // 기본: n층 탑(돌 기단 + 몸돌 + 지붕돌)
  const d = [B('granite', 4, 0.4, 4, 0, 0.2, 0)]; let y = 0.4, w = 2.2;
  for (let i = 0; i < n; i++) { const h = i ? 0.5 : 0.9; d.push(B('granite', w, h, w, 0, y + h / 2, 0)); y += h; d.push(B('granite', w * 1.6, 0.22, w * 1.6, 0, y + 0.11, 0)); y += 0.22; w *= 0.86; }
  return { design: d, reply: `${n}층 석탑을 세웠어요. 층마다 몸돌과 지붕돌을 줄여(체감) 무게중심을 낮췄어요.` };
}

const WORDS = [
  [/피라미드/, () => pyramid()], [/눈사람/, () => snowman()], [/로켓|우주선/, () => rocket()],
  [/하트|사랑/, () => heart()], [/성|캐슬|castle/i, () => castle()],
];
// 예시 탑 이름이 나오면 그 예시를 불러온다
const NAMES = [[/에펠/, 'eiffel'], [/피사/, 'pisa'], [/빅\s?벤|엘리자베스/, 'bigben'], [/도쿄/, 'tokyo'], [/남산|서울\s?타워|N\s?서울/i, 'namsan'], [/대안탑|시안/, 'dayan'],
  [/정림사/, 'jeong'], [/미륵사/, 'mireuk'], [/무량사/, 'muryang'], [/남매탑|청량사/, 'cheongnyang'], [/팔상전|법주사/, 'palsang']];

// ---------- 아무 모양이나: 낱말을 그림 문자(이모지)로 바꿔 그 모양을 블록으로 쌓는다(없으면 글자 모양 그대로) ----------
const EMOJI = [[/곰|테디/, '🧸', '곰돌이'], [/고양이|냥/, '🐱', '고양이'], [/강아지|멍멍/, '🐶', '강아지'], [/토끼/, '🐰', '토끼'], [/펭귄/, '🐧', '펭귄'], [/공룡/, '🦖', '공룡'],
  [/돼지/, '🐷', '돼지'], [/여우/, '🦊', '여우'], [/판다/, '🐼', '판다'], [/호랑이/, '🐯', '호랑이'], [/사자/, '🦁', '사자'], [/코끼리/, '🐘', '코끼리'], [/기린/, '🦒', '기린'],
  [/닭|병아리/, '🐥', '병아리'], [/물고기|생선/, '🐟', '물고기'], [/고래/, '🐳', '고래'], [/부엉이|올빼미/, '🦉', '부엉이'], [/개구리/, '🐸', '개구리'], [/거북/, '🐢', '거북'],
  [/별/, '⭐', '별'], [/초승달|달님/, '🌙', '달'], [/태양|해님/, '☀️', '해'], [/꽃/, '🌸', '꽃'], [/나무/, '🌳', '나무'], [/버섯/, '🍄', '버섯'], [/사과/, '🍎', '사과'], [/딸기/, '🍓', '딸기'],
  [/수박/, '🍉', '수박'], [/케이크|케익/, '🎂', '케이크'], [/아이스크림/, '🍦', '아이스크림'], [/집/, '🏠', '집'], [/자동차/, '🚗', '자동차'], [/돛단배|요트/, '⛵', '배'], [/비행기/, '✈️', '비행기'],
  [/로봇/, '🤖', '로봇'], [/유령/, '👻', '유령'], [/스마일|웃는/, '😀', '웃는 얼굴'], [/왕관/, '👑', '왕관'], [/종/, '🔔', '종'], [/우산/, '☂️', '우산'], [/기타/, '🎸', '기타'], [/축구/, '⚽', '공'],
  [/불꽃|불/, '🔥', '불꽃'], [/구름/, '☁️', '구름'], [/무지개/, '🌈', '무지개'], [/눈송이/, '❄️', '눈송이'], [/다이아|보석/, '💎', '보석'], [/열쇠/, '🔑', '열쇠']];
const PAL = [['흰', 0xf1ede4], ['검', 0x2b2824], ['회', 0x9a968e], ['빨', 0xc8402e], ['주', 0xe0812f], ['노', 0xe9c23c], ['초', 0x5f9a4a], ['파', 0x3f72b8], ['남', 0x2c3f73], ['보', 0x7d55a6], ['분', 0xe39ab4], ['갈', 0x8a5a33], ['살', 0xe8c39a]];
function nearest(r, g, b) {
  let best = PAL[0], bd = 1e9;
  for (const c of PAL) { const cr = c[1] >> 16, cg = (c[1] >> 8) & 255, cb = c[1] & 255, d = (r - cr) ** 2 * 0.3 + (g - cg) ** 2 * 0.59 + (b - cb) ** 2 * 0.11; if (d < bd) { bd = d; best = c; } }
  return best;
}
const STOP = /(모양의|모양|으로|탑을|탑|을|를|만들어\s*줘|만들어|지어\s*줘|쌓아\s*줘|주세요|줘|하나|한\s*개|좀)/g;
export function voxelBuild(text) {
  if (typeof document === 'undefined') return null;
  const hit = EMOJI.find(([re]) => re.test(text));
  const word = text.replace(STOP, ' ').trim().split(/\s+/).filter(Boolean).join('').slice(0, 3);
  const glyph = hit ? hit[1] : word; if (!glyph) return null;
  const N = hit ? 26 : Math.min(40, 14 * [...glyph].length), H = hit ? 26 : 16;
  const cv = document.createElement('canvas'); cv.width = N; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = hit ? `${H - 2}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif` : `900 ${H - 1}px "Gowun Dodum","Malgun Gothic",sans-serif`;
  c.fillStyle = '#8a5a33'; c.fillText(glyph, N / 2, H / 2 + 1);
  if (!hit) { c.strokeStyle = '#8a5a33'; c.lineWidth = 1.6; c.strokeText(glyph, N / 2, H / 2 + 1); } // 글자 획을 굵게(가는 획은 서 있기 어렵다)
  const px = c.getImageData(0, 0, N, H).data, cell = 0.3, depth = 0.9, A = 110;
  let minY = H, maxY = -1, minX = N, maxX = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) if (px[(y * N + x) * 4 + 3] > A) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  if (maxY < 0) return null;
  const cx = (minX + maxX + 1) / 2, base = 0.3;
  const d = [B('granite', (maxX - minX + 3) * cell, base, depth + 0.6, 0, base / 2, 0)], meta = [{ ri: -1 }];
  for (let y = maxY, ri = 0; y >= minY; y--, ri++) { // 아래 줄부터: 같은 색이 이어진 칸을 한 블록으로
    let x = minX;
    while (x <= maxX) {
      const i = (y * N + x) * 4; if (px[i + 3] <= A) { x++; continue; }
      const col = nearest(px[i], px[i + 1], px[i + 2]); let e = x + 1;
      while (e <= maxX) { const j = (y * N + e) * 4; if (px[j + 3] <= A || nearest(px[j], px[j + 1], px[j + 2]) !== col) break; e++; }
      const w = (e - x) * cell, bx = ((x + e) / 2 - cx) * cell, by = base + ri * cell + cell / 2;
      const dark = ['검', '남', '회'].includes(col[0]), wood = ['갈', '주', '노', '살'].includes(col[0]);
      const it = B(ri < 2 || dark ? 'granite' : 'brick', w, cell, depth, bx, by, 0); // 색은 칠로 나타내고, 작은 블록이 부러지지 않게 소나무는 쓰지 않는다
      it.tint = 'v' + col[1].toString(16).padStart(6, '0'); it.links = [];
      // 아래 줄에서 가장 많이 겹치는 블록(없으면 같은 줄 왼쪽 이웃)에 이어 붙인다
      // 아래 줄에서 겹치는 블록마다 겹친 구간 양 끝 두 곳을 이어 붙인다(두 점 이음은 꺾이지 않는다). 없으면 같은 줄 왼쪽 이웃이나 바로 앞 블록에
      const J = hit ? 'glue' : 'steel', X = c => (c - cx) * cell, yb = by - cell / 2;
      if (ri === 0) { it.links.push({ to: 0, joint: J, anchor: [X(x + 0.5), yb, -0.3] }, { to: 0, joint: J, anchor: [X(e - 0.5), yb, 0.3] }); }
      else meta.forEach((m, k) => { if (m.ri !== ri - 1) return; const a0 = Math.max(m.x0, x), a1 = Math.min(m.x1, e); if (a1 <= a0) return;
        it.links.push({ to: k, joint: J, anchor: [X(a0 + 0.5), yb, -0.3] }); it.links.push({ to: k, joint: J, anchor: [X(a1 - 0.5), yb, 0.3] }); });
      const left = meta.findIndex(m => m.ri === ri && m.x1 === x);
      if (left >= 0) { it.links.push({ to: left, joint: J, anchor: [X(x), by, -0.3] }, { to: left, joint: J, anchor: [X(x), by, 0.3] }); }
      if (!it.links.length) it.links.push({ to: d.length - 1, joint: J, anchor: [bx, yb, 0] });
      d.push(it); meta.push({ ri, x0: x, x1: e });
      x = e;
    }
  }
  const name = hit ? hit[2] : `"${glyph}" 글자`;
  return { design: d, reply: `${name} 모양으로 블록 ${d.length - 1}개를 쌓았어요. 아래 두 줄과 어두운 색은 돌, 나머지는 문양전에 색을 칠했어요. 블록끼리 이어 붙였지만 위가 무거우면 지진에 약해요.` };
}

export function localBuild(text) {
  for (const [re, ex] of NAMES) if (re.test(text)) return { example: ex };
  for (const [re, fn] of WORDS) if (re.test(text)) return fn();
  if (EMOJI.some(([re]) => re.test(text))) return voxelBuild(text);
  const m = text.match(/(\d+)\s*층/); const n = m ? Math.max(1, Math.min(12, +m[1])) : 5;
  if (/\d+\s*층|^\s*탑/.test(text)) return stairsTower(n);
  return voxelBuild(text) || stairsTower(n);
}

// AI 설계를 게임 설계로 바꾸고, 바닥 아래로 꺼지거나 너무 큰 부재는 걸러 낸다
export function fromAI(blocks) {
  const ok = [];
  for (const b of blocks || []) {
    if (!['granite', 'pine', 'brick'].includes(b.mat)) continue;
    const w = Math.min(6, Math.max(0.2, +b.w)), h = Math.min(6, Math.max(0.2, +b.h)), d = Math.min(6, Math.max(0.2, +b.d));
    const x = Math.max(-8, Math.min(8, +b.x || 0)), z = Math.max(-8, Math.min(8, +b.z || 0)), y = Math.max(h / 2, +b.y || h / 2);
    ok.push(B(b.mat, w, h, d, x, y + 0.001, z));
    if (ok.length >= 70) break;
  }
  return ok;
}

export async function askBuild(text) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 45000);
  try {
    const r = await fetch('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }), signal: ac.signal });
    if (r.ok) { const j = await r.json(); const design = fromAI(j.blocks); if (design.length) return { design, reply: j.reply || '탑을 지었어요.', ai: true }; }
  } catch { /* 배포본이나 오프라인: 내장 생성기로 */ } finally { clearTimeout(timer); }
  return null;
}
