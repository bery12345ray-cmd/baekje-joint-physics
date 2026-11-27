// 처음 온 사람에게 백제 대목장이 말풍선으로 순서를 알려 준다: 마당 고르기 → 시점 옮기기 → 부재 놓기 → 지진 시험 → 결과와 점수.
// 단계마다 해당 화면 요소를 밝혀 보여 주고, "다음"·"건너뛰기". 다 보면(또는 건너뛰면) localStorage에 적어 한 번만 뜬다. 상단 "?"로 다시 본다.
const KEY = 'baekje-guide-done';
const STEPS = [
  { sel: '#tabs', t: '에헴! 나는 백제의 대목장이오. 못 하나 안 박고 탑을 세우는 사람이지. 먼저 위에서 쌓을 탑, 곧 "마당"을 고르시오. 정림사지 오층석탑부터 하면 좋소.' },
  { sel: '#stage', t: '탑 둘레를 살펴보시오. 마우스 왼쪽으로 끌면 땅이 통째로 옮겨지고, 오른쪽으로 끌면 빙 돌아보오. 휠은 가까이·멀리. 휴대폰은 두 손가락으로 옮기고 벌려 확대하오.' },
  { sel: '#next', alt: '#panel .asm', t: '이 판에 지금 들고 있는 부재가 보이오. 화면에서 끌어 제자리다 싶은 곳에 놓으시오. 안내선은 없소, 눈대중이 곧 장인의 실력이니! 잘못 놓으면 Ctrl+Z, 처음부터는 R 키.' },
  { sel: '#dock', t: '쌓는 동안 이 자리에 놓은 부재 수와 들고 있는 부재 이야기가 보이오. 부재를 모두 놓으면 여기가 재해 고르기로 바뀌니, 재해를 고르시오. 지진·강풍·폭풍우·홍수·폭설, 모두 삼국사기에 남은 백제의 재해요. 세기가 1.00에서 7.00까지 30초 동안 0.01씩 오르니, 손에 땀 좀 날 게요.' },
  { sel: '#board', alt: '#dock', t: '탑이 무너지기 시작한 순간의 세기가 점수요. 7.00까지 버티면 만점! 닉네임을 정하면 온라인 순위에 오르오. 이 안내는 위의 ? 단추로 언제든 다시 볼 수 있소. 자, 쌓아 봅시다!' },
];
// 백제 대목장: 은꽃 장식(은화관식)을 꽂은 검은 관모, 비취색 두루마기에 금동 띠, 가슴에 연꽃 수막새, 손에 곱자(ㄱ자 자)
export const CARPENTER = `<svg class="g-who" viewBox="0 0 120 150" aria-hidden="true">
  <ellipse cx="60" cy="144" rx="34" ry="5" fill="rgba(20,19,17,.25)"/>
  <path d="M30 142c0-36 8-58 30-58s30 22 30 58z" fill="var(--pat)" stroke="var(--togi)" stroke-width="2.2"/>
  <path d="M60 86v56" stroke="var(--gold)" stroke-width="3"/><rect x="31" y="112" width="58" height="7" rx="3" fill="var(--gold)" stroke="var(--togi)" stroke-width="1.6"/>
  <g transform="translate(46 96)"><circle r="8" fill="var(--jeon)" stroke="var(--gold)" stroke-width="2"/><path d="M0-6c2 3 2 6 0 7-2-1-2-4 0-7zM-6 0c3-2 6-2 7 0-1 2-4 2-7 0zM6 0c-3-2-6-2-7 0 1 2 4 2 7 0zM0 6c2-3 2-6 0-7-2 1-2 4 0 7z" fill="var(--red)"/></g>
  <path d="M86 98l22-26M100 70l12 10" stroke="var(--gold)" stroke-width="4" stroke-linecap="round"/><circle cx="86" cy="100" r="6" fill="#e7c9a6" stroke="var(--togi)" stroke-width="1.6"/>
  <circle cx="60" cy="62" r="21" fill="#e7c9a6" stroke="var(--togi)" stroke-width="2.2"/>
  <path d="M44 66c4 14 28 14 32 0-4 6-28 6-32 0z" fill="var(--togi)"/><path d="M52 71c4 2 12 2 16 0" stroke="#e7c9a6" stroke-width="2" stroke-linecap="round"/>
  <path d="M50 58q4-3 8 0M62 58q4-3 8 0" stroke="var(--togi)" stroke-width="2.4" fill="none" stroke-linecap="round" class="g-eye"/>
  <circle cx="48" cy="66" r="3" fill="var(--red)" opacity=".35"/><circle cx="72" cy="66" r="3" fill="var(--red)" opacity=".35"/>
  <path d="M38 50c2-18 42-18 44 0z" fill="var(--togi)"/><rect x="36" y="47" width="48" height="6" rx="3" fill="var(--togi2)" stroke="var(--gold)" stroke-width="1.4"/>
  <g class="g-flower" transform="translate(60 26)"><path d="M0 8V-10" stroke="#d8d4cc" stroke-width="2.4"/><path d="M0-10c-6-6-12-2-10 4M0-10c6-6 12-2 10 4M0-2c-7-2-10 4-6 7M0-2c7-2 10 4 6 7" stroke="#d8d4cc" stroke-width="2" fill="none" stroke-linecap="round"/><circle cy="-11" r="2.6" fill="var(--gold)"/></g>
</svg>`;

