import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - only for eagerly loaded dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-utils': ['axios', 'date-fns'],
          // Note: @react-pdf/renderer and recharts are NOT in manualChunks
          // because they are dynamically imported via lazy() and import()
          // This allows Vite to create optimal code-split chunks automatically
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
