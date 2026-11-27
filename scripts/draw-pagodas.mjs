// 실제 탑 일러스트를 다시 그린다: node scripts/draw-pagodas.mjs public
// 탑마다 실물 사진에서 가장 눈에 띄는 특징(비례, 기단, 지붕돌 두께, 돌 색, 짝을 이룬 탑, 목탑의 칸 수와 지붕)을 살려 그린다.
import fs from 'node:fs';
const out = process.argv[2];
const INK = '#5f5b52', W = 400, H = 300, cx = 200, GROUND = 272;
const f = n => +n.toFixed(1);
const RIDGE = {
  plain: 'M0 214 C 40 170 70 168 104 190 C 130 150 168 150 196 186 C 230 146 276 140 306 180 C 336 156 372 160 400 186',
  peaks: 'M0 214 L40 150 L70 190 L110 120 L150 186 L190 140 L240 196 L290 110 L330 176 L372 132 L400 170', // 계룡산
  sokri: 'M0 210 L30 168 L52 186 L84 128 L104 160 L126 118 L150 172 L200 150 L236 102 L262 150 L300 124 L336 170 L370 120 L400 160', // 속리산
};
const bg = (v = 'plain') => `
<rect width="${W}" height="${H}" fill="#e9e4d8"/>
<circle cx="318" cy="64" r="22" fill="#efe2c2" stroke="#d9c79c" stroke-width="1.5"/>
<path d="${RIDGE[v]} L400 ${GROUND} L0 ${GROUND} Z" fill="#cfd3c1" stroke="#a9b09b" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M0 236 C 50 206 96 210 130 230 C 170 206 220 204 260 228 C 300 210 350 208 400 226 L400 ${GROUND} L0 ${GROUND} Z" fill="#bcc5ae" stroke="#97a28a" stroke-width="1.2"/>
<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#d8cfb9"/>
<line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="${INK}" stroke-width="1.5"/>
${Array.from({ length: 14 }, (_, i) => `<circle cx="${12 + i * 29}" cy="${GROUND + 14 + (i % 3) * 4}" r="1.6" fill="#b2a88f"/>`).join('')}`;
const grp = (body, s = 1, dx = 0) => `<g transform="translate(${cx + dx} ${GROUND}) scale(${s}) translate(${-cx} ${-GROUND})">${body}</g>`;
const write = (file, title, groups, v = 'plain') => fs.writeFileSync(`${out}/${file}`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}"><title>${title}</title>${bg(v)}${groups}</svg>\n`);
// 지붕돌/지붕: 아래 처마선 w, 윗면 wt, 두께 t, 끝 반전 lift
const roof = (y, w, wt, t, lift, fill) => {
  const L = cx - w / 2, R = cx + w / 2;
  return `<path d="M${f(L)} ${f(y - lift)} Q ${f(L + w * 0.18)} ${f(y)} ${cx} ${f(y)} Q ${f(R - w * 0.18)} ${f(y)} ${f(R)} ${f(y - lift)} L ${f(R - 3)} ${f(y - lift - 4)} Q ${f(R - w * 0.2)} ${f(y - 4)} ${f(cx + wt / 2)} ${f(y - t)} L ${f(cx - wt / 2)} ${f(y - t)} Q ${f(L + w * 0.2)} ${f(y - 4)} ${f(L + 3)} ${f(y - lift - 4)} Z" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
};
const rect = (x, y, w, h, fill, sw = 1.5) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;

// ---------- 석탑 몸체 ----------
function stone({ stories, roofs, base = [156, 132], lift = 4, bokbal = true, S = '#c4c0b5', steps = 0, rt = 9, stain = false }) {
  const S2 = '#aeaa9e', S3 = '#b9b5a9'; let y = GROUND, b = '';
  b += rect(cx - base[0] / 2, y - 9, base[0], 9, S2); y -= 9;          // 지대석
  for (let t = 0; t < steps; t++) { const sw = base[0] - 12 - t * 10; b += `<rect x="${f(cx - sw / 2)}" y="${y - 8}" width="${sw}" height="8" rx="3.5" fill="${S}" stroke="${INK}" stroke-width="1.4"/>`; y -= 8; } // 둥글게 다듬은 두툼한 층단
  b += rect(cx - base[1] / 2, y - 15, base[1], 15, S); y -= 15;        // 기단 면석
  for (const x of [-base[1] / 2, -base[1] / 6, base[1] / 6, base[1] / 2]) b += `<line x1="${f(cx + x)}" y1="${y}" x2="${f(cx + x)}" y2="${y + 15}" stroke="${INK}" stroke-width="1.1"/>`;
  b += rect(cx - base[1] / 2 - 4, y - 5, base[1] + 8, 5, S2); y -= 5;  // 갑석
  b += rect(cx - stories[0][0] * 0.58, y - 3, stories[0][0] * 1.16, 3, S3); y -= 3;
  stories.forEach(([w, h], i) => {
    const top = w - 4;
    b += `<path d="M${f(cx - w / 2)} ${y} L ${f(cx - top / 2)} ${f(y - h)} L ${f(cx + top / 2)} ${f(y - h)} L ${f(cx + w / 2)} ${y} Z" fill="${S}" stroke="${INK}" stroke-width="1.5"/>`;
    b += `<path d="M${f(cx + w / 2 - 8)} ${y} L ${f(cx + top / 2 - 7)} ${f(y - h)} L ${f(cx + top / 2)} ${f(y - h)} L ${f(cx + w / 2)} ${y} Z" fill="#6b6455" opacity=".18"/>`;
    for (const k of [-1, 1]) b += `<line x1="${f(cx + k * (w / 2 - 6))}" y1="${y}" x2="${f(cx + k * (top / 2 - 5.5))}" y2="${f(y - h)}" stroke="${INK}" stroke-width="1.1"/>`;
    if (i === 0) b += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${f(y - h)}" stroke="${INK}" stroke-width="0.8" opacity=".7"/>`;
    y -= h;
    b += rect(cx - (top + 8) / 2, y - 3.5, top + 8, 3.5, S3, 1.2); y -= 3.5;
    b += rect(cx - (top + 18) / 2, y - 3.5, top + 18, 3.5, S3, 1.2); y -= 3.5;
    b += roof(y + 2, roofs[i], top * 0.78, rt, lift, S);
    if (stain) b += `<path d="M${f(cx - roofs[i] * 0.3)} ${f(y - 1)} l5 9 M${f(cx + roofs[i] * 0.24)} ${f(y - 1)} l-4 11" stroke="#7d705d" stroke-width="2" opacity=".45"/>`;
    y -= rt - 2;
  });
  const nw = stories[stories.length - 1][0] * 0.72;
  b += rect(cx - nw / 2, y - 10, nw, 10, S); y -= 10;
  if (bokbal) b += `<path d="M${cx - 12} ${y} Q ${cx} ${y - 14} ${cx + 12} ${y} Z" fill="${S}" stroke="${INK}" stroke-width="1.4"/>`;
  return b;
}

