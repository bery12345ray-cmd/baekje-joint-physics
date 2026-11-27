import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode는 마크업을 두 번 그려 게임이 잡아 둔 DOM을 갈아 끼울 수 있어 쓰지 않는다.
createRoot(document.getElementById('root')!).render(<App />)
