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
// Anthropic Messages API client via direct fetch from the browser.
// (We avoid the SDK because v0.100 bundles Node-only tooling that breaks the
//  browser build. We only use the one endpoint we need here.)
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
    if (err.status === 401) return new Error('Invalid API key. Check it in Settings.')
    if (err.status === 429) return new Error('Rate limit reached. Wait a moment and try again.')
    if (err.status === 529) return new Error('The API is overloaded right now. Try again shortly.')
    return new Error(`Anthropic API error (${err.status}): ${err.message}`)
  }
  if (err instanceof TypeError) {
    // fetch throws a TypeError on network/CORS failure
    return new Error('Network error talking to the API (check your connection).')
  }
  if (err instanceof Error) return err
  return new Error('Unknown error talking to the Tutor.')
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
      /* non-JSON body */
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
  throw new Error('The Tutor did not return a structured response.')
}

interface RawLesson {
  category?: string
  conceptTags?: string[]
  answer?: string
  variation?: { move?: string; note?: string }[]
  highlights?: { type?: string; from?: string; to?: string; square?: string; color?: string }[]
}

function normalizeLesson(raw: RawLesson, fallbackCategory: string): Lesson {
  return {
    category: raw.category ?? fallbackCategory,
    conceptTags: Array.isArray(raw.conceptTags) ? raw.conceptTags.slice(0, 2) : [],
    answer: raw.answer ?? '',
    variation: Array.isArray(raw.variation)
      ? raw.variation.map((v) => ({ move: v.move ?? '', note: v.note ?? '' }))
      : [],
    highlights: Array.isArray(raw.highlights)
      ? raw.highlights
          .filter((d) => d.type === 'arrow' || d.type === 'square')
          .map((d) =>
            d.type === 'arrow'
              ? { type: 'arrow' as const, from: d.from ?? '', to: d.to ?? '', color: d.color }
              : { type: 'square' as const, square: d.square ?? '', color: d.color },
          )
          .filter((d) => (d.type === 'arrow' ? d.from && d.to : d.square))
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
      max_tokens: 2000,
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
  summary?: string
  focuses?: { title?: string; description?: string; tags?: string[]; color?: string }[]
}

export async function analyzePatterns(
  apiKey: string,
  model: ClaudeModel,
  agg: TagAggregate[],
  totalGames: number,
): Promise<PatternAnalysis> {
  try {
    const msg = await createMessage({
      apiKey,
      model,
      max_tokens: 1500,
      system: [{ type: 'text', text: PATTERN_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [PATTERN_TOOL],
      tool_choice: { type: 'tool', name: PATTERN_TOOL.name },
      messages: [{ role: 'user', content: buildPatternUserMessage(agg, totalGames) }],
    })
    const raw = extractToolInput<RawPatterns>(msg, PATTERN_TOOL.name)
    return {
      generatedAt: Date.now(),
      basedOnGames: totalGames,
      summary: raw.summary ?? '',
      focuses: Array.isArray(raw.focuses)
        ? raw.focuses.map((f) => ({
            title: f.title ?? '',
            description: f.description ?? '',
            tags: Array.isArray(f.tags) ? f.tags : [],
            color: (f.color as PatternAnalysis['focuses'][number]['color']) ?? 'both',
          }))
        : [],
    }
  } catch (err) {
    throw friendlyError(err)
  }
}

interface RawTriage {
  decisions?: { ply?: number; study?: boolean }[]
}

/**
 * Inaccuracy triage: returns the set of `ply` values that are WORTH studying
 * (they break a clear concept). On error, returns null (caller keeps them all).
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
    for (const d of raw.decisions ?? []) {
      if (typeof d.ply === 'number' && d.study) keep.add(d.ply)
    }
    return keep
  } catch {
    return null
  }
}

/** Lightweight API key validation (minimal call). */
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
