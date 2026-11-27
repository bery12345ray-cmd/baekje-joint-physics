// 교육 만화풍(2~3등신) 인물: 큰 얼굴, 두꺼운 먹선, 단색 면, 짙은 눈썹과 점 눈.
// 인물은 발 가운데가 원점(0,0), 위로 약 -230까지. 게임(people.js)과 장면 그림(scripts/draw-war.mjs)이 함께 쓴다.
export const INK = '#2b2622';
const SK = '#f6e3cf', SK2 = '#ecd0b4', HAIR = '#2b2622';
const L = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// 얼굴: 큰 둥근 얼굴 + 점 눈 + 짙은 눈썹(기분), 수염 선택
function face({ mood = 'brave', beard = false, mustache = false, cheek = true, x = 0, y = -120 } = {}) {
  const brow = mood === 'brave' ? [`M${x - 30} ${y - 6} l20 6`, `M${x + 30} ${y - 6} l-20 6`] : mood === 'worry' ? [`M${x - 30} ${y + 2} l20 -6`, `M${x + 30} ${y + 2} l-20 -6`] : mood === 'sad' ? [`M${x - 30} ${y} l18 -6`, `M${x + 30} ${y} l-18 -6`] : [`M${x - 30} ${y - 2} q10 -6 20 0`, `M${x + 30} ${y - 2} q-10 -6 -20 0`];
  let g = `<path d="M${x - 46} ${y - 4} Q ${x - 48} ${y + 46} ${x} ${y + 50} Q ${x + 48} ${y + 46} ${x + 46} ${y - 4} Q ${x + 40} ${y - 44} ${x} ${y - 46} Q ${x - 40} ${y - 44} ${x - 46} ${y - 4} Z" fill="${SK}" ${L(5)}/>`;
  g += brow.map(d => `<path d="${d}" ${L(7)} fill="none"/>`).join('');
  g += `<circle cx="${x - 18}" cy="${y + 12}" r="5.5" fill="${INK}"/><circle cx="${x + 18}" cy="${y + 12}" r="5.5" fill="${INK}"/>`;
  if (cheek) g += `<ellipse cx="${x - 30}" cy="${y + 28}" rx="8" ry="5" fill="#f2a98a" opacity=".55"/><ellipse cx="${x + 30}" cy="${y + 28}" rx="8" ry="5" fill="#f2a98a" opacity=".55"/>`;
  g += mood === 'worry' || mood === 'sad' ? `<path d="M${x - 8} ${y + 36} q8 -6 16 0" ${L(4)} fill="none"/>` : `<path d="M${x - 8} ${y + 32} q8 7 16 0" ${L(4)} fill="none"/>`;
  if (mustache) g += `<path d="M${x - 22} ${y + 28} q11 -10 22 -2 q11 -8 22 2 q-11 4 -22 0 q-11 4 -22 0 Z" fill="${HAIR}" ${L(3)}/>`;
  if (beard) g += `<path d="M${x - 26} ${y + 36} Q ${x} ${y + 92} ${x + 26} ${y + 36} Q ${x} ${y + 50} ${x - 26} ${y + 36} Z" fill="${HAIR}" ${L(4)}/>`;
  return g;
}
// 몸통(짧고 둥근 옷) + 짧은 다리
function body({ color, color2, trim, belt = '#c8a054', robe = false, x = 0 } = {}) {
  let g = '';
  if (!robe) g += `<path d="M${x - 22} 0 L ${x - 20} -30 L ${x - 4} -30 L ${x - 6} 0 Z" fill="${color2}" ${L(5)}/><path d="M${x + 22} 0 L ${x + 20} -30 L ${x + 4} -30 L ${x + 6} 0 Z" fill="${color2}" ${L(5)}/>`
    + `<path d="M${x - 28} 2 q6 -10 22 -6 l0 6 Z M${x + 28} 2 q-6 -10 -22 -6 l0 6 Z" fill="${INK}"/>`;
  g += robe ? `<path d="M${x - 40} 0 Q ${x - 38} -50 ${x - 30} -78 L ${x + 30} -78 Q ${x + 38} -50 ${x + 40} 0 Z" fill="${color}" ${L(5)}/>`
            : `<path d="M${x - 34} -22 Q ${x - 36} -56 ${x - 28} -78 L ${x + 28} -78 Q ${x + 36} -56 ${x + 34} -22 Q ${x} -14 ${x - 34} -22 Z" fill="${color}" ${L(5)}/>`;
  if (trim) g += `<path d="M${x} -78 L ${x - 10} -52" ${L(4)} fill="none"/><path d="M${x - 26} -76 Q ${x} -64 ${x + 26} -76" stroke="${trim}" stroke-width="6" fill="none"/>`;
  g += `<path d="M${x - 33} -40 Q ${x} -34 ${x + 33} -40" stroke="${belt}" stroke-width="7" fill="none"/>`;
  return g;
}
const arm = (x0, y0, x1, y1, color) => `<path d="M${x0} ${y0} L ${x1} ${y1}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M${x0} ${y0} L ${x1} ${y1}" stroke="${color}" stroke-width="9" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="8.5" fill="${SK}" ${L(4)}/>`;
const spear = (x0, y0, x1, y1, tassel = '#c44d34') => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  return `<path d="M${x0} ${y0} L ${x1} ${y1}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x0} ${y0} L ${x1} ${y1}" stroke="#a87c48" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M${x1} ${y1} L ${x1 + ux * 34 - uy * 9} ${y1 + uy * 34 + ux * 9} L ${x1 + ux * 46} ${y1 + uy * 46} L ${x1 + ux * 34 + uy * 9} ${y1 + uy * 34 - ux * 9} Z" fill="#e8e4da" ${L(4)}/>`
    + `<path d="M${x1 - uy * 2} ${y1 + ux * 2} q${-uy * 10 - ux * 6} ${ux * 10 - uy * 6} ${-uy * 4 - ux * 18} ${ux * 4 - uy * 18}" stroke="${tassel}" stroke-width="7" stroke-linecap="round" fill="none"/>`; };
