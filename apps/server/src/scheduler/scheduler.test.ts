import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppEvent } from '@feedly/shared'
import { getStreamEntries } from '../entries/entries.repository.ts'
import { createEventBus } from '../events/events.ts'
import { createFeed, findFeedById, updateFetchState } from '../feeds/feeds.repository.ts'
import { writePreferences } from '../preferences/preferences.repository.ts'
import { createFakeHttp, type StubResponse } from '../testing/http.ts'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { backoffMs, createScheduler } from './scheduler.ts'

const XML = { 'content-type': 'application/rss+xml; charset=UTF-8' }
/** After every date in the frozen fixtures, so real dates are never clamped. */
const T0 = Date.parse('2026-09-17T12:00:00.000Z')
const MINUTE = 60_000

const techcrunch = readFileSync(
  fileURLToPath(new URL('../feeds/__fixtures__/rss2-techcrunch.xml', import.meta.url)),
  'utf8',
)

/** A logger that records nothing; the scheduler only ever writes to it. */
const silentLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Parameters<typeof createScheduler>[0]['logger']

describe('backoffMs', () => {
  it('walks 30 min, 1 h, 2 h, 4 h and on up to a day', () => {
    expect(backoffMs(1)).toBe(30 * MINUTE)
    expect(backoffMs(2)).toBe(60 * MINUTE)
    expect(backoffMs(3)).toBe(120 * MINUTE)
    expect(backoffMs(4)).toBe(240 * MINUTE)
  })

  it('caps at twenty-four hours, however many failures there have been', () => {
    expect(backoffMs(7)).toBe(1440 * MINUTE)
    expect(backoffMs(99)).toBe(1440 * MINUTE)
  })
})

