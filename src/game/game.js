import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { Sim, MATERIALS, pga, buildJeongnimsa, buildMireuksa, mireukStory1, mireukRoof, mireukUpper, WORLD, buildNeungsa, buildPalsang, woodBase, woodPosts, woodBeam, woodRoof, woodStory, woodFinial } from './sim.js';
import { buildPart, PART_NAMES, loadPartModels } from './parts.js';
import { buildVillage, VMAT, resetVillageMats, loadVillageModels } from './village.js';
import { showLeaflet } from './leaflet.js';
import { localBuild, askBuild } from './towerchat.js';
// 탑을 쌓기 전에 그 탑의 안내 리플렛을 한 번 띄운다(첫째 마당 미륵사지 · 둘째 마당 정림사지)
const stageLeaflet = (force = false) => { if (S.stage !== 3 && !KIOSK_Q) showLeaflet(S.stage === 1 ? 'mireuk' : 'jeong', { once: !force }); };
const KIOSK_Q = new URLSearchParams(location.search).get('kiosk') === '1';

const $ = s => document.querySelector(s);
const stageEl = $('#stage'), panel = $('#panel');
const SHAPES = {
  block: { name: '블록', size: [1, 1, 1] },
  pillar: { name: '기둥', size: [0.4, 1.5, 0.4] },
  slab: { name: '판석', size: [2, 0.3, 2] },
  brick: { name: '벽돌', size: [1, 0.35, 0.5] },
};
// 셋째 마당: 실제 두 석탑의 부재를 하나씩 골라 쌓기(블렌더 모델, 화강암 고정). 한 층 크기 기준이며 위층은 비슷한 크기로 쓰면 된다.
const REAL = {
  jeong: { name: '정림사지', parts: { jidae: [3.65, 0.55, 3.65], gidan: [3, 0.42, 3], tapsin1: [2.3, 1.1, 2.3], tapsin: [1.8, 0.45, 1.8], batchim: [2.2, 0.16, 2.2], okgae: [3.4, 0.24, 3.4], noban: [0.6, 0.3, 0.6], bokbal: [0.5, 0.55, 0.5] } },
  mireuk: { name: '미륵사지', parts: { mgidan: [5, 0.38, 5], mgidung: [0.36, 1.35, 0.36], msimju: [0.52, 1.35, 0.52], mbyeok: [3.08, 1.35, 0.2], mchangbang: [3.9, 0.24, 3.9], mbatchim: [4.26, 0.2, 4.26], mokgae: [5.4, 0.2, 5.4], mtapsin: [3.5, 0.46, 3.5] } },
};
for (const t of Object.values(REAL)) for (const [part, size] of Object.entries(t.parts)) SHAPES['p_' + part] = { real: t.name, name: PART_NAMES[part], part, size, mat: 'granite' };
const MAT_INFO = {
  granite: { sw: '#a9a7a0', note: '무겁고 단단함. 기단에 좋지만 위에 쌓으면 자중이 짐' },
  pine: { sw: '#c99a62', note: '가볍고 탄성. 목재끼리 결구되지만 무거운 돌에 눌리면 부러짐' },
  brick: { sw: '#8f8b80', note: '가볍고 촘촘함. 벽돌끼리 맞붙여 빈틈을 보강' },
};
const JOINT_INFO = {
  flex: ['턱 맞춤·은장', '돌에 턱과 홈을 파 맞추고 나비 모양 은장으로 이어, 미세한 유격이 흔들림을 받아 흘려보냅니다.'],
  rigid: ['꽉 붙여 고정', '처음엔 단단하지만 작은 변형에도 이음이 쪼개지고, 풀린 뒤엔 그냥 얹힌 부재가 됩니다.'],
  none: ['그냥 얹기', '이음 없이 마찰로만 버팁니다. 돌기둥이 미끄러지고 기울면 그대로 무너집니다.'],
};
const TUT = [
  ['단층 기단 놓기', '미륵사지 석탑은 낮은 단층 기단 위에 섭니다. 우리나라에 남은 가장 오래되고 큰 석탑으로, 639년 백제 무왕 때 세웠습니다.'],
  ['돌기둥과 심주석 세우기', '네 귀에 민흘림 돌기둥을, 한가운데 심주석을 세웁니다. 2009년 이 1층 심주석에서 금제 사리봉영기가 나왔습니다.'],
  ['벽석과 창방·평방 얹기', '면마다 가운데 문을 낸 벽석을 끼우고, 기둥 머리를 창방·평방으로 엮습니다. 나무 건물의 짜임을 돌로 그대로 옮겼습니다.'],
  ['층급받침과 지붕돌 올리기', '3단으로 내민 층급받침 위에 얇고 넓은 지붕돌을 얹습니다. 처마 끝이 살짝 들려 목조 지붕을 닮았습니다.'],
  ['2층부터 6층까지 올리기', '낮은 몸돌과 지붕돌을 아주 천천히 줄여 올립니다. 원래 9층으로 보며, 오늘은 6층까지 남았습니다.'],
  ['지진 시험', '지진 세기를 정하고 흔들어 보세요. 이음 방식을 바꿔 다시 쌓으면 차이가 보입니다.'],
];
// 실제 정림사지 오층석탑 사진에서 잰 비례: 기단은 1층 지붕돌보다 좁고 낮은 두 단, 1층 몸돌은 너비의 절반쯤 높이, 2층부터 몸돌이 아주 낮다
const HIST = { taper: 0.86, roof: 1.63, body: 1, ornament: false, first: 1.1, up: 0.45, bt: 0.78, jw: 3.65, jh: 0.55, gw: 3.0, gh: 0.42 };
const ORNATE = { body: 1.6, roof: 2.2, ornament: true }; // 화이불치를 어긴 탑: 몸돌·지붕돌을 키우고 장식석을 얹음  // 2026-11-27: 양식 고르기는 없앰(실제 정림사지 석탑 하나만 쌓는다). 저장된 옛 기록 호환용으로만 남김
// 부재를 들 때 보여 주는 실제 건축 기법(국가유산청 국가유산포털·국립부여박물관 해설을 바탕으로 요약)
const PART_INFO = {
  jidae: '탑 전체를 받치는 맨 아래 바닥돌입니다. 단단히 다진 땅(판축토) 위에 놓여 무게를 넓게 나눕니다.',
  gidan: '정림사지 석탑의 기단은 낮고 좁은 한 단입니다. 각 면의 모서리와 가운데에 기둥돌(우주·탱주)을 끼워 목조 건물의 기단을 본떴고, 위를 갑석으로 덮습니다.',
  tapsin1: '실제 1층 몸돌은 네 모서리의 배흘림 기둥(우주)과 그 사이 면석 여러 장을 짜 맞췄습니다(게임에서는 한 덩어리로 놓습니다). 목조 건물의 기둥을 돌로 옮긴 것입니다. 이 면에는 660년 당나라가 새긴 「대당평백제국비명」이 남아 있습니다.',
  tapsin: '2층부터는 몸돌이 낮아지고 너비가 조금씩 줄어듭니다(체감). 위를 덜어낼수록 무게중심이 내려앉습니다.',
  batchim: '지붕돌 아래를 층층이 받치는 옥개받침입니다. 목조 건물에서 처마 무게를 기둥으로 모아 내리는 공포를 단순하게 옮긴 모습입니다.',
  okgae: '얇고 넓게 뻗은 지붕돌(옥개석)입니다. 처마 끝이 살짝 들려 목조 지붕을 닮았지만, 두껍지 않아 위가 무겁지 않습니다.',
  jangsik: '실제 탑에는 없는 장식입니다. 화려함을 더할수록 위가 무거워지는지 시험해 보세요(화이불치).',
  noban: '상륜부를 받치는 노반입니다. 정림사지 석탑의 상륜부는 오늘날 노반만 남아 있습니다.',
  bokbal: '노반 위의 복발과 보주는 사라진 상륜부를 게임에서 보충한 것입니다.',
  mgidan: '미륵사지 석탑의 기단은 낮은 단층입니다. 넓게 깔아 무게를 고르게 나눕니다.',
  mgidung: '네 귀의 민흘림 돌기둥입니다. 나무 기둥처럼 위가 조금 가늘고, 머리는 창방으로 엮습니다.',
  msimju: '1층 한가운데 세운 심주석입니다. 2009년 해체 수리 때 이 돌의 사리공에서 금제 사리봉영기(639년)가 나왔습니다.',
  mbyeok: '면마다 가운데 문을 낸 벽석입니다. 1층은 사방에서 십자로 드나드는 통로가 있어, 목탑의 내부 공간을 돌로 옮긴 흔적입니다.',
  mchangbang: '기둥 머리를 가로로 엮는 창방과 그 위의 평방을 돌로 깎았습니다. 나무 건물의 짜임을 그대로 본뜬 부분입니다.',
  mbatchim: '지붕돌 아래 3단으로 내민 층급받침입니다. 목조 건물의 공포를 단순하게 옮긴 모양입니다.',
  mokgae: '얇고 넓은 지붕돌입니다. 귀퉁이가 살짝 들려 목조 지붕을 닮았습니다.',
  mtapsin: '2층부터는 몸돌이 낮고, 아주 천천히 줄어듭니다(완만한 체감). 모서리마다 기둥을 새겼습니다.',
  wbase: '목탑도 땅과 만나는 곳은 돌입니다. 능사지 목탑 터에서는 심주를 받친 심초석 자리가 확인되었고, 그곳에서 석조사리감이 나왔습니다.',
  gidung: '네 귀에 세우는 둥근 기둥입니다. 기둥 발은 초석 위에 얹고, 기둥 머리는 창방으로 서로 엮습니다.',
  simju: '탑 한가운데를 꿰뚫는 심주(心柱)입니다. 아래 심초석에 사리를 모시고, 꼭대기까지 이어져 상륜을 받칩니다.',
  gongpo: '기둥 머리를 가로로 엮는 창방과, 그 위에서 처마 무게를 받아 기둥으로 내려 주는 공포입니다. 쇠못 대신 홈과 촉으로 짜 맞춥니다.',
  cheoma: '지붕을 길게 내미는 서까래입니다. 깊은 처마가 비를 막고, 끝이 들린 곡선이 백제 목조 건축의 맵시를 만듭니다.',
  giwa: '기와지붕입니다. 처마 끝 수막새에는 백제 특유의 연꽃무늬가 찍혔습니다. 지붕 무게가 아래 기둥을 눌러 짜임새를 다잡습니다.',
  sangryun: '꼭대기의 상륜입니다. 찰주에 보륜과 보주를 꿰어 탑의 끝을 장식합니다.',
};
// 지진 시험 결과를 실제 탑과 검이불루 화이불치로 풀어 주는 해설(첫째·둘째 마당)
function lessonHTML() {
  if (!S.last || S.testing || S.stage === 3) return '';
  const L = S.last, m = L.survived, k = S.tut.kind, s2 = S.s2;
  const at = m ? `세기 ${m.toFixed(1)}까지 버텼습니다` : `세기 ${(L.collapseMag || L.mag).toFixed(1)}에서 무너졌습니다`;
  let t;
  if (S.stage === 1) t = k === 'flex' ? `턱을 파 맞추고 은장으로 이은 미륵사지 석탑이 ${at}. 꽉 조이지 않고 여백을 남긴 짜임새가 흔들림을 받아 흘려보냅니다. 같은 세기에서 꽉 고정·그냥 얹기와 견주어 보세요.`
    : k === 'rigid' ? `꽉 붙여 고정한 탑이 ${at}. 단단해 보여도 조금만 비틀리면 이음이 쪼개지고, 풀린 뒤엔 그냥 얹힌 부재가 됩니다. 백제 장인이 맞춤과 유격을 쓴 까닭입니다.`
    : `이음 없이 얹기만 한 탑이 ${at}. 마찰로만 버티니 기둥이 미끄러지면 그대로 무너집니다.`;
  else {
    const hist = s2.taper === HIST.taper && s2.roof === HIST.roof && s2.body === HIST.body && !s2.ornament;
    t = hist ? `정림사지 비례 그대로 쌓은 탑이 ${at}. 낮은 몸돌, 얇은 지붕돌, 층마다 줄어드는 체감이 무게중심을 아래에 붙잡아 둡니다. 실제 탑은 약 1,400년 동안 그 자리를 지켰습니다.`
      : s2.ornament || s2.body > 1.3 || s2.roof > 2 ? `몸돌을 키우거나 지붕돌을 넓히고 장식을 얹은 탑이 ${at}. 위가 무거워질수록 흔들림에 약해집니다. 화려하되 사치스럽지 않게(화이불치), 덜어낼수록 단단해집니다. "정림사지 비례로 되돌리기"와 견주어 보세요.`
      : `비례를 바꾼 탑이 ${at}. 정림사지 원래 비례와 같은 세기에서 견주어 보세요. 백제 석공이 고른 비례에는 까닭이 있습니다.`;
  }
  return `<div class="spirit lesson-box"><b>시험 해설 · 검이불루 화이불치</b><p>${t}</p></div>`;
}
// ---------- 국가유산 안내: 게임 속 유산의 실제 이야기 ----------
const HERITAGE = [
  { name: '부여 정림사지 오층석탑', tag: '국보 · 백제 사비기 · 화강암 · 높이 8.33m · 오늘까지 남은 백제 석탑', img: 'pagoda-jeongnimsa.svg',
    where: '충남 부여군 부여읍 정림사지(사비 도성 한가운데 있던 절터)',
    body: ['익산 미륵사지 석탑과 함께 두 기만 남은 백제 석탑으로, 한국 석탑의 시조로 꼽힙니다.', '기둥돌을 끼운 낮은 기단, 배흘림 기둥 표현, 얇고 넓은 지붕돌로 목조 건물의 짜임새를 돌로 옮기면서도 장중하고 세련된 비례를 보여 줍니다.', '660년 백제가 멸망한 뒤 당나라 소정방이 1층 몸돌에 「대당평백제국비명」을 새겼습니다.', '2015년 「백제역사유적지구」의 하나로 유네스코 세계유산에 등재되었습니다.'],
    game: '둘째 마당에서 이 비례 그대로 쌓고, 비례를 바꿔 가며 지진에 견주어 봅니다.' },
  { name: '익산 미륵사지 석탑', tag: '국보 · 백제 무왕 639년 · 오늘까지 남은 백제 석탑', img: 'pagoda-mireuksa.svg',
    where: '전북특별자치도 익산시 금마면 미륵사지(서쪽 석탑)',
    body: ['우리나라에 남은 가장 오래되고 가장 큰 석탑으로, 원래 9층으로 추정되며 6층까지 남았습니다.', '목조 건물을 돌로 옮겨, 1층 몸돌은 사방 3칸에 가운데 문을 내고 민흘림 기둥과 창방·평방을 돌로 본떴습니다. 백제 목탑의 모습을 잘 보여 줍니다.', '2009년 해체 수리 중 심주에서 금제 사리봉안기가 나와 639년(기해년)에 사리를 모셨음이 밝혀졌습니다.', '무너질 위험이 있어 2001년부터 해체·보수했고, 2019년에 정비를 마쳤습니다.'],
    game: '셋째 마당 예시 탑으로 불러올 수 있습니다. 정림사지 석탑과 함께 지진을 버팁니다.' },
  { name: '부여 능산리 사지와 능사 목탑', tag: '사적 · 567년 무렵 창건 · 목탑은 터만 남음', img: 'pagoda-neungsa.svg',
    where: '충남 부여군 부여읍 능산리(능산리 고분군과 나성 사이)',
    body: ['1992년부터 발굴한 결과 중문·목탑·금당·강당이 한 줄로 놓인 전형적인 백제 가람(일탑일금당)으로 밝혀졌습니다.', '1993년 12월 공방터 수로에서 백제금동대향로(국보)가 나왔습니다.', '목탑 터에서 나온 석조사리감(국보)에는 창왕(위덕왕) 13년, 567년에 사리를 모셨다는 글이 새겨져 있습니다.', '목탑은 남아 있지 않아, 부여 백제문화단지(1993~2010년 조성)에 발굴된 터의 규모대로 능사와 오층목탑을 재현했습니다.'],
    game: '첫째 마당에서 이 목탑을 기둥·창방·처마·기와 순서로 짜 맞추고, 결구 방식에 따라 지진에 어떻게 버티는지 봅니다.' },
  { name: '부여 무량사 오층석탑', tag: '보물 · 고려 전기 · 백제계 석탑(백제 시대 탑은 아님)', img: 'pagoda-muryangsa.svg',
    where: '충남 부여군 외산면 무량사 극락전 앞',
    body: ['백제 탑의 우아한 선과 통일신라 탑의 장중함을 함께 이어받은 고려 전기의 탑입니다. 백제의 옛 땅에서 백제 석탑의 기법이 이어졌음을 보여 줍니다.', '몸돌은 낮은 편이고 지붕돌은 얇고 넓으며, 처마가 수평으로 가다가 끝에서 가볍게 들립니다.', '해체 수리 때 1층 몸돌에서 금동 아미타삼존상이, 5층에서 사리구가 나왔습니다.'],
    game: '셋째 마당 예시 탑으로 불러와 정림사지 탑과 비례를 견주어 볼 수 있습니다.' },
  { name: '공주 청량사지 남매탑 (오층·칠층석탑)', tag: '두 탑 모두 보물 · 고려(12세기 무렵 추정) · 백제계 석탑(백제 시대 탑은 아님)', img: 'pagoda-cheongnyangsa.svg',
    where: '충남 공주시 반포면 계룡산 연천봉 중턱, 해발 약 615m 청량사 터',
    body: ['칠층석탑과 나란히 서 있어 "남매탑(오뉘탑)"으로 불립니다.', '오층석탑은 정림사지 석탑을, 칠층석탑은 미륵사지 석탑을 본뜬 백제계 탑으로 평가됩니다.', '1950년대에 무너져 있던 것을 1961년에 다시 세웠습니다. 계룡산 일대의 화강암으로 쌓았습니다.'],
    game: '셋째 마당 예시 탑으로 불러올 수 있습니다. 작고 가는 비례가 지진에 어떻게 버티는지 보세요.' },
  { name: '보은 법주사 팔상전', tag: '국보 · 조선(임진왜란 뒤 다시 지음) · 충북의 오층 목탑', img: 'pagoda-palsangjeon.svg',
    where: '충북 보은군 속리산 법주사',
    body: ['우리나라에 남아 있는 유일한 오층 목탑이자, 남아 있는 탑 가운데 가장 높은 건축물입니다. 백제 시대 탑은 아니지만, 삼국시대부터 이어진 목탑의 모습을 오늘날 실물로 볼 수 있는 유일한 사례입니다.', '임진왜란 때 불탄 뒤 17세기 초에 다시 지었고, 1968년에 해체 수리했습니다.', '1·2층은 앞·옆면 5칸, 3·4층은 3칸, 5층은 2칸으로 줄어들고, 지붕은 꼭짓점 하나로 모이는 사모지붕입니다.', '벽에 부처의 일생을 여덟 장면으로 그린 팔상도가 있어 팔상전이라 부릅니다.'],
    game: '셋째 마당 예시 탑으로 불러와 능사 목탑과 체감·결구를 견주어 볼 수 있습니다.' },
  { name: '산수문전 (부여 외리 문양전 일괄)', tag: '보물 · 7세기 백제 · 한 변 약 29cm', img: 'tile.svg',
    where: '1937년 충남 부여군 규암면 외리 절터에서 출토, 국립부여박물관 소장',
    body: ['산수문전·연화문전·봉황문전 등 무늬 벽돌 8매 가운데 하나입니다.', '세 봉우리 산이 겹겹이 서고 소나무, 구름, 물가 바위, 산속 건물과 그곳으로 걸어가는 사람까지 담아 백제 산수화의 모습을 보여 줍니다.', '해외 전시에 가장 자주 나간 백제 대표 유물로 알려져 있습니다.'],
    game: '게임 배경의 겹산 능선, 오른쪽 판의 전돌 무늬, 셋째 마당의 "문양전" 자재가 여기서 왔습니다.' },
  { name: '백제 연꽃무늬 수막새', tag: '사비기 · 부여 일대 절터·궁터 출토', img: 'lotus.svg',
    where: '부여 관북리·정림사지·능산리 사지 등에서 출토, 국립부여박물관 등 소장',
    body: ['처마 끝 둥근 기와(수막새)에 연꽃을 찍은 것입니다.', '꽃잎 끝이 살짝 들려 부드럽게 솟는 연꽃무늬가 백제 수막새의 특징으로 꼽힙니다.', '절과 궁궐 지붕마다 이어져 백제 건축의 얼굴이 되었습니다.'],
    game: '상단 엠블럼과 대목장 비평의 인장, 목탑 기와지붕의 모티브입니다.' },
];
const TIMELINE = [
  ['538', '성왕, 사비(부여)로 도읍을 옮김'], ['567', '능사 목탑에 사리를 모심(석조사리감 명문)'], ['660', '백제 멸망 · 정림사지 석탑에 당의 비명이 새겨짐'],
  ['1937', '부여 외리 절터에서 산수문전 등 문양전 출토'], ['1992', '능산리 사지 발굴 시작'], ['1993', '능산리 사지에서 백제금동대향로 출토'], ['1995', '목탑 터에서 석조사리감 확인'],
  ['2010', '백제문화단지 완공 · 능사와 오층목탑 재현'], ['2015', '백제역사유적지구 유네스코 세계유산 등재'],
];
function heritageHTML() {
  return `${head('게임 속 백제 국가유산', '<span id="sheetTtl">국가유산 안내</span>')}
    <div class="hg">${HERITAGE.map(h => `<article class="hcard"><img src="${h.img}" alt="" aria-hidden="true"><div><b>${h.name}</b><span class="htag">${h.tag}</span><p class="hwhere">${h.where}</p><ul>${h.body.map(t => `<li>${t}</li>`).join('')}</ul><p class="hgame">게임에서: ${h.game}</p></div></article>`).join('')}</div>
    <h3>발굴과 복원의 시간</h3><ol class="tl-list">${TIMELINE.map(([y, t]) => `<li><b>${y}</b><span>${t}</span></li>`).join('')}</ol>
    <p class="note">출처: 국가유산청 국가유산포털(부여 정림사지 오층석탑, 부여 능산리 사지, 부여 외리 문양전 일괄), 국립부여박물관, 백제역사유적지구 통합관리단. 건립 연대처럼 학계에서 논의 중인 내용은 일반적인 설명을 따랐습니다.</p>
    <div class="row"><button class="btn pat" data-x="close">닫기</button></div>`;
}


