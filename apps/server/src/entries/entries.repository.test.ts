import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { DAY_MS, makeCategory, makeEntry, makeFeed, NOW } from '../testing/fixtures.ts'
import {
  findEntryById,
  getStreamEntries,
  markStreamRead,
  setEntriesRead,
  setEntriesSaved,
  upsertEntries,
} from './entries.repository.ts'

describe('entries repository', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  describe('upsertEntries', () => {
    it('inserts new entries and dedupes by guid within the feed', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      const row = {
        feedId: feed.id,
        guid: 'post-1',
        title: 'Primeiro',
        publishedAt: NOW,
        crawledAt: NOW,
      }

      expect(upsertEntries(ctx.db, [row, row]).inserted).toBe(1)
      expect(upsertEntries(ctx.db, [row]).inserted).toBe(0)
    })

    it('keeps the same guid in two different feeds', () => {
      const a = makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/a.xml' })
      const b = makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/b.xml' })

      const result = upsertEntries(ctx.db, [
        { feedId: a.id, guid: 'same', title: 'A', publishedAt: NOW, crawledAt: NOW },
        { feedId: b.id, guid: 'same', title: 'B', publishedAt: NOW, crawledAt: NOW },
      ])

      expect(result.inserted).toBe(2)
    })

    it('refreshes edited content without marking the entry unread again', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      const entry = makeEntry(ctx.db, feed.id, { guid: 'post-1', isRead: true, isSaved: true })

      upsertEntries(ctx.db, [
        {
          feedId: feed.id,
          guid: 'post-1',
          title: 'Título corrigido',
          contentHtml: '<p>novo</p>',
          publishedAt: NOW + 5,
          crawledAt: NOW + 5,
        },
      ])

      expect(findEntryById(ctx.db, entry.id)).toMatchObject({
        title: 'Título corrigido',
        contentHtml: '<p>novo</p>',
        isRead: true,
        isSaved: true,
        readAt: entry.readAt,
      })
    })
  })

  describe('getStreamEntries', () => {
    it('returns the newest first across every feed', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, { title: 'velho', publishedAt: NOW - DAY_MS })
      makeEntry(ctx.db, feed.id, { title: 'novo', publishedAt: NOW })

      const page = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: NOW })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['novo', 'velho'])
      expect(page.nextCursor).toBeNull()
    })

    it('embeds the feed of each entry', () => {
      const feed = makeFeed(ctx.db, 'HubSpot')
      makeEntry(ctx.db, feed.id)

      const page = getStreamEntries(ctx.db, { stream: { kind: 'all' }, now: NOW })

      expect(page.entries[0]?.feed).toMatchObject({ id: feed.id, title: 'HubSpot' })
    })

    it('sorts oldest first when asked', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, { title: 'velho', publishedAt: NOW - DAY_MS })
      makeEntry(ctx.db, feed.id, { title: 'novo', publishedAt: NOW })

      const page = getStreamEntries(ctx.db, { stream: { kind: 'all' }, sort: 'oldest', now: NOW })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['velho', 'novo'])
    })

    it('walks the whole stream through the cursor without repeats or gaps', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      for (let i = 0; i < 25; i += 1) {
        makeEntry(ctx.db, feed.id, { title: `post-${i}`, publishedAt: NOW - i * 1000 })
      }

      const seen: string[] = []
      let cursor: string | null = null
      let pages = 0
      do {
        const page = getStreamEntries(ctx.db, {
          stream: { kind: 'all' },
          limit: 10,
          cursor,
          now: NOW,
        })
        seen.push(...page.entries.map((e) => e.entry.title))
        cursor = page.nextCursor
        pages += 1
      } while (cursor && pages < 10)

      expect(pages).toBe(3)
      expect(new Set(seen).size).toBe(25)
      expect(seen[0]).toBe('post-0')
      expect(seen.at(-1)).toBe('post-24')
    })

    it('keeps pages stable when entries share a timestamp', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      for (let i = 0; i < 6; i += 1) {
        makeEntry(ctx.db, feed.id, { title: `same-${i}`, publishedAt: NOW })
      }

      const first = getStreamEntries(ctx.db, { stream: { kind: 'all' }, limit: 3, now: NOW })
      const second = getStreamEntries(ctx.db, {
        stream: { kind: 'all' },
        limit: 3,
        cursor: first.nextCursor,
        now: NOW,
      })

      const titles = [...first.entries, ...second.entries].map((e) => e.entry.title)
      expect(new Set(titles).size).toBe(6)
    })

    it('rejects a malformed cursor', () => {
      expect(() =>
        getStreamEntries(ctx.db, { stream: { kind: 'all' }, cursor: 'nope', now: NOW }),
      ).toThrow(/invalid cursor/)
    })

    it('filters to a single feed', () => {
      const a = makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/a.xml' })
      const b = makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/b.xml' })
      makeEntry(ctx.db, a.id, { title: 'de A' })
      makeEntry(ctx.db, b.id, { title: 'de B' })

      const page = getStreamEntries(ctx.db, { stream: { kind: 'feed', feedId: a.id }, now: NOW })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['de A'])
    })

    it('filters to a folder, across all of its feeds', () => {
      const tech = makeCategory(ctx.db, 'Tecnologia')
      const inside = makeFeed(ctx.db, 'Dentro', {
        categoryIds: [tech.id],
        feedUrl: 'https://example.test/in.xml',
      })
      const outside = makeFeed(ctx.db, 'Fora', { feedUrl: 'https://example.test/out.xml' })
      makeEntry(ctx.db, inside.id, { title: 'dentro' })
      makeEntry(ctx.db, outside.id, { title: 'fora' })

      const page = getStreamEntries(ctx.db, {
        stream: { kind: 'category', categoryId: tech.id },
        now: NOW,
      })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['dentro'])
    })

    it('hides read entries when unreadOnly is on', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, { title: 'lido', isRead: true })
      makeEntry(ctx.db, feed.id, { title: 'não lido' })

      const page = getStreamEntries(ctx.db, {
        stream: { kind: 'all' },
        unreadOnly: true,
        now: NOW,
      })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['não lido'])
    })

    it('orders "Ler depois" by when each entry was saved', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, {
        title: 'salvo antes',
        publishedAt: NOW,
        isSaved: true,
        savedAt: NOW - DAY_MS,
      })
      makeEntry(ctx.db, feed.id, {
        title: 'salvo agora',
        publishedAt: NOW - 10 * DAY_MS,
        isSaved: true,
        savedAt: NOW,
      })
      makeEntry(ctx.db, feed.id, { title: 'não salvo' })

      const page = getStreamEntries(ctx.db, { stream: { kind: 'saved' }, now: NOW })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['salvo agora', 'salvo antes'])
    })

    it('limits "Lidos recentemente" to the last seven days, by read time', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, { title: 'lido hoje', isRead: true, readAt: NOW })
      makeEntry(ctx.db, feed.id, { title: 'lido há 3 dias', isRead: true, readAt: NOW - 3 * DAY_MS })
      makeEntry(ctx.db, feed.id, { title: 'lido há 9 dias', isRead: true, readAt: NOW - 9 * DAY_MS })
      makeEntry(ctx.db, feed.id, { title: 'não lido' })

      const page = getStreamEntries(ctx.db, { stream: { kind: 'read' }, now: NOW })

      expect(page.entries.map((e) => e.entry.title)).toEqual(['lido hoje', 'lido há 3 dias'])
    })
  })

  describe('marking', () => {
    it('marks entries read and back to unread, clearing readAt', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      const entry = makeEntry(ctx.db, feed.id)

      expect(setEntriesRead(ctx.db, [entry.id], true, NOW)).toBe(1)
      expect(findEntryById(ctx.db, entry.id)).toMatchObject({ isRead: true, readAt: NOW })

      setEntriesRead(ctx.db, [entry.id], false, NOW)
      expect(findEntryById(ctx.db, entry.id)).toMatchObject({ isRead: false, readAt: null })
    })

    it('saves and unsaves entries', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      const entry = makeEntry(ctx.db, feed.id)

      expect(setEntriesSaved(ctx.db, [entry.id], true, NOW)).toBe(1)
      expect(findEntryById(ctx.db, entry.id)).toMatchObject({ isSaved: true, savedAt: NOW })

      setEntriesSaved(ctx.db, [entry.id], false, NOW)
      expect(findEntryById(ctx.db, entry.id)).toMatchObject({ isSaved: false, savedAt: null })
    })

    it('does nothing for an empty id list', () => {
      expect(setEntriesRead(ctx.db, [], true, NOW)).toBe(0)
      expect(setEntriesSaved(ctx.db, [], true, NOW)).toBe(0)
    })

    it('marks a whole stream read', () => {
      const a = makeFeed(ctx.db, 'A', { feedUrl: 'https://example.test/a.xml' })
      const b = makeFeed(ctx.db, 'B', { feedUrl: 'https://example.test/b.xml' })
      makeEntry(ctx.db, a.id)
      makeEntry(ctx.db, a.id)
      makeEntry(ctx.db, b.id)

      expect(markStreamRead(ctx.db, { kind: 'feed', feedId: a.id }, { now: NOW })).toBe(2)

      const left = getStreamEntries(ctx.db, { stream: { kind: 'all' }, unreadOnly: true, now: NOW })
      expect(left.entries).toHaveLength(1)
    })

    it('marks only what is older than the given date', () => {
      const feed = makeFeed(ctx.db, 'Feed')
      makeEntry(ctx.db, feed.id, { title: 'antigo', publishedAt: NOW - 8 * DAY_MS })
      makeEntry(ctx.db, feed.id, { title: 'recente', publishedAt: NOW })

      const marked = markStreamRead(
        ctx.db,
        { kind: 'all' },
        { olderThan: NOW - DAY_MS, now: NOW },
      )

      expect(marked).toBe(1)
      const left = getStreamEntries(ctx.db, { stream: { kind: 'all' }, unreadOnly: true, now: NOW })
      expect(left.entries.map((e) => e.entry.title)).toEqual(['recente'])
    })
  })
})
