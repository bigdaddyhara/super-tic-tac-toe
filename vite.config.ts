import { defineConfig } from 'vite'

export default defineConfig({
  root: process.cwd(),
  // Allow overriding the base path at build time to support GitHub Pages
  // Usage: VITE_BASE=/repo/ npm run build
  base: process.env.VITE_BASE || process.env.BASE || '/',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
