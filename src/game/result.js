// 재해 시험 결과 창(목업 04): 버틴 햇수, 1,400년 막대, 진단 근거, 석공 비평, 다른 재해로 시험·다시 쌓기·순위판, 그리고 인증샷 공유.
// 창이 열리면 body.modal(머리띠가 한 줄 막대로 바뀐다). 닫으면 onClose(칭호가 올랐으면 그다음 칭호 오름 창).
import { npcImg } from './npc.js';
import { makeCard, shareCard, toBlob } from './share.js';
import { DISASTERS } from './disasters.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dIcon = (k, px = 18) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${DISASTERS[k].icon}"/></svg>`;
// 받침이 있으면 "으로", 없거나 ㄹ 받침이면 "로"
const ro = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; if (c < 0 || c > 11171) return '로'; const j = c % 28; return j === 0 || j === 8 ? '로' : '으로'; };
const KAKAO = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.5C6.8 3.5 2.6 6.8 2.6 10.9c0 2.6 1.7 4.9 4.3 6.2l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.4 0 .7.1 1.1.1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5z"/></svg>';
const INSTA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';
const SAVE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

// r: { kind, stageName, score, years, collapsed, chips:[{t,on}], rows:[[k,v]], crit:{tag,html,note}, others:[k,k], boardLabel, say, pose,
//      shots:[canvas], levelName, onRetest(k), onRebuild(), onBoard(), onClose() }
export function showResult(r) {
  document.getElementById('result')?.remove();
  const el = document.createElement('div'); el.id = 'result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'rsTtl');
  const D = DISASTERS[r.kind], pct = Math.max(0, Math.min(100, r.years / 1400 * 100));
  el.innerHTML = `<div class="rs-card">
      <div class="rs-top"><span class="rs-kick" id="rsTtl">${D.name} 시험 결과 · ${esc(r.stageName)}</span><button class="btn rs-x" data-rs="close">✕ 닫기</button></div>
      <div class="rs-hero">
        <div class="rs-yrs"><p>이 탑은</p><strong>${r.years.toLocaleString('ko-KR')}<small>년</small></strong><p class="rs-end">을 버텼습니다</p></div>
        <div class="rs-meter"><div class="rs-lab"><span>0년</span><span>정림사지 1,400년</span></div><div class="rs-bar"><i style="width:0%"></i></div>
          <div class="rs-chips">${r.chips.map(c => `<span class="chip${c.on ? ' on' : ''}">${esc(c.t)}</span>`).join('')}</div></div>
      </div>
      <div class="rs-grid">
        <section class="rs-box"><h4>진단 근거</h4><dl>${r.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
        <section class="rs-box"><h4>석공 비평 <span class="rs-tag">${esc(r.crit.tag)}</span></h4><p class="rs-quote">${r.crit.html}</p><p class="rs-note">${esc(r.crit.note)}</p></section>
      </div>
      <div class="rs-btns">
        <div>${r.others.map(k => `<button class="btn" data-rs="retest" data-k="${k}">${dIcon(k)}${DISASTERS[k].name}${ro(DISASTERS[k].name)} 시험</button>`).join('')}</div>
        <div><button class="btn" data-rs="rebuild"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>다시 쌓기</button>
          <button class="btn cta" data-rs="board">${esc(r.boardLabel)} →</button></div>
      </div>
      <section class="rs-share" aria-label="인증샷 공유">
        <button class="sh-thumb" data-rs="preview" aria-label="인증샷 크게 보기" title="인증샷 크게 보기"></button>
        <div><h4>내 탑 인증샷 공유</h4><p>내가 쌓은 탑 네 컷에 꼬마 석공이 함께 찍혔어요. 카카오톡이나 인스타그램으로 자랑해 보세요.</p>
          <div class="sh-btns"><button class="btn kakao" data-share="kakao">${KAKAO}카카오톡 공유</button><button class="btn insta" data-share="insta">${INSTA}인스타그램 공유</button><button class="btn" data-share="save">${SAVE}이미지 저장</button></div>
          <p class="sh-msg" role="status" hidden></p></div>
      </section>
    </div>
    <div class="rs-npc"><p class="rs-say">${esc(r.say)}</p>${npcImg(r.pose, r.pose === 'panic' ? 'shake' : 'pop')}</div>`;
  document.body.appendChild(el); document.body.classList.add('modal');
  requestAnimationFrame(() => requestAnimationFrame(() => { el.querySelector('.rs-bar i').style.width = pct + '%'; }));
  // 인증샷은 창이 열리자마자 만들어 둔다(공유 단추를 누른 그 순간에 바로 공유 창을 열어야 해서)
  let blob = null, card = null;
  const ready = makeCard({ shots: r.shots || [], years: r.years, score: r.score, disName: D.name, stageName: r.stageName, levelName: r.levelName, collapsed: r.collapsed })
    .then(async c => { card = c; blob = await toBlob(c); const t = el.querySelector('.sh-thumb'); if (t) t.style.backgroundImage = `url(${c.toDataURL('image/jpeg', 0.7)})`; return blob; })
    .catch(err => { console.warn('인증샷을 만들지 못했어요', err); return null; });
  const msg = t => { const m = el.querySelector('.sh-msg'); m.textContent = t; m.hidden = !t; };
  const text = `${r.stageName}, ${D.name} 세기 ${r.score.toFixed(2)} · 이 탑은 ${r.years.toLocaleString('ko-KR')}년을 버텼어요! #석공1400 #백제 #정림사지`;
  const close = () => { el.remove(); document.body.classList.remove("modal"); removeEventListener("keydown", onKey, true); if (r.onClose) r.onClose(); };
  const onKey = e => { if (document.getElementById('share')) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  el.addEventListener('click', async e => {
    if (e.target === el) return close();
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.rs, s = b.dataset.share;
    if (s) { const bl = blob || await ready; if (!bl) return msg('인증샷을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.'); msg(await shareCard(bl, s, text)); return; }
    if (a === 'preview') { if (card || await ready) openPreview(card, async app => shareCard(blob, app, text)); return; }
    if (a === 'close') return close();
    if (a === 'retest') { close(); r.onRetest(b.dataset.k); }
    if (a === 'rebuild') { close(); r.onRebuild(); }
    if (a === 'board') { close(); r.onBoard(); }
  });
  addEventListener('keydown', onKey, true);
  el.querySelector('[data-share=kakao]').focus({ preventScroll: true });
}
export const resultOpen = () => !!document.getElementById('result');

// 인증샷 크게 보기
function openPreview(card, share) {
  document.getElementById('share')?.remove();
  const el = document.createElement('div'); el.id = 'share'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '인증샷 미리보기');
  el.innerHTML = `<div class="sh-card"><img src="${card.toDataURL('image/png')}" width="1080" height="1350" alt="내가 쌓은 탑 네 컷과 꼬마 석공이 함께 찍힌 인증샷">
    <div class="sh-side"><h3>내 탑 인증샷</h3><p>휴대폰에서는 공유 창에서 카카오톡이나 인스타그램을 고르면 바로 보낼 수 있어요. PC에서는 이미지를 저장하고 게임 주소를 복사해 드려요.</p>
      <div class="sh-btns"><button class="btn kakao" data-share="kakao">${KAKAO}카카오톡 공유</button><button class="btn insta" data-share="insta">${INSTA}인스타그램 공유</button><button class="btn" data-share="save">${SAVE}이미지 저장</button><button class="btn navy" data-share="close">닫기</button></div>
      <p class="sh-msg" role="status" hidden></p></div></div>`;
  const close = () => { el.remove(); removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  el.addEventListener('click', async e => {
    if (e.target === el) return close();
    const b = e.target.closest('[data-share]'); if (!b) return;
    if (b.dataset.share === 'close') return close();
    const m = el.querySelector('.sh-msg'), t = await share(b.dataset.share); m.textContent = t; m.hidden = !t;
  });
  addEventListener('keydown', onKey, true);
  document.body.appendChild(el);
}
