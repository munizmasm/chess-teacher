import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'engine/**/*'],
      manifest: {
        name: 'Chess Teacher',
        short_name: 'Chess Teacher',
        description: 'Tutor de xadrez que explica os porquês das suas jogadas.',
        theme_color: '#1a1f1a',
        background_color: '#1a1f1a',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Stockfish wasm pode ser grande; permitir cache de arquivos maiores.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,wasm}'],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
})
