import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createFakeHttp } from '../testing/http.ts'
import { discoverFeeds, feedLinksInHtml, normalizeInputUrl } from './discover.ts'

const feedXml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/rss2-techcrunch.xml', import.meta.url)),
  'utf8',
)

const XML = { 'content-type': 'application/rss+xml; charset=UTF-8' }
const HTML = { 'content-type': 'text/html; charset=UTF-8' }

describe('normalizeInputUrl', () => {
  it.each([
    ['example.com', 'https://example.com/'],
    ['  example.com/blog  ', 'https://example.com/blog'],
    ['http://example.com/feed', 'http://example.com/feed'],
    ['https://example.com/feed', 'https://example.com/feed'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeInputUrl(input)).toBe(expected)
  })

  it.each(['', '   ', 'javascript:alert(1)', 'file:///etc/passwd', 'not a url at all'])(
    'rejects %j',
    (input) => {
      expect(normalizeInputUrl(input)).toBeNull()
    },
  )
})

describe('feedLinksInHtml', () => {
  it('finds RSS, Atom and JSON Feed links', () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml">
      <link rel="alternate" type="application/atom+xml" href="/atom.xml">
      <link rel="alternate" type="application/feed+json" href="/feed.json">
    </head></html>`

    expect(feedLinksInHtml(html, 'https://site.test/blog/')).toEqual([
      { feedUrl: 'https://site.test/feed.xml', title: 'RSS', source: 'link-tag' },
      { feedUrl: 'https://site.test/atom.xml', title: null, source: 'link-tag' },
      { feedUrl: 'https://site.test/feed.json', title: null, source: 'link-tag' },
    ])
  })

  it('ignores stylesheets, icons and other alternates', () => {
    const html = `<html><head>
      <link rel="stylesheet" href="/a.css">
      <link rel="icon" href="/favicon.ico">
      <link rel="alternate" hreflang="pt" href="/pt/">
    </head></html>`

    expect(feedLinksInHtml(html, 'https://site.test/')).toEqual([])
  })

  it('handles single quotes and unquoted attributes', () => {
    const html = `<link rel='alternate' type='application/rss+xml' href=/feed>`

    expect(feedLinksInHtml(html, 'https://site.test/')[0]?.feedUrl).toBe('https://site.test/feed')
  })

  it('honours a base tag', () => {
    const html = `<html><head><base href="https://cdn.test/site/">
      <link rel="alternate" type="application/rss+xml" href="feed.xml"></head></html>`

    expect(feedLinksInHtml(html, 'https://site.test/')[0]?.feedUrl).toBe(
      'https://cdn.test/site/feed.xml',
    )
  })

  it('reports each feed once', () => {
    const html = `
      <link rel="alternate" type="application/rss+xml" href="/feed.xml">
      <link rel="alternate" type="application/rss+xml" href="/feed.xml">`

    expect(feedLinksInHtml(html, 'https://site.test/')).toHaveLength(1)
  })
})

describe('discoverFeeds', () => {
  it('recognises a URL that is already a feed', async () => {
    const http = createFakeHttp({
      'https://site.test/feed.xml': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test/feed.xml', { fetchImpl: http.fetch })

    expect(found).toEqual([
      { feedUrl: 'https://site.test/feed.xml', title: 'TechCrunch', source: 'direct' },
    ])
    expect(http.requests).toHaveLength(1)
  })

  it('follows the link tag of a page', async () => {
    const http = createFakeHttp({
      'https://site.test/': {
        body: `<html><head><link rel="alternate" type="application/rss+xml" title="Blog"
               href="/rss.xml"></head><body>oi</body></html>`,
        headers: HTML,
      },
      'https://site.test/rss.xml': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test', { fetchImpl: http.fetch })

    expect(found).toEqual([
      { feedUrl: 'https://site.test/rss.xml', title: 'Blog', source: 'link-tag' },
    ])
  })

  it('returns several candidates when a page advertises several feeds', async () => {
    const http = createFakeHttp({
      'https://site.test/': {
        body: `<link rel="alternate" type="application/rss+xml" href="/a.xml">
               <link rel="alternate" type="application/atom+xml" href="/b.xml">`,
        headers: HTML,
      },
      'https://site.test/a.xml': { body: feedXml, headers: XML },
      'https://site.test/b.xml': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test', { fetchImpl: http.fetch })

    expect(found.map((c) => c.feedUrl)).toEqual([
      'https://site.test/a.xml',
      'https://site.test/b.xml',
    ])
  })

  it('drops an advertised link that does not actually serve a feed', async () => {
    const http = createFakeHttp({
      'https://site.test/': {
        body: `<link rel="alternate" type="application/rss+xml" href="/broken.xml">
               <link rel="alternate" type="application/rss+xml" href="/good.xml">`,
        headers: HTML,
      },
      'https://site.test/broken.xml': { body: '<html>not a feed</html>', headers: HTML },
      'https://site.test/good.xml': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test', { fetchImpl: http.fetch })

    expect(found.map((c) => c.feedUrl)).toEqual(['https://site.test/good.xml'])
  })

  it('falls back to the common paths when the page advertises nothing', async () => {
    const http = createFakeHttp({
      'https://site.test/': { body: '<html><head></head><body>oi</body></html>', headers: HTML },
      'https://site.test/rss': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test', { fetchImpl: http.fetch })

    expect(found).toEqual([
      { feedUrl: 'https://site.test/rss', title: 'TechCrunch', source: 'common-path' },
    ])
  })

  it('still probes the common paths when the page itself is unreachable', async () => {
    const http = createFakeHttp({
      'https://site.test/feed': { body: feedXml, headers: XML },
    })

    const found = await discoverFeeds('site.test', { fetchImpl: http.fetch })

    expect(found[0]?.feedUrl).toBe('https://site.test/feed')
  })

  it('returns nothing when there is no feed anywhere', async () => {
    const http = createFakeHttp({
      'https://site.test/': { body: '<html>sem feed</html>', headers: HTML },
    })

    expect(await discoverFeeds('site.test', { fetchImpl: http.fetch })).toEqual([])
  })

  it('returns nothing for an input that is not a usable URL', async () => {
    const http = createFakeHttp({})

    expect(await discoverFeeds('javascript:alert(1)', { fetchImpl: http.fetch })).toEqual([])
    expect(http.requests).toHaveLength(0)
  })
})
