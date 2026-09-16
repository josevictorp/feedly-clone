import { Hono } from 'hono'
import { API_PREFIX, type HealthResponse } from '@feedly/shared'
import { APP_VERSION } from './version.ts'

/**
 * Builds the HTTP application.
 *
 * Only the `/api` surface lives here so the app can be exercised in tests
 * without touching the filesystem; static hosting of the SPA is wired in
 * `index.ts`, where the build output actually exists.
 */
export function createApp(): Hono {
  const app = new Hono()

  app.get(`${API_PREFIX}/health`, (c) => {
    const body: HealthResponse = {
      status: 'ok',
      version: APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
    }
    return c.json(body)
  })

  app.all(`${API_PREFIX}/*`, (c) =>
    c.json({ error: { code: 'not_found', message: `No API route for ${c.req.path}` } }, 404),
  )

  return app
}
