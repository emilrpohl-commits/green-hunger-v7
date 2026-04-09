import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/greenhunger-dm/',
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@shared': path.join(root, 'shared'),
      '@tools': path.join(root, 'tools'),
      '@supabase-root': path.join(root, 'supabase'),
      // shared/ lives outside this package; force deps to this app's node_modules
      '@supabase/supabase-js': path.join(__dirname, 'node_modules/@supabase/supabase-js'),
    },
  },
  server: {
    fs: { allow: [root] },
  },
})
