import { createReadStream, existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { Readable } from 'node:stream'
import { Hono } from 'hono'
import { discoverBodySchema, followFeedBodySchema, updateFeedBodySchema } from '@feedly/shared'
import { findCategoryById } from '../../categories/categories.repository.ts'
import { discoverFeeds } from '../../feeds/discover.ts'
import { resolveFavicon } from '../../feeds/favicon.ts'
import { listFeedsWithCounts } from '../../feeds/feeds.query.ts'
import {
  createFeed,
  deleteFeed,
  findFeedById,
  findFeedByUrl,
  setFeedCategories,
  updateFeed,
} from '../../feeds/feeds.repository.ts'
import { ApiError, invalidRequest, notFound, type AppContext } from '../context.ts'

/** Routes under `/api/feeds` (spec, section 7). */

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function requireFeedId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw invalidRequest('Id de feed inválido.')
  return id
}

function requireExistingCategories(ctx: AppContext, ids: number[]): void {
  for (const id of ids) {
    if (!findCategoryById(ctx.db, id)) throw notFound(`Pasta ${id} não encontrada.`)
  }
}

export function createFeedRoutes(ctx: AppContext) {
  const app = new Hono()
  const now = () => ctx.now?.() ?? Date.now()

  app.get('/', (c) => c.json({ feeds: listFeedsWithCounts(ctx.db) }))

  app.post('/discover', async (c) => {
    const body = discoverBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const candidates = await discoverFeeds(body.data.query, {
      ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
    })

    return c.json({ candidates })
  })

  app.post('/', async (c) => {
    const body = followFeedBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    if (findFeedByUrl(ctx.db, body.data.feedUrl)) {
      throw new ApiError('conflict', 'Esse feed já está sendo seguido.')
    }
    requireExistingCategories(ctx, body.data.categoryIds)

    const feed = createFeed(ctx.db, {
      feedUrl: body.data.feedUrl,
      title: body.data.title ?? body.data.feedUrl,
      categoryIds: body.data.categoryIds,
      now: now(),
    })

    // Fetch the feed and its icon right away, in the background: the follow
    // dialog should close immediately (RF-01).
    void (async () => {
      try {
        await ctx.scheduler.refreshFeeds([feed.id])

        const refreshed = findFeedById(ctx.db, feed.id)
        const icon = await resolveFavicon({
          feedId: feed.id,
          siteUrl: refreshed?.siteUrl ?? null,
          dataDir: ctx.dataDir,
          ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
        })
        if (icon) updateFeed(ctx.db, feed.id, { iconPath: icon.iconPath })

        ctx.events.emit({ type: 'counts.changed' })
      } catch (error) {
        ctx.logger.error({ err: error, feedId: feed.id }, 'first fetch of a new feed failed')
      }
    })()

    return c.json({ feed: { ...feed, unreadCount: 0, categoryIds: body.data.categoryIds } }, 201)
  })

  app.patch('/:id', async (c) => {
    const id = requireFeedId(c.req.param('id'))
    if (!findFeedById(ctx.db, id)) throw notFound('Feed não encontrado.')

    const body = updateFeedBodySchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) throw invalidRequest(body.error.issues[0]?.message ?? 'corpo inválido')

    const { categoryIds, ...patch } = body.data

    if (Object.keys(patch).length > 0) updateFeed(ctx.db, id, patch)
    if (categoryIds) {
      requireExistingCategories(ctx, categoryIds)
      setFeedCategories(ctx.db, id, categoryIds)
    }

    ctx.events.emit({ type: 'counts.changed' })

    const updated = listFeedsWithCounts(ctx.db).find((feed) => feed.id === id)
    return c.json({ feed: updated })
  })

  app.delete('/:id', (c) => {
    const id = requireFeedId(c.req.param('id'))

    if (!deleteFeed(ctx.db, id)) throw notFound('Feed não encontrado.')
    ctx.events.emit({ type: 'counts.changed' })

    return c.body(null, 204)
  })

  app.get('/:id/icon', (c) => {
    const id = requireFeedId(c.req.param('id'))

    const feed = findFeedById(ctx.db, id)
    if (!feed?.iconPath) throw notFound('Esse feed não tem ícone.')

    // iconPath is written by the server, but it is still joined defensively:
    // a path that escapes the data directory must never be served.
    const absolute = normalize(join(ctx.dataDir, feed.iconPath))
    if (!absolute.startsWith(normalize(ctx.dataDir)) || !existsSync(absolute)) {
      throw notFound('Ícone não encontrado.')
    }

    const contentType = CONTENT_TYPE_BY_EXTENSION[extname(absolute).toLowerCase()]
    return c.body(Readable.toWeb(createReadStream(absolute)) as ReadableStream, 200, {
      'content-type': contentType ?? 'application/octet-stream',
      'cache-control': 'public, max-age=86400',
    })
  })

  return app
}
