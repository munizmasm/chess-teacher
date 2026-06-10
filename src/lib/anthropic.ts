import type { ClaudeModel, Color, GameMeta, Lesson, PatternAnalysis, StudyPoint } from '@/types'
import {
  LESSON_SYSTEM,
  LESSON_TOOL,
  PATTERN_SYSTEM,
  PATTERN_TOOL,
  TRIAGE_SYSTEM,
  TRIAGE_TOOL,
  buildLessonUserMessage,
  buildPatternUserMessage,
  buildTriageMessage,
  type TagAggregate,
  type TriageItem,
} from '@/lib/prompts'

// ───────────────────────────────────────────────────────────────────────────
// Cliente da Messages API da Anthropic via fetch direto do browser.
// (Evitamos o SDK porque a v0.100 empacota ferramentas Node-only que quebram o
//  bundle de browser. Aqui usamos só o endpoint que precisamos.)
// ───────────────────────────────────────────────────────────────────────────

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

interface CacheControl {
  type: 'ephemeral'
}
interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: CacheControl
}
interface ToolDef {
  name: string
  description?: string
  input_schema: object
}
interface UserMessage {
  role: 'user'
  content: string
}
interface CreateParams {
  apiKey: string
  model: string
  max_tokens: number
  system?: SystemBlock[]
  tools?: ToolDef[]
  tool_choice?: { type: 'tool'; name: string }
  messages: UserMessage[]
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: string; [k: string]: unknown }

interface AnthropicMessage {
  id: string
  content: ContentBlock[]
  stop_reason?: string
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function friendlyError(err: unknown): Error {
  if (err instanceof ApiError) {
    if (err.status === 401) return new Error('Chave de API inválida. Confira em Configurações.')
    if (err.status === 429)
      return new Error('Limite de requisições atingido. Aguarde um pouco e tente de novo.')
    if (err.status === 529) return new Error('A API está sobrecarregada agora. Tente novamente em instantes.')
    return new Error(`Erro da API Anthropic (${err.status}): ${err.message}`)
  }
  if (err instanceof TypeError) {
    // fetch lança TypeError em falha de rede/CORS
    return new Error('Falha de rede ao falar com a API (verifique sua conexão).')
  }
  if (err instanceof Error) return err
  return new Error('Erro desconhecido ao falar com o Tutor.')
}

async function createMessage(params: CreateParams): Promise<AnthropicMessage> {
  const { apiKey, ...body } = params
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error?: { message?: string } }
      detail = j?.error?.message ?? ''
    } catch {
      /* corpo não-JSON */
    }
    throw new ApiError(res.status, detail || res.statusText)
  }
  return (await res.json()) as AnthropicMessage
}

function extractToolInput<T>(msg: AnthropicMessage, toolName: string): T {
  for (const block of msg.content) {
    if (block.type === 'tool_use' && (block as { name: string }).name === toolName) {
      return (block as { input: unknown }).input as T
    }
  }
  throw new Error('O Tutor não retornou uma resposta estruturada.')
}

interface RawLesson {
  categoria?: string
  tags_conceito?: string[]
  resposta?: string
  variacao?: { lance?: string; nota?: string }[]
  destaques?: { tipo?: string; de?: string; para?: string; casa?: string; cor?: string }[]
}

function normalizeLesson(raw: RawLesson, fallbackCategoria: string): Lesson {
  return {
    categoria: raw.categoria ?? fallbackCategoria,
    tags_conceito: Array.isArray(raw.tags_conceito) ? raw.tags_conceito.slice(0, 2) : [],
    resposta: raw.resposta ?? '',
    variacao: Array.isArray(raw.variacao)
      ? raw.variacao.map((v) => ({ lance: v.lance ?? '', nota: v.nota ?? '' }))
      : [],
    destaques: Array.isArray(raw.destaques)
      ? raw.destaques
          .filter((d) => d.tipo === 'seta' || d.tipo === 'casa')
          .map((d) =>
            d.tipo === 'seta'
              ? { tipo: 'seta' as const, de: d.de ?? '', para: d.para ?? '', cor: d.cor }
              : { tipo: 'casa' as const, casa: d.casa ?? '', cor: d.cor },
          )
          .filter((d) => (d.tipo === 'seta' ? d.de && d.para : d.casa))
      : [],
  }
}

