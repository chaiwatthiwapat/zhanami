import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { getSystemMetrics } from './server/systemMetrics.ts'
import { controlMedia, getMedia } from './server/mpris.ts'
import { isLaunchableApp, launchApp } from './server/appLauncher.ts'
import type { MediaAction } from './src/types/media.ts'

const mediaActions = new Set<MediaAction>(['playPause', 'previous', 'next', 'seek'])

function sendJson(response: import('node:http').ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  }).end(JSON.stringify(value))
}

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
    {
      name: 'local-media-player',
      configureServer(server) {
        server.middlewares.use('/api/media/control', async (request, response) => {
          if (request.method !== 'POST') {
            response.writeHead(405, { Allow: 'POST' }).end()
            return
          }
          if (!request.headers['content-type']?.startsWith('application/json')) {
            sendJson(response, 415, { error: 'JSON required' })
            return
          }

          try {
            let body = ''
            for await (const chunk of request) {
              body += chunk.toString()
              if (body.length > 2048) {
                sendJson(response, 413, { error: 'Request too large' })
                return
              }
            }
            const input = JSON.parse(body) as { playerId?: unknown; action?: unknown; seconds?: unknown }
            if (typeof input.playerId !== 'string' || !/^org\.mpris\.MediaPlayer2\.[A-Za-z0-9_.-]+$/.test(input.playerId)
              || !mediaActions.has(input.action as MediaAction)
              || (input.action === 'seek' && (typeof input.seconds !== 'number' || !Number.isFinite(input.seconds)))) {
              sendJson(response, 400, { error: 'Invalid media command' })
              return
            }

            const result = await controlMedia(input.playerId, input.action as MediaAction, input.seconds as number | undefined)
            sendJson(response, result.ok ? 200 : 409, result)
          } catch (error) {
            if (error instanceof SyntaxError) {
              sendJson(response, 400, { error: 'Invalid JSON' })
            } else {
              console.error('Media control unavailable:', error)
              sendJson(response, 503, { error: 'Media control unavailable' })
            }
          }
        })

        server.middlewares.use('/api/media', async (request, response) => {
          if (request.method !== 'GET') {
            response.writeHead(405, { Allow: 'GET' }).end()
            return
          }
          try {
            sendJson(response, 200, await getMedia())
          } catch (error) {
            console.error('Media status unavailable:', error)
            sendJson(response, 503, { error: 'Media status unavailable' })
          }
        })
      },
    },
    {
      name: 'local-app-launcher',
      configureServer(server) {
        server.middlewares.use('/api/apps/launch', async (request, response) => {
          if (request.method !== 'POST') {
            response.writeHead(405, { Allow: 'POST' }).end()
            return
          }
          if (!request.headers['content-type']?.startsWith('application/json')) {
            sendJson(response, 415, { error: 'JSON required' })
            return
          }

          try {
            let body = ''
            for await (const chunk of request) {
              body += chunk.toString()
              if (body.length > 256) {
                sendJson(response, 413, { error: 'Request too large' })
                return
              }
            }
            const input = JSON.parse(body) as { app?: unknown }
            if (!isLaunchableApp(input.app)) {
              sendJson(response, 400, { error: 'Unknown app' })
              return
            }
            await launchApp(input.app)
            sendJson(response, 200, { ok: true })
          } catch (error) {
            if (error instanceof SyntaxError) {
              sendJson(response, 400, { error: 'Invalid JSON' })
            } else {
              console.error('App launch failed:', error)
              sendJson(response, 503, { error: 'App launch failed' })
            }
          }
        })
      },
    },
  ],
})
