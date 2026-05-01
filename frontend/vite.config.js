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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('zustand')) return 'vendor-state';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-date';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('three')) return 'vendor-three';
            return 'vendor-other';
          }
        }
      }
    }
  }
})
