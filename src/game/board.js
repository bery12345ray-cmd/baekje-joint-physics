// 온라인 순위: 마당별 지진 시험 점수(무너진 세기 1.00–7.00)를 닉네임과 함께 Supabase에 올리고, 실시간으로 모두에게 보인다.
// 보안: 브라우저에는 공개(publishable/anon) 키만. 쓰기는 익명 로그인한 사용자 본인 이름으로 점수 넣기만 되고(RLS),
// 점수 범위·닉네임 길이·욕설·도배 제한은 데이터베이스가 다시 검사한다(supabase/leaderboard.sql).
// 연결 정보가 없거나 실패하면 이 기기 최고 기록만 보여 준다.
import CFG from './board-config.js';
import { DISASTERS, DKEYS } from './disasters.js';
import { LEVELS, level } from './levels.js';
const lvName = n => n >= 1 && n <= 5 ? `LV.0${n} ${LEVELS[n - 1].name}` : '';

const NICK_KEY = 'baekje-nick';
const STAGE_NAME = { 1: '미륵사지', 2: '정림사지', 3: '창작' };
// 기본 욕설 거르기(데이터베이스의 banned_words와 같은 목록, 화면에서 먼저 알려 주기용)
const BAD = ['씨발', '시발', '씨바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '좆', '존나', '졸라', '개새', '새끼', '썅', '지랄', 'ㅈㄹ', '닥쳐', '꺼져', '엿먹', '느금', '니미', '니애미', '애미', '애비', '미친놈', '미친년', '또라이',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'nigger', 'nigga', 'faggot', 'porn', 'sex'];
export const NICK_RE = /^[가-힣a-zA-Z0-9_ .-]{2,12}$/;
export function nickProblem(n) {
  const t = (n || '').trim();
  if (t.length < 2 || t.length > 12) return '닉네임은 2~12자로 정해 주세요';
  if (!NICK_RE.test(t)) return '한글·영문·숫자와 _ . - 만 쓸 수 있어요';
  const flat = t.toLowerCase().replace(/[\s_.-]/g, '');
  if (BAD.some(w => flat.includes(w))) return '다른 닉네임을 골라 주세요';
  return null;
}
export const getNick = () => { try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; } };
const setNick = n => { try { localStorage.setItem(NICK_KEY, n); } catch { /* 저장소 없음 */ } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const B = { sb: null, ready: false, status: CFG.url && CFG.key ? 'connecting' : 'off', stage: 2, dis: 'quake', rows: {}, online: 0, pending: null, msg: '', localBest: () => 0 };
export const boardEl = document.createElement('section');
boardEl.id = 'board'; boardEl.setAttribute('aria-label', '온라인 순위');
boardEl.addEventListener('submit', e => {
  if (e.target.id !== 'nickForm') return;
  e.preventDefault();
  const n = e.target.nick.value.trim(), bad = nickProblem(n);
  if (bad) { B.msg = bad; return draw(); }
  setNick(n); B.msg = `닉네임을 "${n}"(으)로 정했어요`; document.dispatchEvent(new CustomEvent('baekje-nick'));
  if (B.pending) { const p = B.pending; B.pending = null; submitScore(p.stage, p.score, p.disaster, p.lv); }
  draw();
});

// stage를 바꾸거나 처음 열 때 부른다. localBest: 연결이 없을 때 보여 줄 이 기기 최고 기록
export function showBoard(stage, localBest, dis) {
  const prev = rk();
  B.stage = stage; if (localBest) B.localBest = localBest; if (dis && DISASTERS[dis]) B.dis = dis;
  draw();
  if (B.ready && (prev !== rk() || !B.rows[rk()])) fetchTop(stage); // 마당·재해가 바뀔 때만 다시 읽는다(새 점수는 실시간으로 온다)
}
const rk = () => B.stage + '|' + B.dis;
boardEl.addEventListener('click', e => { const b = e.target.closest('[data-bdis]'); if (!b) return; B.dis = b.dataset.bdis; draw(); if (B.ready) fetchTop(B.stage); });

let sbPromise = null;
async function client() {
  if (B.status === 'off') return null;
  if (!sbPromise) sbPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js'); // 연결 정보가 있을 때만 불러온다
      const sb = createClient(CFG.url, CFG.key, { auth: { persistSession: true, storageKey: 'baekje-sb-auth' }, realtime: { params: { eventsPerSecond: 5 } } });
      B.sb = sb;
      // 실시간: 새 점수가 들어오면 그 마당 순위를 다시 읽는다 · 접속 인원은 presence로 센다
      sb.channel('scores-feed').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, p => { if (p.new && +p.new.stage === B.stage && p.new.disaster === B.dis) fetchTop(B.stage); }).subscribe();
      const room = sb.channel('online', { config: { presence: { key: Math.random().toString(36).slice(2) } } });
      room.on('presence', { event: 'sync' }, () => { B.online = Object.keys(room.presenceState()).length; draw(); })
        .subscribe(s => { if (s === 'SUBSCRIBED') room.track({ at: Date.now() }); });
      B.ready = true; B.status = 'on';
      return sb;
    } catch (err) { console.warn('온라인 순위 연결 실패', err); B.status = 'error'; return null; }
  })();
  return sbPromise;
}