// ---------- state & records ----------
const S = { stage: 1, mag: 5, testing: false, tut: { done: 1, kind: 'flex' }, s2: { preset: 'jeong', kind: 'flex', ...HIST },
  sel: { mat: 'granite', shape: 'block' }, rot: 0, design: [], dirty: false, ev: { breaks: 0, joints: 0 }, pre: null, last: null, crit: null };
let REC = { s1: {}, s2: {}, s3: [] };
try { REC = { ...REC, ...JSON.parse(localStorage.getItem('baekje-rec') || '{}') }; } catch { /* 저장소 없음 */ }
const saveRec = () => { try { localStorage.setItem('baekje-rec', JSON.stringify(REC)); } catch { /* 저장소 없음 */ } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- three.js scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfcebf, 30, 72);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.position.set(12, 8.5, 14);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.2, 0); controls.enableDamping = true; controls.maxPolarAngle = 1.52;
controls.minDistance = 5; controls.maxDistance = 48;
scene.add(new THREE.HemisphereLight(0xe3ecee, 0x8a7c68, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(9, 16, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 14, bottom: -6, near: 1, far: 50 }); sun.shadow.bias = -0.0004;
scene.add(sun);

function tex(draw, n = 256) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'); draw(g, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const TEX = {
  granite: tex((g, n) => { g.fillStyle = '#aaa8a1'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = rnd(70, 220) | 0; g.fillStyle = `rgba(${v},${v},${v - 6},${rnd(.25, .7)})`; g.fillRect(rnd(0, n), rnd(0, n), rnd(1, 3), rnd(1, 3)); } }),
  pine: tex((g, n) => { g.fillStyle = '#c99a62'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(110,64,30,${rnd(.15, .45)})`; g.lineWidth = rnd(.6, 2.4); g.beginPath(); const x = rnd(0, n);
      for (let y = 0; y <= n; y += 8) g.lineTo(x + Math.sin(y / 30 + i) * 5, y); g.stroke(); } }),
  brick: tex((g, n) => { g.fillStyle = '#928d82'; g.fillRect(0, 0, n, n);
    g.strokeStyle = 'rgba(60,58,52,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, n - 12, n - 12);
    g.lineWidth = 2.2; for (let r = 0; r < 3; r++) { g.beginPath(); const by = n * (0.78 - r * 0.2);
      for (let x = 14; x <= n - 14; x += 4) g.lineTo(x, by - Math.abs(Math.sin((x / n) * Math.PI * (2 + r))) * n * 0.16); g.stroke(); }
    g.beginPath(); g.arc(n * 0.72, n * 0.22, n * 0.07, 0, 7); g.stroke(); }),
  tile: tex((g, n) => { g.fillStyle = '#687075'; g.fillRect(0, 0, n, n);
    for (let x = 0; x < n; x += 21) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, 0, 9, n); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 16, 0, 4, n); } }),
  ground: tex((g, n) => { g.fillStyle = '#b9ad95'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 70; i++) { const v = rnd(150, 200) | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 24})`; g.beginPath();
      g.ellipse(rnd(0, n), rnd(0, n), rnd(10, 26), rnd(8, 20), rnd(0, 3), 0, 7); g.fill(); g.strokeStyle = 'rgba(90,80,64,.35)'; g.stroke(); } }, 512),
};
const MATS = {
  granite: new THREE.MeshStandardMaterial({ map: TEX.granite, roughness: 0.92 }),
  pine: new THREE.MeshStandardMaterial({ map: TEX.pine, roughness: 0.75 }),
  brick: new THREE.MeshStandardMaterial({ map: TEX.brick, roughness: 0.95 }),
  tile: new THREE.MeshStandardMaterial({ map: TEX.tile, roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a23f, metalness: 0.7, roughness: 0.35 }),
  broken: new THREE.MeshStandardMaterial({ map: TEX.pine, color: 0x7a4a33, roughness: 0.9 }),
  dan: new THREE.MeshStandardMaterial({ map: TEX.pine, color: 0xc0573a, roughness: 0.7 }),   // 붉은 단청 기둥
  green: new THREE.MeshStandardMaterial({ color: 0x3f7d6e, roughness: 0.75 }),               // 녹색 단청 창방
  goldPaint: new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.6 }),            // 소로
  seam: new THREE.MeshStandardMaterial({ color: 0x6b675e, roughness: 1 }),                    // 면석 이음줄
  plaster: new THREE.MeshStandardMaterial({ color: 0xefe8d6, roughness: 0.95 }),            // 흰 회벽
  door: new THREE.MeshStandardMaterial({ map: TEX.pine, color: 0x9a6a44, roughness: 0.8 }),   // 판문
  giwa: new THREE.MeshStandardMaterial({ map: TEX.tile, color: 0x8f8a80, roughness: 0.75 }), // 먹빛 기와
  granite_warm: new THREE.MeshStandardMaterial({ map: TEX.granite, color: 0xe2d3b8, roughness: 0.95 }), // 세월에 바랜 갈색 돌(무량사)
  granite_pink: new THREE.MeshStandardMaterial({ map: TEX.granite, color: 0xf0cdbb, roughness: 0.92 }), // 담홍색 화강암(계룡산 남매탑)
  granite_dark: new THREE.MeshStandardMaterial({ map: TEX.granite, color: 0xc4bfb3, roughness: 0.95 }),
  chip: new THREE.MeshStandardMaterial({ map: TEX.granite, color: 0xa39d90, roughness: 1, flatShading: true }), // 깨진 돌 조각 // 블렌더 부재의 우주·탱주(한 단계 어두운 돌)
  hidden: new THREE.MeshBasicMaterial({ visible: false }),                                    // 충돌 상자(보이지 않음)
};
TEX.ground.repeat.set(9, 9);
const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40), new THREE.MeshStandardMaterial({ map: TEX.ground, roughness: 1 }));
groundMesh.receiveShadow = true; scene.add(groundMesh);
const field = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ color: 0x9fa58f, roughness: 1 }));
field.rotation.x = -Math.PI / 2; field.position.y = -0.6; field.visible = false; scene.add(field);
// 산수문전처럼 겹겹이 선 산 능선
for (let i = 0; i < 0; i++) { // 산은 CSS 산수문전 배경이 맡는다
  const a = i / 26 * Math.PI * 2 + rnd(-.1, .1), r = rnd(50, 64), h = rnd(5, 11);
  const m = new THREE.Mesh(new THREE.ConeGeometry(rnd(12, 18), h, 9), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.3, .14, rnd(.34, .44)), roughness: 1, flatShading: true }));
  m.position.set(Math.cos(a) * r, h / 2 - 0.8, Math.sin(a) * r); scene.add(m);
}
const comMark = new THREE.Group();
comMark.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe0a43a, depthTest: false })));
const comLine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: 0xe0a43a, transparent: true, opacity: .6, depthTest: false }));
comMark.add(comLine); comMark.renderOrder = 9; comMark.children.forEach(c => c.renderOrder = 9); scene.add(comMark);

function boxGeo([w, h, d]) { // box with UVs scaled to real size so textures don't stretch
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] * 0.8, uv.getY(i) * dims[f][1] * 0.8); }
  return g;
}

