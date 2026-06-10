# ♞ Chess Teacher

Tutor de xadrez pessoal que importa o PGN **já analisado** do chess.com e te explica o **porquê** de cada lance ruim seu — virando o erro em uma **regra conceitual**, com a linha melhor calculada pelo Stockfish e navegação lance-a-lance.

- 🔧 **Motor:** Stockfish (WASM lite single-threaded) — roda no navegador, grátis e offline.
- 🤖 **Tutor:** Claude (API da Anthropic), chamado direto do navegador.
- 🌐 **100% local:** sem backend, sem banco de dados. Histórico dos últimos 30 jogos no próprio aparelho (IndexedDB).
- 📱 **PWA:** instalável no celular (Android/Chrome) e no notebook.

## Requisitos

- Node.js 18+ (recomendado 20+)
- Uma chave de API da Anthropic — pegue em https://console.anthropic.com/settings/keys

## Como rodar (desenvolvimento)

```bash
npm install          # instala deps e copia o Stockfish para public/engine
npm run dev          # http://localhost:5173
```

1. Abra o app → aba **Config** → cole sua **chave de API** e escolha o modelo.
2. Aba **Importar** → cole o PGN da partida (com a Revisão do chess.com) → escolha sua cor → **Analisar**.
   - Dica: clique em **“Usar PGN de exemplo”** para testar (você jogou de **pretas**).

## Build de produção / preview

```bash
npm run build        # gera dist/ (inclui o motor e o service worker do PWA)
npm run preview      # serve o dist/ localmente
```

## Usar no celular

Duas opções:

- **Deploy estático** (recomendado): suba a pasta `dist/` em qualquer host estático (Vercel, Netlify, GitHub Pages…). Abra no celular e **instale como app** (menu do Chrome → “Adicionar à tela inicial”).
- **Rede local:** `npm run dev -- --host` e acesse pelo IP do notebook na mesma rede Wi-Fi.

> A chave de API fica salva **só no aparelho** (localStorage). Em cada aparelho novo, configure a chave uma vez. O histórico **não sincroniza** entre aparelhos (por design — sem banco de dados).

## Notas

- A **primeira análise** baixa o motor (~7 MB) e fica em cache (depois roda offline).
- Cada análise faz 1 chamada ao Claude por lance ruim + 1 para os padrões. Com Sonnet, custa centavos por jogo.
- Reimportar o mesmo jogo **não duplica** no histórico (dedup pelo ID do PGN).

## Estrutura

```
src/
  lib/        pgn (parser) · engine (Stockfish) · anthropic (Claude) · prompts · analysis · storage · concepts
  store/      useSettings (chave/modelo) · useApp (navegação/sessão)
  components/ Board · Markdown · Header · bits
  screens/    Import · Analyzing · Study · History · Settings
public/engine/  Stockfish WASM (copiado de node_modules no postinstall)
scripts/        copy-engine.mjs · test-parse.mjs (teste headless do parser)
```
