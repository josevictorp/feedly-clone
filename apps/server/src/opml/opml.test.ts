import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listCategories } from '../categories/categories.repository.ts'
import { getFeedCategoryIds, listFeeds, updateFeed } from '../feeds/feeds.repository.ts'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { NOW } from '../testing/fixtures.ts'
import { exportOpml, importOpml, InvalidOpmlError, parseOpmlDocument } from './opml.ts'

const realExport = readFileSync(
  fileURLToPath(new URL('./__fixtures__/feedly-export-sample.opml', import.meta.url)),
  'utf8',
)

describe('parseOpmlDocument', () => {
  it('reads the folders and feeds of a real Feedly export', () => {
    const parsed = parseOpmlDocument(realExport)

    expect(parsed.title).toBe('José Victor subscriptions in feedly Cloud')
    expect(parsed.feeds).toHaveLength(10)
    expect(parsed.feeds[0]).toEqual({
      feedUrl: 'http://www.engadget.com/rss-full.xml',
      title: 'Engadget',
      siteUrl: 'http://www.engadget.com',
      categories: ['Tech'],
    })
    expect(new Set(parsed.feeds.map((f) => f.categories[0]))).toEqual(new Set(['Tech', 'Marketing']))
  })

  it('trims the trailing spaces Feedly leaves in titles', () => {
    const parsed = parseOpmlDocument(realExport)

    expect(parsed.feeds.map((f) => f.title)).toContain('The Atlantic')
  })

  it('treats an outline with no xmlUrl as a folder', () => {
    const parsed = parseOpmlDocument(`<opml version="1.0"><body>
      <outline text="Pasta"><outline type="rss" text="F" xmlUrl="https://f.test/rss"/></outline>
    </body></opml>`)

    expect(parsed.feeds).toEqual([
      { feedUrl: 'https://f.test/rss', title: 'F', siteUrl: null, categories: ['Pasta'] },
    ])
  })

  it('keeps a feed that sits outside any folder', () => {
    const parsed = parseOpmlDocument(`<opml version="1.0"><body>
      <outline type="rss" text="Solto" xmlUrl="https://solto.test/rss"/>
    </body></opml>`)

    expect(parsed.feeds[0]?.categories).toEqual([])
  })

  it.each([
    ['um documento degenerado', '<opml version="1.0"><body></body></opml>'],
    ['uma página HTML', '<html><body>oi</body></html>'],
    ['texto solto', 'isto não é um OPML'],
  ])('rejects %s with a message the UI can show', (_label, xml) => {
    expect(() => parseOpmlDocument(xml)).toThrow(InvalidOpmlError)
    expect(() => parseOpmlDocument(xml)).toThrow(/não é um OPML válido/)
  })

  it('accepts a document whose body is genuinely empty', () => {
    const parsed = parseOpmlDocument(
      '<opml version="1.0"><head><title>Vazio</title></head><body></body></opml>',
    )

    expect(parsed).toEqual({ title: 'Vazio', feeds: [] })
  })
})

