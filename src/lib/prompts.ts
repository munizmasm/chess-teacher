import { CONCEPTS, CONCEPT_TAGS } from '@/lib/concepts'
import type { Color, GameMeta, StudyPoint } from '@/types'
import { formatEval } from '@/lib/chessUtils'

// ───────────────────────────────────────────────────────────────────────────
// Prompts and tool schemas for the Tutor.
// NOTE: the Tutor TEACHES in PT-BR, so the prompt *text* stays Portuguese.
// The schema keys / tool names are English to keep the codebase English.
// ───────────────────────────────────────────────────────────────────────────

const TAXONOMY = CONCEPTS.map((c) => `- ${c.tag} (${c.group}): ${c.label}`).join('\n')

export const LESSON_SYSTEM = `Você é o "Tutor", um treinador de xadrez paciente, direto e motivador que fala PT-BR.

MISSÃO: explicar o PORQUÊ de um lance do aluno não ter sido o melhor — nunca apenas "foi ruim". O aluno ODEIA decorar; quer entender CONCEITOS virados em REGRAS objetivas que valham para situações parecidas.

COMO PENSAR O ERRO:
- Quase todo erro tem uma camada ESTRUTURAL (permanente: estrutura de peões, segurança do rei, casas fracas, peça presa/má, diagonal aberta) e às vezes uma TÁTICA (imediata: material, xeque, ameaça). A estrutural costuma ser a mais importante para aprender.
- O lance certo é o PRIMEIRO lance da LINHA MELHOR que te envio. Baseie qualquer lance concreto NESSA linha — NÃO invente outras sequências táticas (você poderia ensinar xadrez errado). Planos/ideias gerais podem ser conceituais.

ESTILO — CURTO E DIRETO (obrigatório):
- PT-BR. **Só bullets curtos. NUNCA parágrafos longos.** Cada bullet = 1 ideia, no máximo ~1 linha.
- O campo "answer" deve:
  1. Começar com 1 bullet que NOMEIA o erro em uma frase curta. Ex.: "Você aceitou uma troca que quebra a sua estrutura de peões."
  2. Ter 1–3 bullets explicando o porquê (concisos).
  3. Terminar SEMPRE com um bullet de **resumo conceitual** (a regra), começando com "📌".
- Tabela comparativa só se agregar MUITO; na dúvida, fique nos bullets.
- Emojis com moderação (1 por campo).
- NÃO desenhe tabuleiros em ASCII — a aplicação JÁ mostra o tabuleiro real. Para apontar coisas visualmente, use o campo "highlights": setas (type "arrow", de "from" para "to") para ameaças/planos e casas (type "square") para fraquezas, baterias, peça presa, diagonais.

VARIAÇÃO:
- No campo "variation", uma nota CURTA por lance da LINHA MELHOR, na ordem. Explique também os lances do ADVERSÁRIO que pareçam estranhos ("por que ele jogaria isso?").

TAGS DE CONCEITO VÁLIDAS (escolha 1 ou 2 no campo "conceptTags", as mais centrais ao erro):
${TAXONOMY}

Você receberá: a posição (FEN), o lance jogado (e a classificação), as avaliações do motor (POV do aluno) e a LINHA MELHOR (em SAN). Responda SEMPRE chamando "emit_lesson".`

