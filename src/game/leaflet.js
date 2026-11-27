// 탑을 쌓기 전에 띄우는 안내 리플렛(첫째 마당 미륵사지 · 둘째 마당 정림사지)을 한 장씩 넘겨 보는 형식.
// 판형(남색 표지, 흰 속지와 파란 소제목, 초록 박물관 면, 남색 관람 안내)은 정림사지박물관 리플렛을 따르고,
// 글은 그 내용을 바탕으로 새로 썼다. 그림은 모두 블렌더로 지은 3D 장면 렌더(scripts/blender/garam_scene.py)이며 리플렛 사진·로고는 쓰지 않는다.
const IMG = n => `leaflet/${n}.jpg`;

// 익산 미륵사지 리플렛: 국립익산박물관 누리집 「미륵사지」(출처 (재)백제세계유산센터)를 바탕으로 새로 쓴 글
const MSECTIONS = {
  site: { h: '미륵사지(사적)', img: 'mireuk-aerial', alt: '오늘날 미륵사지 전경(3D 재현)', p: [
    '익산 미륵산(430m) 아래 넓은 평지에 펼쳐진, 동아시아에서 가장 큰 규모의 절터입니다. 백제 무왕 때인 7세기 초에 세웠고, 임진왜란 무렵 폐사되었습니다.',
    '1974년부터 23년 동안 발굴해 강당에서 중문까지 134m, 동서 폭 172m에 이르는 가람이 드러났습니다.'] },
  story: { h: '연못에서 나타난 미륵삼존', p: [
    '『삼국유사』에는 무왕 부부가 사자사로 가던 길에 용화산 아래 연못에서 미륵삼존이 나타나, 왕비의 청으로 연못을 메우고 세 곳에 탑과 금당, 회랑을 세웠다는 이야기가 전합니다.',
    '발굴 결과 실제로 습지를 메워 땅을 다졌고, 세 번의 설법으로 모든 사람을 구한다는 미륵의 가르침대로 가람을 셋으로 나누었음이 확인되었습니다.'] },
  plan: { h: '3탑 3금당', img: 'mireuk-plan', alt: '미륵사지 가람 배치(3D 재현, 위에서 본 모습)', p: [
    '중문, 탑, 금당을 한 줄로 놓은 백제식 1탑 1금당 가람 셋을 동·중·서로 나란히 두었습니다. 가운데 중원이 가장 크고, 중원에는 목탑이, 동원과 서원에는 석탑이 섰습니다.',
    '세 원은 회랑으로 나뉘지만 북쪽의 큰 강당 하나로 이어져, 예불 공간은 셋으로 나누고 강당은 하나로 모았습니다.'] },
  west: { h: '미륵사지 석탑(국보) · 서탑', img: 'mireuk-west', alt: '미륵사지 서탑(3D 재현)', p: [
    '서원의 석탑은 크게 훼손된 채 동북쪽 면만 6층까지 남아 있었습니다. 1998년 안전진단에서 위험하다는 결과가 나와 2001년부터 해체·보수를 시작했습니다.',
    '1층은 사방에 문을 내고 돌기둥과 창방·평방을 깎아 세워, 나무로 짓던 탑의 짜임을 돌로 그대로 옮겼습니다.'] },
  east: { h: '9층으로 되살린 동탑', img: 'mireuk-east', alt: '1992년 복원한 미륵사지 동탑(3D 재현)', p: [
    '무너진 동탑 터에서 노반석과 지붕돌이 나와, 서탑과의 비례로 계산한 결과 9층탑이었다는 결론에 이르렀습니다.',
    '1992년 동원에 높이 24m로 복원했습니다. 신라에서 가장 높은 감은사지 석탑(13m)의 두 배 가까운 크기입니다.'] },
  sari: { h: '심주석에서 나온 사리장엄', img: 'mireuk-simju', alt: '1층 심주석 윗면의 사리공과 사리장엄(3D 재현)', p: [
    '2009년 서탑 1층을 해체하던 중 심주석 윗면 가운데에서 사리공이 나왔습니다. 둘레에는 십자 먹선과 석회로 봉한 흔적이 있었습니다.',
    '사리호, 금제 사리봉영기, 은제 관식, 청동합이 함께 나왔고, 봉영기에서 639년에 사리를 모시며 탑을 세웠음이 밝혀졌습니다.'] },
  water: { h: '습지 위의 절', img: 'mireuk-geumdang', alt: '바닥을 띄운 금당의 높은 초석(3D 재현)', p: [
    '미륵산에서 흘러내린 물을 가람 네 면의 인공 물길로 돌리고, 남쪽 앞에는 큰 연못을 팠습니다.',
    '금당은 지대석 위에 1m 남짓한 주춧돌을 마름모꼴로 세우고 귀틀을 걸쳐, 바닥 아래를 비워 습기를 막았습니다.'] },
};