const sword = (x, y, ang) => { const r = ang * Math.PI / 180, ex = x + Math.sin(r) * 70, ey = y - Math.cos(r) * 70; return `<path d="M${x} ${y} L ${ex} ${ey}" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M${x} ${y} L ${ex} ${ey}" stroke="#eef0f2" stroke-width="5" stroke-linecap="round"/><path d="M${x - 10} ${y + 2} l20 -4" ${L(6)}/>`; };
const shield = (x, y, color, boss) => `<circle cx="${x}" cy="${y}" r="26" fill="${color}" ${L(5)}/><circle cx="${x}" cy="${y}" r="9" fill="${boss}" ${L(4)}/>`;
const bow = (x, y) => `<path d="M${x} ${y - 50} Q ${x + 34} ${y} ${x} ${y + 50}" ${L(7)} fill="none"/><path d="M${x} ${y - 50} Q ${x + 34} ${y} ${x} ${y + 50}" stroke="#a87c48" stroke-width="3" fill="none"/><path d="M${x} ${y - 50} L ${x - 16} ${y} L ${x} ${y + 50}" stroke="${INK}" stroke-width="2" fill="none"/>`;

// 투구·모자
const helmB = `<path d="M-50 -128 Q -50 -176 0 -178 Q 50 -176 50 -128 Q 0 -146 -50 -128 Z" fill="#2e3b36" ${L(5)}/><path d="M-50 -128 Q 0 -146 50 -128 L 52 -118 Q 0 -136 -52 -118 Z" fill="#c8a054" ${L(4)}/>`
  + `<path d="M0 -178 L 0 -206 M-12 -200 q12 -14 24 0 M-18 -190 q18 -12 36 0" stroke="${INK}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M0 -178 L 0 -206 M-12 -200 q12 -14 24 0 M-18 -190 q18 -12 36 0" stroke="#e0bf6a" stroke-width="4" stroke-linecap="round" fill="none"/>`;
const helmE = `<path d="M-50 -126 Q -52 -178 0 -180 Q 52 -178 50 -126 Q 0 -142 -50 -126 Z" fill="#8a7f6c" ${L(5)}/><path d="M-50 -126 Q 0 -142 50 -126" stroke="#6b3226" stroke-width="7" fill="none"/>`
  + `<path d="M0 -180 q6 -26 26 -30" stroke="${INK}" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M0 -180 q6 -26 26 -30" stroke="#d65a3e" stroke-width="8" stroke-linecap="round" fill="none"/>`;
