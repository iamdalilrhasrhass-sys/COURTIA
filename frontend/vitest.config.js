import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/tests/e2e/**',
      '**/e2e/**',
      '**/*.e2e.{js,jsx,ts,tsx}',
      '**/*.pw.{js,jsx,ts,tsx}',
      '**/playwright/**',
      '**/node_modules/**',
    ],
  },
})
