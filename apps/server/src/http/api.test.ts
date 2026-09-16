import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCategory } from '../categories/categories.repository.ts'
import { setEntriesRead } from '../entries/entries.repository.ts'
import { createFeed } from '../feeds/feeds.repository.ts'
import { createFakeHttp } from '../testing/http.ts'
import { makeEntry, NOW } from '../testing/fixtures.ts'
import { createTestApp, json, type TestApp } from '../testing/test-app.ts'

const XML = { 'content-type': 'application/rss+xml; charset=UTF-8' }
const HTML = { 'content-type': 'text/html; charset=UTF-8' }

const techcrunch = readFileSync(
  fileURLToPath(new URL('../feeds/__fixtures__/rss2-techcrunch.xml', import.meta.url)),
  'utf8',
)
const realOpml = readFileSync(
  fileURLToPath(new URL('../opml/__fixtures__/feedly-export-sample.opml', import.meta.url)),
  'utf8',
)

describe('API', () => {
  let ctx: TestApp

  function setUp(routes: Parameters<typeof createFakeHttp>[0] = {}) {
    const http = createFakeHttp(routes)
    ctx = createTestApp({ fetchImpl: http.fetch, now: NOW })
    return http
  }

  beforeEach(() => {
    setUp()
  })
  afterEach(() => ctx.close())

  /* ------------------------------------------------------------- health */

  describe('GET /api/health', () => {
    it('reports the service as up', async () => {
      const { status, body } = await json(ctx.app, 'GET', '/api/health')

      expect(status).toBe(200)
      expect(body).toMatchObject({ status: 'ok' })
    })
  })

  describe('unknown routes', () => {
    it('answer 404 with a typed error', async () => {
      const { status, body } = await json(ctx.app, 'GET', '/api/nope')

      expect(status).toBe(404)
      expect(body.error.code).toBe('not_found')
    })
  })

  /* --------------------------------------------------------- categories */

  describe('categories', () => {
    it('creates, lists, renames and deletes a folder', async () => {
      const created = await json(ctx.app, 'POST', '/api/categories', { label: 'Tecnologia' })
      expect(created.status).toBe(201)
      const id = created.body.category.id

      const listed = await json(ctx.app, 'GET', '/api/categories')
      expect(listed.body.categories).toHaveLength(1)
      expect(listed.body.categories[0]).toMatchObject({ label: 'Tecnologia', unreadCount: 0 })

      const renamed = await json(ctx.app, 'PATCH', `/api/categories/${id}`, {
        label: 'Tech',
        isCollapsed: true,
      })
      expect(renamed.body.category).toMatchObject({ label: 'Tech', isCollapsed: true })

      const removed = await json(ctx.app, 'DELETE', `/api/categories/${id}`)
      expect(removed.status).toBe(204)
      expect((await json(ctx.app, 'GET', '/api/categories')).body.categories).toEqual([])
    })

    it('rejects a folder with no label', async () => {
      const { status, body } = await json(ctx.app, 'POST', '/api/categories', { label: '' })

      expect(status).toBe(400)
      expect(body.error.code).toBe('invalid_request')
    })

    it('answers 404 for a folder that is not there', async () => {
      expect((await json(ctx.app, 'PATCH', '/api/categories/999', { label: 'x' })).status).toBe(404)
      expect((await json(ctx.app, 'DELETE', '/api/categories/999')).status).toBe(404)
    })

    it('counts unread articles per folder', async () => {
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })
      const feed = createFeed(ctx.db, {
        feedUrl: 'https://a.test/f.xml',
        title: 'A',
        categoryIds: [category.id],
        now: NOW,
      })
      makeEntry(ctx.db, feed.id)
      makeEntry(ctx.db, feed.id, { isRead: true })

      const { body } = await json(ctx.app, 'GET', '/api/categories')

      expect(body.categories[0]).toMatchObject({ unreadCount: 1, feedIds: [feed.id] })
    })
  })

  /* --------------------------------------------------------------- feeds */

  describe('feeds', () => {
    it('follows a feed and fetches it in the background', async () => {
      const http = setUp({
        'https://a.test/f.xml': { body: techcrunch, headers: XML },
        'https://techcrunch.com/': { body: '<head></head>', headers: HTML },
      })

      const created = await json(ctx.app, 'POST', '/api/feeds', {
        feedUrl: 'https://a.test/f.xml',
        title: 'TechCrunch',
      })

      expect(created.status).toBe(201)
      // Let the background refresh settle.
      await ctx.scheduler.refreshFeeds([created.body.feed.id])

      const { body } = await json(ctx.app, 'GET', '/api/feeds')
      expect(body.feeds[0]).toMatchObject({ title: 'TechCrunch', unreadCount: 3 })
      expect(http.requests.some((r) => r.url === 'https://a.test/f.xml')).toBe(true)
    })

    it('refuses to follow the same feed twice', async () => {
      await json(ctx.app, 'POST', '/api/feeds', { feedUrl: 'https://a.test/f.xml' })

      const { status, body } = await json(ctx.app, 'POST', '/api/feeds', {
        feedUrl: 'https://a.test/f.xml',
      })

      expect(status).toBe(409)
      expect(body.error.code).toBe('conflict')
    })

    it('rejects a feed URL that is not a URL', async () => {
      const { status } = await json(ctx.app, 'POST', '/api/feeds', { feedUrl: 'nope' })

      expect(status).toBe(400)
    })

    it('refuses to file a feed under a folder that does not exist', async () => {
      const { status } = await json(ctx.app, 'POST', '/api/feeds', {
        feedUrl: 'https://a.test/f.xml',
        categoryIds: [999],
      })

      expect(status).toBe(404)
    })

    it('renames a feed and moves it between folders', async () => {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })

      const { body } = await json(ctx.app, 'PATCH', `/api/feeds/${feed.id}`, {
        title: 'Meu feed',
        isFavorite: true,
        categoryIds: [category.id],
      })

      expect(body.feed).toMatchObject({
        title: 'Meu feed',
        isFavorite: true,
        categoryIds: [category.id],
      })
    })

    it('rejects an empty patch', async () => {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })

      expect((await json(ctx.app, 'PATCH', `/api/feeds/${feed.id}`, {})).status).toBe(400)
    })

    it('unfollows a feed and its entries', async () => {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })
      makeEntry(ctx.db, feed.id)

      expect((await json(ctx.app, 'DELETE', `/api/feeds/${feed.id}`)).status).toBe(204)

      const { body } = await json(ctx.app, 'GET', '/api/streams/all/entries')
      expect(body.entries).toEqual([])
    })

    it('answers 404 when unfollowing something that is not there', async () => {
      expect((await json(ctx.app, 'DELETE', '/api/feeds/999')).status).toBe(404)
    })

    it('discovers the feed of a site', async () => {
      setUp({
        'https://site.test/': {
          body: '<link rel="alternate" type="application/rss+xml" href="/rss.xml">',
          headers: HTML,
        },
        'https://site.test/rss.xml': { body: techcrunch, headers: XML },
      })

      const { status, body } = await json(ctx.app, 'POST', '/api/feeds/discover', {
        query: 'site.test',
      })

      expect(status).toBe(200)
      expect(body.candidates).toEqual([
        { feedUrl: 'https://site.test/rss.xml', title: 'TechCrunch', source: 'link-tag' },
      ])
    })

    it('reports an empty candidate list rather than an error', async () => {
      setUp({ 'https://nada.test/': { body: '<html>sem feed</html>', headers: HTML } })

      const { status, body } = await json(ctx.app, 'POST', '/api/feeds/discover', {
        query: 'nada.test',
      })

      expect(status).toBe(200)
      expect(body.candidates).toEqual([])
    })

    it('answers 404 for the icon of a feed that has none', async () => {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })

      expect((await json(ctx.app, 'GET', `/api/feeds/${feed.id}/icon`)).status).toBe(404)
    })
  })

  /* ------------------------------------------------------------- streams */

  describe('streams', () => {
    function seed() {
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })
      const feed = createFeed(ctx.db, {
        feedUrl: 'https://a.test/f.xml',
        title: 'A',
        categoryIds: [category.id],
        now: NOW,
      })
      const other = createFeed(ctx.db, {
        feedUrl: 'https://b.test/f.xml',
        title: 'B',
        now: NOW,
      })
      return { category, feed, other }
    }

    it('lists entries newest first, with the feed embedded', async () => {
      const { feed } = seed()
      makeEntry(ctx.db, feed.id, { title: 'velho', publishedAt: NOW - 1000 })
      makeEntry(ctx.db, feed.id, { title: 'novo', publishedAt: NOW })

      const { body } = await json(ctx.app, 'GET', '/api/streams/all/entries')

      expect(body.entries.map((e: { title: string }) => e.title)).toEqual(['novo', 'velho'])
      expect(body.entries[0].feed).toMatchObject({ id: feed.id, title: 'A' })
      expect(body.entries[0].contentHtml).toBeUndefined()
    })

    it('paginates with the cursor it hands back', async () => {
      const { feed } = seed()
      for (let i = 0; i < 5; i += 1) makeEntry(ctx.db, feed.id, { publishedAt: NOW - i * 1000 })

      const first = await json(ctx.app, 'GET', '/api/streams/all/entries?limit=2')
      expect(first.body.entries).toHaveLength(2)
      expect(first.body.nextCursor).toBeTruthy()

      const second = await json(
        ctx.app,
        'GET',
        `/api/streams/all/entries?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`,
      )
      expect(second.body.entries).toHaveLength(2)
    })

    it('rejects a malformed cursor', async () => {
      const { status, body } = await json(ctx.app, 'GET', '/api/streams/all/entries?cursor=nope')

      expect(status).toBe(400)
      expect(body.error.code).toBe('invalid_request')
    })

    it('filters by folder and by feed', async () => {
      const { category, feed, other } = seed()
      makeEntry(ctx.db, feed.id, { title: 'na pasta' })
      makeEntry(ctx.db, other.id, { title: 'fora' })

      const byCategory = await json(ctx.app, 'GET', `/api/streams/category:${category.id}/entries`)
      const byFeed = await json(ctx.app, 'GET', `/api/streams/feed:${other.id}/entries`)

      expect(byCategory.body.entries.map((e: { title: string }) => e.title)).toEqual(['na pasta'])
      expect(byFeed.body.entries.map((e: { title: string }) => e.title)).toEqual(['fora'])
    })

    it('rejects a stream id it does not recognise', async () => {
      const { status } = await json(ctx.app, 'GET', '/api/streams/bogus/entries')

      expect(status).toBe(400)
    })

    it('reads and writes the per-stream settings', async () => {
      const initial = await json(ctx.app, 'GET', '/api/streams/all/settings')
      expect(initial.body).toEqual({ viewMode: 'magazine', sort: 'newest', hideRead: false })

      const updated = await json(ctx.app, 'PUT', '/api/streams/all/settings', {
        viewMode: 'cards',
      })
      expect(updated.body).toMatchObject({ viewMode: 'cards', sort: 'newest' })

      const reread = await json(ctx.app, 'GET', '/api/streams/all/settings')
      expect(reread.body.viewMode).toBe('cards')
    })

    it('keeps the settings of one stream out of another', async () => {
      const { feed } = seed()
      await json(ctx.app, 'PUT', `/api/streams/feed:${feed.id}/settings`, { viewMode: 'article' })

      const all = await json(ctx.app, 'GET', '/api/streams/all/settings')

      expect(all.body.viewMode).toBe('magazine')
    })

    it('marks a whole stream read and announces the change', async () => {
      const { feed } = seed()
      makeEntry(ctx.db, feed.id)
      makeEntry(ctx.db, feed.id)

      const { status, body } = await json(ctx.app, 'POST', '/api/streams/all/mark-read', {})

      expect(status).toBe(200)
      expect(body.affected).toBe(2)
      expect(ctx.published).toContainEqual({ type: 'counts.changed' })
    })

    it('marks only what is older than the given instant', async () => {
      const { feed } = seed()
      makeEntry(ctx.db, feed.id, { publishedAt: NOW - 100_000 })
      makeEntry(ctx.db, feed.id, { publishedAt: NOW })

      const { body } = await json(ctx.app, 'POST', '/api/streams/all/mark-read', {
        olderThan: NOW - 50_000,
      })

      expect(body.affected).toBe(1)
    })

    it('queues a refresh and answers 202', async () => {
      const http = setUp({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })

      const { status, body } = await json(ctx.app, 'POST', `/api/streams/feed:${feed.id}/refresh`)

      expect(status).toBe(202)
      expect(body.queued).toBe(1)
      await ctx.scheduler.refreshFeeds([feed.id])
      expect(http.requests.length).toBeGreaterThan(0)
    })

    it('answers 404 when refreshing a feed that is not there', async () => {
      expect((await json(ctx.app, 'POST', '/api/streams/feed:999/refresh')).status).toBe(404)
    })

    it('serves "Ler depois" and "Lidos recentemente"', async () => {
      const { feed } = seed()
      const saved = makeEntry(ctx.db, feed.id, { title: 'salvo', isSaved: true, savedAt: NOW })
      makeEntry(ctx.db, feed.id, { title: 'lido', isRead: true, readAt: NOW })

      const savedStream = await json(ctx.app, 'GET', '/api/streams/saved/entries')
      const readStream = await json(ctx.app, 'GET', '/api/streams/read/entries')

      expect(savedStream.body.entries.map((e: { id: number }) => e.id)).toEqual([saved.id])
      expect(readStream.body.entries.map((e: { title: string }) => e.title)).toEqual(['lido'])
    })
  })

  /* ------------------------------------------------------------- entries */

  describe('entries', () => {
    function seedEntry() {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })
      return makeEntry(ctx.db, feed.id)
    }

    it('serves one entry with its content', async () => {
      const entry = seedEntry()
      ctx.db.$client
        .prepare('update entries set content_html = ? where id = ?')
        .run('<p>corpo</p>', entry.id)

      const { status, body } = await json(ctx.app, 'GET', `/api/entries/${entry.id}`)

      expect(status).toBe(200)
      expect(body).toMatchObject({ id: entry.id, contentHtml: '<p>corpo</p>' })
    })

    it('answers 404 for an entry that is not there', async () => {
      expect((await json(ctx.app, 'GET', '/api/entries/999')).status).toBe(404)
    })

    it('rejects an id that is not a number', async () => {
      expect((await json(ctx.app, 'GET', '/api/entries/abc')).status).toBe(400)
    })

    it('marks entries read and unread', async () => {
      const entry = seedEntry()

      const marked = await json(ctx.app, 'POST', '/api/entries/mark', {
        ids: [entry.id],
        read: true,
      })
      expect(marked.body.affected).toBe(1)
      expect((await json(ctx.app, 'GET', `/api/entries/${entry.id}`)).body.isRead).toBe(true)

      await json(ctx.app, 'POST', '/api/entries/mark', { ids: [entry.id], read: false })
      expect((await json(ctx.app, 'GET', `/api/entries/${entry.id}`)).body.isRead).toBe(false)
    })

    it('saves and unsaves entries', async () => {
      const entry = seedEntry()

      await json(ctx.app, 'POST', '/api/entries/save', { ids: [entry.id], saved: true })

      const reread = await json(ctx.app, 'GET', `/api/entries/${entry.id}`)
      expect(reread.body).toMatchObject({ isSaved: true, savedAt: NOW })
    })

    it('rejects an empty id list', async () => {
      const { status } = await json(ctx.app, 'POST', '/api/entries/mark', { ids: [], read: true })

      expect(status).toBe(400)
    })

    it('rejects a body that is not JSON', async () => {
      const response = await ctx.app.request('/api/entries/mark', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'não é json',
      })

      expect(response.status).toBe(400)
    })
  })

  /* ------------------------------------------------- sidebar, today, prefs */

  describe('sidebar and today', () => {
    it('serves the sidebar tree with counts', async () => {
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })
      const feed = createFeed(ctx.db, {
        feedUrl: 'https://a.test/f.xml',
        title: 'A',
        categoryIds: [category.id],
        now: NOW,
      })
      makeEntry(ctx.db, feed.id)

      const { body } = await json(ctx.app, 'GET', '/api/sidebar')

      expect(body).toMatchObject({ totalUnread: 1, uncategorized: [] })
      expect(body.categories[0]).toMatchObject({ label: 'Tech', unreadCount: 1 })
    })

    it('groups Today by folder, ten entries each', async () => {
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })
      const feed = createFeed(ctx.db, {
        feedUrl: 'https://a.test/f.xml',
        title: 'A',
        categoryIds: [category.id],
        now: NOW,
      })
      for (let i = 0; i < 15; i += 1) makeEntry(ctx.db, feed.id, { publishedAt: NOW - i * 1000 })

      const { body } = await json(ctx.app, 'GET', '/api/today')

      expect(body.groups).toHaveLength(1)
      expect(body.groups[0]).toMatchObject({ label: 'Tech', unreadCount: 15 })
      expect(body.groups[0].entries).toHaveLength(10)
    })

    it('leaves read articles out of Today', async () => {
      const feed = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })
      const entry = makeEntry(ctx.db, feed.id)
      setEntriesRead(ctx.db, [entry.id], true, NOW)

      const { body } = await json(ctx.app, 'GET', '/api/today')

      expect(body.groups).toEqual([])
    })

    it('puts feeds with no folder in their own group, last', async () => {
      const category = createCategory(ctx.db, { label: 'Tech', now: NOW })
      const inFolder = createFeed(ctx.db, {
        feedUrl: 'https://a.test/f.xml',
        title: 'A',
        categoryIds: [category.id],
        now: NOW,
      })
      const loose = createFeed(ctx.db, { feedUrl: 'https://b.test/f.xml', title: 'B', now: NOW })
      makeEntry(ctx.db, inFolder.id)
      makeEntry(ctx.db, loose.id)

      const { body } = await json(ctx.app, 'GET', '/api/today')

      expect(body.groups.map((g: { label: string }) => g.label)).toEqual(['Tech', 'Sem pasta'])
      expect(body.groups[1].categoryId).toBeNull()
    })
  })

  describe('preferences', () => {
    it('serves the defaults and applies a partial patch', async () => {
      const initial = await json(ctx.app, 'GET', '/api/preferences')
      expect(initial.body).toMatchObject({ theme: 'system', density: 'cozy', defaultView: 'magazine' })

      const patched = await json(ctx.app, 'PATCH', '/api/preferences', {
        theme: 'dark',
        fetchIntervalMin: 30,
      })

      expect(patched.body).toMatchObject({ theme: 'dark', fetchIntervalMin: 30, density: 'cozy' })
    })

    it('rejects a value outside the allowed set', async () => {
      expect((await json(ctx.app, 'PATCH', '/api/preferences', { theme: 'neon' })).status).toBe(400)
      expect(
        (await json(ctx.app, 'PATCH', '/api/preferences', { fetchIntervalMin: 0 })).status,
      ).toBe(400)
    })

    it('rejects an empty patch', async () => {
      expect((await json(ctx.app, 'PATCH', '/api/preferences', {})).status).toBe(400)
    })
  })

  /* --------------------------------------------------------------- OPML */

  describe('OPML', () => {
    it('imports a real Feedly export', async () => {
      const response = await ctx.app.request('/api/opml/import', {
        method: 'POST',
        headers: { 'content-type': 'text/x-opml' },
        body: realOpml,
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ added: 10, skipped: 0, categoriesCreated: 2 })
    })

    it('imports the same file as a multipart upload', async () => {
      const form = new FormData()
      form.append('file', new File([realOpml], 'feedly.opml', { type: 'text/x-opml' }))

      const response = await ctx.app.request('/api/opml/import', { method: 'POST', body: form })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ added: 10 })
    })

    it('rejects a file that is not OPML', async () => {
      const response = await ctx.app.request('/api/opml/import', {
        method: 'POST',
        headers: { 'content-type': 'text/x-opml' },
        body: '<html>não é opml</html>',
      })

      expect(response.status).toBe(400)
      const body = (await response.json()) as { error: { code: string } }
      expect(body.error.code).toBe('invalid_request')
    })

    it('rejects an empty upload', async () => {
      const response = await ctx.app.request('/api/opml/import', {
        method: 'POST',
        headers: { 'content-type': 'text/x-opml' },
        body: '   ',
      })

      expect(response.status).toBe(400)
    })

    it('exports what was imported, as a download', async () => {
      await ctx.app.request('/api/opml/import', {
        method: 'POST',
        headers: { 'content-type': 'text/x-opml' },
        body: realOpml,
      })

      const response = await ctx.app.request('/api/opml/export')
      const xml = await response.text()

      expect(response.headers.get('content-type')).toContain('text/x-opml')
      expect(response.headers.get('content-disposition')).toContain('feedly-clone.opml')
      expect(xml).toContain('engadget.com')
      expect(xml).toContain('Marketing')
    })
  })

  /* --------------------------------------------------------------- SSE */

  describe('GET /api/events', () => {
    it('opens the stream and announces it is ready', async () => {
      const response = await ctx.app.request('/api/events')

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/event-stream')

      const reader = response.body?.getReader()
      const first = await reader?.read()
      const text = new TextDecoder().decode(first?.value)

      expect(text).toContain('event: ready')
      await reader?.cancel()
    })

    it('delivers an event published while the stream is open', async () => {
      const response = await ctx.app.request('/api/events')
      const reader = response.body!.getReader()
      await reader.read() // the ready frame

      ctx.events.emit({ type: 'feed.updated', feedId: 7, newEntries: 3 })

      const frame = new TextDecoder().decode((await reader.read()).value)

      expect(frame).toContain('event: feed.updated')
      expect(frame).toContain('"feedId":7')
      await reader.cancel()
    })

    it('stops listening once the client goes away', async () => {
      const response = await ctx.app.request('/api/events')
      const reader = response.body!.getReader()
      await reader.read()

      expect(ctx.events.subscriberCount()).toBeGreaterThan(1)

      await reader.cancel()
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Only the recorder installed by createTestApp is left.
      expect(ctx.events.subscriberCount()).toBe(1)
    })
  })
})
