import { CONCEPTS, CONCEPT_TAGS } from '@/lib/concepts'
import type { Color, GameMeta, StudyPoint } from '@/types'
import { formatEval } from '@/lib/chessUtils'

// ───────────────────────────────────────────────────────────────────────────
// Prompts e schemas das ferramentas (tool use) do Tutor
// ───────────────────────────────────────────────────────────────────────────

const TAXONOMIA = CONCEPTS.map((c) => `- ${c.tag} (${c.grupo}): ${c.rotulo}`).join('\n')

export const LESSON_SYSTEM = `Você é o "Tutor", um treinador de xadrez paciente, direto e motivador que fala PT-BR.

MISSÃO: explicar o PORQUÊ de um lance do aluno não ter sido o melhor — nunca apenas "foi ruim". O aluno ODEIA decorar; quer entender CONCEITOS virados em REGRAS objetivas que valham para situações parecidas.

COMO PENSAR O ERRO:
- Quase todo erro tem uma camada ESTRUTURAL (permanente: estrutura de peões, segurança do rei, casas fracas, peça presa/má, diagonal aberta) e às vezes uma TÁTICA (imediata: material, xeque, ameaça). A estrutural costuma ser a mais importante para aprender.
- O lance certo é o PRIMEIRO lance da LINHA MELHOR que te envio. Baseie qualquer lance concreto NESSA linha — NÃO invente outras sequências táticas (você poderia ensinar xadrez errado). Planos/ideias gerais podem ser conceituais.

ESTILO — CURTO E DIRETO (obrigatório):
- PT-BR. **Só bullets curtos. NUNCA parágrafos longos.** Cada bullet = 1 ideia, no máximo ~1 linha.
- A "resposta" deve:
  1. Começar com 1 bullet que NOMEIA o erro em uma frase curta. Ex.: "Você aceitou uma troca que quebra a sua estrutura de peões."
  2. Ter 1–3 bullets explicando o porquê (concisos).
  3. Terminar SEMPRE com um bullet de **resumo conceitual** (a regra), começando com "📌".
- Tabela comparativa só se agregar MUITO; na dúvida, fique nos bullets.
- Emojis com moderação (1 por campo).
- NÃO desenhe tabuleiros em ASCII — a aplicação JÁ mostra o tabuleiro real. Para apontar coisas visualmente, use "destaques": setas (de→para) para ameaças/planos e casas para fraquezas, baterias, peça presa, diagonais.
VARIAÇÃO:
- Uma nota CURTA por lance da LINHA MELHOR, na ordem. Explique também os lances do ADVERSÁRIO que pareçam estranhos ("por que ele jogaria isso?").

TAGS DE CONCEITO VÁLIDAS (escolha 1 ou 2, as mais centrais ao erro):
${TAXONOMIA}

Você receberá: a posição (FEN), o lance jogado (e a classificação), as avaliações do motor (POV do aluno) e a LINHA MELHOR (em SAN). Responda SEMPRE chamando "emitir_licao".`

export const LESSON_TOOL = {
  name: 'emitir_licao',
  description: 'Emite a lição estruturada sobre o lance do aluno.',
  input_schema: {
    type: 'object' as const,
    properties: {
      categoria: {
        type: 'string',
        enum: ['Imprecisão', 'Erro', 'Capivarada', 'Chance perdida'],
        description: 'A categoria do erro (já informada no contexto).',
      },
      tags_conceito: {
        type: 'array',
        items: { type: 'string', enum: CONCEPT_TAGS },
        minItems: 1,
        maxItems: 2,
        description: 'Os 1–2 conceitos centrais do erro.',
      },
      resposta: {
        type: 'string',
        description:
          'SÓ bullets curtos (markdown "- "), sem parágrafos longos. 1º bullet nomeia o erro em uma frase; 1–3 bullets do porquê; ÚLTIMO bullet sempre o resumo conceitual começando com "📌". Sem tabuleiros ASCII.',
      },
      variacao: {
        type: 'array',
        description: 'Uma nota CURTA por lance da LINHA MELHOR, na mesma ordem.',
        items: {
          type: 'object',
          properties: {
            lance: { type: 'string', description: 'O lance em SAN (igual ao da linha melhor).' },
            nota: { type: 'string', description: 'Explicação curta do lance.' },
          },
          required: ['lance', 'nota'],
        },
      },
      destaques: {
        type: 'array',
        description:
          'Dicas visuais para o tabuleiro na tela da RESPOSTA. Setas para ameaças/planos; casas para fraquezas/baterias/diagonais/peça presa.',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['seta', 'casa'] },
            de: { type: 'string', description: 'Casa de origem (apenas para seta), ex.: "d1".' },
            para: { type: 'string', description: 'Casa de destino (apenas para seta), ex.: "d2".' },
            casa: { type: 'string', description: 'Casa a destacar (apenas para casa), ex.: "e5".' },
            cor: { type: 'string', enum: ['verde', 'azul', 'amarelo', 'laranja', 'vermelho'] },
          },
          required: ['tipo'],
        },
      },
    },
    required: ['categoria', 'tags_conceito', 'resposta', 'variacao', 'destaques'],
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
  const turno = point.color === 'white' ? 'Brancas' : 'Pretas'
  const ideal = bestSan[0] ?? '(motor não retornou)'

  return `CONTEXTO DA PARTIDA
- Aluno joga de: ${colorPt(userColor)}
- Adversário: ${opponent || '—'}
- Abertura: ${meta.eco ?? '—'}${meta.ecoUrl ? ` (${meta.ecoUrl})` : ''}

POSIÇÃO DA DECISÃO (lance ${point.moveNumber}, ${turno} a jogar)
- FEN: ${point.fenBefore}
- Lance que o ALUNO jogou: ${point.san}  (classificação: ${point.category})
- Lance IDEAL (1º da linha melhor): ${ideal}
- Avaliação (POV do aluno) — após o lance jogado: ${evalPlayed} | com a melhor jogada: ${evalBest}

LINHA MELHOR (Stockfish, profundidade ${point.bestLine?.depth ?? '?'}), em SAN, na ordem:
${bestSan.length ? bestSan.map((m, i) => `${i + 1}. ${m}`).join('  ') : '(motor não retornou linha)'}

Tarefa: gere a lição chamando "emitir_licao", seguindo o estilo curto (bullets; último bullet = resumo conceitual).`
}

