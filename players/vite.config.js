import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['../shared/**/*.test.js'],
  },
  base: process.env.VITE_BASE_PATH || '/greenhunger-players/',
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@shared': path.join(root, 'shared'),
      '@rules-data': path.join(root, 'data', 'rules'),
      '@supabase/supabase-js': path.join(__dirname, 'node_modules/@supabase/supabase-js'),
      zod: path.join(__dirname, 'node_modules/zod'),
    },
  },
  server: {
    fs: { allow: [root] },
  },
})
