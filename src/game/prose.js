// 문장 나누기(2026-11-28 예진: "문단 단락 구분을 정확히"): 안내·말풍선·설명 글은 문장(. ? ! …)이 끝나면 다음 줄에서 시작한다.
// 문장마다 span.sent(display:block, text-wrap:balance)로 감싸 한 문장 안에서만 줄이 바뀌게 한다.
// html: 믿을 수 있는 HTML(<b> 등). 태그 안에 ". "가 없고 <b>가 문장 경계를 넘지 않는다고 본다. 평문은 sentText를 쓴다.
const SPLIT = /(?<=[.!?…])\s+(?=\S)/;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sentHTML = html => String(html || '').split(SPLIT).map(s => `<span class="sent">${s}</span>`).join('');
export const sentText = text => sentHTML(esc(text));