// ─── Triagem de imprecisões ──────────────────────────────────────────────────

export interface TriageItem {
  ply: number
  moveNumber: number
  color: Color
  san: string
  fenBefore: string
}

export const TRIAGE_SYSTEM = `Você decide quais IMPRECISÕES (inaccuracies) de uma partida valem virar lição para um aluno HUMANO.

REGRA: uma imprecisão SÓ vale estudar se quebra um CONCEITO CLARO e humano de xadrez — algo que o aluno consegue entender e aplicar depois. Exemplos do que VALE (estudar=true):
- Dobrar / isolar / desconectar peões sem necessidade
- Não desenvolver peças, ou mover a mesma peça várias vezes na abertura
- Expor o rei / atrasar o roque sem motivo
- Abrir mão do centro
- Criar uma casa fraca séria, ou pôr uma peça numa casa ruim
- Trocar peça boa por ruim, ou aceitar troca que piora a estrutura

O que NÃO vale (estudar=false):
- Sutilezas de motor: quando a "linha certa" é difícil até para mestres e NÃO há um conceito humano claro por trás.

Na dúvida entre sutileza e conceito claro, prefira **estudar=false** — é melhor poucas lições boas do que muitas maçantes.

Responda SEMPRE chamando "triagem".`

export const TRIAGE_TOOL = {
  name: 'triagem',
  description: 'Decide, para cada imprecisão, se vale virar lição.',
  input_schema: {
    type: 'object' as const,
    properties: {
      decisoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ply: { type: 'number', description: 'O "ply" exato informado no item.' },
            estudar: { type: 'boolean', description: 'true se quebra um conceito claro/estrutural.' },
            conceito: { type: 'string', description: 'Conceito quebrado (curto), se estudar=true.' },
          },
          required: ['ply', 'estudar'],
        },
      },
    },
    required: ['decisoes'],
  },
}

export function buildTriageMessage(items: TriageItem[], meta: GameMeta, userColor: Color): string {
  const opponent = userColor === 'white' ? meta.black : meta.white
  const linhas = items
    .map(
      (it) =>
        `- ply ${it.ply} | lance ${it.moveNumber} (${it.color === 'white' ? 'brancas' : 'pretas'}): ${it.san} | FEN antes: ${it.fenBefore}`,
    )
    .join('\n')

  return `Aluno joga de ${colorPt(userColor)} (adversário: ${opponent || '—'}). Avalie estas IMPRECISÕES do aluno e diga quais valem virar lição.

IMPRECISÕES:
${linhas}

Responda chamando "triagem" com uma decisão para CADA ply acima.`
}

// ─── Análise de padrões ──────────────────────────────────────────────────────

export const PATTERN_SYSTEM = `Você é o "Tutor", treinador de xadrez (PT-BR). Recebe um resumo agregado dos ERROS dos últimos jogos de um aluno (por conceito, por cor e por fase do jogo). Sua tarefa é identificar de 2 a 4 FOCOS DE MELHORIA prioritários — padrões recorrentes que, se resolvidos, mais elevariam o nível do aluno.

Regras:
- Fale como um treinador direto e motivador. PT-BR, bullets, emojis com moderação.
- Cada foco vira uma orientação acionável e conceitual (não "estude mais", e sim "o quê" e "por quê").
- Considere recortes por COR (ex.: fraquezas só com as pretas) e por FASE (abertura/meio-jogo/final).
- Responda SEMPRE chamando a ferramenta "emitir_padroes".`

export const PATTERN_TOOL = {
  name: 'emitir_padroes',
  description: 'Emite os focos de melhoria do aluno.',
  input_schema: {
    type: 'object' as const,
    properties: {
      resumo: { type: 'string', description: 'Resumo curto (1–2 frases) do diagnóstico geral.' },
      focos: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'Título curto do foco.' },
            descricao: { type: 'string', description: 'O que estudar e por quê (bullets curtos).' },
            tags: { type: 'array', items: { type: 'string', enum: CONCEPT_TAGS } },
            cor: { type: 'string', enum: ['white', 'black', 'ambas'] },
          },
          required: ['titulo', 'descricao', 'tags'],
        },
      },
    },
    required: ['resumo', 'focos'],
  },
}

export interface TagAggregate {
  tag: string
  total: number
  porCor: { white: number; black: number }
  porFase: { abertura: number; 'meio-jogo': number; final: number }
}

export function buildPatternUserMessage(agg: TagAggregate[], totalJogos: number): string {
  const linhas = agg
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(
      (a) =>
        `- ${a.tag}: ${a.total}x (brancas ${a.porCor.white}, pretas ${a.porCor.black}; abertura ${a.porFase.abertura}, meio ${a.porFase['meio-jogo']}, final ${a.porFase.final})`,
    )
    .join('\n')

  return `RESUMO AGREGADO DE ERROS (últimos ${totalJogos} jogos analisados):
${linhas || '(sem erros registrados ainda)'}

Tarefa: identifique de 2 a 4 focos de melhoria prioritários chamando "emitir_padroes".`
}