const topknot = `<path d="M-46 -126 Q -44 -168 0 -170 Q 44 -168 46 -126 Q 30 -150 0 -150 Q -30 -150 -46 -126 Z" fill="${HAIR}" ${L(4)}/><ellipse cx="0" cy="-176" rx="13" ry="11" fill="${HAIR}" ${L(4)}/>`;
const band = c => `<path d="M-47 -134 Q 0 -150 47 -134" stroke="${INK}" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M-47 -134 Q 0 -150 47 -134" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M44 -134 l16 10 M44 -134 l18 -2" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
const boktu = `<path d="M-40 -136 L -40 -168 Q 0 -186 40 -168 L 40 -136 Z" fill="#1f1c1a" ${L(5)}/><path d="M-40 -150 L -84 -146 M40 -150 L 84 -146" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
const scarf = `<path d="M-50 -122 Q -52 -170 0 -172 Q 52 -170 50 -122 Q 36 -150 0 -150 Q -36 -150 -50 -122 Z" fill="#eae4d7" ${L(4)}/><path d="M40 -150 q22 0 26 14" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`;

// 인물 정의: pose = 'stand' | 'attack' | 'fallen' | 'work'
export function chibi(kind, pose = 'stand') {
  let g = '';
  switch (kind) {
    case 'baekje': // 백제군: 청동녹 비늘갑옷, 적갈 망토, 금동 장식 투구, 붉은 방패, 창
      g += `<path d="M-34 -76 Q -64 -40 -56 -6 L -26 -20 Z" fill="#a8452c" ${L(5)}/>`;
      g += body({ color: '#4f8a7b', color2: '#2e3b36', trim: '#c8a054', belt: '#c8a054' });
      g += `<path d="M-26 -64 h52 M-28 -54 h56" stroke="#3a6b5f" stroke-width="3"/>`;
      g += pose === 'attack' ? arm(26, -66, 52, -94, '#4f8a7b') + spear(30, -54, 86, -150) : arm(26, -66, 46, -44, '#4f8a7b') + spear(46, 6, 46, -150);
      g += shield(-34, -48, '#b5492f', '#e0bf6a') + face({ mood: 'brave' }) + helmB;
      break;
    case 'enemy': // 나당 연합군: 회갈 비늘갑옷, 검붉은 테, 붉은 술 둥근 투구, 창
      g += body({ color: '#9a8f7a', color2: '#4c3d30', trim: '#6b3226', belt: '#6b3226' });
      g += `<path d="M-26 -64 h52 M-28 -54 h56" stroke="#7d7462" stroke-width="3"/>`;
      g += pose === 'attack' ? arm(26, -66, 54, -92, '#9a8f7a') + spear(30, -52, 90, -144, '#d65a3e') : arm(26, -66, 46, -44, '#9a8f7a') + spear(46, 6, 46, -150, '#d65a3e');
      g += arm(-26, -66, -40, -44, '#9a8f7a') + face({ mood: 'brave', mustache: true }) + helmE;
      break;
    case 'archer': // 연합군 궁수
      g += body({ color: '#9a8f7a', color2: '#4c3d30', trim: '#6b3226', belt: '#6b3226' });
      g += arm(26, -66, 56, -70, '#9a8f7a') + bow(60, -70) + arm(-26, -66, 10, -70, '#9a8f7a') + face({ mood: 'brave' }) + helmE;
      break;
    case 'general': // 당 장수 소정방: 보랏빛 관복, 복두, 팔자수염과 턱수염, 붓
      g += body({ color: '#5b4f7a', color2: '#3a3150', trim: null, belt: '#c8a054', robe: true });
      g += `<path d="M0 -78 L -12 -50 L 0 -48" ${L(4)} fill="none"/>`;
      g += arm(26, -66, 52, -70, '#5b4f7a') + `<path d="M56 -74 l20 -36" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M56 -74 l20 -36" stroke="#a87c48" stroke-width="4" stroke-linecap="round"/><path d="M76 -110 l6 -12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`;
      g += arm(-26, -66, -40, -44, '#5b4f7a') + face({ mood: 'smug', mustache: true, beard: true }) + boktu;
      break;
    case 'carpenter': // 목수: 흰 저고리, 갈색 바지, 머리띠, 망치
      g += body({ color: '#f1ebdd', color2: '#8a6a44', trim: null, belt: '#c44d34' });
      g += `<path d="M0 -78 L -12 -50 L 0 -48" ${L(4)} fill="none"/>`;
      g += (pose === 'work' ? arm(26, -66, 50, -100, '#f1ebdd') + `<path d="M50 -100 L 58 -132" ${L(9)}/><path d="M50 -100 L 58 -132" stroke="#a87c48" stroke-width="4"/><rect x="44" y="-150" width="30" height="18" rx="4" fill="#9aa0a3" ${L(4)}/>` : arm(26, -66, 46, -44, '#f1ebdd'))
        + arm(-26, -66, -40, -44, '#f1ebdd') + topknot + face({ mood: 'happy' }) + band('#eae4d7');
      g += pose === 'work' ? `<path d="M48 -168 q6 10 0 16 q-6 -6 0 -16 Z" fill="#8ec5e6" ${L(3)}/>` : '';
      break;
    case 'carpenter2': // 목수: 새 기둥감을 어깨에 멘다
      g += body({ color: '#e9e0c9', color2: '#7a5c3a', trim: null, belt: '#3f7d6e' });
      g += `<rect x="-96" y="-96" width="190" height="20" rx="5" fill="#d0a571" ${L(5)} transform="rotate(-8 0 -86)"/><path d="M-60 -96 l4 -6 M0 -102 l4 -6 M50 -108 l4 -6" stroke="#a87c48" stroke-width="3"/>`;
      g += arm(26, -66, 40, -92, '#e9e0c9') + arm(-26, -66, -36, -86, '#e9e0c9') + topknot + face({ mood: 'happy' }) + band('#eae4d7');
      break;
    case 'villager': // 백성(남): 흰 저고리, 바람에 놀란 얼굴
      g += body({ color: '#eae4d7', color2: '#8d8270', trim: null, belt: '#3f7d6e' });
      g += arm(26, -66, 50, -104, '#eae4d7') + arm(-26, -66, -48, -96, '#eae4d7') + topknot + face({ mood: 'worry' });
      break;
    case 'villager2': // 백성(여): 붉은 치마, 흰 저고리, 머릿수건
      g += `<path d="M-44 0 Q -40 -40 -26 -60 L 26 -60 Q 40 -40 44 0 Z" fill="#c4563f" ${L(5)}/>`;
      g += `<path d="M-30 -58 Q -30 -76 -24 -82 L 24 -82 Q 30 -76 30 -58 Z" fill="#f1ebdd" ${L(5)}/><path d="M0 -80 l10 18" stroke="#3f7d6e" stroke-width="5"/>`;
      g += arm(24, -70, 44, -100, '#f1ebdd') + arm(-24, -70, -40, -50, '#f1ebdd') + face({ mood: 'worry' }) + scarf;
      break;
  }
  if (pose === 'fallen') return `<g transform="rotate(-84 0 -10) translate(0 30)">${g}</g>`;
  return g;
}
// 손글씨 이름표(말풍선 꼬리 없는 둥근 띠)
export const LABEL_FONT = `'Gaegu', 'Nanum Pen Script', 'Gowun Dodum', cursive`;
export function tag(text, x, y, { size = 30, color = INK, bg = 'rgba(255,253,247,.92)' } = {}) {
  const w = text.length * size * 0.92 + 28;
  return `<g transform="translate(${x} ${y})"><rect x="${-w / 2}" y="${-size * 0.9}" width="${w}" height="${size * 1.5}" rx="${size * 0.6}" fill="${bg}" stroke="${INK}" stroke-width="3.5"/><text x="0" y="${size * 0.25}" font-family="${LABEL_FONT}" font-size="${size}" font-weight="700" text-anchor="middle" fill="${color}">${text}</text></g>`;
}