describe('scheduler', () => {
  let ctx: TestDatabase
  let clock: number
  let events: AppEvent[]

  beforeEach(() => {
    ctx = createTestDatabase()
    clock = T0
    events = []
  })
  afterEach(() => ctx.close())

  function build(routes: Record<string, StubResponse | ((attempt: number) => StubResponse)>) {
    const http = createFakeHttp(routes)
    const bus = createEventBus()
    bus.subscribe((event) => events.push(event))

    const scheduler = createScheduler({
      db: ctx.db,
      events: bus,
      logger: silentLogger,
      fetchImpl: http.fetch,
      now: () => clock,
    })

    return { http, scheduler }
  }

  function followFeed(url: string, title = 'Feed') {
    return createFeed(ctx.db, { feedUrl: url, title, now: T0 })
  }

  it('fetches a feed that is due and stores its entries', async () => {
    followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })

    await scheduler.tick()

    expect(getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: T0 }).entries).toHaveLength(3)
  })

  it('leaves a feed alone until its next fetch is due', async () => {
    const feed = followFeed('https://a.test/f.xml')
    updateFetchState(ctx.db, feed.id, { nextFetchAt: T0 + 10 * MINUTE })
    const { http, scheduler } = build({
      'https://a.test/f.xml': { body: techcrunch, headers: XML },
    })

    await scheduler.tick()

    expect(http.requests).toHaveLength(0)
  })

  it('schedules the next fetch using the global interval preference', async () => {
    const feed = followFeed('https://a.test/f.xml')
    writePreferences(ctx.db, { fetchIntervalMin: 45 })
    const { scheduler } = build({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })

    await scheduler.tick()

    expect(findFeedById(ctx.db, feed.id)).toMatchObject({
      nextFetchAt: T0 + 45 * MINUTE,
      lastFetchedAt: T0,
      errorCount: 0,
    })
  })

  it('treats a 304 as a successful, cheap fetch', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { scheduler } = build({
      'https://a.test/f.xml': (attempt) =>
        attempt === 1 ? { body: techcrunch, headers: { ...XML, etag: 'W/"1"' } } : { status: 304 },
    })
    await scheduler.tick()

    clock = T0 + 20 * MINUTE
    await scheduler.tick()

    expect(findFeedById(ctx.db, feed.id)).toMatchObject({ errorCount: 0, lastError: null })
    expect(getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: clock }).entries).toHaveLength(3)
  })

  it('backs off further on each consecutive failure', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { status: 500 } })

    await scheduler.tick()
    expect(findFeedById(ctx.db, feed.id)).toMatchObject({
      errorCount: 1,
      nextFetchAt: T0 + 30 * MINUTE,
      lastError: 'HTTP 500',
    })

    clock = T0 + 30 * MINUTE
    await scheduler.tick()
    expect(findFeedById(ctx.db, feed.id)).toMatchObject({
      errorCount: 2,
      nextFetchAt: clock + 60 * MINUTE,
    })
  })

  it('clears the error state once the feed recovers', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { scheduler } = build({
      'https://a.test/f.xml': (attempt) =>
        attempt === 1 ? { status: 500 } : { body: techcrunch, headers: XML },
    })
    await scheduler.tick()

    clock = T0 + 30 * MINUTE
    await scheduler.tick()

    expect(findFeedById(ctx.db, feed.id)).toMatchObject({ errorCount: 0, lastError: null })
  })

  it('keeps fetching the other feeds when one is broken', async () => {
    followFeed('https://broken.test/f.xml', 'Quebrado')
    followFeed('https://ok.test/f.xml', 'Bom')
    const { scheduler } = build({
      'https://broken.test/f.xml': { status: 500 },
      'https://ok.test/f.xml': { body: techcrunch, headers: XML },
    })

    await scheduler.tick()

    expect(getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: T0 }).entries).toHaveLength(3)
  })

  it('fetches at most four feeds at a time', async () => {
    let concurrent = 0
    let peak = 0
    const routes: Record<string, () => StubResponse> = {}
    for (let i = 0; i < 12; i += 1) {
      followFeed(`https://f${i}.test/f.xml`, `Feed ${i}`)
      routes[`https://f${i}.test/f.xml`] = () => ({ body: techcrunch, headers: XML })
    }

    const http = createFakeHttp(routes)
    const instrumented: typeof http.fetch = async (url, init) => {
      concurrent += 1
      peak = Math.max(peak, concurrent)
      try {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return await http.fetch(url, init)
      } finally {
        concurrent -= 1
      }
    }

    const scheduler = createScheduler({
      db: ctx.db,
      events: createEventBus(),
      logger: silentLogger,
      fetchImpl: instrumented,
      now: () => clock,
    })

    await scheduler.tick()

    expect(http.requests).toHaveLength(12)
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThan(1)
  })

  it('refreshes on demand even when the feed is not due', async () => {
    const feed = followFeed('https://a.test/f.xml')
    updateFetchState(ctx.db, feed.id, { nextFetchAt: T0 + 10 * MINUTE })
    const { http, scheduler } = build({
      'https://a.test/f.xml': { body: techcrunch, headers: XML },
    })

    await scheduler.refreshFeeds([feed.id])

    expect(http.requests).toHaveLength(1)
    expect(getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: T0 }).entries).toHaveLength(3)
  })

  it('still sends conditional headers on a manual refresh', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { http, scheduler } = build({
      'https://a.test/f.xml': (attempt) =>
        attempt === 1 ? { body: techcrunch, headers: { ...XML, etag: 'W/"1"' } } : { status: 304 },
    })
    await scheduler.tick()

    await scheduler.refreshFeeds([feed.id])

    expect(http.requests[1]?.headers['if-none-match']).toBe('W/"1"')
  })

  it('ignores a refresh for a feed that does not exist', async () => {
    const { http, scheduler } = build({})

    await expect(scheduler.refreshFeeds([999])).resolves.toBeUndefined()
    expect(http.requests).toHaveLength(0)
  })

  it('announces new entries and a count change', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })

    await scheduler.tick()

    expect(events).toEqual([
      { type: 'feed.updated', feedId: feed.id, newEntries: 3 },
      { type: 'counts.changed' },
    ])
  })

  it('stays quiet when a fetch brings nothing new', async () => {
    followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })
    await scheduler.tick()
    events.length = 0

    clock = T0 + 20 * MINUTE
    await scheduler.tick()

    expect(events).toEqual([])
  })

  it('announces a failure so the sidebar can show the alert', async () => {
    const feed = followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { status: 500 } })

    await scheduler.tick()

    expect(events).toEqual([{ type: 'feed.error', feedId: feed.id, message: 'HTTP 500' }])
  })

  it('fetches a newly followed feed on the very next tick', async () => {
    followFeed('https://a.test/f.xml')
    const { http, scheduler } = build({
      'https://a.test/f.xml': { body: techcrunch, headers: XML },
    })

    await scheduler.tick()

    expect(http.requests).toHaveLength(1)
  })

  it('never has a feed in flight once a tick settles', async () => {
    followFeed('https://a.test/f.xml')
    const { scheduler } = build({ 'https://a.test/f.xml': { body: techcrunch, headers: XML } })

    await scheduler.tick()

    expect(scheduler.inFlight()).toBe(0)
  })
})
