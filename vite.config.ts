/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6969,
    strictPort: true,
  },
  preview: {
    port: 6969,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": "/src",
      "@server": "/server/src",
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