const LEAFLETS = {
  mireuk: { theme: 'mireuk', S: MSECTIONS, src: '자료: 국립익산박물관 누리집 「미륵사지」((재)백제세계유산센터) · 그림: 블렌더 3D 재현',
    cover: { img: 'mireuk-aerial', tag: '미륵산 아래 백제 사람들의 염원', title: '미륵사지', en: 'MIREUKSAJI', han: '彌勒寺址', note: '우리나라에서 가장 오래되고 큰 석탑을 쌓아 보기 전에, 한 장씩 넘겨 보세요.' },
    pages: [
      { kind: 'cover' },
      { kind: 'white', title: '미륵사지', en: 'MIREUKSAJI', secs: ['site', 'story'] },
      { kind: 'white', title: '가람과 서탑', en: 'THREE COURTYARDS', secs: ['plan', 'west'] },
      { kind: 'white', title: '되살린 탑과 사리장엄', en: 'RESTORATION & RELICS', secs: ['east', 'sari'] },
      { kind: 'green', title: '습지를 다스린 백제', en: 'BUILT ON A WETLAND', secs: ['water'] },
    ],
    info: [['관람 시간', '국립익산박물관 09:00~18:00'], ['문의', '063-830-0900']],
    addr: '전북특별자치도 익산시 금마면 미륵사지로 362 (국립익산박물관)',
    map: ['미륵사지 · 국립익산박물관', '미륵산', '익산 시내 방면', '금마면', '왕궁리 유적', '서동공원'] },
};

const sec = (S, k) => {
  const s = S[k];
  return `<article class="lf-sec"><h3><i></i>${s.h}</h3>${s.p.map(t => `<p>${t}</p>`).join('')}${s.img ? `<figure><img src="${IMG(s.img)}" alt="${s.alt}" loading="lazy"></figure>` : ''}</article>`;
};
const mapSVG = ([here, a, b, c, d, e]) => `<svg viewBox="0 0 360 200" class="lf-map" role="img" aria-label="둘레 약도(대략)" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
  <path d="M20 150 H330 M150 20 V190 M60 40 L300 180 M240 20 L330 70" />
  <g fill="currentColor" stroke="none" font-size="12"><circle cx="150" cy="96" r="7"/><text x="160" y="92">${here}</text>
  <text x="96" y="30">${a}</text><text x="30" y="140">${b}</text><text x="250" y="140">${c}</text><text x="160" y="185">${d}</text><text x="262" y="58">${e}</text></g></svg>`;

