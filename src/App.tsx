import { useEffect } from 'react'
import markup from './game/markup.html?raw'
import '../design/brand/brand-colors.css' // 브랜드 색 변수(기준: design/brand/brand-tokens.json, 값은 바꾸지 않음)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css' // Pretendard Variable(SIL OFL), 글자 범위별로 나눈 woff2를 직접 싣는다
import './game/game.css'

// 데모 아티팩트(바닐라 Three.js + Rapier) 게임을 그대로 띄운다.
// game.js는 모듈 최상위에서 DOM을 찾아 시작하므로, 마크업을 먼저 그린 뒤 한 번만 불러온다.
let started = false

export default function App() {
  useEffect(() => {
    if (started) return
    started = true
    void import('./game/game.js')
  }, [])
  return <div id="game-root" dangerouslySetInnerHTML={{ __html: markup }} />
}