describe('importOpml', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('creates the folders and the feeds of the export', () => {
    const result = importOpml(ctx.db, realExport, { now: NOW })

    expect(result).toMatchObject({ added: 10, skipped: 0, categoriesCreated: 2 })
    expect(listCategories(ctx.db).map((c) => c.label)).toEqual(['Tech', 'Marketing'])
    expect(listFeeds(ctx.db)).toHaveLength(10)
  })

  it('files each feed under its folder', () => {
    importOpml(ctx.db, realExport, { now: NOW })

    const tech = listCategories(ctx.db).find((c) => c.label === 'Tech')
    const engadget = listFeeds(ctx.db).find((f) => f.title === 'Engadget')

    expect(getFeedCategoryIds(ctx.db, engadget?.id ?? 0)).toEqual([tech?.id])
  })

  it('queues every new feed for an immediate fetch', () => {
    const result = importOpml(ctx.db, realExport, { now: NOW })

    expect(result.addedFeedIds).toHaveLength(10)
    expect(listFeeds(ctx.db).every((feed) => feed.nextFetchAt === NOW)).toBe(true)
  })

  it('skips feeds already followed rather than duplicating them', () => {
    importOpml(ctx.db, realExport, { now: NOW })

    const second = importOpml(ctx.db, realExport, { now: NOW })

    expect(second).toMatchObject({ added: 0, skipped: 10, categoriesCreated: 0 })
    expect(listFeeds(ctx.db)).toHaveLength(10)
  })

  it('leaves a renamed feed alone on re-import', () => {
    importOpml(ctx.db, realExport, { now: NOW })
    const engadget = listFeeds(ctx.db).find((f) => f.title === 'Engadget')
    updateFeed(ctx.db, engadget?.id ?? 0, { title: 'Meu Engadget' })

    importOpml(ctx.db, realExport, { now: NOW })

    expect(listFeeds(ctx.db).find((f) => f.id === engadget?.id)?.title).toBe('Meu Engadget')
  })

  it('deduplicates a feed listed twice inside one file', () => {
    const result = importOpml(
      ctx.db,
      `<opml version="1.0"><body>
        <outline text="A"><outline type="rss" text="F" xmlUrl="https://f.test/rss"/></outline>
        <outline text="B"><outline type="rss" text="F" xmlUrl="https://f.test/rss"/></outline>
      </body></opml>`,
      { now: NOW },
    )

    expect(result).toMatchObject({ added: 1, skipped: 1 })
  })

  it('reuses a folder that already exists', () => {
    importOpml(ctx.db, realExport, { now: NOW })

    importOpml(
      ctx.db,
      `<opml version="1.0"><body>
        <outline text="Tech"><outline type="rss" text="Novo" xmlUrl="https://novo.test/rss"/></outline>
      </body></opml>`,
      { now: NOW },
    )

    expect(listCategories(ctx.db).filter((c) => c.label === 'Tech')).toHaveLength(1)
  })
})

describe('exportOpml', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('produces a document that imports back identically', () => {
    importOpml(ctx.db, realExport, { now: NOW })
    const before = parseOpmlDocument(exportOpml(ctx.db))

    const fresh = createTestDatabase()
    try {
      importOpml(fresh.db, exportOpml(ctx.db), { now: NOW })

      expect(listFeeds(fresh.db).map((f) => f.feedUrl).sort()).toEqual(
        listFeeds(ctx.db).map((f) => f.feedUrl).sort(),
      )
      expect(listCategories(fresh.db).map((c) => c.label)).toEqual(
        listCategories(ctx.db).map((c) => c.label),
      )
      expect(before.feeds).toHaveLength(10)
    } finally {
      fresh.close()
    }
  })

  it('keeps every feed in the folder it was in', () => {
    importOpml(ctx.db, realExport, { now: NOW })

    const exported = parseOpmlDocument(exportOpml(ctx.db))
    const copyblogger = exported.feeds.find((f) => f.title === 'Copyblogger')

    expect(copyblogger?.categories).toEqual(['Marketing'])
  })

  it('exports a feed with no folder at the top level', () => {
    importOpml(
      ctx.db,
      `<opml version="1.0"><body>
        <outline type="rss" text="Solto" xmlUrl="https://solto.test/rss"/>
      </body></opml>`,
      { now: NOW },
    )

    const exported = parseOpmlDocument(exportOpml(ctx.db))

    expect(exported.feeds).toEqual([
      { feedUrl: 'https://solto.test/rss', title: 'Solto', siteUrl: null, categories: [] },
    ])
  })

  it('exports an empty database as a valid, empty document', () => {
    const xml = exportOpml(ctx.db, 'Vazio')

    expect(parseOpmlDocument(xml)).toEqual({ title: 'Vazio', feeds: [] })
  })

  it('escapes a title that contains XML characters', () => {
    const xml = exportOpml(ctx.db, 'Fulano & <cia>')

    expect(xml).toContain('Fulano &amp; &lt;cia&gt;')
    expect(parseOpmlDocument(xml).title).toBe('Fulano & <cia>')
  })
})
