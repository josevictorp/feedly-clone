import { Hono } from 'hono'
import { markEntriesBodySchema, saveEntriesBodySchema } from '@feedly/shared'
import {
  findEntryById,
  setEntriesRead,
  setEntriesSaved,
} from '../../entries/entries.repository.ts'
import { findFeedById } from '../../feeds/feeds.repository.ts'
import { invalidRequest, notFound, type AppContext } from '../context.ts'
import { toEntryDetail } from '../serializers.ts'

/** Routes under `/api/entries` (spec, section 7). */
export function createEntryRoutes(ctx: AppContext) {
  const app = new Hono()
  const now = () => ctx.now?.() ?? Date.now()

  app.post('/mark', async (c) => {
    const body = markEntriesBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const affected = setEntriesRead(ctx.db, body.data.ids, body.data.read, now())
    if (affected > 0) ctx.events.emit({ type: 'counts.changed' })

    return c.json({ affected })
  })

  app.post('/save', async (c) => {
    const body = saveEntriesBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const affected = setEntriesSaved(ctx.db, body.data.ids, body.data.saved, now())

    return c.json({ affected })
  })

  // Declared after the literal paths so `/mark` is never read as an id.
  app.get('/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) throw invalidRequest('Id de entrada inválido.')

    const entry = findEntryById(ctx.db, id)
    if (!entry) throw notFound('Entrada não encontrada.')

    const feed = findFeedById(ctx.db, entry.feedId)
    if (!feed) throw notFound('Feed da entrada não encontrado.')

    return c.json(
      toEntryDetail(entry, {
        id: feed.id,
        title: feed.title,
        iconPath: feed.iconPath,
        siteUrl: feed.siteUrl,
      }),
    )
  })

  return app
}