// ---------- physics ----------
let sim;
const meshes = [];
function hookSim() {
  sim.onAdd = b => {
    const t = b.body.translation(), vis = b.part && b.tint !== 'broken' ? buildPart(b.part, b.size, MATS, { ...(b.po || {}), corner: [Math.sign(t.x - sim.gx) || 1, Math.sign(t.z - sim.gz) || 1] }) : null;
    const m = new THREE.Mesh(boxGeo(b.size), vis ? MATS.hidden : MATS[b.tint || b.mat]); m.castShadow = m.receiveShadow = !vis;
    if (vis) m.add(vis); // 보이는 모양은 실제 부재, 충돌과 집기는 상자
    m.userData.block = b; b.mesh = m; scene.add(m); meshes.push(m);
  };
  sim.onRemove = b => { scene.remove(b.mesh); disposeTree(b.mesh); meshes.splice(meshes.indexOf(b.mesh), 1); };
  sim.onEvent = e => {
    if (e.type === 'break') S.ev.breaks++;
    if (e.type === 'joint') S.ev.joints++;
    if (e.type === 'collapse') banner(`지진 세기 ${e.mag.toFixed(1)}에서 무너졌습니다`, '#ffc2a8');
    if (e.type === 'shatter') dust(e.pos, Math.min(6, 0.6 + e.size * 0.5));
    if (e.type === 'giveway') { banner(`지진 세기 ${e.mag.toFixed(1)} · 구조가 버티지 못하고 쓰러집니다`, '#ffc2a8'); const H = sim.height(); for (let i = 0; i < 6; i++) dust([sim.gx + (Math.random() - 0.5) * 4, H * i / 6, sim.gz + (Math.random() - 0.5) * 4], 2 + H * 0.05); }
  };
}
// 돌이 깨질 때 피어오르는 돌먼지(작은 점 구름이 퍼지며 옅어진다)
const DUST = [], dustMat = new THREE.PointsMaterial({ color: 0xc9bfa8, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true });
function dust(pos, r = 1) {
  if (DUST.length > 40) { const o = DUST.shift(); scene.remove(o.p); o.p.geometry.dispose(); o.p.material.dispose(); }
  const n = 60, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) { a.set([pos[0], pos[1], pos[2]], i * 3); v.push([(Math.random() - 0.5) * r * 2.4, Math.random() * r * 1.6, (Math.random() - 0.5) * r * 2.4]); }
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const m = dustMat.clone(); m.size = 0.25 + r * 0.25;
  const p = new THREE.Points(g, m); scene.add(p); DUST.push({ p, v, t: 0 });
}
function dustTick(dt) {
  for (const o of [...DUST]) {
    o.t += dt; const a = o.p.geometry.attributes.position;
    for (let i = 0; i < o.v.length; i++) { const v = o.v[i]; a.array[i * 3] += v[0] * dt; a.array[i * 3 + 1] += v[1] * dt; a.array[i * 3 + 2] += v[2] * dt; v[0] *= 0.96; v[1] = v[1] * 0.96 - 0.3 * dt; v[2] *= 0.96; }
    a.needsUpdate = true; o.p.material.opacity = Math.max(0, 0.8 * (1 - o.t / 2.2));
    if (o.t > 2.2) { scene.remove(o.p); o.p.geometry.dispose(); o.p.material.dispose(); DUST.splice(DUST.indexOf(o), 1); }
  }
}
// 큰 탑(세계의 탑, 실제 크기)을 불러오면 카메라·안개·보이는 거리를 탑 크기에 맞춘다
function fitCamera() {
  let H = 0, W = 0; for (const it of S.design || []) { const sz = it.size || SHAPES[it.shape].size; H = Math.max(H, it.pos[1] + sz[1] / 2); W = Math.max(W, Math.abs(it.pos[0]) + sz[0] / 2); }
  const big = Math.max(H, W * 1.4, 8), dist = big < 12 ? 22 : big * 1.9;
  controls.maxDistance = Math.max(48, dist * 1.6); camera.far = Math.max(200, dist * 6); scene.fog.near = Math.max(30, dist * 0.8); scene.fog.far = Math.max(72, dist * 3);
  camera.position.set(dist * 0.62, Math.max(8.5, H * 0.55), dist * 0.72); controls.target.set(0, big < 12 ? 3.2 : H * 0.42, 0); camera.updateProjectionMatrix(); controls.update();
}
// ---------- 셋째 마당 대화창: 말로 탑 만들기 ----------
function chatHTML() {
  const msgs = S.chat || [{ who: 'ai', t: '어떤 탑을 지어 볼까요? "곰돌이 모양 탑 만들어줘", "7층 탑", "에펠탑"처럼 말해 보세요.' }];
  return `<section class="chat" aria-label="말로 탑 만들기"><h3>말로 탑 만들기</h3><div class="chat-log" role="log" aria-live="polite">${msgs.map(m => `<p class="${m.who}">${esc(m.t)}</p>`).join('')}${S.chatBusy ? '<p class="ai busy">설계하는 중…</p>' : ''}</div>
    <form id="chatForm" class="chat-form"><input id="chatIn" name="q" autocomplete="off" placeholder="예: 곰돌이 모양 탑 만들어줘" maxlength="200" ${S.chatBusy || S.testing ? 'disabled' : ''}><button class="btn pat" ${S.chatBusy || S.testing ? 'disabled' : ''}>만들기</button></form></section>`;
}
async function chatSend(text) {
  S.chat = S.chat || []; S.chat.push({ who: 'me', t: text }); S.chatBusy = true; render();
  let res = await askBuild(text), fallback = !res;
  if (!res) res = localBuild(text);
  S.chatBusy = false;
  if (res && res.example) { S.design = EXAMPLES[res.example].design(); S.example = res.example; S.last = null; rebuild(); fitCamera(); S.chat.push({ who: 'ai', t: `${EXAMPLES[res.example].name}을(를) 불러왔어요. 지진 시험을 눌러 보세요.` }); }
  else if (res && res.design && res.design.length) { S.design = res.design; S.example = null; S.last = null; rebuild(); fitCamera(); S.chat.push({ who: 'ai', t: res.reply + (fallback ? ' (내장 설계)' : '') }); }
  else S.chat.push({ who: 'ai', t: '아직 그 모양은 모르겠어요. 곰돌이, 피라미드, 눈사람, 로켓, 하트, 성, "N층 탑", 또는 에펠탑·피사의 사탑 같은 탑 이름으로 말해 보세요.' });
  S.chat = S.chat.slice(-12); render();
  const log = document.querySelector('.chat-log'); if (log) log.scrollTop = log.scrollHeight;
}
document.addEventListener('submit', e => { if (e.target && e.target.id === 'chatForm') { e.preventDefault(); const q = e.target.q.value.trim(); if (q && !S.chatBusy) chatSend(q); } });
function disposeTree(o) { o.traverse(c => c.geometry && c.geometry.dispose()); }
function clearWorld() { if (sim) sim.quakeGain = 1; for (const m of [...meshes]) { scene.remove(m); disposeTree(m); } meshes.length = 0; sim.reset(); S.ev = { breaks: 0, joints: 0 }; }

// ---------- 조립 설계도: the builders run against a recorder, then the player places every piece by hand ----------
function pieceName({ mat, size: [w, h], tint, pos, part }) {
  if (part && PART_NAMES[part]) return PART_NAMES[part];
  if (tint === 'gold') return '상륜(찰주)';
  if (mat === 'brick') return '기와';
  if (mat === 'pine') return h > w * 2 ? '기둥' : w > 3 ? '지붕판' : '창방·평방';
  if (w >= 3.5 && pos[1] < 0.9) return '기단석'; if (w < 0.3) return '장식석'; if (w < 0.7) return '상륜부';
  if (h <= 0.2) return '층급받침'; if (h <= 0.45 && w > 1.8) return '옥개석'; return '탑신석';
}
function recordPlan(build) {
  const plan = [], joints = [];
  const rec = { gx: 0, gz: 0, step: 0, blocks: plan,
    addBlock(o) { const it = { mat: o.mat, size: o.size.slice(), pos: o.pos.slice(), tint: o.tint, part: o.part, po: o.po, idx: plan.length, step: rec.step, joints: [],
      body: { translation: () => ({ x: o.pos[0], y: o.pos[1], z: o.pos[2] }) } }; plan.push(it); return it; },
    addJoint(a, b, kind, anchor) { joints.push({ a: a.idx, b: b ? b.idx : null, kind, anchor: anchor.slice() }); } };
  build(rec);
  for (const j of joints) plan[Math.max(j.a, j.b ?? -1)].joints.push(j);
  for (const p of plan) { p.name = pieceName(p); delete p.body; }
  return plan;
}
const tutPlan = () => recordPlan(r => buildMireuksa(r, { kind: S.tut.kind })); // 목탑을 닮은 석탑: 익산 미륵사지 석탑(서탑)
const s2Plan = () => recordPlan(r => buildJeongnimsa(r, S.s2)); // 천년의 석탑: 정림사지 오층석탑만
const asm = () => S.stage === 1 ? S.asm1 : S.asm2;
function resetAsm(stage = S.stage) { const A = { plan: stage === 1 ? tutPlan() : s2Plan(), placed: [], bodies: [], lastSnap: null }; if (stage === 1) S.asm1 = A; else S.asm2 = A; }
const held = () => { const A = S.stage !== 3 && asm(); return A && !S.testing && A.placed.length < A.plan.length ? A.plan[A.placed.length] : null; };
function spawnPiece(i) {
  const A = asm(), it = A.plan[i], p = A.placed[i];
  const b = sim.addBlock({ mat: it.mat, size: it.size.slice(), pos: p.pos, tint: it.tint, part: it.part, po: it.po }); A.bodies[i] = b;
  if (!p.snap) return;
  for (const j of it.joints) {
    const a = A.bodies[j.a], o = j.b == null ? null : A.bodies[j.b];
    if (!a || (j.b != null && !o) || !A.placed[j.a].snap || (j.b != null && !A.placed[j.b].snap)) continue;
    sim.addJoint(a, o, j.kind, [j.anchor[0] + sim.gx, j.anchor[1], j.anchor[2] + sim.gz]);
  }
}
function placePiece(pos, snap) { const A = asm(); A.placed.push({ pos, snap }); A.lastSnap = snap; spawnPiece(A.placed.length - 1); }
function autoPlace(untilStep) { // 정위치에 맞춰 놓기 (demo shortcut)
  const A = asm(); if (S.dirty) rebuild();
  while (A.placed.length < A.plan.length && (untilStep == null || A.plan[A.placed.length].step <= untilStep)) { const it = A.plan[A.placed.length]; placePiece(it.pos.slice(), true); }
}
function buildAsm() { clearWorld(); const A = asm(); A.bodies = []; A.placed.forEach((_, i) => spawnPiece(i)); }
function buildS3() {
  clearWorld(); sim.quakeGain = 1; sim.breakAt = 0; sim.armor = false;
  const made = [];
  for (const it of S.design) {
    const b = sim.addBlock({ mat: it.mat, size: (it.size || SHAPES[it.shape].size).slice(), pos: it.pos, rotY: it.rot, tint: it.tint, part: it.part, po: it.po });
    b.di = made.length; made.push(b);
    if (it.links && it.links.length) { for (const l of it.links) if (made[l.to]) sim.addJoint(b, made[l.to], l.joint, l.anchor); }
    else if (it.parent != null && made[it.parent]) sim.addJoint(b, made[it.parent], it.joint, it.anchor);
  }
  // 백제 시대 석탑으로 오늘까지 남은 것은 미륵사지·정림사지 둘뿐 → 게임에서는 다른 예시 탑을 일부러 약하게(이음 없이, 미끄럽게, 흔들림 1.6배)
  const EX = S.example && EXAMPLES[S.example];
  // 세계의 탑: 정해진 세기(breakAt)에 이르면 구조가 풀리며 쓰러진다(게임 속 설정, 실제 내진 성능과는 다름)
  if (EX && EX.world) sim.breakAt = EX.breakAt;
  // 오늘까지 남은 백제 석탑(정림사지·미륵사지): 셋째 마당 예시로는 어떤 세기에도 무너지지 않게 한다
  if (EX && (S.example === 'jeong' || S.example === 'mireuk')) { sim.armor = true; sim.quakeGain = 0.5; for (const b of sim.blocks) b.col.setFriction(1.4); }
  if (EX && EX.fragile) { for (const j of [...sim.joints]) sim.removeJoint(j); for (const b of sim.blocks) b.col.setFriction(0.3); const fr = EXAMPLES[S.example].fragile; sim.quakeGain = typeof fr === 'number' ? fr : 1.6; }
}
const rebuild = () => { S.dirty = false; S.crit = null; (S.stage === 3 ? buildS3 : buildAsm)(); syncVillage(); };
// ---------- 탑 둘레: 백제 마을과 정림사 가람(둘째 마당은 "백제 때 / 오늘날" 전환) ----------
let VIL = null, vilKey = '';
const vilLabels = new THREE.Group();
function syncVillage(force = false) {
  const key = S.stage === 3 ? 'none' : S.stage + (S.stage === 2 ? S.era || 'baekje' : 'baekje');
  if (!force && key === vilKey && !S.villageDamaged) return;
  vilKey = key; S.villageDamaged = false;
  if (VIL) { scene.remove(VIL.root); VIL.root.traverse(o => o.geometry && o.geometry.dispose()); VIL = null; }
  for (const c of [...vilLabels.children]) vilLabels.remove(c);
  resetVillageMats();
  if (S.stage === 3) return;
  VIL = buildVillage(S.stage === 2 ? S.era || 'baekje' : 'baekje', S.stage);
  scene.add(VIL.root);
  if (!vilLabels.parent) scene.add(vilLabels);
  for (const [t, x, y, z] of VIL.labels) vilLabels.add(label(t, x, y, z, { w: 3.6 }));
}
const recKey = () => S.stage === 1 ? S.tut.kind : S.s2.preset === 'jeong'
  ? `정림사 · 탑신 ${S.s2.body}× · 체감 ${S.s2.taper} · 지붕 ${S.s2.roof}×${S.s2.ornament ? ' · 장식' : ''}` : `능사지 · ${JOINT_INFO[S.s2.kind][0]}`;

// ---------- earthquake test ----------
function startTest(mode) {
  if (S.dirty) rebuild();
  // 첫째 마당(미륵사지 석탑): 이음 없이 얹은 돌은 맞닿은 면이 매끈해 잘 미끄러진다(턱·은장이 없음)
  if (S.stage === 1) { sim.quakeGain = S.tut.kind === 'none' ? 2.3 : S.tut.kind === 'rigid' ? 1.4 : 1; if (S.tut.kind === 'none') for (const b of sim.blocks) b.col.setFriction(0.12); }
  for (let i = 0; i < 60; i++) sim.step();
  // 지진 전까지 부러진 나무 = 자중(自重) 초과. 지진 중 기록과 따로 센다
  S.preEv = { ...S.ev };
  S.pre = sim.stats(); S.ev = { breaks: 0, joints: 0 }; S.testing = true; S.crit = null; S.rampShown = 1;
  sim.startQuake(S.mag, mode);
  banner(mode === 'ramp' ? '한계 도전 시작 · 지진 세기 1.0' : `지진 세기 ${S.mag.toFixed(1)} 시험`, '#fff');
  render();
}
function finishTest() {
  const q = sim.quake; sim.stopQuake(); S.testing = false; S.dirty = true;
  const survived = q.mode === 'fixed' ? (q.collapsed ? 0 : q.mag) : q.passed;
  S.last = { mode: q.mode, mag: q.mag, collapsed: q.collapsed, collapseMag: q.collapseMag, survived, reason: q.reason,
    stressed: q.stressed.size, comShift: q.comShift, base0: q.base0, comY0: q.comY0 };
  if (!q.collapsed) banner(q.mode === 'ramp' ? '지진 세기 7.0까지 모두 버텼습니다' : `지진 세기 ${q.mag.toFixed(1)}을 버텼습니다`, '#fff3d2');
  if (survived) {
    if (S.stage === 1) REC.s1[S.tut.kind] = Math.max(REC.s1[S.tut.kind] || 0, survived);
    if (S.stage === 2) REC.s2[recKey()] = Math.max(REC.s2[recKey()] || 0, survived);
  }
  const ev = evidence(S.pre, S.last, S.ev, S.preEv || { breaks: 0 }), diag = diagnose(S.pre, S.last, ev);
  recordTrial(S.pre, S.last, diag);
  if (S.stage === 3) {
    S.crit = { ...critique(S.pre, S.last, S.ev), source: 'rule', pending: true, ev, diag };
    if (S.design.length) { REC.s3.push({ t: S.crit.title, m: survived, n: S.design.length }); REC.s3.sort((a, b) => b.m - a.m || a.n - b.n); REC.s3 = REC.s3.slice(0, 6); }
    aiCritique(S.crit, physicsLog(S.pre, S.last, S.ev, ev), S.design.length ? REC.s3.find(r => r.t === S.crit.title && r.m === survived) : null);
  }
  saveRec(); render();
  if (S.crit) $('#critique').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (sess().trials.length === 3 && !sess().quiz.post) setTimeout(() => openSheet('quiz-post'), 1400);
}
let bannerT;
function banner(text, color) { const b = $('#banner'); b.textContent = text; b.style.color = color; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 2600); }

