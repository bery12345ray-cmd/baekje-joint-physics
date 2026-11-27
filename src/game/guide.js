// 처음 온 사람에게 꼬마 석공이 흰 말풍선으로 순서를 알려 준다: 마당 고르기 → 시점 옮기기 → 부재 놓기 → 지진 시험 → 결과와 점수.
// 단계마다 해당 화면 요소를 밝혀 보여 주고, "다음"·"건너뛰기". 다 보면(또는 건너뛰면) localStorage에 적어 한 번만 뜬다. 상단 "?"로 다시 본다.
const KEY = 'baekje-guide-done';
const STEPS = [
  { sel: '#tabs', short: '마당 고르기', title: '반가워요, 새 석공님!\n먼저 쌓을 탑을 골라 볼까요?',
    t: '위쪽 마당 단추에서 <b>정림사지 오층석탑</b>과 <b>미륵사지 석탑</b> 중 하나를 고를 수 있어요. 둘 다 1,400년 가까이 버틴 백제의 탑이에요.' },
  { sel: '#stage', short: '시점 돌려 보기', title: '탑 둘레를\n천천히 둘러봐요',
    t: '마우스 <b>오른쪽으로 끌면</b> 빙 돌아보고, <b>왼쪽으로 끌면</b> 땅이 옮겨져요. 휠을 굴리면 가까이·멀리 볼 수 있어요.',
    tt: '<b>한 손가락으로 끌면</b> 빙 돌아보고, <b>두 손가락으로</b> 끌면 땅이 옮겨져요. 두 손가락을 벌리면 가까이 보여요.' },
  { sel: '#next', alt: '#dock', short: '부재 놓기', title: '부재를 하나씩\n제자리에 놓아요',
    t: '이 판에 <b>지금 들고 있는 부재</b>가 보여요. 화면에서 끌어 제자리다 싶은 곳에서 떼면 놓여요. 안내선은 없어요, 눈대중이 곧 석공의 실력! 잘못 놓으면 <b>Ctrl+Z</b>, 처음부터는 <b>R</b>.',
    tt: '이 판에 <b>지금 들고 있는 부재</b>가 보여요. 탑 옆에 뜬 상자를 손가락으로 끌어 제자리다 싶은 곳에서 떼요. 잘못 놓으면 <b>되돌리기</b>, 처음부터는 <b>처음부터</b> 단추.' },
  { sel: '#dock', short: '재해 시험', title: '다 쌓으면\n재해로 시험해요',
    t: '부재를 모두 놓으면 이 자리가 <b>재해 고르기</b>로 바뀌어요. 지진·강풍·폭풍우·홍수·폭설, 모두 삼국사기에 남은 백제의 재해예요. 세기가 1.00에서 7.00까지 30초 동안 올라가요.' },
  { sel: '#board', alt: '#dock', short: '직접 쌓아 보기', title: '버틴 세기가\n곧 점수예요',
    t: '탑이 무너지기 시작한 순간의 세기가 점수, 7.00까지 버티면 만점이에요. 닉네임을 정하면 <b>온라인 순위</b>에 올라요. 이 안내는 위의 <b>?</b> 단추로 언제든 다시 볼 수 있어요.' },
];
// 꼬마 석공 그림은 npc.js(두루마리를 들고 가리키는 자세)
import { npcImg } from './npc.js';