export const LESSON_TOOL = {
  name: 'emit_lesson',
  description: 'Emite a lição estruturada sobre o lance do aluno.',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        enum: ['Inaccuracy', 'Mistake', 'Blunder', 'Miss'],
        description: 'A categoria do erro (já informada no contexto).',
      },
      conceptTags: {
        type: 'array',
        items: { type: 'string', enum: CONCEPT_TAGS },
        minItems: 1,
        maxItems: 2,
        description: 'Os 1–2 conceitos centrais do erro.',
      },
      answer: {
        type: 'string',
        description:
          'SÓ bullets curtos (markdown "- "), sem parágrafos longos. 1º bullet nomeia o erro em uma frase; 1–3 bullets do porquê; ÚLTIMO bullet sempre o resumo conceitual começando com "📌". Sem tabuleiros ASCII.',
      },
      variation: {
        type: 'array',
        description: 'Uma nota CURTA por lance da LINHA MELHOR, na mesma ordem.',
        items: {
          type: 'object',
          properties: {
            move: { type: 'string', description: 'O lance em SAN (igual ao da linha melhor).' },
            note: { type: 'string', description: 'Explicação curta do lance.' },
          },
          required: ['move', 'note'],
        },
      },
      highlights: {
        type: 'array',
        description:
          'Dicas visuais para o tabuleiro na tela da RESPOSTA. Setas (arrow) para ameaças/planos; casas (square) para fraquezas/baterias/diagonais/peça presa.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['arrow', 'square'] },
            from: { type: 'string', description: 'Casa de origem (apenas para arrow), ex.: "d1".' },
            to: { type: 'string', description: 'Casa de destino (apenas para arrow), ex.: "d2".' },
            square: { type: 'string', description: 'Casa a destacar (apenas para square), ex.: "e5".' },
            color: { type: 'string', enum: ['green', 'blue', 'yellow', 'orange', 'red'] },
          },
          required: ['type'],
        },
      },
    },
    required: ['category', 'conceptTags', 'answer', 'variation', 'highlights'],
  },
}

function colorPt(c: Color): string {
  return c === 'white' ? 'Brancas' : 'Pretas'
}

export function buildLessonUserMessage(
  point: StudyPoint,
  meta: GameMeta,
  userColor: Color,
): string {
  const opponent = userColor === 'white' ? meta.black : meta.white
  const bestSan = point.bestLine?.sanMoves ?? []
  const evalBest = formatEval(point.evalBestCp, point.evalBestMate)
  const evalPlayed = formatEval(point.evalPlayedCp, point.evalPlayedMate)
  const turn = point.color === 'white' ? 'Brancas' : 'Pretas'
  const ideal = bestSan[0] ?? '(motor não retornou)'

  return `CONTEXTO DA PARTIDA
- Aluno joga de: ${colorPt(userColor)}
- Adversário: ${opponent || '—'}
- Abertura: ${meta.eco ?? '—'}${meta.ecoUrl ? ` (${meta.ecoUrl})` : ''}

POSIÇÃO DA DECISÃO (lance ${point.moveNumber}, ${turn} a jogar)
- FEN: ${point.fenBefore}
- Lance que o ALUNO jogou: ${point.san}  (classificação: ${point.category})
- Lance IDEAL (1º da linha melhor): ${ideal}
- Avaliação (POV do aluno) — após o lance jogado: ${evalPlayed} | com a melhor jogada: ${evalBest}

LINHA MELHOR (Stockfish, profundidade ${point.bestLine?.depth ?? '?'}), em SAN, na ordem:
${bestSan.length ? bestSan.map((m, i) => `${i + 1}. ${m}`).join('  ') : '(motor não retornou linha)'}

Tarefa: gere a lição chamando "emit_lesson", seguindo o estilo curto (bullets; último bullet = resumo conceitual). O campo "variation" deve ter UMA nota para CADA lance da linha melhor acima, na mesma ordem.`
}

// ─── Inaccuracy triage ───────────────────────────────────────────────────────

export interface TriageItem {
  ply: number
  moveNumber: number
  color: Color
  san: string
  fenBefore: string
}

export const TRIAGE_SYSTEM = `Você decide quais IMPRECISÕES (inaccuracies) de uma partida valem virar lição para um aluno HUMANO.

REGRA: uma imprecisão SÓ vale estudar se quebra um CONCEITO CLARO e humano de xadrez — algo que o aluno consegue entender e aplicar depois. Exemplos do que VALE (study=true):
- Dobrar / isolar / desconectar peões sem necessidade
- Não desenvolver peças, ou mover a mesma peça várias vezes na abertura
- Expor o rei / atrasar o roque sem motivo
- Abrir mão do centro
- Criar uma casa fraca séria, ou pôr uma peça numa casa ruim
- Trocar peça boa por ruim, ou aceitar troca que piora a estrutura

O que NÃO vale (study=false):
- Sutilezas de motor: quando a "linha certa" é difícil até para mestres e NÃO há um conceito humano claro por trás.

Na dúvida entre sutileza e conceito claro, prefira **study=false** — é melhor poucas lições boas do que muitas maçantes.

Responda SEMPRE chamando "triage".`

