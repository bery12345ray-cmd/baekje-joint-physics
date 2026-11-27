// 대목장(NPC): 3D로 렌더한 그림 세 장(public/npc/daemokjang3d-*.webp, 600×780, 같은 구도). 그린 원본 코드는 scripts/npc3d/(게임에는 넣지 않음).
//   guide 손 흔들기(기본·첫 안내·도움말) · panic 걱정(탑이 무너졌을 때) · celebrate 금빛 곱자를 들고 만세(칭호가 오를 때·7.00 완주)
// 그림 둘레에 얇은 크림색 테가 이미 있어 테두리·그림자를 따로 넣지 않는다. 움직임: 가만히 있을 때 2~3px 오르내림(2.4초),
// panic으로 바뀔 때 짧게 흔들림(0.3초), celebrate가 나타날 때 톡 튀어나옴. prefers-reduced-motion이면 움직이지 않는다(CSS).
export const NPC = { guide: 'npc/daemokjang3d-guide.webp', panic: 'npc/daemokjang3d-panic.webp', celebrate: 'npc/daemokjang3d-celebrate.webp' };
for (const src of Object.values(NPC)) { const i = new Image(); i.decoding = 'async'; i.src = src; } // 미리 받아 두어 자세를 바꿀 때 깜빡이지 않게
const ALT = { guide: '손을 흔드는 대목장', panic: '걱정하는 대목장', celebrate: '금빛 곱자를 들고 기뻐하는 대목장' };
// 그림 하나(크기는 CSS가 높이로 정하고 너비는 600:780 비례를 따른다)
export const npcImg = (pose = 'guide', cls = '') => `<span class="npc-wrap ${cls} pose-${pose}"><img class="npc" src="${NPC[pose]}" width="600" height="780" alt="${ALT[pose]}" decoding="async"></span>`;

// ---------- 놀이 화면 한쪽의 대목장: 재해 시험 결과에 반응한다 ----------
// 무너지면 panic + 한마디, 7.00 완주나 칭호가 오르면 celebrate, 그다음 아무 조작이나 하면 guide로 돌아와 도움말, 잠시 뒤 사라진다.
const PANIC = ['탑 쌓기는 어려워!', '어이쿠, 무너졌소!', '아이고, 내 탑이…!'];
const CHEER = ['천년 가는 탑이오!', '이 맛에 돌을 쌓지!', '왕실도 놀랄 솜씨요!'];
const pick = a => a[Math.floor(Math.random() * a.length)];
let el = null, hideT = 0, waitNext = false;
function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'npc'; el.hidden = true; el.setAttribute('role', 'status');
  el.innerHTML = `<p class="npc-say"></p>${npcImg('guide')}`;
  document.getElementById('stage').appendChild(el);
  // 반응 뒤 다음 조작에서 guide 자세로
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, e => { if (waitNext && !e.target.closest?.('#npc')) { waitNext = false; setTimeout(() => companion('guide', '다른 재해나 다른 이음으로도 시험해 보시오.'), 60); } }, true);
  return el;
}
export function companion(pose, text, { stay = 7000 } = {}) {
  const e = ensure(), wrap = e.querySelector('.npc-wrap'), img = e.querySelector('img'), prev = e.dataset.pose;
  clearTimeout(hideT);
  e.querySelector('.npc-say').textContent = text;
  img.src = NPC[pose]; img.alt = ALT[pose];
  wrap.className = `npc-wrap pose-${pose}`; e.dataset.pose = pose;
  // 바뀔 때만 한 번 움직임: panic은 흔들기, celebrate는 톡 튀어나오기
  if (pose !== prev || e.hidden) { void wrap.offsetWidth; if (pose === 'panic') wrap.classList.add('shake'); if (pose === 'celebrate') wrap.classList.add('pop'); }
  e.hidden = false;
  waitNext = pose !== 'guide';
  if (pose === 'guide' && stay) hideT = setTimeout(() => { e.hidden = true; }, stay);
}
export const companionPanic = extra => companion('panic', `${pick(PANIC)} ${extra || ''}`.trim());
export const companionCheer = extra => companion('celebrate', `${pick(CHEER)} ${extra || ''}`.trim());
export function hideCompanion() { if (el) { el.hidden = true; waitNext = false; clearTimeout(hideT); } }
