import { useEffect } from 'react'
import markup from './game/markup.html?raw'
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
