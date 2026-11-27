// 탑을 쌓기 전에 띄우는 안내 리플렛(첫째 마당 미륵사지 · 둘째 마당 정림사지)을 한 장씩 넘겨 보는 형식.
// 판형(남색 표지, 흰 속지와 파란 소제목, 초록 박물관 면, 남색 관람 안내)은 정림사지박물관 리플렛을 따르고,
// 글은 그 내용을 바탕으로 새로 썼다. 그림은 모두 블렌더로 지은 3D 장면 렌더(scripts/blender/garam_scene.py)이며 리플렛 사진·로고는 쓰지 않는다.
const IMG = n => `leaflet/${n}.jpg`;

const SECTIONS = {
  site: { h: '정림사지(사적)', img: 'aerial', alt: '오늘날 정림사지 전경(3D 재현)', p: [
    '백제가 사비에 도읍한 시기(538~660)에 세운 절로, 나성으로 둘러싸인 도성 한가운데 자리했습니다.',
    '남쪽에서 북쪽으로 중문, 석탑, 금당, 강당을 한 줄로 놓은 1탑 1금당 배치로, 백제 절의 대표 모습입니다. 주변 땅을 사들여 발굴하고 정비해 오늘의 모습이 되었습니다.'] },
  tile: { h: '역사를 바꾼 기와 한 장', img: 'tile', alt: '"태평팔년 무진 정림사 대장당초" 명문 기와(3D 재현)', p: [
    '1942년 발굴 때 "태평 8년 무진년 정림사 대장당초"라고 새긴 기와 조각이 나왔습니다.',
    '고려 현종 19년(1028)에 이 절을 정림사라 불렀다는 뜻이어서, 그 뒤로 절터는 정림사지, 탑은 정림사지 오층석탑이라 불립니다.'] },
  stupa: { h: '정림사지 오층석탑(국보)', img: 'pagoda', alt: '정림사지 오층석탑(3D 재현)', p: [
    '익산 미륵사지 석탑과 함께 오늘까지 남은 백제 석탑입니다. 나무로 짓던 탑의 양식을 쉽게 변하지 않는 돌로 옮겼습니다.',
    '화강암 149매를 짜 맞추어 8m 넘게 올렸습니다. 얇고 넓은 지붕돌의 부드러운 곡선과 층마다 줄어드는 안정된 비례가 우리 석탑의 본보기가 되었습니다.'] },
  scar: { h: '석탑의 상처', img: 'scar', alt: '1층 몸돌에 새긴 대당평백제국비명(3D 재현)', p: [
    '660년 사비성을 함락한 당나라 장수 소정방이 1층 몸돌에 승전 기록 "대당평백제국비명"을 새겼습니다.',
    '그래서 한때 이 탑은 "백제를 평정한 탑"이라는 뜻의 평제탑으로 불렸습니다.'] },
  buddha: { h: '정림사지 석조여래좌상(보물)', img: 'buddha', alt: '석조여래좌상(3D 재현)', p: [
    '절터에 남은 돌부처입니다. 몸은 크게 닳아 형체만 남았고, 머리와 관은 뒤에 다시 만든 것입니다.',
    '백제 때 강당이 있던 자리에 모셨으며, 고려 때 절을 고쳐 지으며 세운 본존불로 봅니다.'] },
  walk: { h: '오늘의 절터 거닐기', img: 'hall', alt: '금당 터와 강당 자리 보호각(3D 재현)', p: [
    '석탑 북쪽 금당 터에는 기단과 주춧돌이 남아 있고, 그 뒤 강당 자리에 석조여래좌상을 모신 보호각(1993)이 섰습니다.',
    '회랑이 돌던 자리와 중문 앞 연못 둘도 정비되어, 1탑 1금당의 짜임을 걸으며 느낄 수 있습니다.'] },
  museum1: { h: '제1전시실 · 정림사지관', img: 'museum', alt: '정림사지박물관(3D 재현)', p: [
    '명문 기와와 출토 유물을 AR로 보고, 석탑을 쌓는 과정과 복원한 가람 모형을 영상으로 만납니다.',
    '하나의 석탑과 하나의 금당으로 이루어진 정림사의 사계를 대형 모형 위 영상으로 감상할 수 있습니다.'] },
  museum2: { h: '제2전시실 · 백제불교역사관', p: [
    '360도로 둘러싸는 구형 영상관에서 사비 백제의 불교 이야기를 봅니다.',
    '백제 불교가 전해진 길과 이웃 나라로 건너간 과정, 사비 백제 절터의 분포를 지도와 영상으로 살펴봅니다.'] },
};

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
  jeong: { theme: 'jeong', S: SECTIONS, src: '자료: 정림사지박물관 안내 리플릿 · 그림: 블렌더 3D 재현',
    cover: { img: 'aerial', tag: '백제 사람의 꿈과 땀이 밴 자리', title: '정림사지', en: 'JEONGNIMSAJI', han: '定林寺址', note: '천사백 년을 견딘 오층석탑을 직접 쌓아 보기 전에, 한 장씩 넘겨 보세요.' },
    pages: [
      { kind: 'cover' },
      { kind: 'white', title: '정림사지', en: 'JEONGNIMSAJI', secs: ['site', 'tile'] },
      { kind: 'white', title: '오층석탑', en: 'FIVE-STORY STONE PAGODA', secs: ['stupa', 'scar'] },
      { kind: 'white', title: '절터에 남은 것들', en: 'REMAINS', secs: ['buddha', 'walk'] },
      { kind: 'green', title: '정림사지박물관', en: 'JEONGNIMSAJI MUSEUM', secs: ['museum1', 'museum2'] },
    ],
    info: [['관람 시간', '<b>3월~10월</b> 09:00~18:00<br><b>11월~2월</b> 09:00~17:00<br><small>박물관 입장은 관람 종료 1시간 전까지</small>'],
      ['쉬는 날', '<b>정림사지</b> 연중무휴<br><b>박물관</b> 매주 월요일, 1월 1일, 설날·추석 당일<br><small>월요일이 공휴일이면 그다음 첫 평일</small>'], ['문의', '041-832-2721']],
    addr: '충남 부여군 부여읍 정림로 83',
    map: ['정림사지 · 박물관', '부소산성', '시외버스터미널', '국립부여박물관', '궁남지', '공주·논산 방면'] },
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

const seen = new Set();
// key: 'mireuk'(첫째 마당 · 미륵사지 석탑) | 'jeong'(둘째 마당 · 정림사지 오층석탑). once면 이번 방문에 한 번만 띄운다
export function showLeaflet(key = 'jeong', { once = false } = {}) {
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
