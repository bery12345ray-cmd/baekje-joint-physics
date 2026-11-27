// 셋째 마당 대화창: "곰돌이 모양 탑 만들어줘" 같은 말을 Claude가 부재 목록(JSON)으로 설계한다.
// API 키는 서버 쪽(.env.local의 ANTHROPIC_API_KEY)에서만 읽는다. 키가 없으면 503을 돌려주고, 게임은 내장 생성기를 쓴다.
import Anthropic from '@anthropic-ai/sdk'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

const MODEL = 'claude-opus-5-5'

const SYSTEM = `너는 백제 탑 쌓기 물리 게임의 설계 도우미다. 사용자가 말한 모양의 탑을 상자 모양 부재들로 설계한다.

규칙:
- 좌표 단위는 게임 단위(1 ≈ 1.4m). 바닥은 y=0. x, z는 -8~8 안. 각 부재의 y는 부재의 가운데 높이다(바닥에 놓인 높이 h 부재의 y = h/2).
- 부재는 반드시 바닥이나 아래 부재 위에 얹혀야 한다(공중에 뜨거나 겹치지 않게). 아래 부재 윗면 높이 + 자기 h/2 = y.
- 부재 크기 w, h, d는 0.2~6. 부재는 60개 이하.
- 자재: granite(화강암, 무겁고 단단함 → 아래에), pine(소나무, 가볍고 따뜻한 갈색), brick(문양전, 회색 벽돌).
- 모양이 한눈에 알아보이게, 그러면서 무게중심이 너무 높지 않게 설계한다. 무거운 돌을 가벼운 나무 위에 얹지 않는다.
- reply: 사용자에게 보여 줄 한두 문장(존댓말, 무엇을 어떻게 지었는지와 지진에 강할지 약할지).`

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mat: { type: 'string', enum: ['granite', 'pine', 'brick'] },
          x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' },
          w: { type: 'number' }, h: { type: 'number' }, d: { type: 'number' },
        },
        required: ['mat', 'x', 'y', 'z', 'w', 'h', 'd'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'blocks'],
  additionalProperties: false,
} as const

async function readJson(req: IncomingMessage): Promise<{ prompt?: unknown }> {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 4000) throw new Error('prompt too large')
  }
  return JSON.parse(body)
}

export function buildPlugin(apiKey: string | undefined): Plugin {
  const client = apiKey ? new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 }) : null
  return {
    name: 'baekje-ai-build',
    configureServer(server) {
      server.middlewares.use('/api/build', async (req, res) => {
        const send = (status: number, data: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        }
        if (req.method !== 'POST') return send(405, { error: 'POST only' })
        if (!client) return send(503, { error: 'no_api_key' })
        try {
          const { prompt } = await readJson(req)
          if (typeof prompt !== 'string' || !prompt.trim()) return send(400, { error: 'empty' })
          const response = await client.beta.messages.create({
            model: MODEL,
            max_tokens: 8000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
            system: SYSTEM,
            messages: [{ role: 'user', content: prompt.slice(0, 300) }],
          })
          if (response.stop_reason === 'refusal') return send(502, { error: 'refusal' })
          const text = response.content.find((b) => b.type === 'text')
          if (!text || text.type !== 'text') return send(502, { error: 'empty' })
          send(200, JSON.parse(text.text))
        } catch (err) {
          if (err instanceof Anthropic.AuthenticationError) return send(401, { error: 'bad_api_key' })
          if (err instanceof Anthropic.RateLimitError) return send(429, { error: 'rate_limited' })
          if (err instanceof Anthropic.APIError) return send(502, { error: `api_${err.status ?? 'error'}` })
          server.config.logger.error(`[AI 설계] ${(err as Error).message}`)
          send(500, { error: 'failed' })
        }
      })
    },
  }
}
