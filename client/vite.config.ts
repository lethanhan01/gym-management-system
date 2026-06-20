import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const DEFAULT_API_PROXY_TARGET = 'http://127.0.0.1:3000'
const BACKEND_READY_TIMEOUT_MS = 60_000

function waitForBackend(target: string): Plugin {
  return {
    name: 'wait-for-backend',
    apply: 'serve',
    async configureServer(server) {
      const healthUrl = new URL('/health', target).toString()
      const deadline = Date.now() + BACKEND_READY_TIMEOUT_MS
      let lastError = 'backend has not responded'

      server.config.logger.info(`[vite] Waiting for backend at ${healthUrl}...`)

      while (Date.now() < deadline) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 2_000)

        try {
          const response = await fetch(healthUrl, { signal: controller.signal })
          if (response.ok) {
            server.config.logger.info('[vite] Backend is ready.')
            return
          }
          lastError = `HTTP ${response.status}`
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
        } finally {
          clearTimeout(timeout)
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      throw new Error(
        `[vite] Backend is unavailable at ${healthUrl} after 60 seconds (${lastError}). ` +
          'Start it with "cd server && npm run dev".'
      )
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET
  const usesDevProxy = !env.VITE_API_URL

  return {
    plugins: [
      react(),
      ...(command === 'serve' && usesDevProxy ? [waitForBackend(proxyTarget)] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['recharts'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          },
        },
      },
    },
  }
})