export const TRIAGE_TOOL = {
  name: 'triage',
  description: 'Decide, para cada imprecisão, se vale virar lição.',
  input_schema: {
    type: 'object' as const,
    properties: {
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ply: { type: 'number', description: 'O "ply" exato informado no item.' },
            study: { type: 'boolean', description: 'true se quebra um conceito claro/estrutural.' },
            concept: { type: 'string', description: 'Conceito quebrado (curto), se study=true.' },
          },
          required: ['ply', 'study'],
        },
      },
    },
    required: ['decisions'],
  },
}

export function buildTriageMessage(items: TriageItem[], meta: GameMeta, userColor: Color): string {
  const opponent = userColor === 'white' ? meta.black : meta.white
  const lines = items
    .map(
      (it) =>
        `- ply ${it.ply} | lance ${it.moveNumber} (${it.color === 'white' ? 'brancas' : 'pretas'}): ${it.san} | FEN antes: ${it.fenBefore}`,
    )
    .join('\n')

  return `Aluno joga de ${colorPt(userColor)} (adversário: ${opponent || '—'}). Avalie estas IMPRECISÕES do aluno e diga quais valem virar lição.

IMPRECISÕES:
${lines}

Responda chamando "triage" com uma decisão para CADA ply acima.`
}

// ─── Pattern analysis ──────────────────────────────────────────────────────

export const PATTERN_SYSTEM = `Você é o "Tutor", treinador de xadrez (PT-BR). Recebe um resumo agregado dos ERROS dos últimos jogos de um aluno (por conceito, por cor e por fase do jogo). Sua tarefa é identificar de 2 a 4 FOCOS DE MELHORIA prioritários — padrões recorrentes que, se resolvidos, mais elevariam o nível do aluno.

Regras:
- Fale como um treinador direto e motivador. PT-BR, bullets, emojis com moderação.
- Cada foco vira uma orientação acionável e conceitual (não "estude mais", e sim "o quê" e "por quê").
- Considere recortes por COR (ex.: fraquezas só com as pretas) e por FASE (abertura/meio-jogo/final).
- Responda SEMPRE chamando a ferramenta "emit_patterns".`

export const PATTERN_TOOL = {
  name: 'emit_patterns',
  description: 'Emite os focos de melhoria do aluno.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Resumo curto (1–2 frases) do diagnóstico geral.' },
      focuses: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título curto do foco.' },
            description: { type: 'string', description: 'O que estudar e por quê (bullets curtos).' },
            tags: { type: 'array', items: { type: 'string', enum: CONCEPT_TAGS } },
            color: { type: 'string', enum: ['white', 'black', 'both'] },
          },
          required: ['title', 'description', 'tags'],
        },
      },
    },
    required: ['summary', 'focuses'],
  },
}

export interface TagAggregate {
  tag: string
  total: number
  byColor: { white: number; black: number }
  byPhase: { opening: number; middlegame: number; endgame: number }
}

export function buildPatternUserMessage(agg: TagAggregate[], totalGames: number): string {
  const lines = agg
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(
      (a) =>
        `- ${a.tag}: ${a.total}x (brancas ${a.byColor.white}, pretas ${a.byColor.black}; abertura ${a.byPhase.opening}, meio ${a.byPhase.middlegame}, final ${a.byPhase.endgame})`,
    )
    .join('\n')

  return `RESUMO AGREGADO DE ERROS (últimos ${totalGames} jogos analisados):
${lines || '(sem erros registrados ainda)'}

Tarefa: identifique de 2 a 4 focos de melhoria prioritários chamando "emit_patterns".`
}
