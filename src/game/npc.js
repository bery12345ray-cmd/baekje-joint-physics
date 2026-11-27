// 꼬마 석공(NPC): 목업(2026-11-27 예진) 그대로의 3D 꼬마 석공 그림 세 장(public/npc/seokgong-*.webp, 배경을 지운 PNG→WebP).
//   guide 두루마리를 들고 손으로 가리키기(기본·첫 안내·조립 중 도움말) · panic 두 주먹을 쥐고 놀람(탑이 무너졌을 때, 땀방울은 CSS)
//   celebrate 망치를 들고 만세(칭호가 오를 때·7.00 완주, 반짝이 포함)
// 크기는 CSS가 높이로만 정한다(그림마다 비례가 달라 너비는 auto). 움직임: 가만히 있을 때 오르내림, panic은 흔들기, celebrate는 톡 튀어나오기.
// prefers-reduced-motion이면 움직이지 않는다(CSS).
export const NPC = { guide: 'npc/seokgong-guide.webp', panic: 'npc/seokgong-panic.webp', celebrate: 'npc/seokgong-celebrate.webp' };
export const NPC_SIZE = { guide: [359, 660], panic: [236, 498], celebrate: [379, 637] };
for (const src of Object.values(NPC)) { const i = new Image(); i.decoding = 'async'; i.src = src; } // 미리 받아 두어 자세를 바꿀 때 깜빡이지 않게
const ALT = { guide: '두루마리를 들고 손으로 가리키는 꼬마 석공', panic: '두 주먹을 쥐고 놀란 꼬마 석공', celebrate: '망치를 들고 만세하는 꼬마 석공' };
import { sentText } from './prose.js';
const DROPS = '<i class="npc-drop d1" aria-hidden="true"></i><i class="npc-drop d2" aria-hidden="true"></i>';
// 그림 하나(크기는 CSS가 높이로 정한다)
export const npcImg = (pose = 'guide', cls = '') => `<span class="npc-wrap ${cls} pose-${pose}"><img class="npc" src="${NPC[pose]}" width="${NPC_SIZE[pose][0]}" height="${NPC_SIZE[pose][1]}" alt="${ALT[pose]}" decoding="async">${DROPS}</span>`;