// ---------- 진단 근거: 물리 로그의 원값과, 같은 로그에서 규칙으로 뽑은 진단 범주 ----------
const CAT = {
  too_small: '부재가 너무 적음',
  self_weight: '자중 초과 (지진 전에 부러짐)',
  stress: '응력 초과 (나무 부재 파손)',
  top_heavy: '머리가 무거움 (무게중심이 높음)',
  narrow_base: '밑동이 좁음 (세장비가 큼)',
  sound: '구조 건전 (끝까지 또는 6.0 이상 버팀)',
  general: '흔들림 누적 (뚜렷한 약점 없음)',
};
function evidence(st, res, ev, preEv) {
  const r1 = v => Math.round(v * 10) / 10, half = (res.base0 || st.base || 1) / 2;
  return {
    stressed: res.stressed || 0, broken: Math.ceil(ev.breaks), preBroken: Math.ceil(preEv.breaks || 0),
    comAngle: r1(Math.atan2(res.comShift || 0, res.comY0 || st.comY || 1) * 57.3),
    comRatio: Math.round((res.comShift || 0) / half * 100),
    comHeight: Math.round(st.comY / (st.height || 1) * 100), slender: r1(st.height / (st.base || 1)),
    survived: res.survived || 0, collapsed: res.collapsed,
  };
}
// 규칙 기반 진단: primary = 대표 범주, ok = 데이터와 모순되지 않는 범주들(AI 검증에 씀)
function diagnose(st, res, e) {
  const f = {
    too_small: st.count < 4, self_weight: e.preBroken > 0, stress: e.broken > 0 || e.preBroken > 0,
    sound: !res.collapsed || e.survived >= 6, top_heavy: e.comHeight > 55, narrow_base: e.slender > 3.2,
  };
  const order = ['too_small', 'self_weight', 'stress', 'sound', 'top_heavy', 'narrow_base'];
  const primary = order.find(k => f[k]) || 'general';
  const ok = new Set(order.filter(k => f[k])); ok.add(primary);
  if (res.collapsed) ok.add('general');
  return { primary, ok: [...ok] };
}

// ---------- AI 대목장 (Claude): 물리 로그를 개발 서버의 /api/critique로 보내 칭호와 비평을 받는다 ----------
// 키가 없거나 오프라인이거나, 응답이 늦거나, 데이터와 모순되면 규칙 기반 비평이 그대로 남는다.
function physicsLog(st, res, ev, e) {
  const T = st.total || 1, r2 = v => Math.round(v * 100) / 100, pct = v => Math.round(v * 100);
  const up = st.upper.granite + st.upper.pine + st.upper.brick || 1;
  // 놓기 정확도: 각 부재 중심이 아래 받침 부재 중심(없으면 탑 축)에서 수평으로 얼마나 어긋났는가
  const D = S.design, axis = D.length ? [D.reduce((s, d) => s + d.pos[0], 0) / D.length, D.reduce((s, d) => s + d.pos[2], 0) / D.length] : [0, 0];
  const offs = D.map(d => { const p = d.parent != null ? D[d.parent].pos : null; return Math.hypot(d.pos[0] - (p ? p[0] : axis[0]), d.pos[2] - (p ? p[2] : axis[1])); });
  const byShape = {}; for (const d of D) { const n = d.part ? PART_NAMES[d.part] : SHAPES[d.shape].name || PART_NAMES[SHAPES[d.shape].part]; byShape[n] = (byShape[n] || 0) + 1; }
  return {
    부재수: st.count, 모양별: byShape,
    자재_무게비율_퍼센트: { 화강암: pct(st.byMat.granite / T), 소나무: pct(st.byMat.pine / T), 문양전: pct(st.byMat.brick / T) },
    윗절반_자재비율_퍼센트: { 화강암: pct(st.upper.granite / up), 소나무: pct(st.upper.pine / up), 문양전: pct(st.upper.brick / up) },
    높이_m: r2(st.height), 밑동폭_m: r2(st.base), 세장비_높이나누기밑동: e.slender,
    무게중심_높이_m: r2(st.comY), 무게중심_높이비율_퍼센트: e.comHeight,
    놓기정확도: { 평균_중심어긋남_m: r2(offs.reduce((s, v) => s + v, 0) / (offs.length || 1)), 최대_중심어긋남_m: r2(Math.max(0, ...offs)), 결구로_이어진_부재수: D.filter(d => d.parent != null).length },
    결구수: st.joints, 지진중_풀린결구: ev.joints,
    응력초과_나무부재수: e.stressed, 지진중_부러진_나무부재: e.broken,
    자중초과: { 지진전_부러진_나무부재: e.preBroken, 여부: e.preBroken > 0 },
    무게중심_최대이탈: { 기울기_각도_도: e.comAngle, 밑동반폭_대비_퍼센트: e.comRatio },
    시험방식: res.mode === 'ramp' ? '한계 도전(지진 세기 1.0부터 0.5씩 올림)' : `고정 지진 세기 ${res.mag.toFixed(1)}`,
    붕괴: res.collapsed, 붕괴_지진세기: res.collapsed ? r2(res.collapseMag || res.mag) : null,
    붕괴_원인: res.collapsed ? ({ top: '꼭대기 부재 추락', pieces: '부재 3개 이상 이탈', mass: '전체 무게의 15% 이상 무너짐' }[res.reason] || null) : null,
    최대_버틴_지진세기: e.survived,
  };
}
// AI 응답 검증: 진단 범주가 규칙 진단과 모순되지 않고, 로그의 숫자를 하나 이상 그대로 인용했는가
function logNumbers(o, out = []) {
  if (typeof o === 'number') out.push(o);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) logNumbers(v, out);
  return out;
}
function numInText(text, n) {
  return [String(n), n.toFixed(1), n.toFixed(2)].some(f => new RegExp(`(^|[^0-9.])${f.replace('.', '\\.')}(?![0-9])`).test(text));
}
function validateAI(data, log, diag) {
  if (!data || typeof data.title !== 'string' || typeof data.text !== 'string') return '응답 형식이 맞지 않음';
  if (!diag.ok.includes(data.diagnosis)) return `AI는 '${CAT[data.diagnosis] || data.diagnosis || '범주 없음'}'(으)로 봤지만 데이터는 '${CAT[diag.primary]}'`;
  const nums = logNumbers(log), words = `${data.text} ${data.lesson || ''}`;
  const cited = (Array.isArray(data.cited_numbers) ? data.cited_numbers : []).filter(n => typeof n === 'number' && nums.some(v => Math.abs(v - n) < 0.051));
  if (!cited.some(n => numInText(words, n))) return '로그의 숫자를 인용하지 않음';
  return null;
}
async function aiCritique(crit, log, rec) {
  let data = null, fail = null;
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 30000);
  try {
    const r = await fetch('/api/critique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log), signal: ac.signal });
    if (r.ok) data = await r.json(); else fail = r.status === 503 ? null : 'AI 호출 실패';
  } catch (err) { fail = err && err.name === 'AbortError' ? 'AI 응답 시간 초과(30초)' : null; /* 오프라인: 규칙 기반 비평 유지 */ }
  clearTimeout(timer);
  if (S.crit !== crit) return; // 그새 탑을 고쳤거나 다시 시험했다
  const bad = data ? validateAI(data, log, crit.diag) : fail;
  if (data && !bad) {
    S.crit = { ...crit, title: data.title, text: data.text, lesson: data.lesson || crit.lesson, source: 'ai', pending: false, aiCat: data.diagnosis };
    if (rec) { rec.t = data.title; saveRec(); }
  } else S.crit = { ...crit, pending: false, reject: bad };
  render();
}

// ---------- 규칙 기반 대목장 (오프라인·키 없음 대비) ----------
function critique(st, res, ev) {
  const T = st.total || 1, sh = k => st.byMat[k] / T, pct = v => Math.round(v * 100);
  const up = st.upper.granite + st.upper.pine + st.upper.brick, upStone = st.upper.granite / (up || 1);
  const lowStone = (st.byMat.granite - st.upper.granite) / T;
  const comR = st.comY / (st.height || 1), slender = st.height / (st.base || 1), m = res.survived;
  const said = m ? `지진 세기 ${m.toFixed(1)}까지 버텼다.` : `지진 세기 ${(res.collapseMag || res.mag).toFixed(1)}에서 무너졌다.`;
  const rules = [
    [st.count < 4, '소박한 돌무지', `탑이라 하기엔 아직 돌무지에 가깝구나. 높이 ${st.height.toFixed(1)}m로는 지진도 싱거워하겠어. 층을 올려 보거라.`],
    [ev.breaks > 0 && upStone > 0.3, '머리 무거운 장수', `나무 위에 돌을 이고 있었으니 기둥 ${Math.ceil(ev.breaks)}개가 부러진 게야. 나무는 휘어서 버티는 재목이지 바위 받침이 아니다.`],
    [lowStone > 0.45 && upStone < 0.35 && up > 0 && m >= 6, '환생한 백제 장인', '기단부는 정림사지처럼 묵직하게 돌로 잡고, 상층부는 목탑의 결구로 가볍게 뺐구나! 1,400년 전 백제 장인이 환생한 듯한 솜씨네.'],
    [sh('granite') > 0.95 && m >= 6, '정림사의 후계자', '돌만으로 이만큼 버티다니, 비례를 아는 손이로구나. 정림사지 석탑을 쌓은 석공도 고개를 끄덕이겠다.'],
    [sh('granite') > 0.95, '돌쟁이 고집쟁이', '돌만 고집하니 무겁기만 하고 흔들림을 받아 줄 데가 없다. 위쪽은 덜어내거나 가벼운 재료로 바꿔 보거라.'],
    [comR > 0.55, '가분수 탑', `무게중심이 높이의 ${pct(comR)}% 지점에 떠 있다. 머리가 무거우면 작은 흔들림에도 고개를 숙이는 법이지.`],
    [slender > 3.2, '하늘 찌르는 장대', `밑동 폭에 비해 ${slender.toFixed(1)}배나 높구나. 욕심은 알겠다만, 바닥을 넓혀야 하늘에 닿는다.`],
    [sh('pine') > 0.75, '목탑의 후예', `나무로 엮은 탑이로구나. 결구 ${st.joints}곳이 흔들림을 나눠 받았다. 능사지 목탑 장인의 피가 흐르는 게야.`],
    [sh('brick') > 0.6, '문양전 장인', '산수문전을 촘촘히 맞붙였구나. 벽돌의 결합력은 좋지만, 이음이 끊어지면 한꺼번에 쏟아진다는 걸 잊지 마라.'],
    [m >= 6, '천년 가는 탑', '재료를 고루 쓰면서도 중심을 잃지 않았다. 이 정도면 천 년 비바람도 견디겠구나.'],
    [m >= 4, '쓸 만한 견습 목수', '기본은 섰다. 다만 큰 지진 앞에선 아직 다리가 후들거리는구나.'],
    [true, '흔들리는 새내기', '처음부터 잘 쌓는 장인은 없다. 무너진 자리에서 다음 탑이 시작되는 게야.'],
  ];
  const [, title, line] = rules.find(r => r[0]);
  const parts = [line, `${said} 무게중심은 높이의 ${pct(comR)}%, ${comR < 0.36 ? '아래가 묵직해 좋다.' : comR > 0.5 ? '위를 덜어내야 한다.' : '무난하다.'}`];
  if (st.joints) parts.push(`결구 ${st.joints}곳 가운데 ${ev.joints}곳이 풀렸다.`);
  const lesson = comR > 0.5 ? '덜어낼수록 단단해진다. 위를 비워야 아래가 산다.'
    : ev.breaks ? '재료마다 제자리가 있다. 아래는 돌로 중심을 잡고, 위는 나무와 벽돌로 가볍게.'
    : m >= 6 ? '검이불루 화이불치. 검소하되 누추하지 않으니 천년을 가겠구나.' : '아래는 돌로 중심을 잡고, 위는 나무와 벽돌로 가볍게 덜어내 보거라.';
  return { title, text: parts.join(' '), lesson };
}

