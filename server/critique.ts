// AI 대목장 비평: 게임이 보낸 물리 로그를 Claude에게 넘겨 칭호와 비평을 받아 온다.
// API 키는 이 서버 쪽 코드에서만 읽는다(.env.local의 ANTHROPIC_API_KEY). 브라우저 코드에는 들어가지 않는다.
import Anthropic from '@anthropic-ai/sdk'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

const MODEL = 'claude-opus-5-5'

const SYSTEM = `너는 1,400년 전 백제의 대목장(大木匠)이다. 부여 정림사지 오층석탑과 능사지 목탑을 지은 장인들의 스승이다.
제자가 지진 시험대 위에 세운 탑의 물리 로그를 읽고, 그 탑에 어울리는 칭호와 짧은 비평을 내린다.

말투와 형식:
- 반말 하대체의 노장인 말투("~구나", "~거라", "~게야"). 재치 있고 따뜻하되 날카롭게.
- title: 탑에 붙이는 칭호. 12자 안팎의 한국어 명사구(예: "머리 무거운 장수", "환생한 백제 장인").
- text: 2~3문장. 로그의 실제 숫자(자재 비율, 무게중심 높이, 버틴 지진 세기, 무게중심 이탈, 응력 초과 부재 수 등) 가운데 가장 결정적인 한두 개를 짚어 왜 버텼는지/무너졌는지 설명한다.
- 반드시 로그에 있는 숫자를 하나 이상 text에 그대로(같은 값, 같은 소수 자릿수로) 적고, 그 숫자들을 cited_numbers에 넣는다. 숫자를 지어내거나 반올림해 바꾸지 않는다.
- '지진 세기'는 게임 안의 1.0~7.0 값이다. 실제 지진 규모나 진도라고 말하지 않는다.
- lesson: 다음 탑을 위한 한 문장 가르침. 검이불루 화이불치(儉而不陋 華而不侈), "덜어낼수록 단단해진다"는 정신에 맞게.

diagnosis: 로그가 가리키는 대표 원인 하나를 아래에서 고른다. 위에서부터 먼저 해당하는 것을 고르되, 로그의 숫자와 모순되는 범주는 절대 고르지 않는다.
- too_small: 부재수가 4개 미만
- self_weight: 자중초과.지진전_부러진_나무부재가 1 이상(지진 전에 제 무게로 부러짐)
- stress: 지진중_부러진_나무부재가 1 이상(돌 같은 무게에 눌려 나무 응력 초과)
- sound: 붕괴하지 않았거나 최대_버틴_지진세기가 6 이상
- top_heavy: 무게중심_높이비율_퍼센트가 55 초과
- narrow_base: 세장비_높이나누기밑동이 3.2 초과
- general: 위 어디에도 뚜렷이 해당하지 않는데 무너짐

판단 기준(이 게임의 물리 규칙):
- 무거운 화강암은 아래(기단)에, 가벼운 소나무·문양전은 위에 둘수록 좋다. 나무 위에 돌을 얹으면 나무가 부러진다.
- 무게중심이 낮을수록(높이 대비 비율이 작을수록), 밑동이 넓을수록 지진에 강하다. 많이 쌓기보다 알맞게 쌓기가 미덕이다.
- 소나무끼리는 유격 있는 결구(주먹장·연귀맞춤), 문양전끼리는 맞붙임으로 이어진다. 결구가 흔들림을 나눠 받는다.
- 부재가 아래 부재의 중심과 어긋나게 놓일수록(정렬 오차가 클수록) 탑이 기운다.`

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '탑의 칭호' },
    text: { type: 'string', description: '2~3문장 비평' },
    lesson: { type: 'string', description: '한 문장 가르침' },
    diagnosis: { type: 'string', enum: ['too_small', 'self_weight', 'stress', 'sound', 'top_heavy', 'narrow_base', 'general'], description: '로그가 가리키는 대표 원인' },
    cited_numbers: { type: 'array', items: { type: 'number' }, description: 'text에 그대로 인용한 로그 숫자(1개 이상)' },
  },
  required: ['title', 'text', 'lesson', 'diagnosis', 'cited_numbers'],
  additionalProperties: false,
} as const

type Critique = { title: string; text: string; lesson: string; diagnosis: string; cited_numbers: number[] }

async function readJson(req: IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 20_000) throw new Error('log too large')
  }
  return JSON.parse(body)
}

export function critiquePlugin(apiKey: string | undefined): Plugin {
  const client = apiKey ? new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 }) : null
  return {
    name: 'baekje-ai-critique',
    configureServer(server) {
      server.middlewares.use('/api/critique', async (req, res) => {
        const send = (status: number, data: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        }
        if (req.method !== 'POST') return send(405, { error: 'POST only' })
        if (!client) return send(503, { error: 'no_api_key' })
        try {
          const log = await readJson(req)
          const response = await client.beta.messages.create({
            model: MODEL,
            max_tokens: 4000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
            system: SYSTEM,
            messages: [
              {
                role: 'user',
                content: `제자가 세운 탑의 지진 시험 물리 로그(JSON)다. 칭호와 비평을 내려라.\n\n${JSON.stringify(log, null, 2)}`,
              },
            ],
          })
          if (response.stop_reason === 'refusal') return send(502, { error: 'refusal' })
          const text = response.content.find((b) => b.type === 'text')
          if (!text || text.type !== 'text') return send(502, { error: 'empty' })
          const crit = JSON.parse(text.text) as Critique
          send(200, { ...crit, model: response.model })
        } catch (err) {
          if (err instanceof Anthropic.AuthenticationError) return send(401, { error: 'bad_api_key' })
          if (err instanceof Anthropic.RateLimitError) return send(429, { error: 'rate_limited' })
          if (err instanceof Anthropic.APIError) return send(502, { error: `api_${err.status ?? 'error'}` })
          server.config.logger.error(`[AI 대목장] ${(err as Error).message}`)
          send(500, { error: 'failed' })
        }
      })
    },
  }
}
