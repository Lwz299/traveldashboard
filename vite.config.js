import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    (env.VITE_API_BASE_URL || env.VITE_API_PROXY_TARGET || 'https://api.altadumntest.com').replace(
      /\/+$/,
      ''
    )

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