export async function generateLesson(
  apiKey: string,
  model: ClaudeModel,
  point: StudyPoint,
  meta: GameMeta,
  userColor: Color,
): Promise<Lesson> {
  try {
    const msg = await createMessage({
      apiKey,
      model,
      max_tokens: 2500,
      system: [{ type: 'text', text: LESSON_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [LESSON_TOOL],
      tool_choice: { type: 'tool', name: LESSON_TOOL.name },
      messages: [{ role: 'user', content: buildLessonUserMessage(point, meta, userColor) }],
    })
    return normalizeLesson(extractToolInput<RawLesson>(msg, LESSON_TOOL.name), point.category)
  } catch (err) {
    throw friendlyError(err)
  }
}

interface RawPatterns {
  resumo?: string
  focos?: { titulo?: string; descricao?: string; tags?: string[]; cor?: string }[]
}

export async function analyzePatterns(
  apiKey: string,
  model: ClaudeModel,
  agg: TagAggregate[],
  totalJogos: number,
): Promise<PatternAnalysis> {
  try {
    const msg = await createMessage({
      apiKey,
      model,
      max_tokens: 1500,
      system: [{ type: 'text', text: PATTERN_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [PATTERN_TOOL],
      tool_choice: { type: 'tool', name: PATTERN_TOOL.name },
      messages: [{ role: 'user', content: buildPatternUserMessage(agg, totalJogos) }],
    })
    const raw = extractToolInput<RawPatterns>(msg, PATTERN_TOOL.name)
    return {
      geradoEm: Date.now(),
      baseadoEmJogos: totalJogos,
      resumo: raw.resumo ?? '',
      focos: Array.isArray(raw.focos)
        ? raw.focos.map((f) => ({
            titulo: f.titulo ?? '',
            descricao: f.descricao ?? '',
            tags: Array.isArray(f.tags) ? f.tags : [],
            cor: (f.cor as PatternAnalysis['focos'][number]['cor']) ?? 'ambas',
          }))
        : [],
    }
  } catch (err) {
    throw friendlyError(err)
  }
}

interface RawTriage {
  decisoes?: { ply?: number; estudar?: boolean }[]
}

/**
 * Triagem das imprecisões: devolve o conjunto de `ply` que VALEM virar lição
 * (quebram conceito claro). Em caso de erro, devolve null (caller mantém todas).
 */
export async function triageInaccuracies(
  apiKey: string,
  model: ClaudeModel,
  items: TriageItem[],
  meta: GameMeta,
  userColor: Color,
): Promise<Set<number> | null> {
  if (items.length === 0) return new Set()
  try {
    const msg = await createMessage({
      apiKey,
      model,
      max_tokens: 800,
      system: [{ type: 'text', text: TRIAGE_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [TRIAGE_TOOL],
      tool_choice: { type: 'tool', name: TRIAGE_TOOL.name },
      messages: [{ role: 'user', content: buildTriageMessage(items, meta, userColor) }],
    })
    const raw = extractToolInput<RawTriage>(msg, TRIAGE_TOOL.name)
    const keep = new Set<number>()
    for (const d of raw.decisoes ?? []) {
      if (typeof d.ply === 'number' && d.estudar) keep.add(d.ply)
    }
    return keep
  } catch {
    return null
  }
}

/** Validação leve da chave (chamada mínima). */
export async function pingApiKey(apiKey: string, model: ClaudeModel): Promise<void> {
  try {
    await createMessage({
      apiKey,
      model,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ok' }],
    })
  } catch (err) {
    throw friendlyError(err)
  }
}
