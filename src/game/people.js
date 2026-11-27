// 재해 장면 인물: 탑 일러스트(public/pagoda-*.svg)와 같은 화풍
// 먹선 #5f5b52 · 굵기 2 · 둥근 이음, 전돌·화강·청동녹·적갈·금동의 낮은 채도 색, 접힌 면은 같은 색의 한 단계 어두운 면으로만
const INK = '#5f5b52', SKIN = '#e8d2b4', SKIN2 = '#d9bf9c', HAIR = '#3d3933';
const L = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const head = (cx, cy, { band = null, topknot = true } = {}) => `
  ${topknot ? `<ellipse cx="${cx}" cy="${cy - 15}" rx="5" ry="4.5" fill="${HAIR}" ${L}/>` : ''}
  <path d="M${cx - 11} ${cy - 2} Q ${cx - 11} ${cy - 14} ${cx} ${cy - 14} Q ${cx + 11} ${cy - 14} ${cx + 11} ${cy - 2} Q ${cx + 11} ${cy + 12} ${cx} ${cy + 12} Q ${cx - 11} ${cy + 12} ${cx - 11} ${cy - 2} Z" fill="${SKIN}" ${L}/>
  <path d="M${cx - 11} ${cy - 3} Q ${cx} ${cy - 16} ${cx + 11} ${cy - 3} Q ${cx + 6} ${cy - 8} ${cx} ${cy - 8} Q ${cx - 6} ${cy - 8} ${cx - 11} ${cy - 3} Z" fill="${HAIR}" ${L}/>
  ${band ? `<path d="M${cx - 11} ${cy - 5} Q ${cx} ${cy - 9} ${cx + 11} ${cy - 5}" fill="none" stroke="${band}" stroke-width="4"/>` : ''}
  <path d="M${cx - 5} ${cy + 1} h2.5 M${cx + 3} ${cy + 1} h2.5" stroke="${INK}" stroke-width="2"/>
  <path d="M${cx - 2} ${cy + 7} Q ${cx} ${cy + 8} ${cx + 2} ${cy + 7}" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
const arm = (d, color, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (body, w = 120, h = 220) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${body}</svg>`;

