// 꼬마 석공(NPC): 목업(2026-11-27 예진) 그대로의 3D 꼬마 석공 그림 세 장(public/npc/seokgong-*.webp, 배경을 지운 PNG→WebP).
//   guide 두루마리를 들고 손으로 가리키기(기본·첫 안내·조립 중 도움말) · panic 두 주먹을 쥐고 놀람(탑이 무너졌을 때, 땀방울은 CSS)
//   celebrate 망치를 들고 만세(칭호가 오를 때·7.00 완주, 반짝이 포함)
// 크기는 CSS가 높이로만 정한다(그림마다 비례가 달라 너비는 auto). 움직임: 가만히 있을 때 오르내림, panic은 흔들기, celebrate는 톡 튀어나오기.
// prefers-reduced-motion이면 움직이지 않는다(CSS).
export const NPC = { guide: 'npc/seokgong-guide.webp', panic: 'npc/seokgong-panic.webp', celebrate: 'npc/seokgong-celebrate.webp' };
export const NPC_SIZE = { guide: [359, 660], panic: [236, 498], celebrate: [379, 637] };
for (const src of Object.values(NPC)) { const i = new Image(); i.decoding = 'async'; i.src = src; } // 미리 받아 두어 자세를 바꿀 때 깜빡이지 않게
const ALT = { guide: '두루마리를 들고 손으로 가리키는 꼬마 석공', panic: '두 주먹을 쥐고 놀란 꼬마 석공', celebrate: '망치를 들고 만세하는 꼬마 석공' };
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
  // 반응 뒤 다음 조작에서 guide 자세로
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, e => {
    if (waitNext && !e.target.closest?.('#npc, #result, #lvup, #share')) { waitNext = false; setTimeout(() => tip ? companionTip(tip, true) : companion('guide', '다른 재해로도 시험해 봐요.'), 60); }
  }, true);
  return el;
}
export function companion(pose, text, { stay = 7000 } = {}) {
  const e = ensure(), wrap = e.querySelector('.npc-wrap'), img = e.querySelector('img'), prev = e.dataset.pose;
  clearTimeout(hideT);
  const say = e.querySelector('.npc-say'); if (say.textContent !== text) { say.textContent = text; say.classList.remove('in'); void say.offsetWidth; say.classList.add('in'); }
  if (prev !== pose) { img.src = NPC[pose]; img.alt = ALT[pose]; img.width = NPC_SIZE[pose][0]; img.height = NPC_SIZE[pose][1]; }
  wrap.className = `npc-wrap pose-${pose}`; e.dataset.pose = pose;
  // 바뀔 때만 한 번 움직임: panic은 흔들기, celebrate는 톡 튀어나오기
  if (pose !== prev || e.hidden) { void wrap.offsetWidth; if (pose === 'panic') wrap.classList.add('shake'); if (pose === 'celebrate') wrap.classList.add('pop'); }
  e.hidden = false;
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