async function fetchTop(stage) {
  const sb = await client(); if (!sb) return draw();
  const dis = B.dis, { data, error } = await sb.rpc('top_scores', { p_stage: stage, p_disaster: dis, p_limit: 10 });
  if (error) { console.warn(error); B.status = 'error'; } else { B.rows[stage + '|' + dis] = data || []; B.status = 'on'; }
  draw();
}

// 지진 시험(점수)이 끝나면 부른다. 닉네임이 없으면 정할 때까지 기다렸다 올린다.
export async function submitScore(stage, score, disaster = 'quake', lv = 1) {
  score = Math.round(Math.min(7, Math.max(1, score)) * 100) / 100;
  if (B.status === 'off') return draw();
  const nick = getNick();
  if (!nick || nickProblem(nick)) { B.pending = { stage, score, disaster, lv }; B.msg = `점수 ${score.toFixed(2)} · 닉네임을 정하면 순위에 올라가요`; return draw(); }
  const sb = await client(); if (!sb) return draw();
  try {
    if (!(await sb.auth.getSession()).data.session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; }
    const { error } = await sb.from('scores').insert({ nickname: nick, stage, disaster, score, level: Math.min(5, Math.max(1, lv | 0)) });
    if (error) throw error;
    B.msg = `${STAGE_NAME[stage]} · ${DISASTERS[disaster].name} 순위에 ${score.toFixed(2)}점을 올렸어요`; B.dis = disaster;
  } catch (err) {
    const m = String(err && err.message || err);
    B.msg = /too many|limit/i.test(m) ? '잠시 뒤에 다시 올려 주세요(도배 방지)' : /nickname/i.test(m) ? '이 닉네임은 쓸 수 없어요' : '순위에 올리지 못했어요 · 이 기기에는 기록했어요';
    console.warn('점수 올리기 실패', err);
  }
  fetchTop(stage);
}

// 결과 창 순위 표시: 온라인이고 그 마당·재해 순위를 받아 왔을 때만(상위 10위 안에서 센다). 아니면 null
export function rankOf(stage, dis, score) {
  const rows = B.status === 'on' && B.rows[stage + '|' + dis]; if (!rows) return null;
  const n = rows.filter(r => Number(r.score) > score).length + 1;
  return n <= Math.max(10, rows.length) ? `순위 ${n}위` : null;
}
function draw() {
  const nick = getNick(), rows = B.rows[rk()] || [], on = B.status === 'on';
  const local = B.localBest(B.stage, B.dis);
  const list = on && rows.length
    ? `<ol class="bd-list">${rows.map((r, i) => `<li class="${r.nickname === nick ? 'me' : ''}"><i>${i + 1}</i><span>${esc(r.nickname)}${r.level ? `<em class="bd-lv">${lvName(r.level)}</em>` : ''}</span><b>${Number(r.score).toFixed(2)}</b></li>`).join('')}</ol>`
    : on ? '<p class="note">아직 이 마당 순위가 비어 있어요. 첫 기록의 주인공이 되어 보세요.</p>'
    : `<p class="note">${B.status === 'connecting' ? '온라인 순위에 연결하는 중…' : '온라인 순위에 연결되지 않아 이 기기 최고 기록만 보여요.'}</p>${local ? `<div class="bd-local"><span>이 기기 최고 · ${DISASTERS[B.dis].name}${level() ? `<em class="bd-lv">${esc(nick || '나')} · ${lvName(level())}</em>` : ''}</span><b>${local.toFixed(2)}</b></div>` : ''}`;
  const focused = document.activeElement && document.activeElement.id === 'nickIn';
  const typed = focused ? document.activeElement.value : null;
  boardEl.innerHTML = `<div class="bd-head"><h3>온라인 순위 · ${STAGE_NAME[B.stage]}</h3>${on ? `<span class="bd-on" title="지금 접속 중인 사람"><i aria-hidden="true"></i>${B.online || 1}명 접속 중</span>` : ''}</div>
    <div class="bd-dis" role="group" aria-label="재해별 순위">${DKEYS.map(k => `<button data-bdis="${k}" aria-pressed="${B.dis === k}">${DISASTERS[k].name}</button>`).join('')}</div>
    ${list}
    <form id="nickForm" class="bd-nick"><label for="nickIn">닉네임</label><input id="nickIn" name="nick" maxlength="12" minlength="2" autocomplete="nickname" placeholder="2~12자" value="${esc(typed ?? nick)}"><button class="btn line">${nick ? '바꾸기' : '정하기'}</button></form>
    ${B.msg ? `<p class="bd-msg" role="status">${esc(B.msg)}</p>` : ''}`;
  if (focused) { const i = boardEl.querySelector('#nickIn'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}
if (B.status !== 'off') client().then(() => fetchTop(B.stage));
draw();
