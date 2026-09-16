import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const SERVER_PORT = process.env.PORT ?? '3000'

export default defineConfig({
  plugins: [react()],
  // React and react-dom must resolve to a single copy across the workspace.
  resolve: { dedupe: ['react', 'react-dom'] },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${SERVER_PORT}`, changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
})