// ---------- 목탑 몸체(능사 재현) ----------
function wood({ bodies, eave = 62, pole = 58 }) {
  let y = GROUND, b = '';
  const bw = bodies[0][0] + 80;
  b += rect(cx - bw / 2, y - 8, bw, 8, '#aeaa9e'); y -= 8;
  b += rect(cx - bw / 2 + 8, y - 12, bw - 16, 12, '#c4c0b5'); y -= 12;
  b += rect(cx - 14, y + 2, 28, 18, '#bdb9ad', 1.2);
  bodies.forEach(([w, h], i) => {
    if (i > 0) { b += rect(cx - w / 2 - 6, y - 4, w + 12, 4, '#7a4a2c', 1.2); for (let x = -w / 2 - 4; x <= w / 2 + 4; x += 6) b += `<line x1="${f(cx + x)}" y1="${y - 4}" x2="${f(cx + x)}" y2="${y - 9}" stroke="#7a4a2c" stroke-width="1.2"/>`; b += `<line x1="${cx - w / 2 - 6}" y1="${y - 9}" x2="${cx + w / 2 + 6}" y2="${y - 9}" stroke="#7a4a2c" stroke-width="1.4"/>`; y -= 4; }
    b += rect(cx - w / 2, y - h, w, h, '#efe8d6');
    for (let k = 0; k <= 4; k++) { const x = cx - w / 2 + (w / 4) * k; b += `<rect x="${f(x - 2.5)}" y="${f(y - h)}" width="5" height="${h}" fill="#a8452c" stroke="${INK}" stroke-width=".8"/>`; }
    b += `<rect x="${f(cx - w / 8 + 1)}" y="${f(y - h * 0.72)}" width="${f(w / 4 - 2)}" height="${f(h * 0.72)}" fill="#8a5a36" stroke="${INK}" stroke-width=".8"/>`;
    y -= h;
    b += rect(cx - w / 2 - 4, y - 5, w + 8, 5, '#3f7d6e', 1.1);
    for (let x = -w / 2; x <= w / 2; x += 8) b += `<rect x="${f(cx + x - 1.5)}" y="${y - 5}" width="3" height="5" fill="#e0bf6a"/>`;
    y -= 5;
    const R = w + eave - i * 4; b += roof(y + 1, R, w * 0.6, 16, 11, '#4d4a44');
    b += `<path d="M${f(cx - R / 2 + 8)} ${f(y - 2)} Q ${cx} ${f(y + 1)} ${f(cx + R / 2 - 8)} ${f(y - 2)}" fill="none" stroke="#8d897e" stroke-width="1"/>`;
    y -= 12;
  });
  b += rect(cx - 10, y - 6, 20, 6, '#4d4a44', 1.2); y -= 6;
  b += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y - pole}" stroke="#8a6a24" stroke-width="3"/>`;
  for (let k = 0; k < 9; k++) { const yy = y - 6 - k * (pole - 18) / 9, rw = 11 - k * 0.5; b += `<ellipse cx="${cx}" cy="${f(yy)}" rx="${f(rw)}" ry="1.6" fill="#e0bf6a" stroke="#8a6a24" stroke-width=".9"/>`; }
  b += `<path d="M${cx - 8} ${y - pole + 10} Q ${cx} ${y - pole + 2} ${cx + 8} ${y - pole + 10} Q ${cx} ${y - pole + 14} ${cx - 8} ${y - pole + 10} Z" fill="#e0bf6a" stroke="#8a6a24" stroke-width="1"/>`;
  b += `<circle cx="${cx}" cy="${y - pole - 3}" r="3.2" fill="#e0bf6a" stroke="#8a6a24" stroke-width="1"/>`;
  return b;
}

