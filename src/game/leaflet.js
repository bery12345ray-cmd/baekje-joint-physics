// 첫 화면: 정림사지 안내 리플렛을 한 장씩 넘겨 보는 형식으로 보여 준다.
// 내용은 정림사지박물관 안내 리플렛을 바탕으로 새로 쓴 글이며, 그림은 게임 톤(먹선·화강·금동)으로 새로 그렸다(리플렛 사진·로고는 쓰지 않음).
const INK = '#1d1b18', STONE = '#cfc8b8', STONE2 = '#b9b1a0', GOLD = '#c8a054', JADE = '#4a7c74', PAPER = '#efe9dc', ROOF = '#5b554c';
const svg = (body, vb = '0 0 320 260') => `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

// 정림사지 오층석탑(실물 비례: 낮은 기단, 낮은 1층 몸돌, 빨리 좁아지는 몸돌, 얇고 넓은 지붕돌)
function tower(cx, base, s = 1, label = false) {
  let y = base, out = '';
  const R = (x, yy, w, h, f = STONE) => `<rect x="${x}" y="${yy}" width="${w}" height="${h}" fill="${f}"/>`;
  out += R(cx - 58 * s, y - 10 * s, 116 * s, 10 * s); y -= 10 * s;
  out += R(cx - 48 * s, y - 9 * s, 96 * s, 9 * s, STONE2); y -= 9 * s;
  let bw = 66 * s, rw = 120 * s;
  for (let i = 0; i < 5; i++) {
    const h = (i === 0 ? 32 : 13 * Math.pow(0.88, i - 1)) * s;
    out += R(cx - bw / 2, y - h, bw, h);
    out += `<path d="M${cx - bw / 2 + 5 * s} ${y} v${-h} M${cx + bw / 2 - 5 * s} ${y} v${-h}" stroke-width="1.2"/>`;
    if (i === 0) out += `<path d="M${cx} ${y} v${-h}" stroke-width="1"/>`;
    y -= h;
    out += R(cx - bw * 0.6, y - 4 * s, bw * 1.2, 4 * s, STONE2); y -= 4 * s;
    out += `<path d="M${cx - rw / 2} ${y - 1 * s} Q${cx} ${y + 2 * s} ${cx + rw / 2} ${y - 1 * s} L${cx + rw / 2 - 2 * s} ${y - 5 * s} L${cx + bw * 0.45} ${y - 9 * s} L${cx - bw * 0.45} ${y - 9 * s} L${cx - rw / 2 + 2 * s} ${y - 5 * s} Z" fill="${STONE}"/>`;
    y -= 9 * s; bw *= 0.78; rw *= 0.86;
  }
  out += R(cx - bw * 0.45, y - 6 * s, bw * 0.9, 6 * s); y -= 6 * s;
  out += `<path d="M${cx - 7 * s} ${y} q${7 * s} ${-12 * s} ${14 * s} 0 z" fill="${STONE2}"/>`;
  if (label) out += `<path d="M${cx + 70 * s} ${base} V${y}" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${cx + 76 * s}" y="${(base + y) / 2}" font-size="12" fill="${INK}" stroke="none">8m 넘게</text>`;
  return out;
}
const hills = `<path d="M0 170 Q60 120 120 160 T240 150 T320 160 V260 H0Z" fill="#cfdccf" stroke="none"/><path d="M0 190 Q80 160 160 185 T320 180 V260 H0Z" fill="#b9cbb8" stroke="none"/>`;
const ground = `<rect x="0" y="222" width="320" height="38" fill="#dcd0b6" stroke="none"/>`;

