import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { makeCategory, makeEntry, makeFeed } from '../testing/fixtures.ts'
import { getSidebar } from './sidebar.query.ts'

describe('getSidebar', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('returns an empty sidebar for a fresh database', () => {
    expect(getSidebar(ctx.db)).toEqual({ categories: [], uncategorized: [], totalUnread: 0 })
  })

  it('groups feeds under their folder with unread counts', () => {
    const tech = makeCategory(ctx.db, 'Tecnologia')
    const feed = makeFeed(ctx.db, 'HubSpot', { categoryIds: [tech.id] })
    makeEntry(ctx.db, feed.id)
    makeEntry(ctx.db, feed.id)
    makeEntry(ctx.db, feed.id, { isRead: true })

    const sidebar = getSidebar(ctx.db)

    expect(sidebar.categories).toHaveLength(1)
    expect(sidebar.categories[0]?.label).toBe('Tecnologia')
    expect(sidebar.categories[0]?.unreadCount).toBe(2)
    expect(sidebar.categories[0]?.feeds[0]).toMatchObject({ title: 'HubSpot', unreadCount: 2 })
    expect(sidebar.totalUnread).toBe(2)
  })

  it('lists folders with no feeds and feeds with no folder', () => {
    makeCategory(ctx.db, 'Vazia')
    const loose = makeFeed(ctx.db, 'Solto')
    makeEntry(ctx.db, loose.id)

    const sidebar = getSidebar(ctx.db)

    expect(sidebar.categories.map((c) => c.label)).toEqual(['Vazia'])
    expect(sidebar.categories[0]?.feeds).toEqual([])
    expect(sidebar.uncategorized.map((f) => f.title)).toEqual(['Solto'])
    expect(sidebar.totalUnread).toBe(1)
  })

  it('counts a feed in two folders once in the total', () => {
    const a = makeCategory(ctx.db, 'A')
    const b = makeCategory(ctx.db, 'B')
    const feed = makeFeed(ctx.db, 'Duplo', { categoryIds: [a.id, b.id] })
    makeEntry(ctx.db, feed.id)
    makeEntry(ctx.db, feed.id)

    const sidebar = getSidebar(ctx.db)

    expect(sidebar.categories.map((c) => c.unreadCount)).toEqual([2, 2])
    expect(sidebar.totalUnread).toBe(2)
  })

  it('surfaces the feed error state the sidebar alert icon needs', () => {
    const feed = makeFeed(ctx.db, 'Quebrado')
    ctx.db.$client
      .prepare(`update feeds set error_count = 3, last_error = 'timeout' where id = ?`)
      .run(feed.id)

    expect(getSidebar(ctx.db).uncategorized[0]).toMatchObject({
      errorCount: 3,
      lastError: 'timeout',
    })
  })

  it('reads a sidebar of 200 feeds in a single SQL statement (RNF-02)', () => {
    const categories = Array.from({ length: 10 }, (_, i) => makeCategory(ctx.db, `Pasta ${i}`))
    for (let i = 0; i < 200; i += 1) {
      const category = categories[i % categories.length]
      const feed = makeFeed(ctx.db, `Feed${i}`, {
        categoryIds: category ? [category.id] : [],
        feedUrl: `https://example.test/feed-${i}.xml`,
      })
      makeEntry(ctx.db, feed.id)
    }

    ctx.resetQueryCount()
    const sidebar = getSidebar(ctx.db)

    expect(ctx.queryCount()).toBe(1)
    expect(sidebar.totalUnread).toBe(200)
    expect(sidebar.categories.reduce((n, c) => n + c.feeds.length, 0)).toBe(200)
  })
})
