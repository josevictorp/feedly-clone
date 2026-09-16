import { Hono } from 'hono'
import { API_PREFIX } from '@feedly/shared'
import { ApiError, errorResponse, type AppContext } from './http/context.ts'
import { createEntryRoutes } from './http/routes/entries.ts'
import { createFeedRoutes } from './http/routes/feeds.ts'
import { createMiscRoutes } from './http/routes/misc.ts'
import { createStreamRoutes } from './http/routes/streams.ts'

/**
 * Builds the HTTP application.
 *
 * Only the `/api` surface lives here, so the whole API can be exercised in
 * tests against an in-memory database; static hosting of the SPA is wired in
 * `index.ts`, where the build output actually exists.
 */
export function createApp(ctx: AppContext): Hono {
  const app = new Hono()
  const api = new Hono()

  api.route('/streams', createStreamRoutes(ctx))
  api.route('/entries', createEntryRoutes(ctx))
  api.route('/feeds', createFeedRoutes(ctx))
  api.route('/', createMiscRoutes(ctx))

  api.all('/*', (c) =>
    c.json({ error: { code: 'not_found', message: `Rota inexistente: ${c.req.path}` } }, 404),
  )

  app.route(API_PREFIX, api)

  // Routes throw ApiError rather than building responses by hand, so every
  // failure comes out in the documented `{ error: { code, message } }` shape.
  app.onError((error, c) => {
    if (error instanceof ApiError) return errorResponse(c, error)

    ctx.logger.error({ err: error, path: c.req.path }, 'unhandled request failure')
    return c.json({ error: { code: 'internal', message: 'Erro interno do servidor.' } }, 500)
  })

  return app
}