let el = null, i = 0, onEnd = null;
const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const markDone = () => { try { localStorage.setItem(KEY, '1'); } catch { /* 저장소 없음 */ } };
function target(s) {
  const pick = q => { const e = q && document.querySelector(q); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? e : null; };
  return pick(s.sel) || pick(s.alt);
}
// 큰 꼬마 석공 + 흰 말풍선 묶음은 화면 가운데에 두고, 밝힌 곳과 겹치면 그 위나 아래로 비킨다(목업 01).
// 밝힌 곳이 말풍선 위에 있으면 말풍선 위로 흰 화살표가 그곳을 가리킨다.
function sizeCard(card, k = 1) {
  const W = innerWidth, H = innerHeight, narrow = W <= 860;
  const gH = (narrow ? Math.min(200, H * 0.26) : Math.max(300, Math.min(620, H * 0.56, (W - 120) * 0.55))) * k;
  const gW = narrow ? Math.min(560, W - 24) : Math.max(420, Math.min(660, W - gH * 0.54 - 80));
  card.style.setProperty('--gH', gH + 'px'); card.style.setProperty('--gW', gW + 'px'); card.style.setProperty('--gT', Math.round(gH * 0.3) + 'px');
}
const overlap = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
function place() {
  if (!el) return;
  const s = STEPS[i], t = target(s), hole = el.querySelector('.g-hole'), card = el.querySelector('.g-card'), arrow = el.querySelector('.g-arrow');
  const W = innerWidth, H = innerHeight, pad = 8;
  const r = t && t.getBoundingClientRect(), big = r && r.width > W * 0.6 && r.height > H * 0.5;
  if (t && t.closest('#panel') && t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
  arrow.style.opacity = 0;
  if (r) { hole.classList.toggle('box', r.height > 90); Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: big ? 0 : 1 }); }
  else hole.style.opacity = 0;
  const tr = r && !big ? { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad } : null;
  let left = 8, top = 8, cw = 0, ch = 0;
  // 밝힌 곳을 가리지 않는 자리를 찾는다. 모자라면 석공을 조금씩 줄여 본다.
  for (const k of [1, 0.86, 0.74, 0.62]) {
    sizeCard(card, k); cw = card.offsetWidth; ch = card.offsetHeight;
    left = Math.max(8, (W - cw) / 2 + (W > 860 ? 40 : 0)); top = Math.max(8, (H - ch) / 2 + (W > 860 ? 30 : 0));
    if (!tr) break;
    const box = { left, top, right: left + cw, bottom: top + ch };
    if (!overlap(box, tr)) break;
    if (tr.top - ch - 24 >= 8) { top = tr.top - ch - 24; break; }
    if (tr.bottom + 24 + ch <= H - 8) { top = tr.bottom + 24; break; }
    if (tr.left - cw - 24 >= 8) { left = tr.left - cw - 24; break; }
    if (tr.right + 24 + cw <= W - 8) { left = tr.right + 24; break; }
  }
  Object.assign(card.style, { left: left + 'px', top: top + 'px', width: '' });
  // 밝힌 곳이 말풍선보다 위에 있으면 흰 화살표로 가리킨다
  if (tr) {
    const bub = card.querySelector('.g-bubble'), bTop = top + bub.offsetTop;
    if (tr.bottom + 20 < bTop) {
      const ax = Math.min(Math.max((tr.left + tr.right) / 2, left + 40), left + cw - 40), y0 = tr.bottom + 14, y1 = Math.min(bTop - 20, y0 + 70);
      if (y1 - y0 > 24) Object.assign(arrow.style, { left: ax - 1.5 + 'px', top: y0 + 'px', height: y1 - y0 + 'px', opacity: 1 });
    }
  }
}
function show() {
  const s = STEPS[i];
  const touch = document.body.classList.contains('touch') || matchMedia('(pointer: coarse)').matches;
  el.querySelector('.g-title').textContent = s.title;
  el.querySelector('.g-text').innerHTML = touch && s.tt ? s.tt : s.t; // 손가락 기기는 손가락 조작으로 안내(글은 이 파일에 적은 것만)
  el.querySelector('.g-step').textContent = `${i + 1} / ${STEPS.length}`;
  el.querySelector('.g-dots').innerHTML = STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  el.querySelector('.g-next').textContent = i < STEPS.length - 1 ? `다음: ${STEPS[i + 1].short}` : `다음: ${s.short}`;
  const nx = el.querySelector('[data-g=next]'); nx.textContent = i === STEPS.length - 1 ? '시작하기 →' : '다음 →';
  const card = el.querySelector('.g-card'); card.classList.remove('pop'); void el.offsetWidth; card.classList.add('pop');
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
  el = document.createElement('div'); el.id = 'guide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '백제 석공의 첫 안내');
  el.innerHTML = `<div class="g-hole" aria-hidden="true"></div><div class="g-arrow" aria-hidden="true"></div><div class="g-card">${npcImg('guide', 'g-who')}<div class="g-bubble">
    <div class="g-top"><span class="g-kick">백제 석공의 첫 안내</span><span class="g-step"></span></div>
    <h2 class="g-title"></h2><p class="g-text" aria-live="polite"></p><div class="g-dots" aria-hidden="true"></div>
    <div class="g-foot"><span class="g-next"></span><div class="g-btns"><button class="btn" data-g="skip">건너뛰기</button><button class="btn" data-g="next">다음 →</button></div></div></div></div>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'skip') end(); else next(); });
  document.body.appendChild(el);
  addEventListener('resize', place); addEventListener('keydown', key, true);
  show();
  return true;
}
export const guideSeen = done;
