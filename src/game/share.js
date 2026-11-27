// 공유 카드(SNS 인증샷) · 2026-11-28 새 디자인: "석공 네컷"
// 1080×1920(인스타그램 스토리 9:16, 카카오톡에서도 그대로 보임) PNG를 캔버스로 그린다.
// 연한 아이스 블루 바탕 + 큰 햇수 + 네컷 사진관 틀(남색, 살짝 기울고 마스킹 테이프) + 컷마다 다른 자세의 꼬마 석공 스티커(흰 칼선)
// + 말풍선·반짝이 스티커 + 아래 티켓(재해·세기·1,400년까지, QR로 게임 주소).
// 공유: 휴대폰은 Web Share API(파일 공유)로 시스템 공유 창을 열어 카카오톡·인스타그램을 고른다.
// 파일 공유를 못 하는 브라우저(대부분의 PC)는 이미지를 내려받고 게임 주소를 복사한다.
// 카카오톡 전용 공유(카카오 JavaScript SDK)는 앱 키와 도메인 등록이 필요해 아직 넣지 않았다.
import qrcode from 'qrcode-generator';
import { NPC } from './npc.js';
async function fontReady(font, text) { try { if (document.fonts) { await document.fonts.load(font, text); await document.fonts.ready; } } catch { /* 글꼴 없음 */ } }

export const W = 1080, H = 1920;
export const GAME_URL = 'https://bery12345ray-cmd.github.io/baekje-joint-physics/';
const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
const NAVY = '#0f1c23', SEC = '#396b86', ICE = '#cbe1ee', FILM = '#ff8a3d', YEL = '#ffd34d';
const imgCache = {};
const load = src => imgCache[src] ||= new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
const rad = d => d * Math.PI / 180;
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
// 컷마다 꼬마 석공 자세: 1 정면(가리킴) · 2 만세 · 3 놀람 · 4 거울 뒤집어 가리킴
const POSES = [
  { pose: 'guide', side: 'left', h: 0.7, flip: false, tag: '#정면샷', rot: -4 },
  { pose: 'celebrate', side: 'right', h: 0.7, flip: false, tag: '#만세', rot: 3 },
  { pose: 'panic', side: 'left', h: 0.6, flip: false, tag: '#흔들흔들', rot: 4 },
  { pose: 'guide', side: 'right', h: 0.68, flip: true, tag: '#꼭대기뷰', rot: -3 },
];
// 흰 칼선 스티커: 그림 둘레를 outline만큼 부풀린 흰 실루엣 위에 그림
function sticker(im, h, outline, flip) {
  const w = Math.round(h * im.width / im.height), p = outline + 2, c = document.createElement('canvas');
  c.width = w + p * 2; c.height = h + p * 2;
  const g = c.getContext('2d');
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; g.drawImage(im, p + Math.cos(t) * outline, p + Math.sin(t) * outline, w, h); }
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(-c.width, 0, c.width * 3, c.height);
  g.globalCompositeOperation = 'source-over'; g.drawImage(im, p, p, w, h);
  return c;
}
// 반짝이(네 갈래 별)
function sparkle(g, x, y, r, color) {
  g.save(); g.fillStyle = color; g.beginPath(); g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
  g.fill(); g.restore();
}
// 말풍선 스티커
function bubble(g, x, y, text, rot, tail) {
  g.save(); g.translate(x, y); g.rotate(rad(rot));
  g.font = `800 30px ${FONT}`; const tw = g.measureText(text).width, w = tw + 44, h = 60;
  g.shadowColor = 'rgba(8,20,28,.25)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
  g.fillStyle = '#fff'; rr(g, -w / 2, -h / 2, w, h, 30); g.fill();
  g.beginPath(); const tx = tail === 'left' ? -w / 2 + 34 : w / 2 - 34; g.moveTo(tx - 12, h / 2 - 2); g.lineTo(tx + (tail === 'left' ? -14 : 14), h / 2 + 18); g.lineTo(tx + 12, h / 2 - 2); g.fill();
  g.shadowColor = 'transparent'; g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 2);
  g.restore();
}
// 이름표 스티커(해시태그)
function label(g, x, y, text, rot, align) {
  g.save(); g.font = `800 24px ${FONT}`; const w = g.measureText(text).width + 30, h = 44;
  g.translate(align === 'right' ? x - w / 2 : x + w / 2, y + h / 2); g.rotate(rad(rot));
  g.shadowColor = 'rgba(8,20,28,.22)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  g.fillStyle = '#fff'; rr(g, -w / 2, -h / 2, w, h, 12); g.fill();
  g.shadowColor = 'transparent'; g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 1);
  g.restore();
}
// 마스킹 테이프
function tape(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rad(rot));
  g.fillStyle = 'rgba(236,244,248,.78)'; g.shadowColor = 'rgba(8,20,28,.12)'; g.shadowBlur = 6; g.fillRect(-82, -22, 164, 44);
  g.shadowColor = 'transparent'; g.fillStyle = 'rgba(107,162,192,.22)';
  for (let i = -82; i < 82; i += 18) g.fillRect(i, -22, 8, 44);
  g.restore();
}
function grain(g) {
  const n = document.createElement('canvas'); n.width = n.height = 160;
  const ng = n.getContext('2d'), d = ng.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; }
  ng.putImageData(d, 0, 0); g.save(); g.fillStyle = g.createPattern(n, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
}
function qr(g, x, y, size, text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = size / n;
  g.fillStyle = NAVY;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(Math.floor(x + c * m), Math.floor(y + r * m), Math.ceil(m), Math.ceil(m));
}