// ---------- 놀이 화면 왼쪽의 꼬마 석공 ----------
// 조립 중에는 들고 있는 부재 도움말(흰 말풍선), 재해 시험 중에는 숨고, 무너지면 panic, 7.00 완주나 칭호가 오르면 celebrate,
// 그다음 아무 조작이나 하면 guide로 돌아와 한마디 하고 잠시 뒤 사라진다(조립 중이면 다시 부재 도움말).
const PANIC = ['탑 쌓기는 어려워요!', '어이쿠, 무너졌어요!', '아이고, 내 탑이…!'];
const CHEER = ['천년 가는 탑이에요!', '이 맛에 돌을 쌓지요!', '왕실도 놀랄 솜씨예요!'];
const pick = a => a[Math.floor(Math.random() * a.length)];
let el = null, hideT = 0, waitNext = false, tip = '';
function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'npc'; el.hidden = true; el.setAttribute('role', 'status');
  el.innerHTML = `${npcImg('guide')}<p class="npc-say"></p>`;
  document.getElementById('stage').appendChild(el);
  draggable(el);
  // 반응 뒤 다음 조작에서 guide 자세로
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, e => {
    if (waitNext && !e.target.closest?.('#npc, #result, #lvup, #share')) { waitNext = false; setTimeout(() => tip ? companionTip(tip, true) : companion('guide', '다른 재해로도 시험해 봐요.'), 60); }
  }, true);
  return el;
}
export function companion(pose, text, { stay = 7000 } = {}) {
  const e = ensure(), wrap = e.querySelector('.npc-wrap'), img = e.querySelector('img'), prev = e.dataset.pose;
  clearTimeout(hideT);
  const say = e.querySelector('.npc-say'); if (say.dataset.t !== text) { say.dataset.t = text; say.innerHTML = sentText(text); say.classList.remove('in'); void say.offsetWidth; say.classList.add('in'); untuck(); }
  if (prev !== pose) { img.src = NPC[pose]; img.alt = ALT[pose]; img.width = NPC_SIZE[pose][0]; img.height = NPC_SIZE[pose][1]; }
  wrap.className = `npc-wrap pose-${pose}`; e.dataset.pose = pose;
  // 바뀔 때만 한 번 움직임: panic은 흔들기, celebrate는 톡 튀어나오기
  if (pose !== prev || e.hidden) { void wrap.offsetWidth; if (pose === 'panic') wrap.classList.add('shake'); if (pose === 'celebrate') wrap.classList.add('pop'); }
  const wasHidden = e.hidden; e.hidden = false;
  if (wasHidden) { restorePos(); untuck(); }
  waitNext = pose !== 'guide';
  if (pose === 'guide' && stay) hideT = setTimeout(() => { e.hidden = true; }, stay);
}
// 조립 중 도움말: 사라지지 않고 들고 있는 부재가 바뀔 때마다 말이 바뀐다. 반응(panic·celebrate) 중이면 다음 조작까지 기다린다.
export function companionTip(text, force = false) {
  tip = text || '';
  if (!tip) { if (el && el.dataset.pose === 'guide') { el.hidden = true; clearTimeout(hideT); } return; }
  if (!force && waitNext) return;
  companion('guide', tip, { stay: 0 });
}
export const companionPanic = extra => companion('panic', `${pick(PANIC)} ${extra || ''}`.trim());
export const companionCheer = extra => companion('celebrate', `${pick(CHEER)} ${extra || ''}`.trim());
// 2026-11-28 예진: "시야를 가린다" → 작게, 끌어서 옮길 수 있게(자리는 localStorage에 기억), 말풍선은 6초 뒤 접힘.
// 석공을 누르면(끌지 않고) 말풍선을 다시 펴거나 접는다. 화면 오른쪽 절반에 두면 말풍선이 왼쪽으로 열린다.
const POS_KEY = 'baekje-npc-pos', TUCK_MS = 6000;
let tuckT = 0;
function untuck() { if (!el) return; el.classList.remove('tuck'); clearTimeout(tuckT); tuckT = setTimeout(() => el && el.classList.add('tuck'), TUCK_MS); }
function box() { const p = el.offsetParent; if (!p || getComputedStyle(el).position === 'fixed') return { left: 0, top: 0, w: innerWidth, h: innerHeight }; const r = p.getBoundingClientRect(); return { left: r.left, top: r.top, w: p.clientWidth, h: p.clientHeight }; }
function moveTo(x, y) { // x, y: 부모(넓은 화면은 화면) 안에서 석공 왼쪽 위
  const b = box(), wr = el.querySelector('.npc-wrap').getBoundingClientRect();
  x = Math.max(0, Math.min(b.w - wr.width, x)); y = Math.max(0, Math.min(b.h - wr.height, y));
  const flip = x + wr.width / 2 > b.w / 2; el.classList.toggle('flip', flip);
  // 말풍선이 왼쪽에 열리면 오른쪽 끝을 기준으로 둔다(말풍선 길이가 바뀌어도 석공은 제자리)
  Object.assign(el.style, flip ? { left: 'auto', right: b.w - x - wr.width + 'px' } : { left: x + 'px', right: 'auto' }, { top: y + 'px', bottom: 'auto' });
  return { x: x / b.w, y: y / b.h };
}
function restorePos() { try { const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (p) { const b = box(); moveTo(p.x * b.w, p.y * b.h); } } catch { /* 저장소 없음 */ } }
function draggable(root) {
  const wrap = root.querySelector('.npc-wrap');
  wrap.title = '끌어서 옮길 수 있어요 · 누르면 말풍선을 접고 펴요';
  let drag = null;
  wrap.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation();
    const r = wrap.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true; root.classList.add('drag');
    const b = box(); drag.pos = moveTo(e.clientX - b.left - drag.dx, e.clientY - b.top - drag.dy);
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    root.classList.remove('drag');
    if (drag.moved) { try { localStorage.setItem(POS_KEY, JSON.stringify(drag.pos)); } catch { /* 저장소 없음 */ } }
    else if (root.classList.contains('tuck')) untuck(); else { clearTimeout(tuckT); root.classList.add('tuck'); }
    drag = null;
  };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  addEventListener('resize', () => { if (!root.hidden) restorePos(); });
}
export function hideCompanion() { if (el) { el.hidden = true; waitNext = false; clearTimeout(hideT); } }
export const panicLine = () => pick(PANIC);
export const cheerLine = () => pick(CHEER);

// 부재마다 꼬마 석공이 건네는 한마디(목업: "옥개받침은 지붕돌 바로 아래에 놓아요. 가운데를 맞춰 봐요!")
export const PART_TIP = {
  jidae: '지대석은 맨 아래 바닥돌이에요. 마당 한가운데에 반듯하게 깔아 봐요!',
  gidan: '기단은 지대석 바로 위에 올려요. 네 모서리를 딱 맞춰 봐요!',
  tapsin1: '1층 몸돌은 기단 위에 세워요. 모서리 기둥끼리 가지런히!',
  tapsin: '몸돌은 지붕돌 위 한가운데에 올려요. 위로 갈수록 작아져요.',
  batchim: '옥개받침은 지붕돌 바로 아래에 놓아요. 가운데를 맞춰 봐요!',
  okgae: '지붕돌은 옥개받침 위에 덮어요. 처마가 네 방향으로 고르게!',
  jangsik: '장식석은 실제 탑에 없어요. 무거워지면 어떻게 될까요?',
  noban: '노반은 꼭대기 지붕돌 한가운데에 올려요.',
  bokbal: '복발·보주는 마지막 돌이에요. 노반 위에 살짝 얹어요!',
  mgidan: '미륵사지 기단은 넓게 깔아요. 무게를 고르게 나눠 줘요.',
  mgidung: '돌기둥은 네 귀에 하나씩 세워요. 기단 모서리를 맞춰 봐요!',
  msimju: '심주석은 1층 한가운데에 세워요. 탑의 중심이에요!',
  mbyeok: '벽석은 기둥 사이에 끼워요. 문이 바깥을 보게 해요.',
  mchangbang: '창방은 기둥 머리를 가로로 엮어요. 네 기둥 위에 걸쳐 봐요!',
  mbatchim: '층급받침은 지붕돌 바로 아래에 놓아요. 가운데를 맞춰 봐요!',
  mokgae: '지붕돌은 층급받침 위에 덮어요. 처마가 고르게 나오게!',
  mtapsin: '몸돌은 지붕돌 위 한가운데에 올려요. 아주 조금씩 작아져요.',
};