// ---------- 손으로 놓기: a held piece follows the pointer, rests on whatever is under its footprint ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), DOWN = new THREE.Vector3(0, -1, 0), O = new THREE.Vector3();
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xb8923a, transparent: true, opacity: 0.42, depthWrite: false });
const ghost = new THREE.Mesh(boxGeo([1, 1, 1]), ghostMat); ghost.visible = false; ghost.renderOrder = 5; scene.add(ghost);
const target = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x3f7d6e, transparent: true, opacity: 0.9, depthTest: false }));
target.visible = false; target.renderOrder = 6; scene.add(target);
let ghostKey = '', downAt = null;
function setGhost(size, it) {
  const part = it && it.part, k = size.join() + (part || '') + (it ? it.pos.join() : ''); if (k === ghostKey) return;
  ghost.geometry.dispose(); ghost.geometry = boxGeo(size); ghostKey = k;
  for (const c of [...ghost.children]) { ghost.remove(c); disposeTree(c); }
  const vis = part ? buildPart(part, size, new Proxy({}, { get: () => ghostMat }), { ...(it.po || {}), ink: false, corner: [Math.sign(it.pos[0]) || 1, Math.sign(it.pos[2]) || 1] }) : null;
  ghost.material = vis ? MATS.hidden : ghostMat; if (vis) { vis.traverse(c => { c.castShadow = false; c.renderOrder = 5; }); ghost.add(vis); }
}
function showTarget() {
  const it = held();
  target.visible = false; // 정위치 안내선은 보여 주지 않는다: 눈대중으로 맞춘다
  if (it) { target.scale.set(it.size[0], it.size[1], it.size[2]); target.position.set(it.pos[0] + sim.gx, it.pos[1], it.pos[2] + sim.gz); }
}
function pointerHit(ev, objs) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObjects(objs, false)[0] || null;
}
// highest surface under a footprint (x,z relative to the moving ground)
function surfaceTop(x, z, sx, sz) {
  let top = 0, under = null;
  for (const fx of [-0.45, 0, 0.45]) for (const fz of [-0.45, 0, 0.45]) {
    ray.set(O.set(x + fx * sx + sim.gx, 60, z + fz * sz + sim.gz), DOWN);
    const h = ray.intersectObjects(meshes, false)[0];
    if (h && h.point.y > top + 1e-3) { top = h.point.y; under = h.object.userData.block; }
  }
  return { top, under };
}
function planAt(ev) {
  const it = held();
  const size = it ? it.size.slice() : SHAPES[S.sel.shape].size.slice();
  if (!it && S.rot) [size[0], size[2]] = [size[2], size[0]];
  const hit = pointerHit(ev, [groundMesh, ...meshes]);
  if (!hit) return null;
  const grid = it ? 0.05 : 0.25, sn = v => Math.round(v / grid) * grid;
  let x = sn(hit.point.x - sim.gx), z = sn(hit.point.z - sim.gz), snap = false;
  if (it && Math.hypot(x - it.pos[0], z - it.pos[2]) < 0.15) { x = it.pos[0]; z = it.pos[2]; snap = true; }
  const { top, under } = surfaceTop(x, z, size[0], size[2]);
  let y = top + size[1] / 2 + 0.005;
  if (snap) { if (Math.abs(y - it.pos[1]) < 0.3) y = Math.max(y, it.pos[1]); else snap = false; }
  return { x, z, y, top, size, under, snap };
}
// ---------- 손가락 조작: 두 손가락이 닿는 순간 놓기를 취소하고, 한 손가락으로 옮긴 뒤 "여기에 놓기"를 눌러야 놓인다 ----------
const touches = new Set(); let multi = false, pending = null;
const dropBar = $('#dropBar');
function setPending(p, ev) {
  pending = p ? { p, x: ev.clientX, y: ev.clientY } : null;
  dropBar.hidden = !pending;
  if (pending) $('#dropName').textContent = held() ? held().name : SHAPES[S.sel.shape].name;
}
function commitDrop(p) {
  if (S.stage === 3) place(p);
  else if (held()) { placePiece([p.x, p.y, p.z], p.snap); ghost.visible = false; render(); }
}
dropBar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const p = pending && pending.p; setPending(null);
  if (b.dataset.drop === 'ok' && p && placing()) commitDrop(p); else ghost.visible = false;
});
renderer.domElement.addEventListener('pointerdown', ev => {
  if (ev.pointerType !== 'touch') return;
  touches.add(ev.pointerId);
  if (touches.size > 1) { multi = true; downAt = null; ghost.visible = !!pending; } // 두 손가락: 화면 돌리기·확대만
}, { capture: true });
for (const t of ['pointerup', 'pointercancel']) renderer.domElement.addEventListener(t, ev => {
  if (ev.pointerType !== 'touch') return;
  touches.delete(ev.pointerId);
  if (!touches.size) setTimeout(() => { multi = false; }, 0);
});
renderer.domElement.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch' && multi) return;
  const active = !S.testing && !S.dirty && (S.stage === 3 ? !S.pick : !!held());
  const p = active ? planAt(ev) : null;
  ghost.visible = !!p;
  if (p) { setGhost(p.size, S.stage === 3 ? null : held()); ghost.position.set(p.x + sim.gx, p.y, p.z + sim.gz); ghostMat.color.set(0xb8923a); ghostMat.opacity = 0.45; }
});
renderer.domElement.addEventListener('pointerleave', () => { if (!pending) ghost.visible = false; });
const placing = () => !S.testing && !S.dirty && (S.stage === 3 ? !S.pick : !!held());
function syncControls() { // 놓는 중에는 왼쪽 드래그/한 손가락 = 부재 옮기기, 오른쪽 드래그/두 손가락 = 시점
  const on = placing();
  controls.mouseButtons.LEFT = on ? null : THREE.MOUSE.ROTATE; controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = on ? null : THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
}
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
renderer.domElement.addEventListener('pointerdown', ev => { downAt = ev.button === 0 && !(ev.pointerType === 'touch' && multi) ? [ev.clientX, ev.clientY] : null; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (S.testing || !downAt || ev.button !== 0 || (ev.pointerType === 'touch' && multi)) { downAt = null; return; }
  const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 6; downAt = null;
  if (moved && !placing()) return;
  if (S.dirty) { rebuild(); render(); banner('탑을 다시 세웠습니다', '#fff'); return; }
  if (S.stage === 3 && S.pick) return pickUp(ev);
  const p = planAt(ev); if (!p) return;
  if (ev.pointerType === 'touch') { setPending(p, ev); return; } // 손가락: 바로 놓지 않고 확인 버튼으로
  commitDrop(p);
});
function place(p) {
  if (S.design.length >= 80) { banner('부재는 80개까지 놓을 수 있습니다', '#fff'); return; }
  const sh = SHAPES[S.sel.shape];
  const it = { mat: sh.mat || S.sel.mat, shape: S.sel.shape, pos: [p.x, p.y, p.z], rot: S.rot ? Math.PI / 2 : 0, parent: null };
  if (sh.part) { it.part = sh.part; it.size = sh.size.slice(); }
  const b = sim.addBlock({ mat: it.mat, size: sh.size.slice(), pos: it.pos, rotY: it.rot, part: it.part });
  b.di = S.design.length;
  const u = p.under;
  if (u && u.mat === it.mat && it.mat !== 'granite' && u.di != null) {
    it.parent = u.di; it.joint = it.mat === 'pine' ? 'flex' : 'mortar'; it.anchor = [p.x, p.top, p.z];
    sim.addJoint(b, u, it.joint, [p.x + sim.gx, p.top, p.z + sim.gz]);
  }
  S.design.push(it); S.crit = null; render();
}
function pickUp(ev) { // 셋째 마당: 놓인 부재를 집어 다시 들기
  const h = pointerHit(ev, meshes), b = h && h.object.userData.block;
  if (!b || b.di == null) return;
  const di = b.di, it = S.design[di];
  S.design.splice(di, 1);
  for (const d of S.design) { if (d.parent === di) d.parent = null; else if (d.parent > di) d.parent--;
    if (d.links) d.links = d.links.filter(l => l.to !== di).map(l => ({ ...l, to: l.to > di ? l.to - 1 : l.to })); }
  S.sel.mat = it.mat; S.sel.shape = it.shape; S.rot = it.rot ? 1 : 0; S.pick = false;
  rebuild(); render(); banner('부재를 집었습니다. 놓을 곳을 누르세요', '#fff');
}
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || S.testing) return;
  if (S.stage === 3 && (e.key === 'r' || e.key === 'R')) { S.rot ^= 1; render(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});
$('#quickUndo').addEventListener('click', () => { if (!S.testing) undo(); });
function undo() {
  if (S.stage === 3) S.design.pop(); else { asm().placed.pop(); asm().lastSnap = null; }
  rebuild(); render();
}

