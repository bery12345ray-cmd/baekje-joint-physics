// 교육 만화풍 장면 그림: node scripts/draw-chibi-scenes.mjs public/scenes
// 1) 인물 원안(characters.svg) 2) 660년 사비성 전투(war-660.svg)
import fs from 'node:fs';
import { chibi, tag, INK, LABEL_FONT } from '../src/game/chibi.js';
const out = process.argv[2] || 'public/scenes';
fs.mkdirSync(out, { recursive: true });
let seed = 11; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * (seed / 2147483647); };
const FONT = `<style>@import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@700&amp;display=swap');</style>`;
const put = (kind, x, y, s = 1, { flip = false, pose = 'stand' } = {}) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${chibi(kind, pose)}</g>`;
const L = w => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- 1) 인물 원안 ----------
{
  const list = [['baekje', '백제군'], ['enemy', '나당 연합군'], ['archer', '연합군 궁수'], ['general', '당 장수 소정방'], ['carpenter', '목수'], ['carpenter2', '목수'], ['villager', '백성'], ['villager2', '백성']];
  let g = `<rect width="1600" height="700" fill="#fbf7ee"/>`;
  list.forEach(([k, name], i) => { const x = 110 + i * 196; g += put(k, x, 520, 1, { pose: k === 'carpenter' ? 'work' : 'stand' }) + tag(name, x, 600, { size: 30 }); });
  g += `<text x="40" y="60" font-family="${LABEL_FONT}" font-size="40" font-weight="700" fill="${INK}">백제 결구 물리학 · 등장인물</text>`;
  fs.writeFileSync(`${out}/characters.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700" width="1600" height="700">${FONT}${g}</svg>\n`);
}

