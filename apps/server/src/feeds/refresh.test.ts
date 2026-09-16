import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getStreamEntries, setEntriesRead, setEntriesSaved } from '../entries/entries.repository.ts'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { createFakeHttp } from '../testing/http.ts'
import { NOW } from '../testing/fixtures.ts'
import { createFeed, findFeedById, updateFeed } from './feeds.repository.ts'
import { refreshFeed } from './refresh.ts'

const FEED_URL = 'https://fixture.test/feed.xml'
const XML = { 'content-type': 'application/rss+xml; charset=UTF-8' }
/** After every date in the frozen fixtures, so real dates are never clamped. */
const FETCHED_AT = Date.parse('2026-09-17T12:00:00.000Z')

const techcrunch = readFileSync(
  fileURLToPath(new URL('./__fixtures__/rss2-techcrunch.xml', import.meta.url)),
  'utf8',
)

/** Minimal one-item feed, so a test can vary exactly one field between fetches. */
function feedWith(guid: string, title: string, content = 'original') {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel>
      <title>Feed de teste</title><link>https://fixture.test/</link><description>d</description>
      <item>
        <guid>${guid}</guid><title>${title}</title>
        <link>https://fixture.test/post</link>
        <description>${content}</description>
        <pubDate>Tue, 15 Sep 2026 10:00:00 GMT</pubDate>
      </item>
    </channel></rss>`
}

describe('refreshFeed', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  function followFeed(title = 'Teste') {
    return createFeed(ctx.db, { feedUrl: FEED_URL, title, now: NOW })
  }

  it('stores the entries of a real feed', async () => {
    const feed = followFeed()
    const http = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })

    const outcome = await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(outcome).toEqual({ status: 'updated', newEntries: 3, totalEntries: 3 })
    const page = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: FETCHED_AT })
    expect(page.entries).toHaveLength(3)
    expect(page.entries[0]?.entry.contentHtml).not.toContain('<script')
  })

  it('adopts the title, site and language the feed announces', async () => {
    const feed = followFeed('https://fixture.test/feed.xml')
    const http = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })

    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(findFeedById(ctx.db, feed.id)).toMatchObject({
      title: 'TechCrunch',
      originalTitle: 'TechCrunch',
      siteUrl: 'https://techcrunch.com/',
      language: 'en-US',
    })
  })

  it('never overwrites a title the user chose', async () => {
    const feed = followFeed()
    const http = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })
    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })
    updateFeed(ctx.db, feed.id, { title: 'Meu TechCrunch' })

    const renamed = findFeedById(ctx.db, feed.id)
    await refreshFeed(ctx.db, renamed!, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(findFeedById(ctx.db, feed.id)?.title).toBe('Meu TechCrunch')
  })

  it('stores the validators for the next conditional request', async () => {
    const feed = followFeed()
    const http = createFakeHttp({
      [FEED_URL]: {
        body: techcrunch,
        headers: { ...XML, etag: 'W/"v1"', 'last-modified': 'Wed, 16 Sep 2026 12:00:00 GMT' },
      },
    })

    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(findFeedById(ctx.db, feed.id)).toMatchObject({
      etag: 'W/"v1"',
      lastModified: 'Wed, 16 Sep 2026 12:00:00 GMT',
    })
  })

  it('sends the stored validators on the next fetch', async () => {
    const feed = followFeed()
    const http = createFakeHttp({
      [FEED_URL]: (attempt) =>
        attempt === 1
          ? { body: techcrunch, headers: { ...XML, etag: 'W/"v1"' } }
          : { status: 304 },
    })
    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    const outcome = await refreshFeed(ctx.db, findFeedById(ctx.db, feed.id)!, {
      fetchImpl: http.fetch,
      now: FETCHED_AT,
    })

    expect(outcome).toEqual({ status: 'not-modified' })
    expect(http.requests[1]?.headers['if-none-match']).toBe('W/"v1"')
  })

  it('skips the validators when the caller asks for a forced refresh', async () => {
    const feed = followFeed()
    const http = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })
    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    await refreshFeed(ctx.db, findFeedById(ctx.db, feed.id)!, {
      fetchImpl: http.fetch,
      now: FETCHED_AT,
      ignoreValidators: true,
    })

    expect(http.requests[1]?.headers['if-none-match']).toBeUndefined()
  })

  it('adds nothing on a second fetch of an unchanged feed', async () => {
    const feed = followFeed()
    const http = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })

    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })
    const second = await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(second).toMatchObject({ status: 'updated', newEntries: 0, totalEntries: 3 })
  })

  it('updates edited content without resetting read or saved state', async () => {
    const feed = followFeed()
    const http = createFakeHttp({
      [FEED_URL]: (attempt) => ({
        body:
          attempt === 1
            ? feedWith('post-1', 'Título antigo', 'texto antigo')
            : feedWith('post-1', 'Título novo', 'texto novo'),
        headers: XML,
      }),
    })
    await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    const stored = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: FETCHED_AT })
    const entryId = stored.entries[0]!.entry.id
    setEntriesRead(ctx.db, [entryId], true, FETCHED_AT)
    setEntriesSaved(ctx.db, [entryId], true, FETCHED_AT)

    const second = await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(second).toMatchObject({ newEntries: 0 })
    const after = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: FETCHED_AT })
    expect(after.entries[0]?.entry).toMatchObject({
      title: 'Título novo',
      isRead: true,
      isSaved: true,
    })
    expect(after.entries[0]?.entry.summary).toBe('texto novo')
  })

  it('reports an HTTP failure without touching the stored entries', async () => {
    const feed = followFeed()
    const good = createFakeHttp({ [FEED_URL]: { body: techcrunch, headers: XML } })
    await refreshFeed(ctx.db, feed, { fetchImpl: good.fetch, now: FETCHED_AT })

    const bad = createFakeHttp({ [FEED_URL]: { status: 500 } })
    const outcome = await refreshFeed(ctx.db, feed, { fetchImpl: bad.fetch, now: FETCHED_AT })

    expect(outcome).toMatchObject({ status: 'error', httpStatus: 500 })
    expect(getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: FETCHED_AT }).entries).toHaveLength(3)
  })

  it('reports unparseable bytes as an error rather than throwing', async () => {
    const feed = followFeed()
    const http = createFakeHttp({
      [FEED_URL]: { body: '<html><body>página de erro</body></html>', headers: XML },
    })

    const outcome = await refreshFeed(ctx.db, feed, { fetchImpl: http.fetch, now: FETCHED_AT })

    expect(outcome.status).toBe('error')
  })

  it('keeps entries of different feeds apart even with the same guid', async () => {
    const a = createFeed(ctx.db, { feedUrl: 'https://a.test/f.xml', title: 'A', now: NOW })
    const b = createFeed(ctx.db, { feedUrl: 'https://b.test/f.xml', title: 'B', now: NOW })
    const http = createFakeHttp({
      'https://a.test/f.xml': { body: feedWith('same', 'De A'), headers: XML },
      'https://b.test/f.xml': { body: feedWith('same', 'De B'), headers: XML },
    })

    await refreshFeed(ctx.db, a, { fetchImpl: http.fetch, now: FETCHED_AT })
    await refreshFeed(ctx.db, b, { fetchImpl: http.fetch, now: FETCHED_AT })

    const page = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: FETCHED_AT })
    expect(page.entries.map((e) => e.entry.title).sort()).toEqual(['De A', 'De B'])
  })
})
