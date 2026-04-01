import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://courtia.onrender.com')
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'https://courtia.onrender.com'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
