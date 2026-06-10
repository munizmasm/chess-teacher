/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tabuleiro estilo chess.com
        board: {
          light: '#EEEED2',
          dark: '#769656',
        },
        // Tema escuro da aplicação (100–400 = texto claro; 500–900 = fundos)
        ink: {
          100: '#e7ece4',
          200: '#cdd6c9',
          300: '#aab5a6',
          400: '#7f8b7c',
          500: '#3a463a',
          600: '#2c352c',
          700: '#222a22',
          800: '#1a1f1a',
          900: '#161a16',
        },
        // Marcadores de classificação (esquema do chess.com)
        mark: {
          brilliant: '#26c2a3', // !! (turquesa) — reservado p/ futuro
          excellent: '#5b9bd5', // !  azul
          inaccuracy: '#f5c542', // ?! amarelo
          mistake: '#e8862e', // ?  laranja
          blunder: '#b33430', // ?? vermelho escuro
          missed: '#e06666', // X  vermelho claro (chance perdida)
        },
        accent: {
          DEFAULT: '#7fa650',
          soft: '#9bbf6a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
