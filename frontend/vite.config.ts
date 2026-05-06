import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
    },
  },
})
