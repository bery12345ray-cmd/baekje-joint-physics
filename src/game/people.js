// 재해 장면 인물: 교육 만화풍(2~3등신) — 모양은 chibi.js가 그린다
import { chibi } from './chibi.js';
const wrap = g => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-130 -240 260 256" width="520" height="512">${g}</svg>`;
export const PEOPLE_SVG = {
  carpenter: wrap(chibi('carpenter', 'work')),
  carpenter2: wrap(chibi('carpenter2')),
  baekje: wrap(chibi('baekje', 'attack')),
  enemy: wrap(chibi('enemy', 'attack')),
  archer: wrap(chibi('archer')),
  general: wrap(chibi('general')),
  villager: wrap(chibi('villager')),
  villager2: wrap(chibi('villager2')),
};
export const PEOPLE_ASPECT = 260 / 256;
