import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
  createCategoryBodySchema,
  preferencesPatchSchema,
  updateCategoryBodySchema,
  type AppEvent,
} from '@feedly/shared'
import { listCategoriesWithCounts } from '../../categories/categories.query.ts'
import {
  createCategory,
  deleteCategory,
  findCategoryById,
  updateCategory,
} from '../../categories/categories.repository.ts'
import { exportOpml, importOpml, InvalidOpmlError } from '../../opml/opml.ts'
import {
  readPreferences,
  writePreferences,
} from '../../preferences/preferences.repository.ts'
import { getSidebar } from '../../sidebar/sidebar.query.ts'
import { getTodayGroups } from '../../today/today.query.ts'
import { APP_VERSION } from '../../version.ts'
import { invalidRequest, notFound, type AppContext } from '../context.ts'

/**
 * The routes that do not need a module of their own: categories, sidebar,
 * today, preferences, OPML, health and the SSE stream.
 */

/** How often a heartbeat is sent, to keep proxies from closing the SSE stream. */
const SSE_KEEPALIVE_MS = 25_000

function createCategoryRoutes(ctx: AppContext) {
  const app = new Hono()
  const now = () => ctx.now?.() ?? Date.now()

  app.get('/', (c) => c.json({ categories: listCategoriesWithCounts(ctx.db) }))

  app.post('/', async (c) => {
    const body = createCategoryBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const category = createCategory(ctx.db, { label: body.data.label, now: now() })
    return c.json({ category: { ...category, unreadCount: 0, feedIds: [] } }, 201)
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) throw invalidRequest('Id de pasta inválido.')
    if (!findCategoryById(ctx.db, id)) throw notFound('Pasta não encontrada.')

    const body = updateCategoryBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    updateCategory(ctx.db, id, body.data)

    const updated = listCategoriesWithCounts(ctx.db).find((category) => category.id === id)
    return c.json({ category: updated })
  })

  app.delete('/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) throw invalidRequest('Id de pasta inválido.')

    if (!deleteCategory(ctx.db, id)) throw notFound('Pasta não encontrada.')
    ctx.events.emit({ type: 'counts.changed' })

    return c.body(null, 204)
  })

  return app
}

function createOpmlRoutes(ctx: AppContext) {
  const app = new Hono()
  const now = () => ctx.now?.() ?? Date.now()

  app.post('/import', async (c) => {
    let xml: string

    const contentType = c.req.header('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      const form = await c.req.parseBody()
      const file = form.file ?? form.opml
      if (file instanceof File) {
        xml = await file.text()
      } else if (typeof file === 'string') {
        xml = file
      } else {
        throw invalidRequest('Envie o arquivo OPML no campo "file".')
      }
    } else {
      xml = await c.req.text()
    }

    if (xml.trim() === '') throw invalidRequest('O arquivo OPML está vazio.')

    let result
    try {
      result = importOpml(ctx.db, xml, { now: now() })
    } catch (error) {
      if (error instanceof InvalidOpmlError) throw invalidRequest(error.message)
      throw error
    }

    if (result.addedFeedIds.length > 0) {
      ctx.events.emit({ type: 'counts.changed' })
      // Fetch everything that was just imported, in the background.
      void ctx.scheduler.refreshFeeds(result.addedFeedIds).catch((error: unknown) => {
        ctx.logger.error({ err: error }, 'fetch after OPML import failed')
      })
    }

    return c.json({
      added: result.added,
      skipped: result.skipped,
      categoriesCreated: result.categoriesCreated,
    })
  })

  app.get('/export', (c) => {
    const preferences = readPreferences(ctx.db)
    const owner = [preferences.profileGivenName, preferences.profileFamilyName]
      .filter((part) => part !== '')
      .join(' ')

    const xml = exportOpml(ctx.db, owner === '' ? 'Feedly Clone subscriptions' : `${owner} subscriptions`)

    return c.body(xml, 200, {
      'content-type': 'text/x-opml; charset=utf-8',
      'content-disposition': 'attachment; filename="feedly-clone.opml"',
    })
  })

  return app
}

export function createMiscRoutes(ctx: AppContext) {
  const app = new Hono()

  app.route('/categories', createCategoryRoutes(ctx))
  app.route('/opml', createOpmlRoutes(ctx))

  app.get('/health', (c) =>
    c.json({ status: 'ok', version: APP_VERSION, uptimeSeconds: Math.round(process.uptime()) }),
  )

  app.get('/sidebar', (c) => c.json(getSidebar(ctx.db)))

  app.get('/today', (c) => c.json({ groups: getTodayGroups(ctx.db) }))

  app.get('/preferences', (c) => c.json(readPreferences(ctx.db)))

  app.patch('/preferences', async (c) => {
    const body = preferencesPatchSchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    return c.json(writePreferences(ctx.db, body.data))
  })

  /**
   * Server-sent events (RF-10). The front end keeps this open and updates
   * counters and lists from it; it falls back to polling if the stream drops.
   */
  app.get('/events', (c) =>
    streamSSE(c, async (stream) => {
      const queue: AppEvent[] = []
      let wake: (() => void) | null = null

      const unsubscribe = ctx.events.subscribe((event) => {
        queue.push(event)
        wake?.()
      })

      stream.onAbort(() => {
        unsubscribe()
        wake?.()
      })

      await stream.writeSSE({ event: 'ready', data: JSON.stringify({ ok: true }) })

      try {
        while (!stream.aborted && !stream.closed) {
          const event = queue.shift()

          if (event) {
            await stream.writeSSE({ event: event.type, data: JSON.stringify(event) })
            continue
          }

          // Nothing queued: wait for the next event, or send a heartbeat.
          const woken = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), SSE_KEEPALIVE_MS)
            wake = () => {
              clearTimeout(timer)
              resolve(true)
            }
          })
          wake = null

          if (!woken && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' })
        }
      } finally {
        unsubscribe()
      }
    }),
  )

  return app
}
