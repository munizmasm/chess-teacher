# ♞ Chess Teacher

A personal chess tutor that imports your **already reviewed** chess.com PGN and explains the **why** behind each of your bad moves — turning the mistake into an **objective concept/rule**, with the best line computed by Stockfish and step-by-step navigation.

- 🔧 **Engine:** Stockfish (WASM, lite single-threaded) — runs in the browser, free and offline.
- 🤖 **Tutor:** Claude (Anthropic API), called directly from the browser. The Tutor teaches in **PT-BR**; the app UI is in English.
- 🌐 **100% local:** no backend, no database. History of the last 30 games lives on the device (IndexedDB).
- 📱 **PWA:** installable on mobile (Android/Chrome) and on a laptop.

## Requirements

- Node.js 18+ (20+ recommended)
- An Anthropic API key — get one at https://console.anthropic.com/settings/keys

## Run (development)

```bash
npm install          # installs deps and copies Stockfish into public/engine
npm run dev          # http://localhost:5173
```

1. Open the app → **Settings** tab → paste your **API key** and pick a model.
2. **Import** tab → paste a PGN (already reviewed on chess.com) → pick your color → **Analyze**.
   - Tip: click **"Use sample PGN"** to try it out (you played **black**).

## Production build / preview

```bash
npm run build        # outputs dist/ (includes the engine and the PWA service worker)
npm run preview      # serves dist/ locally
```

## Use on mobile

- **Static deploy (recommended):** push `dist/` to any static host with HTTPS (GitHub Pages, Vercel, Netlify…). Open it on your phone and **install** it (Chrome menu → "Add to Home screen") for PWA + offline.
- **Local network:** `npm run dev -- --host` and open the laptop's IP on the same Wi-Fi.

> The API key is stored **only on the device** (localStorage). Configure it once per device. History does **not** sync between devices (by design — no database).

## Deploy (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. The repository must be **public** for free Pages. You can also trigger it manually from the **Actions** tab (Run workflow).

## Notes

- The **first analysis** downloads the engine (~7 MB) and caches it (then runs offline).
- Each analysis makes one Claude call per bad move + one for the patterns. With Sonnet it costs a few cents per game.
- Re-importing the same game does **not** duplicate it in history (dedup by the PGN's game id).

## Structure

```
src/
  lib/        pgn (parser) · engine (Stockfish) · anthropic (Claude) · prompts · analysis · storage · concepts
  store/      useSettings (key/model) · useApp (navigation/session)
  components/ Board · Markdown · Header · bits
  screens/    Import · Analyzing · Study · History · Settings
public/engine/  Stockfish WASM (copied from node_modules on postinstall)
scripts/        copy-engine.mjs · test-parse.mjs (headless parser test)
```
