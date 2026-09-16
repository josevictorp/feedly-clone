import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeFeedBytes } from './charset.ts'
import { entryIdentity, normalizeFeed, UNTITLED } from './normalize.ts'

const FIXTURES_DIR = fileURLToPath(new URL('./__fixtures__/', import.meta.url))
/** After every date in the frozen fixtures, so real dates are never clamped. */
const FETCHED_AT = Date.parse('2026-09-17T12:00:00.000Z')

/** Reads a fixture the way the fetcher would: bytes first, then decode. */
function loadFixture(name: string) {
  const bytes = new Uint8Array(readFileSync(`${FIXTURES_DIR}${name}`))
  return decodeFeedBytes(bytes, null)
}

function normalizeFixture(name: string, feedUrl = `https://fixture.test/${name}`) {
  return normalizeFeed(loadFixture(name), { feedUrl, fetchedAt: FETCHED_AT })
}

describe('normalizeFeed, across every fixture', () => {
  const fixtures = readdirSync(FIXTURES_DIR).sort()

  it('ships the range of feeds the plan asks for', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(12)
  })

  it.each(fixtures)('parses %s into usable entries', (name) => {
    const feed = normalizeFixture(name)

    expect(feed.title).not.toBe('')
    expect(feed.entries.length).toBeGreaterThan(0)

    for (const entry of feed.entries) {
      expect(entry.guid).toBeTruthy()
      expect(entry.title).toBeTruthy()
      expect(Number.isFinite(entry.publishedAt)).toBe(true)
      expect(entry.url === null || entry.url.startsWith('http')).toBe(true)
      expect(entry.contentHtml ?? '').not.toContain('<script')
      expect(entry.summary?.length ?? 0).toBeLessThanOrEqual(401)
    }
  })

  it('covers all four formats', () => {
    const formats = new Set(fixtures.map((name) => normalizeFixture(name).format))

    expect(formats).toEqual(new Set(['rss', 'atom', 'rdf', 'json']))
  })
})

describe('normalizeFeed, per format', () => {
  it('reads an RSS 2.0 feed', () => {
    const feed = normalizeFixture('rss2-techcrunch.xml')

    expect(feed.format).toBe('rss')
    expect(feed.title).toBe('TechCrunch')
    expect(feed.siteUrl).toBe('https://techcrunch.com/')
    expect(feed.language).toBe('en-US')
    expect(feed.entries[0]?.author).toBe('Kirsten Korosec')
    expect(feed.entries[0]?.guid).toBe('https://techcrunch.com/?p=3165052')
  })

  it('reads an Atom feed, preferring the alternate link over the id', () => {
    const feed = normalizeFixture('atom-theverge.xml')

    expect(feed.format).toBe('atom')
    expect(feed.title).toBe('The Verge')
    expect(feed.entries[0]?.url).toContain('theverge.com/entertainment/')
    expect(feed.entries[0]?.guid).toBe('https://www.theverge.com/?p=996499')
    expect(feed.entries[0]?.author).toBe('Andrew Webster')
  })

  it('reads a JSON Feed', () => {
    const feed = normalizeFixture('jsonfeed-daringfireball.json')

    expect(feed.format).toBe('json')
    expect(feed.title).toBe('Daring Fireball')
    expect(feed.siteUrl).toBe('https://daringfireball.net/')
    expect(feed.entries[0]?.author).toBe('John Gruber')
    expect(feed.entries[0]?.contentHtml).toContain('<p>')
  })

  it('reads an RDF (RSS 1.0) feed, including its Dublin Core fields', () => {
    const feed = normalizeFixture('rdf-slashdot.xml')

    expect(feed.format).toBe('rdf')
    expect(feed.title).toBe('Slashdot')
    expect(feed.entries[0]?.author).toBe('EditorDavid')
    expect(feed.entries[0]?.publishedAt).toBe(Date.parse('2026-09-16T22:04:00Z'))
  })

  it('decodes a latin-1 feed with its accents intact', () => {
    const feed = normalizeFixture('rss2-iso-8859-1.xml')

    expect(feed.title).toBe('Notícias em Português')
    expect(feed.entries[0]?.title).toBe('Informação e manutenção')
    expect(feed.entries[0]?.summary).toContain('Acúmulo de água')
  })
})

