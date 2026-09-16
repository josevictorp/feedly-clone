import { Hono } from 'hono'
import {
  markStreamReadBodySchema,
  streamEntriesQuerySchema,
  streamIdSchema,
  streamSettingsPatchSchema,
} from '@feedly/shared'
import {
  getStreamEntries,
  markStreamRead,
  type StreamSort,
} from '../../entries/entries.repository.ts'
import { listFeeds } from '../../feeds/feeds.repository.ts'
import { parseStreamId, type StreamRef } from '../../streams/stream-id.ts'
import {
  resolveStreamSettings,
  writeStreamSettings,
} from '../../streams/stream-settings.repository.ts'
import { invalidRequest, notFound, type AppContext } from '../context.ts'
import { toEntrySummary } from '../serializers.ts'

/** Routes under `/api/streams/:streamId` (spec, section 7). */

function requireStream(raw: string): StreamRef {
  const parsed = streamIdSchema.safeParse(raw)
  if (!parsed.success) throw invalidRequest(`Stream inválido: ${raw}`)

  const ref = parseStreamId(parsed.data)
  if (!ref) throw invalidRequest(`Stream inválido: ${raw}`)
  return ref
}

/** Which feeds a stream covers; a refresh of "all" refreshes every feed. */
function feedIdsOfStream(ctx: AppContext, ref: StreamRef): number[] {
  if (ref.kind === 'feed') return [ref.feedId]

  const feeds = listFeeds(ctx.db)
  if (ref.kind === 'category') {
    const rows = ctx.db.$client
      .prepare('select feed_id from feed_categories where category_id = ?')
      .all(ref.categoryId) as { feed_id: number }[]
    return rows.map((row) => row.feed_id)
  }
  // all, saved and read all draw from every feed.
  return feeds.map((feed) => feed.id)
}

export function createStreamRoutes(ctx: AppContext) {
  const app = new Hono()
  const now = () => ctx.now?.() ?? Date.now()

  app.get('/:streamId/entries', (c) => {
    const ref = requireStream(c.req.param('streamId'))

    const query = streamEntriesQuerySchema.safeParse(c.req.query())
    if (!query.success) throw invalidRequest(query.error.issues[0]?.message ?? 'consulta inválida')

    const settings = resolveStreamSettings(ctx.db, ref)
    const sort: StreamSort =
      query.data.sort ?? (settings.sort === 'oldest' ? 'oldest' : 'newest')
    const unreadOnly = query.data.unreadOnly ?? settings.hideRead

    let page
    try {
      page = getStreamEntries(ctx.db, {
        stream: ref,
        sort,
        unreadOnly,
        cursor: query.data.cursor ?? null,
        limit: query.data.limit ?? 50,
        now: now(),
      })
    } catch (error) {
      throw invalidRequest(error instanceof Error ? error.message : 'cursor inválido')
    }

    return c.json({
      entries: page.entries.map(toEntrySummary),
      nextCursor: page.nextCursor,
    })
  })

  app.get('/:streamId/settings', (c) => {
    const ref = requireStream(c.req.param('streamId'))
    return c.json(resolveStreamSettings(ctx.db, ref))
  })

  app.put('/:streamId/settings', async (c) => {
    const ref = requireStream(c.req.param('streamId'))

    const body = streamSettingsPatchSchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    return c.json(writeStreamSettings(ctx.db, ref, body.data))
  })

  app.post('/:streamId/mark-read', async (c) => {
    const ref = requireStream(c.req.param('streamId'))

    const raw = await c.req.json().catch(() => ({}))
    const body = markStreamReadBodySchema.safeParse(raw ?? {})
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const affected = markStreamRead(ctx.db, ref, {
      ...(body.data.olderThan !== undefined ? { olderThan: body.data.olderThan } : {}),
      now: now(),
    })

    if (affected > 0) ctx.events.emit({ type: 'counts.changed' })

    return c.json({ affected })
  })

  app.post('/:streamId/refresh', (c) => {
    const ref = requireStream(c.req.param('streamId'))

    const feedIds = feedIdsOfStream(ctx, ref)
    if (ref.kind === 'feed' && feedIds.length === 1) {
      const exists = ctx.db.$client
        .prepare('select 1 as ok from feeds where id = ?')
        .get(ref.feedId)
      if (!exists) throw notFound('Feed não encontrado.')
    }

    // Answer 202 immediately: the refresh runs in the background and the
    // front end learns it finished through SSE.
    void ctx.scheduler.refreshFeeds(feedIds).catch((error: unknown) => {
      ctx.logger.error({ err: error }, 'manual refresh failed')
    })

    return c.json({ queued: feedIds.length }, 202)
  })

  return app
}
