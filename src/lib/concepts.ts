import type { Category, Classification } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Taxonomia fixa de conceitos (usada nas tags de erro e na análise de padrões)
// ───────────────────────────────────────────────────────────────────────────

export interface ConceptDef {
  tag: string
  rotulo: string
  grupo: string
}

export const CONCEPTS: ConceptDef[] = [
  // Abertura
  { tag: 'desenvolvimento', rotulo: 'Desenvolvimento das peças', grupo: 'Abertura' },
  { tag: 'centro', rotulo: 'Controle do centro', grupo: 'Abertura' },
  { tag: 'seguranca_do_rei', rotulo: 'Segurança do rei / roque', grupo: 'Abertura' },
  { tag: 'ordem_de_lances', rotulo: 'Ordem de lances', grupo: 'Abertura' },
  // Tática
  { tag: 'garfo', rotulo: 'Garfo', grupo: 'Tática' },
  { tag: 'cravada', rotulo: 'Cravada', grupo: 'Tática' },
  { tag: 'raio_x', rotulo: 'Raio-X / espeto', grupo: 'Tática' },
  { tag: 'descoberto', rotulo: 'Ataque descoberto', grupo: 'Tática' },
  { tag: 'peca_pendurada', rotulo: 'Peça pendurada', grupo: 'Tática' },
  { tag: 'desvio', rotulo: 'Desvio / atração', grupo: 'Tática' },
  { tag: 'lance_intermediario', rotulo: 'Lance intermediário (zwischenzug)', grupo: 'Tática' },
  // Posicional
  { tag: 'estrutura_de_peoes', rotulo: 'Estrutura de peões', grupo: 'Posicional' },
  { tag: 'peao_isolado_passado', rotulo: 'Peão isolado / passado', grupo: 'Posicional' },
  { tag: 'casas_fracas', rotulo: 'Casas fracas / buracos', grupo: 'Posicional' },
  { tag: 'par_de_bispos', rotulo: 'Par de bispos', grupo: 'Posicional' },
  { tag: 'coluna_aberta', rotulo: 'Coluna aberta', grupo: 'Posicional' },
  { tag: 'espaco', rotulo: 'Espaço', grupo: 'Posicional' },
  { tag: 'peca_ma', rotulo: 'Peça má (bispo ruim etc.)', grupo: 'Posicional' },
  { tag: 'iniciativa', rotulo: 'Iniciativa / tempo', grupo: 'Posicional' },
  // Defesa
  { tag: 'defender_peca', rotulo: 'Defender peça atacada', grupo: 'Defesa' },
  { tag: 'profilaxia', rotulo: 'Profilaxia', grupo: 'Defesa' },
  { tag: 'simplificar_sob_pressao', rotulo: 'Simplificar sob pressão', grupo: 'Defesa' },
  { tag: 'jogo_posicional_defensivo', rotulo: 'Jogo posicional defensivo', grupo: 'Defesa' },
  // Finais
  { tag: 'oposicao', rotulo: 'Oposição', grupo: 'Finais' },
  { tag: 'rei_ativo', rotulo: 'Rei ativo no final', grupo: 'Finais' },
  { tag: 'regra_do_quadrado', rotulo: 'Regra do quadrado', grupo: 'Finais' },
  { tag: 'torre_atras_do_peao', rotulo: 'Torre atrás do peão passado', grupo: 'Finais' },
  // Cálculo
  { tag: 'contar_atacantes_defensores', rotulo: 'Contar atacantes x defensores', grupo: 'Cálculo' },
  { tag: 'checar_xeques_capturas_ameacas', rotulo: 'Checar xeques/capturas/ameaças', grupo: 'Cálculo' },
]

export const CONCEPT_TAGS = CONCEPTS.map((c) => c.tag)

const CONCEPT_BY_TAG = new Map(CONCEPTS.map((c) => [c.tag, c]))

export function conceptLabel(tag: string): string {
  return CONCEPT_BY_TAG.get(tag)?.rotulo ?? tag
}

// ───────────────────────────────────────────────────────────────────────────
// Mapeamento de classificação (chess.com) → categoria PT-BR + estilo visual
// ───────────────────────────────────────────────────────────────────────────

export interface CategoryStyle {
  category: Category
  marcador: string // ?!, ?, ??, X, !
  cor: string // hex (Tailwind mark.*)
  isStudy: boolean
}

const POSITIVE: Classification[] = ['Brilliant', 'Great', 'Best', 'Excellent']

export function classify(c: Classification): CategoryStyle | null {
  switch (c) {
    case 'Inaccuracy':
      return { category: 'Imprecisão', marcador: '?!', cor: '#f5c542', isStudy: true }
    case 'Mistake':
      return { category: 'Erro', marcador: '?', cor: '#e8862e', isStudy: true }
    case 'Blunder':
      return { category: 'Capivarada', marcador: '??', cor: '#b33430', isStudy: true }
    case 'Miss':
      return { category: 'Chance perdida', marcador: 'X', cor: '#e06666', isStudy: true }
    default:
      if (POSITIVE.includes(c)) {
        return { category: 'Excelente', marcador: '!', cor: '#5b9bd5', isStudy: false }
      }
      return null // Good / Book → ignorado
  }
}

/** Cor (hex) por nome amigável usado pelo Tutor nos destaques. */
export function highlightColor(nome?: string): string {
  switch ((nome ?? '').toLowerCase()) {
    case 'verde':
      return 'rgba(122, 170, 80, 0.9)'
    case 'azul':
      return 'rgba(91, 155, 213, 0.9)'
    case 'amarelo':
      return 'rgba(245, 197, 66, 0.9)'
    case 'laranja':
      return 'rgba(232, 134, 46, 0.95)'
    case 'vermelho':
      return 'rgba(179, 52, 48, 0.95)'
    default:
      return 'rgba(122, 170, 80, 0.9)'
  }
}
