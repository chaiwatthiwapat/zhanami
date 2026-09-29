import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { getSystemMetrics } from './server/systemMetrics.ts'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-system-metrics',
      configureServer(server) {
        server.middlewares.use('/api/system', async (request, response) => {
          if (request.method !== 'GET') {
            response.writeHead(405, { Allow: 'GET' }).end()
            return
          }

          try {
            const metrics = await getSystemMetrics()
            response.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
            }).end(JSON.stringify(metrics))
          } catch (error) {
            console.error('System metrics unavailable:', error)
            response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
              .end(JSON.stringify({ error: 'System metrics unavailable' }))
          }
        })
      },
    },
  ],
})