// ---------- 팔상전 몸체 ----------
function palsang() {
  let y = GROUND, b = '';
  b += rect(cx - 104, y - 7, 208, 7, '#aeaa9e'); y -= 7;
  b += rect(cx - 96, y - 10, 192, 10, '#c4c0b5'); y -= 10;
  for (let k = 0; k < 3; k++) b += rect(cx - 18 + k * 2, y + 10 - (k + 1) * 3.4, 36 - k * 4, 3.4, '#bdb9ad', 1); // 돌계단
  const floors = [[148, 30, 5], [134, 20, 5], [100, 19, 3], [88, 17, 3], [60, 16, 2]];
  floors.forEach(([w, h, n], i) => {
    b += rect(cx - w / 2, y - h, w, h, '#e9dcc0');
    for (let k = 0; k < n; k++) { const x = cx - w / 2 + (w / n) * k + 5; b += `<rect x="${f(x)}" y="${f(y - h + 4)}" width="${f(w / n - 10)}" height="${f(h * 0.55)}" fill="#5f8f7d" stroke="${INK}" stroke-width=".6"/>`; } // 녹색 창호
    for (let k = 0; k <= n; k++) { const x = cx - w / 2 + (w / n) * k; b += `<rect x="${f(x - 2.5)}" y="${f(y - h)}" width="5" height="${h}" fill="#8e4a32" stroke="${INK}" stroke-width=".8"/>`; }
    y -= h;
    b += rect(cx - w / 2 - 6, y - 6, w + 12, 6, '#3f7d6e', 1.1);
    for (let x = -w / 2; x <= w / 2; x += 7) b += `<rect x="${f(cx + x - 1.5)}" y="${y - 6}" width="3" height="6" fill="#d9b45a"/>`;
    for (let x = -w / 2 + 3.5; x <= w / 2; x += 7) b += `<rect x="${f(cx + x - 1)}" y="${y - 6}" width="2" height="6" fill="#b94c33"/>`;
    y -= 6;
    const R = w + 70;
    if (i < floors.length - 1) { b += roof(y + 1, R, w * 0.68, 14, 12, '#3b3934'); y -= 11; }
    else { // 사모지붕: 꼭짓점 하나로 모인다
      b += `<path d="M${f(cx - R / 2)} ${f(y - 12)} Q ${f(cx - R * 0.3)} ${f(y + 1)} ${cx} ${f(y + 1)} Q ${f(cx + R * 0.3)} ${f(y + 1)} ${f(cx + R / 2)} ${f(y - 12)} L ${cx} ${f(y - 42)} Z" fill="#3b3934" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
      b += `<path d="M${cx} ${f(y - 42)} L ${cx} ${f(y + 1)}" stroke="#6b675e" stroke-width="1"/>`;
      y -= 42;
    }
  });
  b += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y - 26}" stroke="#8a6a24" stroke-width="2.6"/>`;
  for (let k = 0; k < 5; k++) b += `<ellipse cx="${cx}" cy="${f(y - 5 - k * 3.6)}" rx="${f(7 - k * 0.6)}" ry="1.4" fill="#e0bf6a" stroke="#8a6a24" stroke-width=".8"/>`;
  b += `<circle cx="${cx}" cy="${y - 28}" r="3" fill="#e0bf6a" stroke="#8a6a24" stroke-width="1"/>`;
  return b;
}

// 부여 정림사지 오층석탑(백제): 높은 1층 몸돌, 얇고 넓은 지붕돌, 완만한 체감, 밝은 화강암
write('pagoda-jeongnimsa.svg', '부여 정림사지 오층석탑 일러스트', grp(stone({ stories: [[86, 50], [62, 16], [56, 14.5], [50, 13], [44, 12]], roofs: [156, 128, 116, 104, 92] }), 1.12));
// 부여 무량사 오층석탑(고려 전기, 백제계): 둥근 층단을 둔 두툼한 기단, 낮은 몸돌, 두껍고 넓으며 수평으로 뻗다 끝만 살짝 들린 지붕돌, 세월에 바랜 갈색 돌
write('pagoda-muryangsa.svg', '부여 무량사 오층석탑 일러스트', grp(stone({ stories: [[78, 26], [68, 14], [60, 13], [52, 12], [44, 11]], roofs: [176, 156, 138, 120, 102], base: [176, 146], steps: 3, rt: 13, lift: 2.5, S: '#c3b59f', stain: true }), 1.04));
// 공주 청량사지 남매탑(고려, 백제계): 정림사지를 본뜬 오층석탑과 미륵사지를 본뜬 칠층석탑이 계룡산 중턱에 나란히, 담홍색 화강암
{
  const S = '#cdb1a0';
  const five = stone({ stories: [[62, 34], [48, 12], [43, 11], [38, 10], [33, 9]], roofs: [112, 94, 84, 74, 64], base: [112, 94], S });
  const seven = stone({ stories: [[56, 30], [46, 10], [42, 9.5], [38, 9], [34, 8.5], [30, 8], [27, 7.5]], roofs: [102, 88, 80, 72, 64, 57, 51], base: [104, 86], S, rt: 8 });
  write('pagoda-cheongnyangsa.svg', '공주 청량사지 남매탑(오층·칠층석탑) 일러스트', grp(five, 0.95, -82) + grp(seven, 0.95, 78), 'peaks');
}
// 능사 오층목탑(백제문화단지 재현): 붉은 기둥과 흰 벽, 녹색 공포, 높은 금동 상륜
write('pagoda-neungsa.svg', '능사 오층목탑(재현) 일러스트', grp(wood({ bodies: [[96, 34], [84, 24], [74, 22], [64, 20], [54, 18]] }), 0.84));
// 보은 법주사 팔상전(조선, 유일한 오층 목탑): 넓고 낮은 기단과 돌계단, 1·2층 5칸 → 3·4층 3칸 → 5층 2칸, 먹빛 큰 처마와 녹색 단청, 사모지붕과 짧은 상륜, 속리산
write('pagoda-palsangjeon.svg', '보은 법주사 팔상전 일러스트', grp(palsang(), 0.98), 'sokri');
console.log('ok');
