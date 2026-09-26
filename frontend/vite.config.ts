import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: funciona em usuario.github.io/<qualquer-repo>/ sem saber o nome antes
export default defineConfig({
  base: './',
  plugins: [react()],
  // o texto da dissertação vai inteiro no bundle (JSON congelado)
  build: { chunkSizeWarningLimit: 2500 },
})