const ART = {
  cover: svg(`<rect width="320" height="260" fill="#e8e0cf" stroke="none"/><circle cx="250" cy="62" r="24" fill="${GOLD}" opacity=".85" stroke="none"/>${hills}${ground}
    <path d="M196 222 v-30 h96 v30" fill="${PAPER}"/><path d="M186 194 L244 172 L302 194 Z" fill="${ROOF}"/><path d="M212 222 v-22 M276 222 v-22" stroke="#a8452c" stroke-width="3"/>${tower(112, 222, 1.05)}`),
  plan: svg(`<rect width="320" height="260" fill="#e8e0cf" stroke="none"/>
    <path d="M86 228 L234 228 L262 26 L58 26 Z" fill="#d9cfb7" stroke-dasharray="6 4"/>
    <rect x="140" y="214" width="40" height="18" fill="${ROOF}"/><text x="160" y="250" text-anchor="middle" font-size="12" fill="${INK}" stroke="none">중문</text>
    <rect x="150" y="160" width="20" height="20" fill="${STONE}"/><text x="186" y="175" font-size="12" fill="${INK}" stroke="none">석탑</text>
    <rect x="128" y="104" width="64" height="34" fill="${ROOF}"/><text x="202" y="126" font-size="12" fill="${INK}" stroke="none">금당</text>
    <rect x="98" y="40" width="124" height="34" fill="${ROOF}"/><text x="160" y="94" text-anchor="middle" font-size="12" fill="${INK}" stroke="none">강당</text>
    <path d="M160 214 V40" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="3 4"/>
    <ellipse cx="60" cy="244" rx="30" ry="10" fill="#9fc0bb"/><ellipse cx="260" cy="244" rx="30" ry="10" fill="#9fc0bb"/>
    <text x="300" y="20" text-anchor="end" font-size="12" fill="${INK}" stroke="none">북 ↑</text>`),
  tile: svg(`<rect width="320" height="260" fill="#e8e0cf" stroke="none"/>
    <path d="M70 230 L52 120 L96 40 L150 28 L176 92 L168 200 L120 236 Z" fill="#b5a98f"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${74 + i * 12} 214 l-10 -150 M${74 + i * 12} 120 l8 -10 M${74 + i * 12} 150 l8 -10 M${74 + i * 12} 180 l8 -10" stroke="#7d725e" stroke-width="1.3"/>`).join('')}
    <rect x="210" y="34" width="72" height="196" fill="${PAPER}" stroke="${GOLD}"/>
    <text x="264" y="58" font-size="17" fill="${INK}" stroke="none" writing-mode="tb" letter-spacing="4">太平八年戊辰定</text>
    <text x="236" y="58" font-size="17" fill="${INK}" stroke="none" writing-mode="tb" letter-spacing="4">林寺大藏當草</text>`),
  stupa: svg(`<rect width="320" height="260" fill="#e3e9ef" stroke="none"/>${hills}${ground}${tower(150, 230, 1.25, true)}`),
  scar: svg(`<rect width="320" height="260" fill="#e8e0cf" stroke="none"/>
    <rect x="50" y="40" width="220" height="190" fill="${STONE}"/><path d="M78 40 v190 M242 40 v190 M160 40 v190" stroke-width="1.4"/>
    ${'大唐平百濟國碑銘'.split('').map((c, i) => `<text x="${200 - Math.floor(i / 4) * 34}" y="${84 + (i % 4) * 34}" font-size="22" fill="#6d6455" stroke="none" opacity=".85">${c}</text>`).join('')}
    ${Array.from({ length: 24 }, (_, i) => `<rect x="${96 + (i % 6) * 9}" y="${70 + Math.floor(i / 6) * 34}" width="5" height="5" fill="#8a8170" stroke="none"/>`).join('')}
    <path d="M60 210 l30 -8 M230 60 l20 14" stroke="#a8452c" stroke-width="1.5"/>`),
  buddha: svg(`<rect width="320" height="260" fill="#e8e0cf" stroke="none"/>
    <path d="M60 230 V96 H260 V230" fill="${PAPER}"/><path d="M40 100 L160 44 L280 100 Z" fill="${ROOF}"/><path d="M76 230 V104 M244 230 V104" stroke="#a8452c" stroke-width="5"/>
    <rect x="124" y="196" width="72" height="30" fill="${STONE2}"/><path d="M118 196 q42 -24 84 0 z" fill="${STONE}"/>
    <path d="M128 196 q-4 -46 32 -52 q36 6 32 52 z" fill="${STONE}"/><path d="M146 176 q14 -8 28 0" stroke-width="1.5"/>
    <rect x="150" y="116" width="20" height="26" rx="4" fill="${STONE2}"/><path d="M146 116 h28 l-4 -18 h-20 z" fill="${STONE2}"/>`),
  museum: svg(`<rect width="320" height="260" fill="#e3ece9" stroke="none"/>${ground}
    <path d="M40 222 V128 H280 V222" fill="${PAPER}"/><path d="M28 132 L160 96 L292 132 Z" fill="${ROOF}"/>
    <rect x="140" y="170" width="40" height="52" fill="${JADE}"/>
    <circle cx="86" cy="178" r="22" fill="#cfd6d2"/><path d="M70 178 h32 M86 162 v32 M74 166 l24 24 M98 166 l-24 24" stroke-width="1"/>
    <path d="M214 196 q10 -26 20 0 q10 -26 20 0" fill="#e8b4c0"/><path d="M206 198 h56" stroke="${JADE}" stroke-width="3"/>`),
};

const PAGES = [
  { art: 'cover', kicker: '백제 사람의 꿈과 땀이 밴 자리', title: '정림사지', sub: 'JEONGNIMSAJI · 定林寺址',
    body: ['사비(부여)에 도읍했던 백제의 한가운데 절터입니다.', '천사백 년을 견딘 오층석탑을 직접 쌓아 보기 전에, 이 리플렛을 한 장씩 넘겨 보세요.'] },
  { art: 'plan', kicker: '사적', title: '정림사지', body: [
    '백제가 사비에 도읍한 시기(538~660)에 세운 절로, 나성으로 둘러싸인 도성 한가운데 자리했습니다.',
    '남쪽에서 북쪽으로 중문, 석탑, 금당, 강당을 한 줄로 놓은 1탑 1금당 배치로, 백제 절의 대표 모습입니다.',
    '주변 땅을 사들여 발굴하고 정비해 오늘의 절터 공원이 되었습니다.'] },
  { art: 'tile', kicker: '역사를 바꾼 기와 한 장', title: '정림사라는 이름', body: [
    '1942년 발굴 때 "태평 8년 무진년 정림사 대장당초"라고 새긴 기와 조각이 나왔습니다.',
    '고려 현종 19년(1028)에 이 절을 정림사라 불렀다는 뜻이어서, 그때부터 절터는 정림사지, 탑은 정림사지 오층석탑이라 불리게 되었습니다.'] },
  { art: 'stupa', kicker: '국보', title: '정림사지 오층석탑', body: [
    '익산 미륵사지 석탑과 함께 오늘까지 남은 백제 석탑입니다.',
    '나무로 짓던 탑의 양식을 쉽게 변하지 않는 돌로 옮겼습니다. 화강암 149매를 짜 맞추어 8m가 넘게 올렸습니다.',
    '얇고 넓은 지붕돌의 부드러운 곡선, 층마다 줄어드는 안정된 비례가 백제 석탑의 본보기가 되었습니다.'] },
  { art: 'scar', kicker: '석탑의 상처', title: '평제탑이라 불린 시절', body: [
    '660년 사비성을 함락한 당나라 장수 소정방이 1층 몸돌에 승전 기록인 "대당평백제국비명"을 새겼습니다.',
    '그래서 한때 이 탑은 "백제를 평정한 탑"이라는 뜻의 평제탑으로 불렸습니다. 지금도 글자가 남아 있습니다.'] },
  { art: 'buddha', kicker: '보물', title: '정림사지 석조여래좌상', body: [
    '절터에 남은 돌부처입니다. 몸은 크게 닳아 형체만 남았고, 머리와 관은 뒤에 다시 만든 것입니다.',
    '백제 때 강당이 있던 자리에 모셔져 있으며, 고려 때 절을 고쳐 지으며 세운 본존불로 봅니다.'] },
  { art: 'museum', kicker: '정림사지박물관', title: '보고, 듣고, 만져 보는 절터', body: [
    '제1전시실: 명문 기와와 출토 유물, 석탑을 쌓는 과정, 복원한 가람 모형을 영상과 AR로 봅니다.',
    '제2전시실(백제불교역사관): 360도 구형 영상관, 백제 불교의 전래와 절터 분포를 만납니다.'],
    info: [['관람 시간', '3~10월 09:00~18:00 · 11~2월 09:00~17:00 (박물관 입장은 끝나기 1시간 전까지)'], ['쉬는 날', '정림사지는 연중무휴 · 박물관은 매주 월요일, 1월 1일, 설날·추석 당일'], ['주소', '충남 부여군 부여읍 정림로 83'], ['문의', '041-832-2721']] },
];

let el, cur = 0;
function page(p, i) {
  const n = PAGES.length;
  const info = p.info ? `<dl class="lf-info">${p.info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '';
  const last = i === n - 1 ? `<button class="lf-go" data-lf="start">탑 쌓으러 가기</button>` : '';
  return `<section class="lf-page${i === 0 ? ' lf-cover' : ''}" style="z-index:${n - i}" aria-label="${i + 1} / ${n} 쪽">
    <div class="lf-art">${ART[p.art]}</div>
    <div class="lf-text"><span class="lf-kicker">${p.kicker}</span><h2>${p.title}</h2>${p.sub ? `<p class="lf-sub">${p.sub}</p>` : ''}
      ${p.body.map(t => `<p>${t}</p>`).join('')}${info}${last}
      <p class="lf-src">자료: 정림사지박물관 안내 리플릿 · ${i + 1} / ${n}</p></div>
  </section>`;
}
function go(to) {
  cur = Math.max(0, Math.min(PAGES.length - 1, to));
  el.querySelectorAll('.lf-page').forEach((p, i) => p.classList.toggle('turned', i < cur));
  el.querySelector('[data-lf=prev]').disabled = cur === 0;
  el.querySelector('[data-lf=next]').hidden = cur === PAGES.length - 1;
  el.querySelectorAll('.lf-dots i').forEach((d, i) => d.classList.toggle('on', i === cur));
}
function close() {
  el.classList.add('lf-out');
  setTimeout(() => el.remove(), 450);
  document.removeEventListener('keydown', onKey);
}
function onKey(e) {
  if (e.key === 'ArrowRight') go(cur + 1);
  else if (e.key === 'ArrowLeft') go(cur - 1);
  else if (e.key === 'Escape') close();
}

export function showLeaflet() {
  if (new URLSearchParams(location.search).get('leaflet') === '0') return;
  el = document.createElement('div');
  el.id = 'leaflet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '정림사지 안내 리플렛');
  el.innerHTML = `<div class="lf-book">${PAGES.map(page).join('')}</div>
    <nav class="lf-nav"><button data-lf="prev" aria-label="앞 장">‹</button><span class="lf-dots">${PAGES.map(() => '<i></i>').join('')}</span><button data-lf="next" aria-label="다음 장">넘기기 ›</button></nav>
    <button class="lf-skip" data-lf="start">건너뛰고 게임 시작</button>
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