// data: { shots: [canvas×4], years, score, disName, stageName, levelName, collapsed }
export async function makeCard(data) {
  const yrs = `${data.years.toLocaleString('ko-KR')}년`, lv = (data.levelName || '').match(/^(LV\.\d+)\s*(.*)$/);
  const kick = `${data.stageName} · ${data.disName} 세기 ${data.score.toFixed(2)}`, say2 = data.collapsed ? '다시 쌓자!' : '끄떡없다!', say3 = '어이쿠!';
  const d = new Date(), ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const pct = Math.max(0, Math.min(100, Math.round(data.years / 14)));
  const all = `석공 : 1400 AI + HERITAGE SEOKGONG 4-CUT BUILD REPORT ${yrs}을 버텼어요 ${kick} ${data.levelName || ''} ${POSES.map(p => p.tag).join('')} ${say2}${say3} 재해 세기 1,400년까지 나도 쌓아 보기 ${ds} 0123456789.%' ${GAME_URL}`;
  await Promise.all([900, 800, 700, 600].map(w => fontReady(`${w} 40px ${FONT}`, all)));
  const imgs = await Promise.all(POSES.map(p => load(NPC[p.pose]).catch(() => null)));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.textBaseline = 'alphabetic';
  // 바탕: 아이스 블루 → 따뜻한 미색 + 부드러운 빛 + 필름 낟알
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#d9e9f2'); bg.addColorStop(0.55, '#e8eff2'); bg.addColorStop(1, '#f3eee4');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (const [x, y, r, col] of [[W * 0.95, 230, 420, 'rgba(107,162,192,.30)'], [40, 1060, 460, 'rgba(255,255,255,.75)'], [W * 0.85, 1760, 420, 'rgba(255,205,140,.22)']]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  grain(g);
  // 머리: 상표 + 날짜 알약
  g.fillStyle = NAVY; g.font = `800 42px ${FONT}`; g.fillText('석공 : 1400', 64, 118);
  const bw = g.measureText('석공 : 1400').width;
  g.font = `700 15px ${FONT}`; g.letterSpacing = '6px'; g.fillStyle = SEC; g.fillText('AI + HERITAGE', 64 + bw + 22, 112); g.letterSpacing = '0px';
  g.font = `700 22px ${FONT}`; const dw = g.measureText(ds).width + 40;
  g.fillStyle = NAVY; rr(g, W - 64 - dw, 80, dw, 48, 24); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(ds, W - 64 - dw / 2, 112); g.textAlign = 'left';
  // 큰 햇수
  g.fillStyle = SEC; g.font = `700 30px ${FONT}`; g.fillText(kick, 64, 234);
  let big = 176;
  const fit = () => { g.font = `900 ${big}px ${FONT}`; g.letterSpacing = `${-big / 30}px`; const a = g.measureText(yrs).width; g.letterSpacing = '0px'; g.font = `800 ${big * 0.31}px ${FONT}`; return a + 14 + g.measureText('을 버텼어요').width; };
  while (fit() > W - 128 && big > 100) big -= 6;
  g.fillStyle = NAVY; g.font = `900 ${big}px ${FONT}`; g.letterSpacing = `${-big / 30}px`; g.fillText(yrs, 58, 406);
  const yw = g.measureText(yrs).width; g.letterSpacing = '0px';
  g.font = `800 ${big * 0.31}px ${FONT}`; g.fillText('을 버텼어요', 58 + yw + 14, 402);
  sparkle(g, W - 92, 214, 26, '#fff'); sparkle(g, W - 140, 270, 13, ICE);

  // 네컷 사진관 틀
  const FX = 64, FY = 456, FW = 952, PAD = 20, GAP = 14, PW = (FW - PAD * 2 - GAP) / 2, PH = 490, FOOT = 80, FH = PAD + PH * 2 + GAP + FOOT;
  g.save(); g.translate(FX + FW / 2, FY + FH / 2); g.rotate(rad(-1.2)); g.translate(-(FX + FW / 2), -(FY + FH / 2));
  g.save(); g.shadowColor = 'rgba(8,20,28,.32)'; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fillStyle = NAVY; rr(g, FX, FY, FW, FH, 34); g.fill(); g.restore();
  const yy = `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`;
  for (let i = 0; i < 4; i++) {
    const px = FX + PAD + (i % 2) * (PW + GAP), py = FY + PAD + Math.floor(i / 2) * (PH + GAP), P = POSES[i], shot = data.shots[i], im = imgs[i];
    g.save(); rr(g, px, py, PW, PH, 18); g.clip();
    const sky = g.createLinearGradient(0, py, 0, py + PH); sky.addColorStop(0, '#cfe0ea'); sky.addColorStop(1, '#e9e4d6'); g.fillStyle = sky; g.fillRect(px, py, PW, PH);
    if (shot) { const s = Math.max(PW / shot.width, PH / shot.height), sw = shot.width * s, sh = shot.height * s; g.drawImage(shot, px + (PW - sw) / 2, py + (PH - sh) / 2, sw, sh); }
    // 아래로 살짝 어둡게(스티커·날짜가 잘 보이게)
    const vg = g.createLinearGradient(0, py + PH * 0.55, 0, py + PH); vg.addColorStop(0, 'rgba(15,28,35,0)'); vg.addColorStop(1, 'rgba(15,28,35,.22)'); g.fillStyle = vg; g.fillRect(px, py, PW, PH);
    if (im) {
      const st = sticker(im, Math.round(PH * P.h), 7, P.flip), sx = P.side === 'left' ? px - 4 : px + PW - st.width + 4, sy = py + PH - st.height + 6;
      g.save(); g.fillStyle = 'rgba(10,20,26,.30)'; g.beginPath(); g.ellipse(sx + st.width / 2, py + PH - 8, st.width * 0.36, 11, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(8,20,28,.35)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.drawImage(st, sx, sy); g.restore();
    }
    // 필름 카메라 날짜 도장
    g.save(); g.font = `700 26px ${FONT}`; g.fillStyle = FILM; g.shadowColor = 'rgba(255,120,40,.75)'; g.shadowBlur = 8;
    g.textAlign = P.side === 'left' ? 'right' : 'left'; g.fillText(yy, P.side === 'left' ? px + PW - 18 : px + 18, py + PH - 20); g.restore();
    g.restore();
    if (P.side === 'left') label(g, px + PW - 14, py + 16, P.tag, P.rot, 'right'); else label(g, px + 14, py + 16, P.tag, P.rot, 'left');
    if (i === 1) { bubble(g, px + PW * 0.36, py + PH * 0.3, say2, -5, 'right'); sparkle(g, px + PW - 36, py + 88, 20, YEL); sparkle(g, px + PW - 70, py + 128, 11, '#fff'); sparkle(g, px + PW * 0.58, py + PH * 0.46, 14, YEL); }
    if (i === 2) bubble(g, px + PW * 0.66, py + PH * 0.34, say3, 5, 'left');
  }
  // 틀 아래 글자(사진관 인화지 느낌)
  const fy = FY + PAD + PH * 2 + GAP + FOOT / 2 + 8;
  g.fillStyle = '#fff'; g.font = `800 22px ${FONT}`; g.letterSpacing = '7px'; g.fillText('SEOKGONG 4-CUT', FX + 30, fy); g.letterSpacing = '0px';
  for (let k = 0; k < 3; k++) { g.fillStyle = k === 0 ? '#fff' : 'rgba(203,225,238,.45)'; g.beginPath(); g.arc(FX + FW / 2 - 18 + k * 18, fy - 8, 4.5, 0, Math.PI * 2); g.fill(); }
  g.restore();
  tape(g, FX + 26, FY + 10, -38); tape(g, FX + FW - 30, FY + FH - 16, -36);
  // 칭호 도장 스티커(틀 오른쪽 위)
  if (lv) {
    g.save(); g.translate(FX + FW - 62, FY + 6); g.rotate(rad(12));
    g.shadowColor = 'rgba(8,20,28,.3)'; g.shadowBlur = 16; g.shadowOffsetY = 6; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'transparent'; g.fillStyle = YEL; g.beginPath(); g.arc(0, 0, 84, 0, Math.PI * 2); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 2.5; g.setLineDash([5, 6]); g.beginPath(); g.arc(0, 0, 72, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = NAVY; g.textAlign = 'center'; g.font = `900 40px ${FONT}`; g.fillText(lv[1], 0, 6);
    g.font = `800 21px ${FONT}`; g.fillText(lv[2], 0, 38); g.font = `700 13px ${FONT}`; g.letterSpacing = '4px'; g.fillText('TITLE', 2, -36); g.letterSpacing = '0px';
    g.restore();
  }

  // 티켓: 재해 · 세기 · 1,400년까지 + QR
  const TW = 952, TH = 214, TX = 64, TY = FY + FH + 46, SX = 700;
  const t = document.createElement('canvas'); t.width = TW; t.height = TH; const tg = t.getContext('2d');
  tg.fillStyle = '#fff'; rr(tg, 0, 0, TW, TH, 26); tg.fill();
  tg.globalCompositeOperation = 'destination-out'; for (const yv of [0, TH]) { tg.beginPath(); tg.arc(SX, yv, 18, 0, Math.PI * 2); tg.fill(); } tg.globalCompositeOperation = 'source-over';
  tg.strokeStyle = '#c8d6de'; tg.lineWidth = 3; tg.setLineDash([10, 9]); tg.beginPath(); tg.moveTo(SX, 30); tg.lineTo(SX, TH - 30); tg.stroke(); tg.setLineDash([]);
  tg.textBaseline = 'alphabetic'; tg.fillStyle = SEC; tg.font = `700 15px ${FONT}`; tg.letterSpacing = '5px'; tg.fillText('BUILD REPORT', 36, 46); tg.letterSpacing = '0px';
  const cols = [['재해', data.disName], ['세기', data.score.toFixed(2)], ['1,400년까지', `${pct}%`]];
  cols.forEach(([k, v], j) => { const x = 36 + j * 216; tg.fillStyle = '#6a7b85'; tg.font = `600 19px ${FONT}`; tg.fillText(k, x, 90); tg.fillStyle = NAVY; tg.font = `800 46px ${FONT}`; tg.fillText(v, x, 142); });
  tg.fillStyle = '#e3ebf0'; rr(tg, 36, 166, SX - 72, 12, 6); tg.fill();
  const bar = tg.createLinearGradient(36, 0, SX - 36, 0); bar.addColorStop(0, SEC); bar.addColorStop(1, '#6ba2c0');
  if (pct > 0) { tg.fillStyle = bar; rr(tg, 36, 166, Math.max(12, (SX - 72) * pct / 100), 12, 6); tg.fill(); }
  qr(tg, SX + (TW - SX - 124) / 2, 24, 124, GAME_URL);
  tg.fillStyle = NAVY; tg.font = `800 19px ${FONT}`; tg.textAlign = 'center'; tg.fillText('나도 쌓아 보기', SX + (TW - SX) / 2, 186);
  g.save(); g.translate(TX + TW / 2, TY + TH / 2); g.rotate(rad(0.8)); g.shadowColor = 'rgba(8,20,28,.18)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.drawImage(t, -TW / 2, -TH / 2); g.restore();
  // 아래 주소
  g.fillStyle = 'rgba(15,28,35,.55)'; g.font = `600 21px ${FONT}`; g.textAlign = 'center'; g.fillText(GAME_URL.replace('https://', '').replace(/\/$/, ''), W / 2, H - 50); g.textAlign = 'left';
  return c;
}

const toBlob = c => new Promise(ok => c.toBlob(ok, 'image/png'));
function download(blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'seokgong-1400.png';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function copyLink() { try { await navigator.clipboard.writeText(GAME_URL); return true; } catch { return false; } }
// app: 'kakao' | 'insta' | 'save'. 반환값: 화면에 보일 한 줄
export async function shareCard(blob, app, text) {
  const file = new File([blob], 'seokgong-1400.png', { type: 'image/png' });
  if (app !== 'save' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: '석공 : 1400', text: `${text}\n${GAME_URL}` }); return app === 'insta' ? '공유 창에서 인스타그램을 골라 스토리나 피드에 올려 보세요.' : '공유 창에서 카카오톡을 골라 친구에게 보내 보세요.'; }
    catch (e) { if (e && e.name === 'AbortError') return ''; }
  }
  download(blob);
  if (app === 'save') return '인증샷 이미지를 저장했어요.';
  const ok = await copyLink();
  return app === 'insta' ? `이 브라우저는 바로 공유를 못 해서 이미지를 저장했어요. 인스타그램에 이미지를 올려 주세요${ok ? '(게임 주소도 복사했어요)' : ''}.`
    : `이 브라우저는 바로 공유를 못 해서 이미지를 저장하고${ok ? ' 게임 주소를 복사했어요' : ''}. 카카오톡 대화방에 붙여 넣어 보내 주세요.`;
}
export { toBlob };
