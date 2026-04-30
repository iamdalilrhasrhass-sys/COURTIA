import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('')
  },
  server: {
    port: 3000,
    proxy: {
      '/api': '/api'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
