// 공유 카드(SNS 인증샷): 내가 쌓은 탑의 정면샷 네 컷 + 컷마다 다른 자세로 함께 찍힌 꼬마 석공 + 버틴 햇수.
// 1080×1350(인스타그램 피드 4:5, 카카오톡에서도 그대로 보임) PNG를 캔버스로 그린다.
// 공유: 휴대폰은 Web Share API(파일 공유)로 시스템 공유 창을 열어 카카오톡·인스타그램을 고른다.
// 파일 공유를 못 하는 브라우저(대부분의 PC)는 이미지를 내려받고 게임 주소를 복사한다.
// 카카오톡 전용 공유(카카오 JavaScript SDK)는 앱 키와 도메인 등록이 필요해 아직 넣지 않았다.
import { NPC } from './npc.js';
async function fontReady(font, text) { try { if (document.fonts) { await document.fonts.load(font, text); await document.fonts.ready; } } catch { /* 글꼴 없음 */ } }

export const W = 1080, H = 1350;
export const GAME_URL = 'https://bery12345ray-cmd.github.io/baekje-joint-physics/';
const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
const imgCache = {};
const load = src => imgCache[src] ||= new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
// 컷마다 꼬마 석공 자세와 자리: 1 정면(손으로 탑을 가리킴) · 2 올려다본 컷(만세) · 3 비스듬히(놀람) · 4 꼭대기 가까이(거울 뒤집어 가리킴)
const POSES = [
  { pose: 'guide', side: 'left', h: 0.62, flip: false, tag: '#정면' },
  { pose: 'celebrate', side: 'right', h: 0.6, flip: false, tag: '#만세' },
  { pose: 'panic', side: 'left', h: 0.54, flip: false, tag: '#흔들흔들' },
  { pose: 'guide', side: 'right', h: 0.6, flip: true, tag: '#꼭대기' },
];

// data: { shots: [canvas×4], years, score, disName, stageName, levelName, collapsed }
export async function makeCard(data) {
  await fontReady(`800 64px ${FONT}`, '석공이탑은년을버텼습니다0123456789');
  const imgs = await Promise.all(POSES.map(p => load(NPC[p.pose]).catch(() => null)));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 바탕: 남색 그라디언트 + 은은한 빛
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0a1319'); bg.addColorStop(0.55, '#10232d'); bg.addColorStop(1, '#1b3d4f');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.5, H * 0.5, 50, W * 0.5, H * 0.5, W * 0.8); glow.addColorStop(0, 'rgba(107,162,192,.20)'); glow.addColorStop(1, 'rgba(107,162,192,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // 머리: 상표 · 날짜
  g.fillStyle = '#fff'; g.font = `800 44px ${FONT}`; g.textBaseline = 'alphabetic'; g.fillText('석공 : 1400', 56, 98);
  g.fillStyle = 'rgba(203,225,238,.6)'; g.font = `600 17px ${FONT}`; g.letterSpacing = '7px'; g.fillText('AI + HERITAGE', 330, 94); g.letterSpacing = '0px';
  const d = new Date(), ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  g.textAlign = 'right'; g.fillStyle = 'rgba(226,236,242,.75)'; g.font = `600 22px ${FONT}`; g.fillText(`${data.stageName} · ${ds}`, W - 56, 96); g.textAlign = 'left';
  // 네 컷
  const M = 48, GAP = 18, top = 136, fw = (W - M * 2 - GAP) / 2, fh = 470;
  for (let i = 0; i < 4; i++) {
    const x = M + (i % 2) * (fw + GAP), y = top + Math.floor(i / 2) * (fh + GAP), P = POSES[i], shot = data.shots[i];
    // 흰 테(사진 느낌)
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = '#f7f9fa'; rr(g, x, y, fw, fh, 22); g.fill(); g.restore();
    const ix = x + 12, iy = y + 12, iw = fw - 24, ih = fh - 24;
    g.save(); rr(g, ix, iy, iw, ih, 14); g.clip();
    const sky = g.createLinearGradient(0, iy, 0, iy + ih); sky.addColorStop(0, '#cfe0ea'); sky.addColorStop(1, '#e9e4d6'); g.fillStyle = sky; g.fillRect(ix, iy, iw, ih);
    if (shot) { const s = Math.max(iw / shot.width, ih / shot.height), sw = shot.width * s, sh = shot.height * s; g.drawImage(shot, ix + (iw - sw) / 2, iy + (ih - sh) / 2, sw, sh); }
    // 꼬마 석공(같이 찍힌 느낌: 컷 아래에 붙여 세우고 그림자)
    const im = imgs[i];
    if (im) {
      const h = ih * P.h, w = h * im.width / im.height, nx = P.side === 'left' ? ix + 6 : ix + iw - w - 6, ny = iy + ih - h + 8;
      g.save(); g.fillStyle = 'rgba(20,24,20,.28)'; g.beginPath(); g.ellipse(nx + w / 2, iy + ih - 6, w * 0.42, 12, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); if (P.flip) { g.translate(nx + w, ny); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); } else g.drawImage(im, nx, ny, w, h); g.restore();
    }
    // 필름 카메라 날짜 도장 + 해시태그
    g.font = `700 20px ${FONT}`; g.fillStyle = 'rgba(255,148,64,.95)'; g.textAlign = P.side === 'left' ? 'right' : 'left';
    g.fillText(`'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`, P.side === 'left' ? ix + iw - 14 : ix + 14, iy + ih - 14);
    g.textAlign = 'left';
    g.font = `800 19px ${FONT}`; const tw = g.measureText(P.tag).width + 24;
    g.fillStyle = 'rgba(15,28,35,.78)'; rr(g, ix + 12, iy + 12, tw, 34, 17); g.fill(); g.fillStyle = '#fff'; g.fillText(P.tag, ix + 24, iy + 35);
    g.restore();
  }
  // 아래: 버틴 햇수
  const by = top + fh * 2 + GAP + 70;
  g.fillStyle = 'rgba(226,236,242,.78)'; g.font = `600 26px ${FONT}`;
  g.fillText(`${data.disName} 세기 ${data.score.toFixed(2)}${data.collapsed ? '에서 흔들렸어요' : '까지 끄떡없었어요'}`, 56, by - 4);
  g.fillStyle = '#fff'; g.font = `800 66px ${FONT}`;
  const yt = `이 탑은 ${data.years.toLocaleString('ko-KR')}년`; g.fillText(yt, 56, by + 72);
  const yw = g.measureText(yt).width; g.font = `800 40px ${FONT}`; g.fillText('을 버텼습니다', 56 + yw + 6, by + 72);
  if (data.levelName) {
    g.font = `700 22px ${FONT}`; const lw = g.measureText(data.levelName).width + 40, lx = W - 56 - lw;
    g.fillStyle = '#fff'; rr(g, lx, by - 34, lw, 46, 23); g.fill(); g.fillStyle = '#0f1c23'; g.fillText(data.levelName, lx + 20, by - 3);
  }
  g.fillStyle = 'rgba(203,225,238,.75)'; g.font = `600 21px ${FONT}`; g.fillText('나도 쌓아 보기 → ' + GAME_URL.replace('https://', ''), 56, H - 44);
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
