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
  [/곰|bear|테디/i, () => bear()], [/피라미드/, () => pyramid()], [/눈사람/, () => snowman()], [/로켓|우주선/, () => rocket()],
  [/하트|사랑/, () => heart()], [/성|캐슬|castle/i, () => castle()],
];
// 예시 탑 이름이 나오면 그 예시를 불러온다
const NAMES = [[/에펠/, 'eiffel'], [/피사/, 'pisa'], [/빅\s?벤|엘리자베스/, 'bigben'], [/도쿄/, 'tokyo'], [/남산|서울\s?타워|N\s?서울/i, 'namsan'], [/대안탑|시안/, 'dayan'],
  [/정림사/, 'jeong'], [/미륵사/, 'mireuk'], [/무량사/, 'muryang'], [/남매탑|청량사/, 'cheongnyang'], [/팔상전|법주사/, 'palsang']];

export function localBuild(text) {
  for (const [re, ex] of NAMES) if (re.test(text)) return { example: ex };
  for (const [re, fn] of WORDS) if (re.test(text)) return fn();
  const m = text.match(/(\d+)\s*층/); const n = m ? Math.max(1, Math.min(12, +m[1])) : 5;
  if (/탑|층/.test(text)) return stairsTower(n);
  return null;
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