// ---------- 2) 660년 사비성 전투 ----------
const W = 1600, H = 900;
function house(x, y, s, { tiled = false, fire = true } = {}) {
  let g = `<rect x="-70" y="-74" width="140" height="74" fill="#f1ebdd" ${L(5)}/><rect x="-16" y="-54" width="32" height="54" fill="#8a6a44" ${L(4)}/><rect x="-54" y="-56" width="24" height="20" fill="#c9b48a" ${L(4)}/>`;
  g += tiled ? `<path d="M-104 -70 Q -70 -84 0 -86 Q 70 -84 104 -70 L 80 -122 L -80 -122 Z" fill="#5a5750" ${L(5)}/><path d="M-80 -104 Q 0 -114 80 -104" stroke="#77736a" stroke-width="4" fill="none"/>`
    : `<path d="M-96 -66 Q -92 -132 0 -140 Q 92 -132 96 -66 Q 0 -78 -96 -66 Z" fill="#dcc07e" ${L(5)}/><path d="M-80 -86 Q 0 -102 80 -86 M-60 -110 Q 0 -122 60 -110" stroke="#b39a5e" stroke-width="4" fill="none"/>`;
  if (fire) g += flame(-10, -112, 1.3) + flame(40, -100, 0.9) + flame(-52, -96, 0.8);
  return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
}
function flame(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C -36 -16 -24 -58 -8 -84 C -2 -60 8 -64 12 -98 C 34 -62 42 -26 0 0 Z" fill="#ef5b3a" ${L(5)}/><path d="M0 -6 C -18 -18 -10 -42 -2 -58 C 2 -42 8 -44 10 -64 C 22 -40 22 -20 0 -6 Z" fill="#ffb84d"/><path d="M0 -10 C -8 -18 -4 -30 0 -36 C 4 -28 8 -24 0 -10 Z" fill="#fff0b0"/></g>`;
}
function cloud(x, y, s, col = '#9a8f85') { return `<path transform="translate(${x} ${y}) scale(${s})" d="M-80 0 q-10 -40 30 -44 q10 -36 50 -26 q30 -30 60 0 q40 -6 36 34 q30 10 10 36 Z" fill="${col}" ${L(5)} opacity=".9"/>`; }
function pagoda(x, y, s) {
  let g = '', yy = 0; const st = '#d8d2c4', sh = '#b8b0a0';
  g += `<rect x="-80" y="-14" width="160" height="14" rx="3" fill="${sh}" ${L(5)}/>`; yy -= 14;
  g += `<rect x="-64" y="${yy - 20}" width="128" height="20" rx="3" fill="${st}" ${L(5)}/>`; yy -= 20;
  [[82, 52], [62, 18], [56, 16], [50, 15], [44, 14]].forEach(([w, h], i) => {
    g += `<rect x="${-w / 2}" y="${yy - h}" width="${w}" height="${h}" fill="${st}" ${L(5)}/><path d="M${-w / 2 + 8} ${yy} v${-h} M${w / 2 - 8} ${yy} v${-h}" stroke="${INK}" stroke-width="3"/>`; yy -= h;
    const R = [158, 132, 120, 108, 96][i];
    g += `<path d="M${-R / 2} ${yy - 2} Q ${-R / 4} ${yy + 6} 0 ${yy + 6} Q ${R / 4} ${yy + 6} ${R / 2} ${yy - 2} L ${R / 2 - 8} ${yy - 12} L ${-R / 2 + 8} ${yy - 12} Z" fill="${st}" ${L(5)}/>`; yy -= 12;
  });
  g += `<rect x="-16" y="${yy - 14}" width="32" height="14" fill="${st}" ${L(5)}/><path d="M-12 ${yy - 14} q12 -18 24 0 Z" fill="${st}" ${L(4)}/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
}
{
  let g = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c98a"/><stop offset=".6" stop-color="#f3a56c"/><stop offset="1" stop-color="#ee8a57"/></linearGradient></defs>`;
  g += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  // 먼 산(둥근 봉우리, 두꺼운 먹선)
  g += `<path d="M0 520 Q 90 400 190 470 Q 280 360 400 450 Q 520 330 650 440 Q 780 350 900 450 Q 1040 340 1180 440 Q 1300 370 1420 450 Q 1520 400 1600 460 L 1600 900 L 0 900 Z" fill="#c98a5a" ${L(5)}/>`;
  g += `<path d="M0 560 Q 140 480 280 540 Q 420 470 560 540 Q 720 480 860 545 Q 1020 480 1160 545 Q 1320 485 1460 540 Q 1540 515 1600 530 L 1600 900 L 0 900 Z" fill="#b8754c" ${L(5)}/>`;
  for (const [x, y, s] of [[220, 300, 1.1], [620, 250, 1.3], [1080, 280, 1.2], [1420, 300, 1]]) g += cloud(x, y, s, '#8c7f76');
  // 땅
  g += `<path d="M0 600 Q 800 570 1600 600 L 1600 900 L 0 900 Z" fill="#d9b98c" ${L(5)}/>`;
  // 불타는 마을과 정림사 석탑
  for (const [x, y, s, t] of [[110, 640, 0.85, 0], [330, 630, 0.95, 1], [520, 620, 0.75, 0], [1080, 620, 0.8, 1], [1270, 630, 0.9, 0], [1480, 640, 0.95, 1]]) g += house(x, y, s, { tiled: !!t });
  g += pagoda(800, 640, 1.35);
  g += tag('정림사 오층석탑', 800, 318, { size: 26 });
  // 불화살
  for (let i = 0; i < 9; i++) { const x0 = rnd(1150, 1550), y0 = rnd(420, 560), x1 = rnd(150, 700), y1 = rnd(560, 640); g += `<path d="M${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.min(y0, y1) - rnd(120, 200)} ${x1} ${y1}" stroke="${INK}" stroke-width="3" fill="none" stroke-dasharray="10 12" opacity=".55"/><circle cx="${x1}" cy="${y1}" r="7" fill="#ffb84d" ${L(3)}/>`; }
  // 마을 곳곳의 전투(작게 → 크게)
  const duel = (x, y, s) => put('baekje', x - 52 * s, y, s, { pose: 'attack' }) + put('enemy', x + 52 * s, y, s, { flip: true, pose: 'attack' });
  g += duel(240, 700, 0.45) + duel(600, 690, 0.42) + duel(1000, 690, 0.42) + duel(1380, 700, 0.45);
  g += put('archer', 1250, 720, 0.5, { flip: true }) + put('archer', 1330, 730, 0.5, { flip: true });
  g += duel(330, 790, 0.66) + duel(1210, 790, 0.66) + put('baekje', 820, 760, 0.55, { pose: 'fallen' });
  g += put('villager2', 560, 780, 0.55) + put('villager', 640, 790, 0.55);
  g += tag('피난하는 백성', 600, 820, { size: 22 });
  g += duel(900, 885, 0.9);
  g += `<path d="M760 760 l10 -16 l6 14 l14 -8 l-6 14 l16 4 l-16 6 l6 14 l-14 -6 l-6 14 l-4 -16 l-16 2 l12 -12 Z" fill="#fff5c8" ${L(3)}/>`;
  // 큰 인물과 이름표
  g += put('baekje', 140, 900, 1.35, { pose: 'stand' }) + tag('백제군', 140, 640, { size: 30, color: '#2f5f54' });
  g += put('enemy', 1460, 900, 1.35, { flip: true, pose: 'stand' }) + tag('나당 연합군', 1460, 640, { size: 30, color: '#7a3328' });
  g += tag('불화살이다!', 1180, 470, { size: 28, color: '#b03a24' });
  // 제목 띠
  g += `<rect x="40" y="36" width="560" height="96" rx="22" fill="#fffdf7" ${L(4)}/><text x="70" y="84" font-family="${LABEL_FONT}" font-size="40" font-weight="700" fill="${INK}">660년 7월, 사비성</text><text x="70" y="118" font-family="${LABEL_FONT}" font-size="25" fill="#5f5b52">신라와 당의 연합군이 백제의 도읍으로 쳐들어와요</text>`;
  fs.writeFileSync(`${out}/war-660.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${FONT}${g}</svg>\n`);
}
console.log('ok');

