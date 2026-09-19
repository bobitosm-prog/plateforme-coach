import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { include: ['tests/integration/nutrition-persistence-runtime.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
