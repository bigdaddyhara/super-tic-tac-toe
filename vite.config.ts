import { defineConfig } from 'vite'

export default defineConfig({
  root: process.cwd(),
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
