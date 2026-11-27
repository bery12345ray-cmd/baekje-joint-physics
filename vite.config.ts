import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { critiquePlugin } from './server/critique.ts'
import { buildPlugin } from './server/build.ts'

export default defineConfig(({ command, mode }) => {
  // .env.local 등에서 읽되 VITE_ 접두사가 없으니 브라우저 번들에는 노출되지 않는다.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 배포(GitHub Pages 등)는 어느 하위 주소에서 열려도 되도록 상대 경로로 빌드한다
    base: command === 'build' ? './' : '/',
    plugins: [react(), tailwindcss(), critiquePlugin(env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY), buildPlugin(env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)],
  }
})
