// 칭호(레벨): 재해 시험 점수를 "버틴 햇수"로 바꾸고, 재해별 최고 햇수로 다섯 단계 칭호를 준다.
//   햇수 = round(1400 × ((점수 − 1) / 6)²)  → 7.00 = 1,400년(정림사지 오층석탑의 나이). 위로 갈수록 가파르게 늘어난다.
//   LV.01 견습 석공: 첫 재해 시험을 마치면 · LV.02 숙련 석공: 어느 한 재해에서 100년 이상
//   LV.03 백제 장인: 서로 다른 재해 3가지에서 500년 이상 · LV.04 왕실 석공: 다섯 재해 모두 1,000년 이상
//   LV.05 문화유산 수호자: 다섯 재해 모두 1,400년(7.00 완주)
// 칭호에는 기준 높이·부재 수를 넘는 탑의 기록만 센다(낮고 납작한 더미로 얻지 못하게). 저장: localStorage 'baekje-level'.
import { DISASTERS, DKEYS } from './disasters.js';
import { npcImg } from './npc.js';

export const yearsOf = score => Math.round(1400 * Math.pow(Math.max(0, Math.min(6, score - 1)) / 6, 2));
// 칭호에 세는 탑: 게임 속 높이 5.6 이상(정림사지 탑을 다 쌓으면 6.27, 미륵사지 6.36, 손으로 어긋나게 쌓아도 6.0 안팎 → 그 90%쯤)과 부재 15개 이상
export const ELIGIBLE = { minHeight: 5.6, minPieces: 15, minAccuracy: 0.75 };
// LV.03 이상은 솜씨(정위치 맞춤 75% 이상)로 쌓은 탑만 센다: 시험해 보니 대충 쌓은 미륵사지 탑(맞춤 35%)도 결구가 튼튼해 높은 점수가 나서, 맞춤 없이는 위 칭호가 운이 되었다.
export const LEVELS = [
  { lv: 1, name: '견습 석공', msg: '당신의 첫 번째 돌이 역사의 시작을 알립니다.', off: 5, need: '첫 재해 시험을 마치기' },
  { lv: 2, name: '숙련 석공', msg: '수많은 시련을 견디며 석공의 기술을 익혔습니다.', off: 10, need: '어느 한 재해에서 100년 이상' },
  { lv: 3, name: '백제 장인', msg: '당신의 기술이 한 시대를 넘어섰습니다.', off: 15, need: '서로 다른 재해 3가지에서 500년 이상(정위치 맞춤 75% 이상인 탑)' },
  { lv: 4, name: '왕실 석공', msg: '천년을 견딘 건축, 왕실도 인정할 기술입니다.', off: 20, need: '다섯 재해 모두 1,000년 이상(정위치 맞춤 75% 이상인 탑)' },
  { lv: 5, name: '문화유산 수호자', msg: '1400년의 시간을 넘어, 마침내 유산을 완성했습니다.', off: 30, need: '다섯 재해 모두 1,400년(7.00 완주, 정위치 맞춤 75% 이상인 탑)' },
];
const KEY = 'baekje-level';
let ST = { lv: 0, tests: 0, best: {}, skill: {} };
try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') ST = { lv: v.lv | 0, tests: v.tests | 0, best: v.best || {}, skill: v.skill || {} }; } catch { /* 저장소 없음 */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch { /* 저장소 없음 */ } };
const count = y => DKEYS.filter(k => (ST.best[k] || 0) >= y).length;          // 기준을 넘은 탑 아무것이나(LV.01~02)
const countS = y => DKEYS.filter(k => (ST.skill[k] || 0) >= y).length;       // 정위치 맞춤 75% 이상 탑(LV.03~05)
function levelNow() {
  if (countS(1400) === 5) return 5;
  if (countS(1000) === 5) return 4;
  if (countS(500) >= 3) return 3;
  if (count(100) >= 1) return 2;
  return ST.tests > 0 ? 1 : 0;
}
export const level = () => ST.lv;
export const levelInfo = (lv = ST.lv) => LEVELS[lv - 1] || null;
export const bestYears = k => ST.best[k] || 0;
// 진행 정도(잠긴 칭호에 보여 줄 글): 예 "500년 이상: 2/3 재해"
export function progress(lv) {
  if (lv === 1) return `재해 시험: ${Math.min(1, ST.tests)}/1`;
  if (lv === 2) return `100년 이상: ${Math.min(1, count(100))}/1 재해`;
  if (lv === 3) return `500년 이상: ${Math.min(3, countS(500))}/3 재해`;
  if (lv === 4) return `1,000년 이상: ${countS(1000)}/5 재해`;
  return `1,400년: ${countS(1400)}/5 재해`;
}
// 재해 시험 하나를 기록한다. stats: 시험 직전 탑(sim.stats()). 새 칭호를 얻으면 그 칭호를 돌려준다.
export function recordScore(kind, score, stats, accuracy = 1) {
  const years = yearsOf(score), eligible = !!stats && stats.height >= ELIGIBLE.minHeight && stats.count >= ELIGIBLE.minPieces, skilled = eligible && accuracy >= ELIGIBLE.minAccuracy;
  if (!eligible) return { years, eligible, skilled, up: null };
  ST.tests++; ST.best[kind] = Math.max(ST.best[kind] || 0, years);
  if (skilled) ST.skill[kind] = Math.max(ST.skill[kind] || 0, years);
  const before = ST.lv, now = Math.max(before, levelNow()); ST.lv = now; save();
  return { years, eligible, skilled, up: now > before ? LEVELS.slice(before, now) : null }; // 한 번에 여러 단계를 오르면 차례로 다 보여 준다
}

