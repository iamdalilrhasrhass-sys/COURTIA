import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9998',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // All React-dependent packages must be in vendor-react
            // to prevent circular chunk issues (createContext undefined)
            if (id.includes('react') || 
                id.includes('@react-oauth') ||
                id.includes('framer-motion') ||
                id.includes('motion-') ||
                id.includes('react-hot-toast') ||
                id.includes('react-router') ||
                id.includes('lucide-react') ||
                id.includes('react-dropzone') ||
                id.includes('react-select') ||
                id.includes('react-datepicker') ||
                id.includes('react-helmet') ||
                id.includes('react-hook-form') ||
                id.includes('react-markdown') ||
                id.includes('react-syntax') ||
                id.includes('react-spinners') ||
                id.includes('react-color') ||
                id.includes('react-phone') ||
                id.includes('react-csv') ||
                id.includes('class-variance') ||
                id.includes('tailwind-merge') ||
                id.includes('clsx') ||
                id.includes('zod') ||
                id.includes('html-to-image')
            ) return 'vendor-react';
            if (id.includes('zustand')) return 'vendor-state';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-date';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('three')) return 'vendor-three';
            // Everything else goes to main index chunk (avoids circular deps)
          }
        }
      }
    }
  }
})