let el = null, i = 0, onEnd = null;
const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const markDone = () => { try { localStorage.setItem(KEY, '1'); } catch { /* 저장소 없음 */ } };
function target(s) {
  const pick = q => { const e = q && document.querySelector(q); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? e : null; };
  return pick(s.sel) || pick(s.alt);
}
function place() {
  if (!el) return;
  const s = STEPS[i], t = target(s), hole = el.querySelector('.g-hole'), card = el.querySelector('.g-card');
  if (t) {
    if (t.closest('#panel') && t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
    const r = t.getBoundingClientRect(), pad = 6;
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: 1 });
    // 말풍선은 밝힌 곳과 겹치지 않는 쪽(아래/위, 좁은 화면은 아래 가운데)에
    const W = innerWidth, H = innerHeight, cw = Math.min(460, W - 24), ch = card.offsetHeight || 200;
    let top = r.bottom + 14; if (top + ch > H - 8) top = r.top - ch - 14; if (top < 8) top = Math.max(8, H - ch - 12);
    let left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), W - cw - 12);
    if (s.sel === '#stage') { left = 16; top = Math.max(8, H - ch - 20); }
    Object.assign(card.style, { width: cw + 'px', left: left + 'px', top: top + 'px' });
  } else { hole.style.opacity = 0; Object.assign(card.style, { width: Math.min(460, innerWidth - 24) + 'px', left: '12px', top: Math.max(8, innerHeight - (card.offsetHeight || 200) - 12) + 'px' }); }
}
function show() {
  const s = STEPS[i];
  el.querySelector('.g-text').textContent = s.t;
  el.querySelector('.g-step').textContent = `${i + 1} / ${STEPS.length}`;
  const nx = el.querySelector('[data-g=next]'); nx.textContent = i === STEPS.length - 1 ? '시작하기' : '다음';
  el.querySelector('.g-card').classList.remove('pop'); void el.offsetWidth; el.querySelector('.g-card').classList.add('pop');
  place(); requestAnimationFrame(place); nx.focus({ preventScroll: true });
}
function end() {
  if (!el) return;
  markDone(); el.remove(); el = null; removeEventListener('resize', place); removeEventListener('keydown', key, true);
  if (onEnd) onEnd();
}
function key(e) {
  if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (i > 0) { i--; show(); } }
  else e.stopPropagation(); // 안내 중에는 게임 단축키(R 등)가 먹지 않게
}
function next() { if (i < STEPS.length - 1) { i++; show(); } else end(); }
export function startGuide({ force = false, after } = {}) {
  if (el || (!force && done())) return false;
  onEnd = after || null; i = 0;
  el = document.createElement('div'); el.id = 'guide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '대목장의 안내');
  el.innerHTML = `<div class="g-hole" aria-hidden="true"></div><div class="g-card">${CARPENTER}<div class="g-bubble"><span class="g-step"></span><p class="g-text" aria-live="polite"></p>
    <div class="g-btns"><button class="btn line" data-g="skip">건너뛰기</button><button class="btn pat" data-g="next">다음</button></div></div></div>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'skip') end(); else next(); });
  document.body.appendChild(el);
  addEventListener('resize', place); addEventListener('keydown', key, true);
  show();
  return true;
}
export const guideSeen = done;
