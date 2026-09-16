import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { DAY_MS, makeEntry, makeFeed, NOW } from '../testing/fixtures.ts'
import { runRetention } from './retention.ts'

function countEntries(ctx: TestDatabase): number {
  return (ctx.db.$client.prepare('select count(*) as n from entries').get() as { n: number }).n
}

describe('runRetention', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('deletes read entries older than thirty days', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    makeEntry(ctx.db, feed.id, { title: 'lido faz tempo', isRead: true, readAt: NOW - 31 * DAY_MS })
    makeEntry(ctx.db, feed.id, { title: 'lido ontem', isRead: true, readAt: NOW - DAY_MS })

    const result = runRetention(ctx.db, { now: NOW })

    expect(result.deletedByAge).toBe(1)
    expect(countEntries(ctx)).toBe(1)
  })

  it('never deletes unread entries, however old', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    makeEntry(ctx.db, feed.id, { publishedAt: NOW - 400 * DAY_MS, crawledAt: NOW - 400 * DAY_MS })

    expect(runRetention(ctx.db, { now: NOW })).toEqual({ deletedByAge: 0, deletedByCap: 0 })
    expect(countEntries(ctx)).toBe(1)
  })

  it('never deletes saved entries, however old', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    makeEntry(ctx.db, feed.id, {
      isRead: true,
      readAt: NOW - 400 * DAY_MS,
      isSaved: true,
      savedAt: NOW - 400 * DAY_MS,
    })

    expect(runRetention(ctx.db, { now: NOW }).deletedByAge).toBe(0)
    expect(countEntries(ctx)).toBe(1)
  })

  it('falls back to the crawl date when an entry has no read date', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    makeEntry(ctx.db, feed.id, { isRead: true, readAt: null, crawledAt: NOW - 90 * DAY_MS })

    expect(runRetention(ctx.db, { now: NOW }).deletedByAge).toBe(1)
  })

  it('caps a feed by dropping the oldest read entries first', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    for (let i = 0; i < 12; i += 1) {
      makeEntry(ctx.db, feed.id, { title: `post-${i}`, publishedAt: NOW - i * 1000, isRead: true })
    }

    const result = runRetention(ctx.db, { now: NOW, maxEntriesPerFeed: 10 })

    expect(result.deletedByCap).toBe(2)
    const left = ctx.db.$client
      .prepare('select title from entries order by published_at desc')
      .all()
      .map((row) => (row as { title: string }).title)
    expect(left).toHaveLength(10)
    expect(left).not.toContain('post-10')
    expect(left).not.toContain('post-11')
  })

  it('lets a feed exceed the cap rather than delete unread entries', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    for (let i = 0; i < 12; i += 1) {
      makeEntry(ctx.db, feed.id, { publishedAt: NOW - i * 1000 })
    }

    expect(runRetention(ctx.db, { now: NOW, maxEntriesPerFeed: 10 }).deletedByCap).toBe(0)
    expect(countEntries(ctx)).toBe(12)
  })

  it('applies the cap per feed, not across the database', () => {
    const a = makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/a.xml' })
    const b = makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/b.xml' })
    for (let i = 0; i < 6; i += 1) {
      makeEntry(ctx.db, a.id, { publishedAt: NOW - i * 1000, isRead: true })
      makeEntry(ctx.db, b.id, { publishedAt: NOW - i * 1000, isRead: true })
    }

    runRetention(ctx.db, { now: NOW, maxEntriesPerFeed: 5 })

    const perFeed = ctx.db.$client
      .prepare('select feed_id, count(*) as n from entries group by feed_id order by feed_id')
      .all() as { feed_id: number; n: number }[]
    expect(perFeed).toEqual([
      { feed_id: a.id, n: 5 },
      { feed_id: b.id, n: 5 },
    ])
  })

  it('is a no-op on an empty database', () => {
    expect(runRetention(ctx.db, { now: NOW })).toEqual({ deletedByAge: 0, deletedByCap: 0 })
  })

  it('gives the same result whenever it runs with the same clock', () => {
    const feed = makeFeed(ctx.db, 'Feed')
    makeEntry(ctx.db, feed.id, { isRead: true, readAt: NOW - 31 * DAY_MS })

    expect(runRetention(ctx.db, { now: NOW }).deletedByAge).toBe(1)
    expect(runRetention(ctx.db, { now: NOW })).toEqual({ deletedByAge: 0, deletedByCap: 0 })
  })
})