export const PEOPLE_SVG = {
  // 목수: 흰 저고리, 갈색 바지에 행전, 머리띠, 어깨에 메는 망치(나무 자루)
  carpenter: svg(`
    <path d="M44 214 L48 150 L60 150 L58 214 Z" fill="#8a6a44" ${L}/><path d="M62 214 L60 150 L72 150 L76 214 Z" fill="#7a5c3a" ${L}/>
    <rect x="45" y="196" width="14" height="10" fill="#efe8d6" ${L}/><rect x="61" y="196" width="15" height="10" fill="#efe8d6" ${L}/>
    <path d="M36 152 Q 38 100 46 86 L 74 86 Q 82 100 84 152 Q 60 158 36 152 Z" fill="#efe8d6" ${L}/>
    <path d="M60 86 L 52 122 L 60 124" fill="none" ${L}/><path d="M48 128 Q 60 132 74 128" fill="none" stroke="#a8452c" stroke-width="3.2"/>
    ${arm("M74 92 Q 92 104 96 72", "#efe8d6", 9)}
    <path d="M96 74 L 104 40" stroke="#8a6a44" stroke-width="5" stroke-linecap="round"/><rect x="96" y="30" width="20" height="11" rx="2" fill="#aeaa9e" ${L}/>
    ${arm("M46 92 Q 34 116 42 136", "#efe8d6", 9)}
    <circle cx="42" cy="139" r="4.5" fill="${SKIN}" ${L}/>
    ${head(60, 66, { band: '#efe8d6' })}`),
  // 목수(나무 들고): 같은 옷, 새 기둥감을 어깨에 메고 온다
  carpenter2: svg(`
    <path d="M44 214 L48 150 L60 150 L58 214 Z" fill="#8a6a44" ${L}/><path d="M62 214 L60 150 L72 150 L76 214 Z" fill="#7a5c3a" ${L}/>
    <rect x="45" y="196" width="14" height="10" fill="#efe8d6" ${L}/><rect x="61" y="196" width="15" height="10" fill="#efe8d6" ${L}/>
    <path d="M36 152 Q 38 100 46 86 L 74 86 Q 82 100 84 152 Q 60 158 36 152 Z" fill="#e6dcc4" ${L}/>
    <path d="M60 86 L 52 122 L 60 124" fill="none" ${L}/><path d="M48 128 Q 60 132 74 128" fill="none" stroke="#3f7d6e" stroke-width="3.2"/>
    <rect x="6" y="72" width="108" height="11" rx="2" fill="#c99a62" ${L} transform="rotate(-8 60 78)"/>
    <path d="M30 86 l2 -4 M50 82 l2 -4 M80 77 l2 -4" stroke="#a87c48" stroke-width="1.5"/>
    ${head(60, 58, { band: '#efe8d6' })}`),
  // 백제군: 청동녹 비늘갑옷에 금동 테, 적갈 망토, 금동 장식 투구, 붉은 술 단 창, 원형 방패
  baekje: svg(`
    <path d="M100 214 L 100 20" stroke="#8a6a44" stroke-width="4" stroke-linecap="round"/><path d="M94 26 L100 6 L106 26 Z" fill="#c4c0b5" ${L}/><path d="M96 30 q4 10 8 0" fill="#a8452c" ${L}/>
    <path d="M30 160 Q 26 110 40 90 L 80 90 Q 94 110 90 160 Z" fill="#a8452c" ${L}/>
    <path d="M46 214 L48 156 L60 156 L58 214 Z" fill="#3d3933" ${L}/><path d="M62 214 L60 156 L72 156 L76 214 Z" fill="#2e2b27" ${L}/>
    <path d="M38 160 Q 40 104 48 90 L 72 90 Q 80 104 82 160 Q 60 166 38 160 Z" fill="#3f7d6e" ${L}/>
    ${[104, 116, 128, 140, 152].map(y => `<path d="M${40 + (y - 104) * 0.02} ${y} Q 60 ${y + 4} ${80} ${y}" fill="none" stroke="#2f5f54" stroke-width="1.6"/>`).join('')}
    <path d="M40 104 Q 60 108 80 104" fill="none" stroke="#c8a054" stroke-width="3"/><path d="M60 90 L 60 160" stroke="#2f5f54" stroke-width="1.6"/>
    <circle cx="32" cy="128" r="17" fill="#a8452c" ${L}/><circle cx="32" cy="128" r="7" fill="#c8a054" ${L}/>
    ${arm("M80 100 Q 94 108 98 120", "#3f7d6e", 8)}<circle cx="99" cy="122" r="4.5" fill="${SKIN}" ${L}/>
    ${head(60, 70, { topknot: false })}
    <path d="M46 66 Q 46 46 60 44 Q 74 46 74 66 L 70 62 Q 60 56 50 62 Z" fill="#2e2b27" ${L}/><path d="M60 44 L 60 30 M54 34 Q 60 26 66 34" fill="none" stroke="#c8a054" stroke-width="3"/>`),
  // 나당 연합군: 회갈색 비늘갑옷에 검붉은 테, 붉은 깃 꽂은 둥근 투구, 끝이 갈라진 창(극)
  enemy: svg(`
    <path d="M18 214 L 18 22" stroke="#6b5a44" stroke-width="4" stroke-linecap="round"/><path d="M12 30 L18 8 L24 30 Z" fill="#c4c0b5" ${L}/><path d="M18 34 L 30 30 L 28 40 Z" fill="#c4c0b5" ${L}/>
    <path d="M46 214 L48 156 L60 156 L58 214 Z" fill="#5b4a3a" ${L}/><path d="M62 214 L60 156 L72 156 L76 214 Z" fill="#4c3d30" ${L}/>
    <path d="M36 160 Q 38 104 46 90 L 74 90 Q 82 104 84 160 Q 60 166 36 160 Z" fill="#9a8f7c" ${L}/>
    ${[102, 114, 126, 138, 150].map(y => `<path d="M38 ${y} Q 60 ${y + 4} 82 ${y}" fill="none" stroke="#7d7364" stroke-width="1.6"/>`).join('')}
    <path d="M38 104 Q 60 108 82 104" fill="none" stroke="#7a3328" stroke-width="3"/><path d="M60 90 L 60 160" stroke="#7d7364" stroke-width="1.6"/>
    ${arm("M40 98 Q 26 110 22 124", "#9a8f7c", 8)}<circle cx="20" cy="126" r="4.5" fill="${SKIN}" ${L}/>
    ${head(60, 70, { topknot: false })}
    <path d="M45 66 Q 45 44 60 42 Q 75 44 75 66 Q 60 58 45 66 Z" fill="#6b5a44" ${L}/><path d="M60 42 Q 64 26 74 22" fill="none" stroke="#a8452c" stroke-width="4" stroke-linecap="round"/>`),
  // 당 장수 소정방: 짙은 남보라 관복, 검은 복두, 금동 띠, 손에 붓
  general: svg(`
    <path d="M32 214 Q 34 120 44 92 L 76 92 Q 86 120 88 214 Z" fill="#4e4a63" ${L}/>
    <path d="M60 92 L 48 132 L 60 134" fill="none" ${L}/><path d="M42 134 Q 60 140 78 134" fill="none" stroke="#c8a054" stroke-width="4"/>
    <path d="M44 214 L 46 180 M76 214 L 74 180" stroke="#3e3a52" stroke-width="1.6"/>
    ${arm("M76 98 Q 96 112 98 132", "#4e4a63", 12)}<circle cx="98" cy="136" r="5" fill="${SKIN}" ${L}/>
    <path d="M98 136 L 112 112" stroke="#8a6a44" stroke-width="3" stroke-linecap="round"/><path d="M112 112 l3 -6" stroke="${HAIR}" stroke-width="4" stroke-linecap="round"/>
    ${head(60, 70, { topknot: false })}
    <path d="M47 62 L 47 50 Q 60 42 73 50 L 73 62 Z" fill="#2e2b27" ${L}/><path d="M47 54 L 32 52 M73 54 L 88 52" stroke="#2e2b27" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M54 84 Q 60 90 66 84" fill="${HAIR}" ${L}/>`),
  // 백성: 흰 저고리와 갈색 바지, 바람에 옷자락이 날린다
  villager: svg(`
    <path d="M44 214 L48 150 L60 150 L58 214 Z" fill="#8d8270" ${L}/><path d="M62 214 L60 150 L72 150 L76 214 Z" fill="#7d7364" ${L}/>
    <path d="M36 152 Q 38 100 46 86 L 74 86 Q 82 100 84 152 L 104 146 L 96 158 Q 60 160 36 152 Z" fill="#e9e4d8" ${L}/>
    <path d="M60 86 L 52 122 L 60 124" fill="none" ${L}/><path d="M48 128 Q 60 132 74 128 L 96 124" fill="none" stroke="#3f7d6e" stroke-width="3"/>
    ${arm("M46 94 Q 30 84 34 64", "#e9e4d8", 9)}<circle cx="34" cy="62" r="4.5" fill="${SKIN}" ${L}/>
    ${head(60, 66, {})}`),
  // 백성(여인): 치마저고리, 머리에 수건
  villager2: svg(`
    <path d="M34 214 Q 38 150 48 126 L 72 126 Q 84 150 88 214 Z" fill="#a8452c" ${L}/>
    <path d="M42 136 Q 60 142 80 136" fill="none" stroke="#8e3a25" stroke-width="1.6"/>
    <path d="M42 130 Q 44 100 50 88 L 70 88 Q 76 100 78 130 Q 60 134 42 130 Z" fill="#e6dcc4" ${L}/>
    <path d="M60 92 L 66 110" stroke="#3f7d6e" stroke-width="3"/>
    ${arm("M76 96 Q 92 92 96 104", "#e6dcc4", 8)}<circle cx="97" cy="106" r="4" fill="${SKIN}" ${L}/>
    ${head(60, 68, { topknot: false })}
    <path d="M47 62 Q 60 48 73 62 Q 82 56 92 62 Q 80 68 73 66 Q 60 60 47 66 Z" fill="#efe8d6" ${L}/>`),
};
// 땅에 드리우는 그림자(인물이 떠 보이지 않게)
export const SHADOW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" width="200" height="60"><ellipse cx="50" cy="15" rx="46" ry="11" fill="#5f5b52" opacity=".35"/></svg>`;