describe('normalizeFeed, identity', () => {
  it('falls back to the link, then to title and date, when there is no guid', () => {
    const feed = normalizeFixture('rss2-no-guid.xml')

    expect(feed.entries[0]?.guid).toMatch(/^url:[0-9a-f]{40}$/)
    expect(feed.entries[1]?.guid).toMatch(/^title:[0-9a-f]{40}$/)
  })

  it('gives the same entry the same identity on every fetch', () => {
    const first = normalizeFixture('rss2-no-guid.xml')
    const second = normalizeFixture('rss2-no-guid.xml')

    expect(first.entries.map((e) => e.guid)).toEqual(second.entries.map((e) => e.guid))
  })

  it('keeps entries distinct when only the title differs', () => {
    const base = { guid: null, url: null, publishedAt: FETCHED_AT }

    expect(entryIdentity({ ...base, title: 'A' })).not.toBe(entryIdentity({ ...base, title: 'B' }))
  })

  it('prefers a declared guid over any fallback', () => {
    expect(entryIdentity({ guid: 'real', url: 'https://a.test', title: 'x', publishedAt: 0 })).toBe(
      'real',
    )
  })
})

describe('normalizeFeed, dates', () => {
  it('never produces NaN, however broken the dates are', () => {
    const feed = normalizeFixture('rss2-broken-dates.xml')

    for (const entry of feed.entries) {
      expect(Number.isFinite(entry.publishedAt)).toBe(true)
    }
  })

  it('falls back to the fetch time for unreadable, empty and missing dates', () => {
    const feed = normalizeFixture('rss2-broken-dates.xml')

    expect(feed.entries[0]?.publishedAt).toBe(FETCHED_AT)
    expect(feed.entries[1]?.publishedAt).toBe(FETCHED_AT)
    expect(feed.entries[3]?.publishedAt).toBe(FETCHED_AT)
  })

  it('clamps a date set far in the future', () => {
    const feed = normalizeFixture('rss2-broken-dates.xml')

    expect(feed.entries[2]?.publishedAt).toBe(FETCHED_AT)
  })
})

describe('normalizeFeed, content', () => {
  it('sanitizes hostile HTML while keeping the article readable', () => {
    const feed = normalizeFixture('rss2-malicious-html.xml')
    const html = feed.entries[0]?.contentHtml ?? ''

    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<form')
    expect(html).toContain('<strong>negrito</strong>')
    expect(html).toContain('youtube.com/embed/abc123')
  })

  it('resolves relative links and images against the site URL', () => {
    const feed = normalizeFixture('rss2-relative-urls.xml')
    const entry = feed.entries[0]

    expect(entry?.url).toBe('https://relative.example/blog/post-1')
    expect(entry?.contentHtml).toContain('https://relative.example/sobre')
    expect(entry?.imageUrl).toBe('https://relative.example/blog/imagens/capa.png')
  })

  it('keeps a truncated feed as it came, without inventing content', () => {
    const feed = normalizeFixture('rss2-truncated.xml')
    const entry = feed.entries[0]

    expect(entry?.contentHtml).toContain('Continue lendo')
    expect(entry?.summary).toContain('O começo do artigo')
    expect(entry?.summary).not.toContain('<')
  })

  it('prefers content:encoded over the teaser description', () => {
    const feed = normalizeFixture('rss2-tecnoblog.xml')
    const entry = feed.entries[0]

    expect((entry?.contentHtml?.length ?? 0) > (entry?.summary?.length ?? 0)).toBe(true)
    expect(entry?.contentHtml).toContain('<figure>')
  })

  it('does not use a video embed as the entry thumbnail', () => {
    const feed = normalizeFixture('rss2-tecnoblog.xml')

    expect(feed.entries[0]?.imageUrl).not.toContain('youtube.com')
  })

  it('takes the first image of the content when the feed declares none', () => {
    const feed = normalizeFixture('rss2-npr-media.xml')

    expect(feed.entries[0]?.imageUrl).toMatch(/^https:\/\//)
  })

  it('falls back to a placeholder title rather than an empty one', () => {
    const feed = normalizeFeed(
      `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
       <link>https://t.test</link><description>d</description>
       <item><guid>1</guid><description>sem título</description></item>
       </channel></rss>`,
      { feedUrl: 'https://t.test/feed.xml', fetchedAt: FETCHED_AT },
    )

    expect(feed.entries[0]?.title).toBe(UNTITLED)
  })

  it('strips markup out of titles', () => {
    const feed = normalizeFeed(
      `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
       <link>https://t.test</link><description>d</description>
       <item><guid>1</guid><title>Um &lt;b&gt;título&lt;/b&gt; &amp; tal</title></item>
       </channel></rss>`,
      { feedUrl: 'https://t.test/feed.xml', fetchedAt: FETCHED_AT },
    )

    expect(feed.entries[0]?.title).toBe('Um título & tal')
  })
})