// ---------- 그림: 다섯 층 탑 아이콘(레벨만큼 층이 채워진다), 칭호 배지 ----------
export function pagodaIcon(lv = ST.lv, px = 22) {
  const tiers = [[3, 17, 18, 3], [4.5, 13.2, 15, 2.6], [6, 9.8, 12, 2.4], [7.3, 6.6, 9.4, 2.2], [8.5, 3.6, 7, 2]]; // x, y, w, h(아래층부터)
  return `<svg class="pg-ico" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.2v2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="4.5" y="20.4" width="15" height="2" rx=".6" fill="none" stroke="currentColor" stroke-width="1.1"/>
    ${tiers.map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${i < lv ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.1"/>`).join('')}</svg>`;
}
export const badgeText = (lv = ST.lv) => lv ? `LV.0${lv} ${LEVELS[lv - 1].name}` : '칭호 없음';

// ---------- 레벨이 오를 때(목업 05): 화면 가운데 칭호, 오른쪽에 망치를 들고 만세하는 꼬마 석공 ----------
// 할인권은 제휴처가 없는 시연용 예시라 그렇게 밝히고 쿠폰 번호는 만들지 않는다.
const coupon = L => `<div class="lv-coupon" aria-label="시연용 예시 혜택: 제휴처 ${L.off}% 할인권"><div><span class="lv-demo">시연용 예시 혜택</span><span class="lv-cname">제휴처 ${L.off}% 할인권</span><small class="lv-note">제휴처가 정해지면 쓸 수 있어요 · 지금은 쿠폰 번호가 없어요</small></div><b>${L.off}%</b></div>`;
const DOTS = [[22, 25], [40, 12], [63, 18], [78, 30], [15, 62], [33, 83], [69, 75], [61, 90], [86, 58], [9, 40]];
export function showLevelUp(L) {
  if (Array.isArray(L)) { const [first, ...rest] = L; if (!first) return; showLevelUp(first); if (rest.length) document.getElementById('lvup').__next = rest; return; }
  document.getElementById('lvup')?.remove();
  const el = document.createElement('div'); el.id = 'lvup'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lvupTtl');
  const chips = DKEYS.map(k => { const y = ST.best[k] || 0; return `<span class="chip${y ? ' on' : ' dim'}">${DISASTERS[k].name} ${y ? y.toLocaleString('ko-KR') + '년' : '—'}</span>`; }).join('');
  el.innerHTML = `<div class="lv-dots" aria-hidden="true">${DOTS.map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${(i * 0.37).toFixed(2)}s"></i>`).join('')}</div>
    <div class="lv-stage"><div class="lv-center">
      <p class="lv-kicker">칭호가 올랐습니다</p>
      <div class="lv-medal">${pagodaIcon(L.lv, 96)}</div>
      <p class="lv-step">${L.lv > 1 ? `LV.0${L.lv - 1} → ` : ''}LV.0${L.lv}</p>
      <h2 id="lvupTtl">${L.name}</h2><p class="lv-msg">“${L.msg}”</p>
      <div class="lv-chips">${chips}</div><p class="lv-cond">${L.need}</p>
      ${coupon(L)}
      <div class="lv-btns"><button class="btn" data-lv="titles">내 칭호 보기</button><button class="btn white" data-lv="ok">계속 쌓기 →</button></div>
    </div></div>
    <div class="lv-npc">${npcImg('celebrate', 'pop')}</div>`;
  const close = () => { el.remove(); document.body.classList.remove('modal'); removeEventListener('keydown', onKey, true); if (el.__next) setTimeout(() => showLevelUp(el.__next), 250); };
  const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(); } };
  el.addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (e.target === el) return close(); if (!b) return; close(); if (b.dataset.lv === 'titles') document.dispatchEvent(new CustomEvent('lv-titles')); });
  document.body.appendChild(el); document.body.classList.add('modal'); addEventListener('keydown', onKey, true);
  el.querySelector('[data-lv=ok]').focus();
}
// "내 칭호" 창 내용(game.js의 sheet에 넣는다). debug면 칭호 오름 창 미리보기 단추
export function titlesHTML(debug = false) {
  const lv = ST.lv;
  const rows = LEVELS.map(L => { const got = L.lv <= lv;
    return `<li class="lv-row${got ? ' got' : ''}">${pagodaIcon(L.lv, 28)}<div><b>LV.0${L.lv} ${L.name}</b>${got ? `<p>“${L.msg}”</p><span class="lv-mini">시연용 예시 혜택 · 제휴처 ${L.off}% 할인권</span>`
      : `<p class="lv-need">${L.need}</p><span class="lv-prog">${progress(L.lv)}</span>`}</div>${got ? '<i class="lv-ok" aria-label="얻음">✓</i>' : '<i class="lv-lock" aria-label="잠김"></i>'}</li>`; }).join('');
  const yrs = `<div class="lv-years">${DKEYS.map(k => `<div><span>${DISASTERS[k].name}</span><b>${(ST.best[k] || 0).toLocaleString('ko-KR')}년</b></div>`).join('')}</div>`;
  return `<div class="ttl"><span>재해별 최고 기록으로 오르는 다섯 칭호</span><h2 id="sheetTtl">내 칭호</h2></div>
    <p class="note">점수는 "버틴 햇수"로 바뀝니다. 햇수 = 1,400 × ((점수 − 1) ÷ 6)². 7.00이면 정림사지 오층석탑의 나이인 1,400년이에요. 게임 속 높이 ${ELIGIBLE.minHeight} 이상(정림사지 탑을 다 쌓으면 6.3), 부재 ${ELIGIBLE.minPieces}개 이상인 탑의 기록만 셉니다. 백제 장인부터는 정위치 맞춤이 ${Math.round(ELIGIBLE.minAccuracy * 100)}% 이상인 탑만 셉니다.</p>
    <h3>재해별 최고 햇수</h3>${yrs}<ol class="lv-list">${rows}</ol>
    ${debug ? `<div class="row lv-debug"><span class="note">debug: 칭호 오름 창 미리보기</span>${LEVELS.map(L => `<button class="btn line" data-lvprev="${L.lv}">LV.0${L.lv}</button>`).join('')}</div>` : ''}
    <div class="row"><button class="btn pat" data-x="close">닫기</button></div>`;
}
