import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Node >=22.13 ships a `localStorage` global that's non-functional unless
// `--localstorage-file` is set. jsdom's environment setup only copies its own
// window properties that aren't already present on the global object, so
// Node's inert global silently shadows jsdom's real one, breaking any test
// that touches `localStorage`. Disabling the flag lets jsdom's copy through.
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --no-experimental-webstorage`.trim()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