// ---------- 3) 장마와 목수의 보수 ----------
function woodPagoda(x, y, s, { broken = false } = {}) {
  let g = '', yy = 0;
  g += `<rect x="-110" y="-16" width="220" height="16" rx="4" fill="#c9c2b2" ${L(5)}/>`; yy -= 16;
  [[150, 70], [124, 56], [100, 50]].forEach(([w, h], i) => {
    g += `<rect x="${-w / 2}" y="${yy - h}" width="${w}" height="${h}" fill="#f1ebdd" ${L(5)}/>`;
    for (let k = 0; k <= 3; k++) { const px = -w / 2 + (w / 3) * k; if (broken && i === 0 && k === 0) { g += `<path d="M${px} ${yy} l6 -${h * 0.45} l-8 -6" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M${px} ${yy} l6 -${h * 0.45} l-8 -6" stroke="#6e5a3a" stroke-width="6" stroke-linecap="round" fill="none"/>`; continue; } g += `<rect x="${px - 6}" y="${yy - h}" width="12" height="${h}" fill="#b5492f" ${L(4)}/>`; }
    g += `<rect x="-14" y="${yy - h * 0.7}" width="28" height="${h * 0.7}" fill="#8a6a44" ${L(4)}/>`;
    yy -= h;
    g += `<rect x="${-w / 2 - 8}" y="${yy - 10}" width="${w + 16}" height="10" fill="#4f8a7b" ${L(4)}/>`; yy -= 10;
    const R = w + 90, tilt = broken && i === 0 ? 14 : 0;
    g += `<path d="M${-R / 2} ${yy + tilt} Q ${-R / 4} ${yy - 8} 0 ${yy - 10} Q ${R / 4} ${yy - 8} ${R / 2} ${yy - 12} L ${R / 2 - 26} ${yy - 46} L ${-R / 2 + 26} ${yy - 46 + tilt * 0.5} Z" fill="#5a5750" ${L(5)}/>`; yy -= 44;
  });
  g += `<path d="M0 ${yy} v-60" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M0 ${yy} v-60" stroke="#d9b45a" stroke-width="5" stroke-linecap="round"/>`;
  for (let k = 0; k < 4; k++) g += `<ellipse cx="0" cy="${yy - 12 - k * 12}" rx="${14 - k * 2}" ry="4" fill="#e0bf6a" ${L(3)}/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
}
{
  let g = `<rect width="${W}" height="${H}" fill="#b9c7cc"/>`;
  g += `<path d="M0 540 Q 120 440 260 500 Q 400 410 560 490 Q 720 420 880 495 Q 1040 420 1200 490 Q 1360 430 1600 500 L 1600 900 L 0 900 Z" fill="#8fa39a" ${L(5)}/>`;
  for (const [x, y, s] of [[200, 170, 1.4], [640, 140, 1.7], [1100, 170, 1.5], [1460, 150, 1.2]]) g += cloud(x, y, s, '#7d8a90');
  g += `<path d="M0 600 Q 800 580 1600 600 L 1600 900 L 0 900 Z" fill="#a9a68f" ${L(5)}/>`;
  for (let i = 0; i < 140; i++) { const x = rnd(0, W), y = rnd(80, 880); g += `<path d="M${x} ${y} l-10 30" stroke="#5f7d8c" stroke-width="3" stroke-linecap="round" opacity=".7"/>`; }
  g += woodPagoda(800, 780, 1.45, { broken: true });
  // 비계(발판)와 층마다 목수
  g += `<path d="M560 780 V 330 M1040 780 V 330 M560 640 H 1040 M560 510 H 1040 M560 400 H 1040" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M560 780 V 330 M1040 780 V 330 M560 640 H 1040 M560 510 H 1040 M560 400 H 1040" stroke="#c99a62" stroke-width="5" stroke-linecap="round"/>`;
  g += put('carpenter', 640, 780, 0.62, { pose: 'work' }) + tag('1층 보수', 640, 610, { size: 26 });
  g += put('carpenter2', 960, 640, 0.55) + tag('2층 보수', 960, 500, { size: 26 });
  g += put('carpenter', 650, 510, 0.5, { pose: 'work', flip: true }) + tag('3층 보수', 650, 390, { size: 26 });
  g += put('villager2', 1260, 820, 0.8) + tag('또 썩었네…', 1260, 600, { size: 26 });
  g += tag('썩어 무너진 1층 기둥', 520, 820, { size: 24, color: '#b03a24' });
  g += `<rect x="40" y="36" width="600" height="96" rx="22" fill="#fffdf7" ${L(4)}/><text x="70" y="84" font-family="${LABEL_FONT}" font-size="40" font-weight="700" fill="${INK}">몇 해째 이어진 장마</text><text x="70" y="118" font-family="${LABEL_FONT}" font-size="25" fill="#5f5b52">빗물에 썩은 기둥을 목수들이 층마다 갈아 끼워요</text>`;
  fs.writeFileSync(`${out}/rain-repair.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${FONT}${g}</svg>\n`);
}
// ---------- 4) 《삼국사기》의 큰 바람 ----------
{
  let g = `<rect width="${W}" height="${H}" fill="#cfd8d6"/>`;
  g += `<path d="M0 540 Q 140 420 300 500 Q 460 400 620 490 Q 800 410 960 495 Q 1120 420 1280 490 Q 1440 430 1600 500 L 1600 900 L 0 900 Z" fill="#9db3a4" ${L(5)}/>`;
  g += `<path d="M0 600 Q 800 580 1600 600 L 1600 900 L 0 900 Z" fill="#d9c9a3" ${L(5)}/>`;
  for (let i = 0; i < 14; i++) { const x = rnd(-100, 1500), y = rnd(120, 620); g += `<path d="M${x} ${y} q60 -30 120 0 t120 0 q30 20 10 40 q-20 10 -30 -6" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/><path d="M${x} ${y} q60 -30 120 0 t120 0 q30 20 10 40 q-20 10 -30 -6" stroke="${INK}" stroke-width="2" fill="none" opacity=".3"/>`; }
  g += house(260, 700, 0.95, { fire: false }) + house(1360, 700, 0.95, { fire: false, tiled: true });
  // 날아가는 초가지붕과 기와
  g += `<path transform="translate(560 300) rotate(-24) scale(.8)" d="M-96 -66 Q -92 -132 0 -140 Q 92 -132 96 -66 Q 0 -78 -96 -66 Z" fill="#dcc07e" ${L(5)}/>`;
  for (let i = 0; i < 12; i++) g += `<path transform="translate(${rnd(900, 1500)} ${rnd(220, 520)}) rotate(${rnd(-50, 50)})" d="M-16 -6 Q 0 -14 16 -6 L 14 6 Q 0 0 -14 6 Z" fill="#5a5750" ${L(3)}/>`;
  // 뽑혀 쓰러지는 나무
  g += `<g transform="translate(1040 720) rotate(-60)"><path d="M-10 0 L -8 -120 L 8 -120 L 10 0 Z" fill="#8a6a44" ${L(5)}/><path d="M0 -110 q-70 -10 -60 -70 q10 -50 60 -50 q50 0 60 50 q10 60 -60 70 Z" fill="#6d9a62" ${L(5)}/><path d="M-10 0 q-20 10 -34 4 M10 0 q20 12 32 4" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
  g += woodPagoda(800, 760, 1.15) + put('villager', 470, 820, 0.75) + put('villager2', 620, 830, 0.7) + tag('으악, 지붕이 날아가!', 520, 590, { size: 26 });
  g += `<rect x="1040" y="70" width="520" height="150" rx="22" fill="#fffdf7" ${L(4)}/><text x="1070" y="118" font-family="${LABEL_FONT}" font-size="30" font-weight="700" fill="${INK}">429년 비유왕 3년 · 地震 大風飛瓦</text><text x="1070" y="152" font-family="${LABEL_FONT}" font-size="22" fill="#5f5b52">땅이 흔들리고 큰 바람에 기와가 날렸다</text><text x="1070" y="190" font-family="${LABEL_FONT}" font-size="30" font-weight="700" fill="${INK}">492년 동성왕 14년 · 大風拔木</text>`;
  g += `<rect x="40" y="36" width="640" height="96" rx="22" fill="#fffdf7" ${L(4)}/><text x="70" y="84" font-family="${LABEL_FONT}" font-size="40" font-weight="700" fill="${INK}">《삼국사기》에 남은 큰 바람</text><text x="70" y="118" font-family="${LABEL_FONT}" font-size="25" fill="#5f5b52">기와가 날리고 나무가 뽑혔다는 백제본기의 기록이에요</text>`;
  fs.writeFileSync(`${out}/wind-429.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${FONT}${g}</svg>\n`);
}
console.log('scenes ok');
