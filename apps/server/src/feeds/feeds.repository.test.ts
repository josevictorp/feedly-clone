import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { makeCategory, makeEntry, makeFeed, NOW } from '../testing/fixtures.ts'
import {
  deleteFeed,
  findFeedById,
  findFeedByUrl,
  findFeedsDueForFetch,
  getFeedCategoryIds,
  listFeeds,
  setFeedCategories,
  updateFeed,
  updateFetchState,
} from './feeds.repository.ts'

describe('feeds repository', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('creates a feed due for an immediate fetch', () => {
    const feed = makeFeed(ctx.db, 'HubSpot')

    expect(feed).toMatchObject({ title: 'HubSpot', originalTitle: 'HubSpot', errorCount: 0 })
    expect(feed.nextFetchAt).toBe(NOW)
    expect(findFeedByUrl(ctx.db, feed.feedUrl)?.id).toBe(feed.id)
  })

  it('refuses a second feed with the same URL', () => {
    makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/same.xml' })

    expect(() => makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/same.xml' })).toThrow(
      /UNIQUE/i,
    )
  })

  it('puts a feed in several folders and replaces them on update', () => {
    const tech = makeCategory(ctx.db, 'Tecnologia')
    const news = makeCategory(ctx.db, 'Notícias')
    const design = makeCategory(ctx.db, 'Design')
    const feed = makeFeed(ctx.db, 'Multi', { categoryIds: [tech.id, news.id] })

    expect(getFeedCategoryIds(ctx.db, feed.id)).toEqual([tech.id, news.id])

    setFeedCategories(ctx.db, feed.id, [design.id])

    expect(getFeedCategoryIds(ctx.db, feed.id)).toEqual([design.id])
  })

  it('renames a feed without losing its original title', () => {
    const feed = makeFeed(ctx.db, 'Original')

    const updated = updateFeed(ctx.db, feed.id, { title: 'Meu nome', isFavorite: true })

    expect(updated).toMatchObject({ title: 'Meu nome', originalTitle: 'Original', isFavorite: true })
  })

  it('deletes the entries of a feed that is unfollowed', () => {
    const feed = makeFeed(ctx.db, 'Vai embora')
    makeEntry(ctx.db, feed.id)
    makeEntry(ctx.db, feed.id)

    expect(deleteFeed(ctx.db, feed.id)).toBe(true)

    expect(findFeedById(ctx.db, feed.id)).toBeUndefined()
    const left = ctx.db.$client.prepare('select count(*) as n from entries').get() as { n: number }
    expect(left.n).toBe(0)
  })

  it('records the conditional-GET state the scheduler writes back', () => {
    const feed = makeFeed(ctx.db, 'Condicional')

    const updated = updateFetchState(ctx.db, feed.id, {
      etag: 'W/"abc"',
      lastModified: 'Wed, 16 Sep 2026 12:00:00 GMT',
      lastFetchedAt: NOW,
      nextFetchAt: NOW + 900_000,
      errorCount: 0,
      lastError: null,
    })

    expect(updated).toMatchObject({ etag: 'W/"abc"', nextFetchAt: NOW + 900_000 })
  })

  it('returns only the feeds whose next fetch is due, oldest first', () => {
    const due = makeFeed(ctx.db, 'Due', { feedUrl: 'https://example.test/due.xml' })
    const later = makeFeed(ctx.db, 'Later', { feedUrl: 'https://example.test/later.xml' })
    const never = makeFeed(ctx.db, 'Never', { feedUrl: 'https://example.test/never.xml' })
    updateFetchState(ctx.db, due.id, { nextFetchAt: NOW - 1000 })
    updateFetchState(ctx.db, later.id, { nextFetchAt: NOW + 1000 })
    updateFetchState(ctx.db, never.id, { nextFetchAt: null as unknown as number })

    expect(findFeedsDueForFetch(ctx.db, NOW).map((f) => f.id)).toEqual([due.id])
  })

  it('lists feeds in sort order', () => {
    const a = makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/a.xml' })
    const b = makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/b.xml' })
    updateFeed(ctx.db, b.id, { sortOrder: -1 })

    expect(listFeeds(ctx.db).map((f) => f.id)).toEqual([b.id, a.id])
  })
})