function page(L, p, i) {
  const n = L.pages.length, foot = `<p class="lf-src">${L.src} · ${i + 1} / ${n}</p>`, c = L.cover;
  if (p.kind === 'cover') return `<section class="lf-page lf-cover" style="z-index:${n - i}"><img class="lf-bg" src="${IMG(c.img)}" alt="">
    <div class="lf-cv"><p class="lf-tag">${c.tag}</p><h2>${c.title}</h2><p class="lf-en">${c.en}</p><p class="lf-han">${c.han}</p></div>
    <p class="lf-cvnote">${c.note}</p>${foot}</section>`;
  if (p.kind === 'navy') return `<section class="lf-page lf-navy" style="z-index:${n - i}"><div class="lf-cols">
    <div class="lf-sec"><h2 class="lf-bar">관람 안내</h2><dl class="lf-info">${L.info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
    <div class="lf-sec"><h2 class="lf-bar">오시는 길</h2><dl class="lf-info"><div><dt>주소</dt><dd>${L.addr}</dd></div></dl>${mapSVG(L.map)}
      <button class="lf-go" data-lf="start">탑 쌓으러 가기</button></div></div>${foot}</section>`;
  return `<section class="lf-page lf-${p.kind}" style="z-index:${n - i}"><div class="lf-head"><h2>${p.title}</h2><span>${p.en}</span></div>
    <div class="lf-cols${p.secs.length === 1 ? ' lf-one' : ''}">${p.secs.map(k => sec(L.S, k)).join('')}</div>${i === n - 1 ? '<div class="lf-end"><button class="lf-go" data-lf="start">탑 쌓으러 가기</button></div>' : ''}${foot}</section>`;
}

let el = null, cur = 0, N = 0;
function go(to) {
  cur = Math.max(0, Math.min(N - 1, to));
  el.querySelectorAll('.lf-page').forEach((p, i) => { p.classList.toggle('turned', i < cur); p.setAttribute('aria-hidden', String(i !== cur)); });
  el.querySelector('[data-lf=prev]').disabled = cur === 0;
  el.querySelector('[data-lf=next]').hidden = cur === N - 1;
  el.querySelectorAll('.lf-dots i').forEach((d, i) => d.classList.toggle('on', i === cur));
}
function close() {
  if (!el) return;
  const e = el; el = null;
  e.classList.add('lf-out');
  setTimeout(() => e.remove(), 450);
  document.removeEventListener('keydown', onKey);
}
function onKey(e) {
  if (e.key === 'ArrowRight') go(cur + 1);
  else if (e.key === 'ArrowLeft') go(cur - 1);
  else if (e.key === 'Escape') close();
}

export const leafletOpen = () => !!el; // 처음 안내(guide.js)가 리플렛이 닫힌 뒤에 뜨도록
const seen = new Set();
// key: 'mireuk'(확장 마당 · 미륵사지 석탑, 정림사지 리플렛은 2026-11-27 뺐다). once면 이번 방문에 한 번만 띄운다
export function showLeaflet(key = 'mireuk', { once = false } = {}) {
  if (new URLSearchParams(location.search).get('leaflet') === '0') return;
  if (once && seen.has(key)) return;
  seen.add(key);
  if (el) { el.remove(); document.removeEventListener('keydown', onKey); }
  const L = LEAFLETS[key]; N = L.pages.length; cur = 0;
  el = document.createElement('div');
  el.id = 'leaflet'; el.className = 'lf-theme-' + L.theme; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', L.cover.title + ' 안내 리플렛');
  el.innerHTML = `<div class="lf-book">${L.pages.map((p, i) => page(L, p, i)).join('')}</div>
    <nav class="lf-nav"><button data-lf="prev" aria-label="앞 장">‹</button><span class="lf-dots">${L.pages.map(() => '<i></i>').join('')}</span><button data-lf="next" aria-label="다음 장">넘기기 ›</button></nav>
    <button class="lf-skip" data-lf="start">건너뛰고 탑 쌓기</button>
    <p class="lf-hint">옆으로 밀거나 화살표를 눌러 넘겨요</p>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-lf]'); if (!b) return;
    const a = b.dataset.lf;
    if (a === 'next') go(cur + 1); else if (a === 'prev') go(cur - 1); else if (a === 'start') close();
  });
  let sx = null, sy = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('keydown', onKey);
  go(0);
  el.querySelector('[data-lf=next]').focus();
}