// ---------- UI: 오른쪽 판(panel), 아래 지진 조작판(dock), 왼쪽 도구판(tools) ----------
const HAN = '一二三四五六七';
const dis = () => S.testing ? 'disabled' : '';
const records = (rows, empty) => rows.length ? `<div class="records">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>지진 세기 ${Number(v).toFixed(1)}</b></div>`).join('')}</div>` : `<p class="note">${empty}</p>`;
function dockHTML() {
  const A = S.stage !== 3 && asm(), lockMsg = S.stage === 1 && A.placed.length < A.plan.length ? `탑을 다 세우면 지진 시험대가 열립니다 · 남은 부재 ${A.plan.length - A.placed.length}개`
    : S.stage === 2 && !A.placed.length ? '부재를 하나 이상 놓으면 지진 시험대가 열립니다' : '';
  if (lockMsg) {
    return `<div class="locked"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>${lockMsg}</div>`;
  }
  const L = S.last && !S.testing ? `<p class="result">${S.last.survived ? `버틴 지진 세기 <b>${S.last.survived.toFixed(1)}</b>` : '버티지 못함'}${S.last.collapsed ? ` · 지진 세기 ${S.last.collapseMag.toFixed(1)}에서 붕괴${S.last.reason === 'top' ? '(꼭대기 부재 추락)' : S.last.reason === 'pieces' ? '(부재 셋 이상 이탈)' : '(전체의 15% 이상 무너짐)'}` : ''}${S.ev.breaks ? ` · 부러진 목재 ${Math.ceil(S.ev.breaks)}` : ''}${S.ev.joints ? ` · 풀린 결구 ${S.ev.joints}` : ''}</p>` : '';
  return `<div class="dock-in">
    <div class="mag">
      <label for="mag" class="maglab"><span>${S.testing ? (sim.quake && sim.quake.mode === 'ramp' ? '한계 도전 중 · 위 지진 세기 표시를 보세요' : '지진 시험 중') : '지진 세기 <small class="unit">게임 내 값 1.0–7.0</small>'}</span><span><b id="magBig">${S.mag.toFixed(1)}</b> · 지반 가속도 <span id="magPga">${pga(S.mag).toFixed(2)}</span> m/s²</span></label>
      <input id="mag" type="range" min="1" max="7" step="0.5" value="${S.mag}" ${dis()}>
      <div class="ticks">${[...HAN].map(c => `<span>${c}</span>`).join('')}</div>
      ${L}
    </div>
    <div class="acts">
      ${S.testing ? '<button class="btn line" data-act="stop">시험 멈추기</button>'
        : `<button class="btn red" data-act="fixed">지진 시험<small>정한 세기로 8초</small></button><button class="btn line" data-act="ramp">한계 도전<small>1.0부터 0.5씩</small></button>${S.dirty ? '<button class="btn pat" data-act="rebuild">다시 세우기</button>' : ''}`}
    </div></div>`;
}
function toolsHTML() {
  if (S.stage !== 3) return '';
  return `<span class="tl">자재</span>${Object.keys(MATERIALS).map(id => `<button class="tbtn mat" data-mat="${id}" aria-pressed="${S.sel.mat === id}" title="${MAT_INFO[id].note}"><i style="background:${MAT_INFO[id].sw}"></i>${MATERIALS[id].name}</button>`).join('')}
    <span class="tl">모양</span>${Object.entries(SHAPES).filter(([, s]) => !s.real).map(([id, s]) => `<button class="tbtn" data-shape="${id}" aria-pressed="${S.sel.shape === id}">${s.name}</button>`).join('')}
    ${Object.values(REAL).map(t => `<span class="tl">${t.name}</span>${Object.keys(t.parts).map(part => `<button class="tbtn real" data-shape="p_${part}" aria-pressed="${S.sel.shape === 'p_' + part}">${PART_NAMES[part]}</button>`).join('')}`).join('')}
    <button class="tbtn" data-act="rot" aria-pressed="${!!S.rot}" aria-label="90도 돌리기 (R)" title="90도 돌리기 (R)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg></button>
    <button class="tbtn pick" data-act="pick" aria-pressed="${!!S.pick}" title="놓인 부재를 집어 옮기기">옮기기</button>
    <button class="tbtn" data-act="undo" aria-label="되돌리기" title="되돌리기 (Ctrl+Z)" ${S.design.length ? '' : 'disabled'}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>`;
}
const head = (small, big) => `<div class="ttl"><span>${small}</span><h2>${big}</h2></div>`;
const spirit = (h, t) => `<div class="spirit"><b>${h}</b><p>${t}</p></div>`;
// ---------- 실제 탑 일러스트 (public/pagoda-*.svg, 실물 사진의 비례를 따라 그림) ----------
const PHOTOS = {
  jeong: { src: 'pagoda-jeongnimsa.svg', name: '부여 정림사지 오층석탑', note: '국보 · 7세기 백제 · 지금도 그 자리에 서 있는 실물', ref: '정림사지_오층석탑_정면.jpg', by: '국가유산청' },
  mireuk: { src: 'pagoda-mireuksa.svg', name: '익산 미륵사지 석탑', note: '국보 · 백제 무왕 639년 · 우리나라에서 가장 오래되고 큰 석탑, 6층까지 남음', url: 'https://www.heritage.go.kr', by: '국가유산청' },
  neung: { src: 'pagoda-neungsa.svg', name: '능사 오층목탑 (재현)', note: '능사지 목탑은 남아 있지 않아, 부여 백제문화단지에 발굴 자료로 재현한 탑을 그렸습니다', ref: 'Korea-5th-tower.jpg', by: 'Pediagaller' },
};
const photo = (k, sm) => { const p = PHOTOS[k], page = p.url || 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(p.ref);
  return `<figure class="real${sm ? ' sm' : ''}"><img src="${p.src}" alt="${p.name} 일러스트"><figcaption><b>${p.name}</b>${sm ? '' : `<span>${p.note}</span>`}<small>일러스트 · ${p.url ? '참고' : '참고 사진'} <a href="${page}" target="_blank" rel="noopener">${p.by}</a></small></figcaption></figure>`; };
const seg = (items, attr, cur) => `<div class="seg" style="grid-template-columns:repeat(${items.length},minmax(0,1fr))">${items.map(([id, n]) => `<button data-${attr}="${id}" aria-pressed="${cur === id}" ${dis()}>${n}</button>`).join('')}</div>`;
// 다음 부재 미리보기: isometric drawing of each upcoming piece, true to its proportions
const MAT_FACE = { granite: ['#c9c7c0', '#a9a7a0', '#8b8982'], pine: ['#ddb27a', '#c99a62', '#a87c48'], brick: ['#a8a499', '#8f8b80', '#77736a'], tile: ['#8a9196', '#687075', '#535a5e'], gold: ['#e3c26a', '#c9a23f', '#a8842c'] };
function isoSVG(it, px) {
  const [w, h, d] = it.size, c = MAT_FACE[it.tint === 'gold' || it.tint === 'tile' ? it.tint : it.mat], k = Math.cos(Math.PI / 6);
  const pr = (x, y, z) => [(x - z) * k, (x + z) / 2 - y];
  const a = -w / 2, b = w / 2, e = -d / 2, f = d / 2;
  const pts = [[a, h, e], [b, h, e], [b, h, f], [a, h, f], [a, 0, f], [b, 0, f], [b, 0, e]].map(q => pr(...q));
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), mx = Math.min(...xs), my = Math.min(...ys);
  const sc = (px - 8) / Math.max(Math.max(...xs) - mx, Math.max(...ys) - my);
  const ox = (px - (Math.max(...xs) - mx) * sc) / 2, oy = (px - (Math.max(...ys) - my) * sc) / 2;
  const P = i => `${(ox + (pts[i][0] - mx) * sc).toFixed(1)},${(oy + (pts[i][1] - my) * sc).toFixed(1)}`;
  const poly = (ix, col) => `<polygon points="${ix.map(P).join(' ')}" fill="${col}" stroke="#3d3933" stroke-width="1" stroke-linejoin="round"/>`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" aria-hidden="true">${poly([0, 1, 2, 3], c[0])}${poly([3, 2, 5, 4], c[1])}${poly([1, 2, 5, 6], c[2])}</svg>`;
}
// 실제 부재 모양을 작은 3D 그림으로 찍어 미리보기에 쓴다(부재 종류·크기별로 한 번만 찍는다)
const THUMB = new Map(); let thumbR = null;
function partThumb(it, px) {
  if (!it.part) return isoSVG(it, px);
  const key = it.part + it.size.join() + (it.part === 'tapsin1' ? Math.sign(it.pos[0]) + '' + Math.sign(it.pos[2]) : '');
  if (!THUMB.has(key)) {
    try {
      if (!thumbR) { thumbR = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); thumbR.setSize(168, 168); thumbR.outputColorSpace = THREE.SRGBColorSpace; }
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff6e4, 0x6b6455, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(3, 5, 4); sc.add(dl);
      const g = buildPart(it.part, it.size, MATS, { ...(it.po || {}), corner: [Math.sign(it.pos[0]) || 1, Math.sign(it.pos[2]) || 1] }); sc.add(g);
      const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
      const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.01, 100); cam.position.copy(c).add(new THREE.Vector3(1, 0.8, 1.2).normalize().multiplyScalar(r * 4)); cam.lookAt(c);
      thumbR.render(sc, cam); THUMB.set(key, thumbR.domElement.toDataURL()); g.traverse(o => o.geometry && o.geometry.dispose());
    } catch { return isoSVG(it, px); }
  }
  return `<img src="${THUMB.get(key)}" width="${px}" height="${px}" alt="" aria-hidden="true">`;
}
function nextHTML() {
  if (S.stage === 3) return '';
  const A = asm(), n = A.placed.length;
  if (n >= A.plan.length) return `<span class="tl">다음 부재</span><p class="nx-done">모두 놓았습니다</p>`;
  const card = (it, now) => `<div class="nx${now ? ' now' : ''}">${partThumb(it, now ? 84 : 52)}<span><b>${it.name}</b><small>${it.tint === 'tile' ? '기와' : MATERIALS[it.mat].name}</small></span></div>`;
  return `<span class="tl">지금 들고 있는 부재</span>${card(A.plan[n], true)}${A.plan.length > n + 1 ? `<span class="tl">다음</span>${A.plan.slice(n + 1, n + 4).map(it => card(it, false)).join('')}` : ''}<p class="nx-left">남은 부재 ${A.plan.length - n}개</p>`;
}
function stepCount(step) { const A = S.asm1, all = A.plan.filter(p => p.step === step).length, done = A.placed.filter((_, i) => A.plan[i].step === step).length; return `${done}/${all}`; }
function asmBox(extra) {
  const A = asm(), it = held(), ok = A.placed.filter(p => p.snap).length;
  const last = A.lastSnap == null ? '' : A.lastSnap ? '<span class="ok">맞춤! 결구가 이어졌습니다</span>' : '<span class="miss">빗나감. 결구 없이 그 자리에 놓였습니다</span>';
  return `<div class="asm">
    <div class="asm-top"><span>놓은 부재 <b>${A.placed.length}</b> / ${A.plan.length}</span><span>정위치 맞춤 <b>${ok}</b></span></div>
    ${it ? `<p class="holding">들고 있는 부재 <b>${it.name}</b> · ${MATERIALS[it.mat].name}</p>${it.part && PART_INFO[it.part] ? `<p class="tech">${PART_INFO[it.part]}</p>` : ''}<p class="note">누른 채 끌어 제자리라고 생각하는 곳에서 손을 떼세요. 안내선은 없습니다. 아래 부재와 가운데를 맞추고, 정확히 맞으면 결구가 이어집니다.</p>` : `<p class="holding">모든 부재를 놓았습니다</p>`}
    ${last}
    <div class="row">${it ? extra : ''}<button class="btn line" data-act="undo" ${A.placed.length && !S.testing ? '' : 'disabled'}>하나 되돌리기</button></div></div>`;
}
function panelHTML() {
  if (S.stage === 1) {
    const k = S.tut.kind, ready = S.tut.done >= TUT.length - 1;
    return head('첫째 마당 · 학습', '목탑을 닮은 석탑') + photo('mireuk')
      + asmBox(!ready ? `<button class="btn pat" data-act="autostep" ${dis()}>이 단계 자동으로</button>` : '') + lessonHTML()
      + `<h3>이음 방식</h3>` + seg(Object.entries(JOINT_INFO).map(([id, [n]]) => [id, n]), 'kind', k) + `<p class="note">${JOINT_INFO[k][1]}</p>`
      + `<h3>조립 순서</h3><ol class="steps">${TUT.map(([t, d], i) => `<li class="${i < S.tut.done ? 'done' : i === S.tut.done ? 'now' : ''}"><i>${HAN[i]}</i><span>${t}${i === S.tut.done ? `${i < TUT.length - 1 ? ` <b class="cnt">${stepCount(i)}</b>` : ''}<small>${d}</small>` : ''}</span></li>`).join('')}</ol>`
      + disasterHTML()
      + `<div class="row"><button class="btn line" data-act="leaflet" aria-haspopup="dialog">미륵사지 리플렛</button><button class="btn line" data-act="heritage" aria-haspopup="dialog">국가유산 안내</button></div>`
      + spirit('나무의 짜임을 돌로', '미륵사지 석탑은 목탑의 기둥·창방·평방·공포를 돌로 깎아 그대로 쌓았습니다. 꽉 조이지 않고 부재 사이에 미세한 유격을 남겨 흔들림을 흘려보냅니다.')
      + `<h3>이음별 최고 기록</h3>${records(Object.entries(REC.s1).map(([id, v]) => [JOINT_INFO[id][0], v]), '세 가지 이음으로 각각 한계 도전을 해 보세요.')}`;
  }
  if (S.stage === 2) {
    const s = S.s2, j = true; // 둘째 마당은 석탑만 다룬다(목탑은 첫째 마당)
    return head('둘째 마당 · 응용', '천년의 석탑') + photo('jeong')
      + spirit('검이불루 화이불치', '검소하되 누추하지 않고, 화려하되 사치스럽지 않다. 덜어낼수록 무게중심이 내려앉습니다.')
      + spirit('나무의 집을 돌로 옮긴 탑', '정림사지 오층석탑은 목조건축 양식을 돌로 옮겨 지었습니다. 모서리 기둥(우주)은 배흘림 나무 기둥을, 옥개받침은 처마를 받치는 공포를, 얇고 넓으며 끝이 살짝 들린 옥개석은 기와지붕을 닮았습니다.')
      + asmBox(`<button class="btn pat" data-act="autoall" ${dis()}>남은 부재 자동으로</button>`) + lessonHTML()
      + `<h3>정림사지 둘러보기</h3>${seg([['baekje', '백제 때 정림사<br><small>중문·금당·강당·회랑</small>'], ['today', '오늘날 정림사지<br><small>터·보호각·박물관</small>'], ['future', '미래 복원<br><small>다시 세울 가람</small>']], 'era', S.era || 'baekje')}<p class="note">${(S.era || 'baekje') === 'future' ? '정림사지박물관이 내놓은 복원 계획을 참고해, 오늘의 절터 위에 중문·회랑·2층(중층) 금당·강당·승방을 다시 세워 보았습니다. 건물 모양과 배치는 계획안 그림을 바탕으로 한 게임 속 재현이며, 실제 복원 설계와 다를 수 있습니다. (참고: 정림사지박물관 누리집 「정림사지 복원 계획」)' : (S.era || 'baekje') === 'today' ? '오늘날 금당과 회랑은 터만 남았고, 강당 자리에 고려 때 석조여래좌상을 모신 보호각(1993)이 있습니다. 가까이에 정림사지박물관(2006 개관)이 있습니다.' : '남쪽에서 북쪽으로 중문·오층석탑·금당·강당이 한 줄로 서고, 둘레를 회랑이 감쌌습니다(북쪽이 더 넓은 사다리꼴). 중문 앞에는 연못 두 개가 있었습니다.'}</p>`
      + disasterHTML()
      + `<div class="row"><button class="btn line" data-act="leaflet" aria-haspopup="dialog">정림사지 리플렛</button><button class="btn line" data-act="heritage" aria-haspopup="dialog">국가유산 안내</button><button class="btn line" data-act="gojeung" aria-haspopup="dialog">고증 노트</button></div>`
      + `<details><summary>왜 나무의 기술을 돌에 옮겼을까</summary><p class="note">정림사지 석탑의 모서리 기둥(우주)과 얇게 층층이 받친 옥개석은 목조 건축의 기둥과 공포를 돌로 옮긴 모습입니다. 불에 약한 목탑의 짜임새를 그대로 살리되, 천 년을 견딜 재료로 바꾼 것이지요.</p></details>`
      + `<h3>최고 기록</h3>${records(Object.entries(REC.s2).sort((a, b) => b[1] - a[1]).slice(0, 5), '아직 기록이 없습니다.')}`;
  }
  const st = sim.stats(), T = st.total || 1;
  const crit = S.crit ? critHTML(S.crit)
    : spirit('덜어낼수록 단단해진다', '마당이나 부재 윗면을 눌러 쌓으세요. 나무 위 나무는 주먹장 결구로, 벽돌 위 벽돌은 맞붙임으로 이어지고, 돌은 마른 쌓기입니다. 지진 시험을 마치면 대목장이 비평합니다.');
  return head('셋째 마당 · 창작', '나만의 백제 탑') + `<div class="reals">${photo('jeong', 1)}${photo('mireuk', 1)}</div>` + chatHTML() + crit
    + `<div class="facts"><div><span>부재</span><b>${S.design.length}</b></div><div><span>높이</span><b>${st.height.toFixed(1)}m</b></div><div><span>무게중심</span><b>${st.height ? Math.round(st.comY / st.height * 100) : 0}%</b></div></div>`
    + `<h3>자재 비율 (무게)</h3><div class="bars">${Object.keys(MATERIALS).map(id => `<div class="bar"><span>${MATERIALS[id].name}</span><div class="track"><div style="width:${st.byMat[id] / T * 100}%;background:${MAT_INFO[id].sw}"></div></div><span>${Math.round(st.byMat[id] / T * 100)}%</span></div>`).join('')}</div>`
    + `<h3>백제와 충청의 탑</h3><p class="note">백제 시대 석탑으로 오늘까지 남은 익산 미륵사지 석탑과 부여 정림사지 오층석탑은 이 마당에서 어떤 지진에도 무너지지 않습니다. 나머지 충청 예시 탑은 일부러 무너지게 했습니다(무량사·남매탑·팔상전은 고려·조선 때 지은 탑으로 실제로는 지금도 서 있습니다).</p><div class="ex-grid">${Object.entries(EXAMPLES).filter(([, e]) => !e.world).map(([k, e]) => `<button class="ex" data-ex="${k}" aria-pressed="${S.example === k}" ${dis()}>${e.img ? `<img src="${e.img}" alt="">` : e.world ? `<span class="ex-world" aria-hidden="true">${e.breakAt.toFixed(1)}</span>` : '<span class="ex-mix" aria-hidden="true"></span>'}<b>${e.name}</b><small>${e.tag}</small></button>`).join('')}</div><h3>세계의 탑 · 실제 크기</h3><p class="note">정림사지 오층석탑(8.33m)과 같은 비율로 지은 세계의 탑입니다. 숫자는 이 게임에서 무너지기 시작하는 지진 세기로, 낮은 것부터 차례로 쓰러집니다(게임 속 설정이며 실제 내진 성능과는 다릅니다). 큰 탑은 마우스 휠로 멀리 보세요.</p><div class="ex-grid">${Object.entries(EXAMPLES).filter(([, e]) => e.world).map(([k, e]) => `<button class="ex" data-ex="${k}" aria-pressed="${S.example === k}" ${dis()}>${e.img ? `<img src="${e.img}" alt="">` : e.world ? `<span class="ex-world" aria-hidden="true">${e.breakAt.toFixed(1)}</span>` : '<span class="ex-mix" aria-hidden="true"></span>'}<b>${e.name}</b><small>${e.tag}</small></button>`).join('')}</div>`
    + `<div class="row"><button class="btn line" data-act="heritage" aria-haspopup="dialog">국가유산 안내</button><button class="btn line" data-act="clear" ${S.design.length && !S.testing ? '' : 'disabled'}>모두 지우기</button></div>`
    + `<h3>내진 기록 순위</h3>${records(REC.s3.map(r => [`${r.t} · 부재 ${r.n}`, r.m]), '한계 도전을 마치면 기록이 남습니다.')}`;
}
// 비평 + 진단 근거(로그 원값) + 검증 배지
function critHTML(c) {
  const e = c.ev, ai = c.source === 'ai';
  const badge = ai ? '<span class="badge ok">AI 진단 · 데이터 검증 통과</span>' : '<span class="badge">규칙 기반 진단</span>';
  const why = ai ? 'Claude가 물리 로그를 읽고 쓴 비평입니다. 진단 범주가 규칙 진단과 맞고, 로그의 숫자를 인용한 것을 확인했습니다.'
    : c.pending ? 'AI 대목장이 물리 로그를 읽는 중… 확인이 끝날 때까지 규칙 기반 비평을 보여 드립니다.'
    : c.reject ? `AI 비평을 쓰지 않았습니다: ${esc(c.reject)}. 같은 로그로 계산한 규칙 기반 비평입니다.`
    : '물리 로그를 규칙으로 분석한 비평 · AI 연결 없음';
  const row = (k, v, warn) => `<div${warn ? ' class="warn"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`;
  const evid = e ? `<section class="evid" aria-label="진단 근거"><h4>진단 근거 <small>물리 로그 원값</small></h4><dl>
      ${row('응력 초과 나무 부재', `${e.stressed}개`, e.stressed > 0)}
      ${row('부러진 나무 부재', `${e.broken}개`, e.broken > 0)}
      ${row('무게중심 최대 이탈', `${e.comAngle}° · 밑동 반폭의 ${e.comRatio}%`, e.comRatio > 50)}
      ${row('무게중심 높이', `높이의 ${e.comHeight}% · 세장비 ${e.slender}`, e.comHeight > 55 || e.slender > 3.2)}
      ${row('자중 초과', e.preBroken ? `예 · 지진 전 ${e.preBroken}개 부러짐` : '아니오', e.preBroken > 0)}
      ${row('최대로 버틴 지진 세기', e.survived ? e.survived.toFixed(1) : '버티지 못함')}
    </dl><p class="cat">규칙 진단: <b>${CAT[c.diag.primary]}</b>${ai && c.aiCat && c.aiCat !== c.diag.primary ? ` · AI 진단: ${CAT[c.aiCat]}` : ''}</p></section>` : '';
  return `<div id="critique"><div class="who"><img src="lotus.svg" alt="" width="34" height="34">AI 대목장의 비평</div>${badge}<b class="title">${esc(c.title)}</b><p>${esc(c.text)}</p><p class="lesson">${esc(c.lesson)}</p><span class="seal" aria-hidden="true">大木<br>匠印</span><small>${why}</small></div>${evid}`;
}
// 설명 글을 문장 단위로 줄바꿈한다: 마침표·물음표·느낌표 뒤 띄어쓰기를 줄바꿈으로 바꾼다(숫자 1.0 같은 소수점은 그대로).
// 스토리 글·설명 창·안내 문구 전체에 같은 규칙을 쓴다.
//  1) 문장(. ? !)마다 span.sent 블록: 화면 크기와 상관없이 문장이 끝나면 다음 줄로.
//  2) 긴 문장은 쉼표 뒤 의미 단위를 span.ph로 묶는다: PC(768px 이상)는 inline-block이라 쉼표 자리에서 줄이 바뀌고,
//     모바일은 inline이라 강제 개행 없이 화면 너비대로 흐른다.
const PROSE = '.note, .spirit p, .tech, .steps small, #critique p, .hcard li, .hgame, .hwhere, .gj li, .lesson-box p, .result, .locked, .sheet p, .sheet li, .holding';
function sentenceNode(text) {
  const sp = document.createElement('span'); sp.className = 'sent';
  const phrases = text.length > 26 ? text.split(/(?<=,)\s+/) : [text];
  if (phrases.length > 1) phrases.forEach((p, i) => { const ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = p; sp.appendChild(ph); if (i < phrases.length - 1) sp.appendChild(document.createTextNode(' ')); });
  else sp.textContent = text;
  return sp;
}
function breakSentences(root) {
  if (!root) return;
  for (const el of root.querySelectorAll(PROSE)) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) { const n = walker.currentNode; if (!n.parentNode.closest('.sent') && n.nodeValue.trim() && (/[.!?]\s+\S/.test(n.nodeValue) || /,\s/.test(n.nodeValue) && n.nodeValue.length > 26)) nodes.push(n); }
    for (const n of nodes) {
      const parts = n.nodeValue.split(/(?<=[.!?])\s+(?=\S)/), frag = document.createDocumentFragment();
      if (/^\s/.test(n.nodeValue)) frag.appendChild(document.createTextNode(' '));
      parts.forEach(p => frag.appendChild(sentenceNode(p.trim())));
      n.replaceWith(frag);
    }
  }
}
function render() {
  if (pending && (S.testing || S.dirty || !placing())) setPending(null);
  if (S.stage !== 3) { const A = asm(); if (S.stage === 1) S.tut.done = A.placed.length >= A.plan.length ? TUT.length - 1 : A.plan[A.placed.length].step; }
  const it = held();
  $('#hint').textContent = S.dirty ? '화면을 누르면 탑을 다시 세웁니다' : it ? `${it.name}을(를) 끌어 제자리를 찾아 떼면 놓입니다 · 시점: 오른쪽 드래그 또는 두 손가락` : S.stage === 3 ? (S.pick ? '옮길 부재를 누르세요' : '끌어서 위치를 맞추고 떼면 놓입니다 · R: 돌리기 · 시점: 오른쪽 드래그') : '드래그: 돌려 보기 · 휠/두 손가락: 확대';
  showTarget(); syncControls();
  { const can = !S.testing && (S.stage === 3 ? S.design.length > 0 : asm().placed.length > 0); const q = $("#quickUndo"); q.disabled = !can; q.hidden = S.stage !== 3 && !asm().placed.length && !S.testing; }
  document.querySelectorAll('#tabs a').forEach(b => b.setAttribute('aria-current', b.dataset.stage == S.stage ? 'step' : 'false'));
  const best = S.stage === 1 ? Math.max(0, ...Object.values(REC.s1)) : S.stage === 2 ? Math.max(0, ...Object.values(REC.s2)) : Math.max(0, ...REC.s3.map(r => r.m));
  $('#best').textContent = best ? `지진 세기 ${best.toFixed(1)}` : '없음';
  panel.innerHTML = panelHTML();
  $('#dock').innerHTML = dockHTML();
  breakSentences(panel); breakSentences($('#dock'));
  const nx = $('#next'); nx.innerHTML = nextHTML(); nx.hidden = S.stage === 3;
  const tools = $('#tools'); tools.innerHTML = toolsHTML(); tools.hidden = S.stage !== 3;
  document.body.dataset.stage = S.stage;
}

