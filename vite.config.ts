import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Only run checker in dev mode, not during tests or build
    mode === 'development' &&
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint . --ext ts,tsx',
          dev: {
            logLevel: ['error', 'warning'],
          },
        },
      }),
  ].filter(Boolean),
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
}))
