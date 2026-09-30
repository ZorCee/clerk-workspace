import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handlePersistApi } from './server/persist.ts'

function relaxTimeouts(server: { httpServer?: { setTimeout: (n: number) => void; headersTimeout?: number; requestTimeout?: number } | null }): void {
  const http = server.httpServer
  if (!http) return
  http.setTimeout(0)
  http.headersTimeout = 0
  http.requestTimeout = 0
}

function persistApi(): Plugin {
  return {
    name: 'wenshi-persist',
    configureServer(server) {
      relaxTimeouts(server)
      server.httpServer?.once('listening', () => relaxTimeouts(server))
      server.middlewares.use((req, res, next) => {
        void handlePersistApi(req, res, next)
      })
    },
    configurePreviewServer(server) {
      relaxTimeouts(server)
      server.httpServer?.once('listening', () => relaxTimeouts(server))
      server.middlewares.use((req, res, next) => {
        void handlePersistApi(req, res, next)
      })
    },
  }
}

const listenPort = Number(process.env.PORT) || 5173

export default defineConfig({
  plugins: [react(), persistApi()],
  server: {
    host: true,
    port: listenPort,
    strictPort: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/演示/**', '**/D:\\谛图文事台数据/**', '**/D:\\谛图文事台数据-演示/**'],
    },
  },
})
