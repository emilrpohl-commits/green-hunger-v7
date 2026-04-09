import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [react()],
  base: '/greenhunger-players/',
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@shared': path.join(root, 'shared'),
      '@supabase/supabase-js': path.join(__dirname, 'node_modules/@supabase/supabase-js'),
    },
  },
  server: {
    fs: { allow: [root] },
  },
})