const ui = $('#ui');
ui.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.kind) { S.tut.kind = d.kind; S.last = null; resetAsm(1); rebuild(); }
  if (d.kind2) { S.s2.kind = d.kind2; S.last = null; resetAsm(2); rebuild(); }
  if (d.s2m) { Object.assign(S.s2, HIST, d.s2m === 'ornate' ? ORNATE : {}); S.last = null; resetAsm(2); rebuild(); }
  if (d.era) { S.era = d.era; syncVillage(); if (d.era === 'future') { camera.position.set(25, 25, 22); controls.target.set(2, 0, -4); controls.update(); } }
  if (d.preset) { S.s2.preset = d.preset; S.last = null; resetAsm(2); rebuild(); }
  if (d.ex) { S.design = EXAMPLES[d.ex].design(); S.example = d.ex; S.last = null; rebuild(); fitCamera(); banner(`${EXAMPLES[d.ex].name}을(를) 불러왔습니다`, '#fff'); }
  if (d.mat) S.sel.mat = d.mat;
  if (d.shape) S.sel.shape = d.shape;
  const a = d.act;
  if (a === 'autostep') autoPlace(S.tut.done);
  if (a === 'autoall') autoPlace();
  if (a === 'pick') S.pick = !S.pick;
  if (a === 'fixed' || a === 'ramp') { if (!sess().quiz.pre) return openSheet('quiz-pre', a); startTest(a); }
  if (a === 'gojeung') return openSheet('gojeung');
  if (a === 'heritage') return openSheet('heritage');
  if (a === 'leaflet') return stageLeaflet(true);
  if (a === 'why') return openSheet('why');
  if (a === 'stop') { sim.quake.done = true; return; }
  if (a === 'rebuild') rebuild();
  if (a === 'hist') { Object.assign(S.s2, HIST); resetAsm(2); rebuild(); }
  if (a === 'rot') S.rot ^= 1;
  if (a === 'undo') return undo();
  if (a === 'clear') { S.design = []; S.last = null; rebuild(); }
  if (a === 'sample') { S.design = sampleDesign(); S.example = 'mix'; S.last = null; rebuild(); }
  render();
});
ui.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'mag') { S.mag = +t.value; $("#magBig").textContent = S.mag.toFixed(1); $('#magPga').textContent = pga(S.mag).toFixed(2); }
  if (t.dataset.p && t.type === 'range') { S.s2[t.dataset.p] = +t.value; $('#o-' + t.dataset.p).textContent = t.value + (t.dataset.p === 'taper' ? '' : '×'); }
});
ui.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.p) { if (t.type === 'checkbox') S.s2.ornament = t.checked; S.last = null; resetAsm(2); rebuild(); render(); }
});
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('a'); if (!b) return;
  e.preventDefault(); if (S.testing) return;
  S.stage = +b.dataset.stage; S.last = null; location.hash = 'stage' + S.stage; rebuild(); render(); stageLeaflet();
});

// 돌 기단 + 나무 몸체 + 벽돌 상층: the "백제 장인" recipe, so the sandbox opens mid-use
// 충청 지역 국가유산 탑을 실제 부재로 쌓은 예시(셋째 마당). 설계도 부재를 셋째 마당 부재로 옮긴다.
function planToDesign(build) {
  const plan = recordPlan(build);
  return plan.map(p => {
    const j = p.joints.find(j => j.b != null), other = j ? (j.a === p.idx ? j.b : j.a) : null;
    const shape = p.size[1] > Math.max(p.size[0], p.size[2]) * 2 ? 'pillar' : p.size[1] < 0.35 ? 'slab' : 'block';
    const links = p.joints.filter(j => j.b != null).map(j => ({ to: j.a === p.idx ? j.b : j.a, joint: j.kind, anchor: j.anchor.slice() }));
    return { mat: p.mat, shape, size: p.size.slice(), part: p.part, tint: p.tint, po: p.po, pos: p.pos.slice(), rot: 0, parent: other, joint: j ? j.kind : undefined, anchor: j ? j.anchor.slice() : null, links };
  });
}
const EXAMPLES = {
  jeong: { name: '부여 정림사지 오층석탑', tag: '충남 · 백제 · 오늘까지 남음', img: 'pagoda-jeongnimsa.svg', design: () => planToDesign(r => buildJeongnimsa(r, HIST)) },
  mireuk: { name: '익산 미륵사지 석탑', tag: '전북 · 백제 639년 · 오늘까지 남음', img: 'pagoda-mireuksa.svg', design: () => planToDesign(r => buildMireuksa(r)) },
  muryang: { fragile: true, name: '부여 무량사 오층석탑', tag: '충남 · 고려 · 백제계', img: 'pagoda-muryangsa.svg', design: () => planToDesign(r => buildJeongnimsa(r, { taper: 0.9, roof: 2.0, body: 0.8, first: 0.95, steps: 2, rt: 0.3, tone: 'warm' })) },
  cheongnyang: { fragile: true, name: '공주 청량사지 남매탑', tag: '충남 · 고려 · 백제계 · 오층과 칠층', img: 'pagoda-cheongnyangsa.svg', design: () => planToDesign(r => { buildJeongnimsa(r, { k: 0.55, x: -2.1, taper: 0.86, roof: 1.65, first: 1.2, tone: 'pink' }); buildJeongnimsa(r, { k: 0.55, x: 2.1, stories: 7, taper: 0.9, roof: 1.6, first: 1.05, body: 0.85, tone: 'pink' }); }) },
  palsang: { fragile: true, name: '보은 법주사 팔상전', tag: '충북 · 조선 · 목탑', img: 'pagoda-palsangjeon.svg', design: () => planToDesign(r => buildPalsang(r)) },
  ...Object.fromEntries(Object.entries(WORLD).map(([k, w]) => [k, { world: true, breakAt: w.breakAt, name: w.name, tag: w.tag + ` · 세기 ${w.breakAt.toFixed(1)}에서 무너짐`, img: null, design: () => planToDesign(r => w.build(r)) }])),
  mix: { fragile: 3, name: '세 자재 섞은 연습 탑', tag: '돌·나무·문양전', img: null, design: () => sampleDesign() },
};
function sampleDesign() {
  const d = [], add = (mat, shape, x, y, z, parent = null, joint) => { d.push({ mat, shape, pos: [x, y, z], rot: 0, parent, joint, anchor: parent != null ? [x, y - SHAPES[shape].size[1] / 2, z] : null }); return d.length - 1; };
  add('granite', 'slab', -1, 0.16, -1); add('granite', 'slab', 1, 0.16, -1); add('granite', 'slab', -1, 0.16, 1); add('granite', 'slab', 1, 0.16, 1);
  add('granite', 'slab', 0, 0.47, 0);
  add('granite', 'block', 0, 1.13, 0);
  let s = add('pine', 'slab', 0, 1.79, 0);
  const p = [];
  for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) p.push(add('pine', 'pillar', x, 2.7, z, s, 'flex'));
  s = add('pine', 'slab', 0, 3.61, 0, p[0], 'flex');
  let b = add('brick', 'brick', 0, 3.94, 0);
  b = add('brick', 'brick', 0, 4.3, 0, b, 'mortar');
  add('brick', 'brick', 0, 4.66, 0, b, 'mortar');
  return d;
}

// ---------- 학습 기록: 지진 시험마다 남기고(localStorage), 시험 전·3번째 시험 후 같은 질문을 묻는다 ----------
const KIOSK = new URLSearchParams(location.search).get('kiosk') === '1';
document.body.classList.toggle('kiosk', KIOSK);
const STAGE_NAME = { 1: '목탑을 닮은 석탑', 2: '천년의 석탑', 3: '나만의 백제 탑' };
const QUIZ = {
  q: '탑을 지진에 더 강하게 만들려면?',
  choices: [
    ['a', '위층까지 무거운 돌로 꽉 채우고, 이음은 못으로 단단히 고정한다'],
    ['b', '하층은 넓고 무겁게, 상층은 가볍게, 결구에 유격을 둔다'],
    ['c', '부재를 최대한 많이, 높이 쌓아 무게로 누른다'],
    ['d', '위로 갈수록 넓고 무겁게 쌓아 균형을 잡는다'],
  ],
  answer: 'b',
};
let LEARN = { version: 1, sessions: [] };
try { const v = JSON.parse(localStorage.getItem('baekje-learn') || 'null'); if (v && Array.isArray(v.sessions)) LEARN = v; } catch { /* 저장소 없음 */ }
const saveLearn = () => { try { localStorage.setItem('baekje-learn', JSON.stringify(LEARN)); } catch { /* 저장소 없음 */ } };
function newSession() {
  LEARN.sessions.push({ id: Date.now().toString(36), startedAt: new Date().toISOString(), kiosk: KIOSK, quiz: { pre: null, post: null }, trials: [] });
  LEARN.sessions = LEARN.sessions.slice(-30); saveLearn();
}
if (!LEARN.sessions.length || KIOSK) newSession(); // 키오스크는 관람객마다 새 기록
const sess = () => LEARN.sessions[LEARN.sessions.length - 1];
function recordTrial(st, res, diag) {
  const T = st.total || 1, pct = v => Math.round(v / T * 100), s = sess();
  s.trials.push({
    attempt: s.trials.length + 1, stage: S.stage, stageName: STAGE_NAME[S.stage], at: new Date().toISOString(),
    mode: res.mode === 'ramp' ? '한계 도전' : `고정 ${res.mag.toFixed(1)}`,
    materialMix: { 화강암: pct(st.byMat.granite), 소나무: pct(st.byMat.pine), 문양전: pct(st.byMat.brick) },
    maxSurvived: res.survived || 0, collapsed: res.collapsed,
    cause: diag.primary, causeLabel: CAT[diag.primary],
  });
  saveLearn();
}
function answerQuiz(when, choice) {
  sess().quiz[when] = { choice, text: QUIZ.choices.find(c => c[0] === choice)[1], correct: choice === QUIZ.answer, at: new Date().toISOString() };
  saveLearn();
}
function downloadLearn() {
  const blob = new Blob([JSON.stringify({ app: '백제 결구 물리학', exportedAt: new Date().toISOString(), question: QUIZ.q, correctAnswer: QUIZ.choices.find(c => c[0] === QUIZ.answer)[1], ...LEARN }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `baekje-learning-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// 최대로 버틴 지진 세기 추이 (작은 꺾은선)
function chartSVG(trials) {
  if (!trials.length) return '<p class="note">지진 시험을 하면 시도마다 버틴 지진 세기가 여기에 그려집니다.</p>';
  const W = 320, H = 128, l = 28, r = 10, t = 10, b = 22, n = trials.length;
  const x = i => n === 1 ? (l + W - r) / 2 : l + i * (W - l - r) / (n - 1), y = v => t + (7 - v) / 7 * (H - t - b);
  const grid = [0, 3.5, 7].map(v => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" class="lc-grid"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const every = Math.ceil(n / 8);
  const xs = trials.map((tr, i) => i % every === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${tr.attempt}</text>` : '').join('');
  const pts = trials.map((tr, i) => `${x(i).toFixed(1)},${y(tr.maxSurvived).toFixed(1)}`).join(' ');
  const dots = trials.map((tr, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(tr.maxSurvived).toFixed(1)}" r="3.5" class="lc-dot"><title>${tr.attempt}번째 · ${tr.maxSurvived.toFixed(1)}</title></circle>`).join('');
  return `<svg class="lchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="시도별 최대로 버틴 지진 세기: ${trials.map(tr => tr.maxSurvived.toFixed(1)).join(', ')}">${grid}${xs}${n > 1 ? `<polyline points="${pts}" class="lc-line"/>` : ''}${dots}</svg><p class="note lc-cap">가로: 시도 순서 · 세로: 최대로 버틴 지진 세기(게임 내 값)</p>`;
}
function quizRow(label, a) {
  return `<div class="qa"><span>${label}</span>${a ? `<b class="${a.correct ? 'ok' : 'miss'}">${a.correct ? '○' : '×'} ${esc(a.text)}</b>` : '<b class="none">아직 답하지 않음</b>'}</div>`;
}
function learnHTML() {
  const s = sess(), tr = s.trials, best = Math.max(0, ...tr.map(t => t.maxSurvived));
  const rows = tr.slice(-8).reverse().map(t => `<tr><td>${t.attempt}</td><td>${t.stageName}</td><td>${t.materialMix.화강암}/${t.materialMix.소나무}/${t.materialMix.문양전}</td><td>${t.maxSurvived ? t.maxSurvived.toFixed(1) : '–'}</td><td>${esc(t.causeLabel)}</td></tr>`).join('');
  return `${head('지진 시험 기록', '<span id="sheetTtl">학습 기록</span>')}
    <div class="facts"><div><span>시험</span><b>${tr.length}회</b></div><div><span>최고 지진 세기</span><b>${best ? best.toFixed(1) : '–'}</b></div><div><span>자주 나온 원인</span><b class="sm">${tr.length ? esc(topCause(tr)) : '–'}</b></div></div>
    <h3>최대로 버틴 지진 세기</h3>${chartSVG(tr)}
    ${tr.length ? `<div class="tscroll"><table class="trials"><thead><tr><th>#</th><th>마당</th><th>화강암/소나무/문양전 %</th><th>버틴 세기</th><th>원인</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    <h3>확인 질문 · ${QUIZ.q}</h3>
    ${quizRow('첫 시험 전', s.quiz.pre)}${quizRow('세 번째 시험 후', s.quiz.post)}
    ${s.quiz.pre && s.quiz.post ? `<p class="note">정답: ${esc(QUIZ.choices.find(c => c[0] === QUIZ.answer)[1])}</p>` : !s.quiz.post ? '<p class="note">세 번째 지진 시험을 마치면 같은 질문을 다시 묻습니다.</p>' : ''}
    <div class="row"><button class="btn line dev" data-x="download">기록 JSON 내려받기</button><button class="btn pat" data-x="close">닫기</button></div>`;
}
function topCause(tr) {
  const c = {}; for (const t of tr) c[t.causeLabel] = (c[t.causeLabel] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0].replace(/ \(.*\)$/, '');
}
function quizHTML(when) {
  return `${head(when === 'pre' ? '첫 지진 시험 전에' : '세 번째 시험을 마쳤습니다', '<span id="sheetTtl">확인 질문</span>')}
    <p class="qq">${QUIZ.q}</p>
    <div class="choices">${QUIZ.choices.map(([id, t]) => `<button class="btn line" data-quiz="${id}">${esc(t)}</button>`).join('')}</div>
    <p class="note">${when === 'pre' ? '지금 생각을 고르면 시험이 시작됩니다. 세 번째 시험 뒤에 같은 질문을 다시 묻고, 두 답을 학습 기록에 나란히 보여 드립니다.' : '세 번 시험해 본 지금은 어떻게 생각하나요? 답은 학습 기록에 남습니다.'}</p>`;
}
function gojeungHTML() {
  const li = a => a.map(t => `<li>${t}</li>`).join('');
  return `${head('둘째 마당 · 천년의 석탑', '<span id="sheetTtl">고증 노트</span>')}
    <div class="gj">
      <section><h3>실제 정림사지 오층석탑</h3><ul>${li(['백제 사비기(7세기 무렵)에 세운 석탑', '국보', '높이 약 8.3m', '2015년 백제역사유적지구로 유네스코 세계유산 등재', '약 1,400년 동안 원래 자리에 서 있음', '목탑의 결구 방식을 돌로 옮긴 양식으로 평가됨'])}</ul></section>
      <section><h3>게임에서 단순화한 점</h3><ul>${li(['내부 적심석은 생략하고 핵심 부재만 모듈로 나눔', '지진 세기(1.0–7.0)는 실제 규모·진도가 아닌 게임 안의 값', '부재 치수는 실측 비례를 참고한 근사값'])}</ul></section>
    </div>
    <p class="note">게임의 지진 시험은 비례와 무게중심의 차이를 보여 주기 위한 모형이며, 실제 탑의 내진 성능을 재현하거나 평가하지 않습니다.</p>
    <div class="row"><button class="btn pat" data-x="close">닫기</button></div>`;
}
const sheet = $('#sheet'), sheetIn = sheet.querySelector('.sheet');
let sheetKind = null, sheetAfter = null, sheetFocus = null;
function openSheet(kind, after) {
  if (!sheetKind) sheetFocus = document.activeElement;
  sheetKind = kind; sheetAfter = after || null;
  sheetIn.innerHTML = kind === 'learn' ? learnHTML() : kind === 'gojeung' ? gojeungHTML() : kind === 'heritage' ? heritageHTML() : kind === 'why' ? whyHTML() : quizHTML(kind === 'quiz-pre' ? 'pre' : 'post');
  breakSentences(sheetIn);
  sheet.hidden = false; sheetIn.focus();
}
function closeSheet() {
  if (!sheetKind) return;
  sheet.hidden = true; sheetKind = null; sheetAfter = null;
  if (sheetFocus && sheetFocus.isConnected) sheetFocus.focus();
}
sheet.addEventListener('click', e => {
  if (e.target === sheet) return closeSheet();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.x === 'close') closeSheet();
  if (b.dataset.x === 'download') downloadLearn();
  if (b.dataset.quiz) {
    const pre = sheetKind === 'quiz-pre', after = sheetAfter;
    answerQuiz(pre ? 'pre' : 'post', b.dataset.quiz); closeSheet();
    if (pre && after && !S.testing) startTest(after);
    else if (!pre) openSheet('learn');
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && sheetKind) closeSheet(); });

// ---------- 저사양·키오스크: FPS 측정, 자동 성능 모드(3초 평균 45fps 미만), ?kiosk=1 ----------
const FPS = { frames: 0, t0: performance.now(), hist: [], cur: 0, since: performance.now(), show: false };
const PERF = { on: false, auto: true };
const fpsEl = $('#fps');
function tickFps(now, gap) {
  if (gap > 500) { FPS.frames = 0; FPS.t0 = now; FPS.hist = []; return; } // 탭이 숨었다 돌아옴
  FPS.frames++;
  if (now - FPS.t0 < 1000) return;
  FPS.cur = FPS.frames * 1000 / (now - FPS.t0); FPS.frames = 0; FPS.t0 = now;
  FPS.hist.push(FPS.cur); if (FPS.hist.length > 3) FPS.hist.shift();
  const avg = FPS.hist.reduce((s, v) => s + v, 0) / FPS.hist.length;
  if (FPS.show) fpsEl.textContent = `FPS ${Math.round(FPS.cur)} · 3초 평균 ${Math.round(avg)} · 부재 ${sim.blocks.length}${PERF.on ? ' · 저사양' : ''}`;
  if (PERF.auto && !PERF.on && FPS.hist.length === 3 && now - FPS.since > 5000 && avg < 45 && !document.hidden) {
    setPerf(true); notice(`화면이 느려(평균 ${Math.round(avg)}fps) 저사양 모드로 바꿨습니다 · 해상도·그림자·물리 계산을 낮춤`);
  }
}
function setPerf(on) {
  PERF.on = on;
  renderer.setPixelRatio(on ? 1 : Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = !on; sun.castShadow = !on;
  scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  sim.setStep(on ? 1 / 120 : 1 / 240);
  FPS.hist = []; FPS.since = performance.now();
  syncXbar();
}
let noticeT;
function notice(text) { const n = $('#notice'); n.textContent = text; n.classList.add('show'); clearTimeout(noticeT); noticeT = setTimeout(() => n.classList.remove('show'), 6000); }
function syncXbar() {
  $('#xbar [data-x="fps"]').setAttribute('aria-pressed', FPS.show);
  $('#xbar [data-x="perf"]').setAttribute('aria-pressed', PERF.on);
  fpsEl.hidden = !FPS.show;
}
$('#xbar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const x = b.dataset.x;
  if (x === 'learn') openSheet('learn');
  if (x === 'heritage') openSheet('heritage');
  if (x === 'fps') { FPS.show = !FPS.show; fpsEl.textContent = '측정 중…'; syncXbar(); }
  if (x === 'perf') { PERF.auto = false; setPerf(!PERF.on); notice(PERF.on ? '저사양 모드 켬 · 해상도 1배, 그림자 끔, 물리 1/120초' : '저사양 모드 끔 · 자동 전환도 멈춤'); }
});
// 키오스크: 90초 동안 입력이 없으면 첫 화면으로
const titleEl = $('#title');
let lastInput = performance.now();
for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(t, () => { lastInput = performance.now(); }, { capture: true, passive: true });
function showTitle() { titleEl.hidden = false; titleEl.querySelector('button').focus(); }
titleEl.addEventListener('click', () => { titleEl.hidden = true; lastInput = performance.now(); });
function kioskReset() {
  closeSheet();
  Object.assign(S, { stage: 1, mag: 5, testing: false, tut: { done: 1, kind: 'flex' }, s2: { preset: 'jeong', kind: 'flex', ...HIST },
    sel: { mat: 'granite', shape: 'block' }, rot: 0, design: [], dirty: false, pick: false, last: null, crit: null });
  resetAsm(1); resetAsm(2); history.replaceState(null, '', location.pathname + location.search);
  camera.position.set(12, 8.5, 14); controls.target.set(0, 3.2, 0);
  newSession(); rebuild(); render(); showTitle();
}
if (KIOSK) setInterval(() => { if (titleEl.hidden && !S.testing && performance.now() - lastInput > 90000) kioskReset(); }, 1000);

// ---------- loop ----------
const ro = new ResizeObserver(() => { const w = stageEl.clientWidth, h = stageEl.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  // 세로 휴대폰처럼 좁은 화면에서도 탑 전체 너비가 보이게 세로 화각을 넓힌다(가로 화각 유지)
  const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * 1.12); camera.fov = Math.min(78, Math.max(40, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / camera.aspect))));
  camera.updateProjectionMatrix(); });
ro.observe(stageEl);
let last = performance.now(), frameN = 0;
// 장면 이름표(오늘날 정림사지 표시에 쓴다)
const fx = new THREE.Group(); scene.add(fx);
function label(text, x, y, z, { gold = false, w = 3.2 } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const g = c.getContext('2d');
  g.fillStyle = gold ? 'rgba(20,19,17,.88)' : 'rgba(234,228,215,.94)'; g.strokeStyle = gold ? '#c8a054' : '#9c917c'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(4, 4, 504, 104, 26); g.fill(); g.stroke();
  g.fillStyle = gold ? '#e2c27c' : '#1d1b18'; g.font = `${gold ? 46 : 40}px "Song Myung", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 58, 480);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(w, w * 112 / 512, 1); s.position.set(x, y, z); s.renderOrder = 20; fx.add(s); return s;
}

function disasterHTML() { // 시험은 지진만. 목탑→석탑 이유 설명창 버튼
  return `<button class="btn line" data-act="why" aria-haspopup="dialog">왜 목탑에서 석탑으로 바뀌었을까?</button>`;
}
function whyHTML() {
  return `${head('목탑과 석탑', '<span id="sheetTtl">왜 목탑에서 석탑으로 바뀌었을까?</span>')}
    <p class="note">왜 바꾸었는지 직접 적은 옛 기록은 남아 있지 않습니다. 아래는 학계에서 흔히 드는 이유와 남아 있는 유적이 보여 주는 사실입니다.</p>
    <div class="gj">
      <section><h3>1. 나무는 불과 비에 약하다</h3><ul><li>목탑은 벼락이나 전쟁의 불길에 쉽게 탔고, 빗물과 습기에 기둥과 결구가 썩어 늘 고쳐야 했습니다.</li><li>백제의 큰 목탑들은 오늘날 터만 남았습니다. 능사지 목탑 터, 익산 미륵사지 가운데 목탑 터가 그 예입니다.</li></ul></section>
      <section><h3>2. 돌은 오래 간다</h3><ul><li>화강암은 타지 않고 썩지 않습니다.</li><li>같은 미륵사지에서도 목탑은 사라지고 서쪽 석탑(639년 사리 봉안)이 남았습니다. 정림사지 석탑도 1,300년 넘게 그 자리를 지켰습니다.</li></ul></section>
      <section><h3>3. 돌을 다루는 백제의 기술</h3><ul><li>백제는 화강암을 다듬어 짜 맞추는 기술이 뛰어났습니다.</li><li>큰 나무를 구하고 다루는 부담을 덜 수 있었다는 견해도 있습니다(학계의 해석).</li></ul></section>
      <section><h3>4. 나무의 짜임새를 돌로 옮기다</h3><ul><li>석탑은 목탑의 기둥(우주)·공포(옥개받침)·지붕(옥개석)을 그대로 돌로 옮겼습니다.</li><li>미륵사지 석탑은 목탑을 충실히 따랐고, 정림사지 석탑은 이를 간결하고 세련되게 다듬었다고 평가됩니다.</li></ul></section>
    </div>
    <p class="note">학계 메모: 정림사지 석탑과 미륵사지 석탑 가운데 어느 쪽이 먼저 세워졌는지는 의견이 갈립니다. 출처: 국가유산청 국가유산포털(익산 미륵사지 석탑, 부여 정림사지 오층석탑), 국립부여박물관.</p>
    <div class="row"><button class="btn pat" data-x="close">닫기</button></div>`;
}

function loop(now) {
  const gap = now - last, dt = Math.min(0.05, gap / 1000); last = now;
  tickFps(now, gap);
  sim.frame(dt); dustTick(dt);
  if (sim.quake && sim.quake.done) finishTest();
  groundMesh.position.set(sim.gx, -0.5, sim.gz);
  for (const m of meshes) { const b = m.userData.block, t = b.body.translation(), r = b.body.rotation(); m.position.set(t.x, t.y, t.z); m.quaternion.set(r.x, r.y, r.z, r.w); }
  if (frameN++ % 6 === 0) {
    const st = sim.stats();
    comMark.visible = st.count > 0;
    if (st.count) { comMark.position.set(sim.gx, st.comY, sim.gz); comLine.scale.y = st.comY; comLine.position.y = -st.comY / 2; }
    const mg = sim.quake ? sim.mag : 0; $('#hMag').textContent = mg.toFixed(1); document.querySelectorAll('#segs i').forEach((el, k) => el.classList.toggle('on', k + 1 <= mg));
    $('#hPga').textContent = sim.quake ? pga(sim.mag).toFixed(2) : '0.00';
    $('#hInt').textContent = sim.quake && sim.quake.integrity != null ? Math.round(sim.quake.integrity * 100) + '%' : '100%';
    $('#hCom').textContent = st.comY.toFixed(1) + 'm';
    if (sim.quake && sim.quake.mode === 'ramp') { const m = sim.mag; if (m !== S.rampShown) { S.rampShown = m; if (!sim.quake.collapsed && m > 1) banner(`지진 세기 ${m.toFixed(1)}`, '#fff'); } }
  }
  if (target.visible) target.position.x = asm().plan[asm().placed.length].pos[0] + sim.gx;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

try {
  await RAPIER.init();
  await Promise.all([loadPartModels(), loadVillageModels()]); // 블렌더 부재·마을 건물이 있으면 먼저 불러 둔다
  sim = new Sim(RAPIER); hookSim();
  const h = location.hash.match(/stage([123])/); if (h) S.stage = +h[1];
  S.design = []; resetAsm(1); resetAsm(2);
  rebuild(); render(); requestAnimationFrame(loop);
  if (KIOSK) showTitle(); else stageLeaflet();
  window.__game = { S, sim, asm, autoPlace, render, FPS, PERF, setPerf, renderer, scene, camera, proj: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera), r = renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; } };
} catch (err) { console.error(err); $('#err').style.display = 'grid'; }
setTimeout(() => syncVillage(true), 0); // 시작할 때 마을을 세운다
