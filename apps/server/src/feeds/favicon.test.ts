import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createFakeHttp } from '../testing/http.ts'
import {
  extensionForContentType,
  iconLinksInHtml,
  iconServiceUrl,
  resolveFavicon,
} from './favicon.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const ICO = new Uint8Array([0x00, 0x00, 0x01, 0x00])

describe('iconLinksInHtml', () => {
  it('finds declared icons in document order', () => {
    const html = `<head>
      <link rel="icon" href="/icon.png">
      <link rel="apple-touch-icon" href="https://cdn.test/touch.png">
    </head>`

    expect(iconLinksInHtml(html, 'https://site.test/blog/')).toEqual([
      'https://site.test/icon.png',
      'https://cdn.test/touch.png',
    ])
  })

  it('accepts the legacy shortcut icon rel', () => {
    expect(iconLinksInHtml('<link rel="shortcut icon" href="/f.ico">', 'https://site.test/')).toEqual(
      ['https://site.test/f.ico'],
    )
  })

  it('ignores links that are not icons', () => {
    const html = '<link rel="stylesheet" href="/a.css"><link rel="alternate" href="/feed.xml">'

    expect(iconLinksInHtml(html, 'https://site.test/')).toEqual([])
  })
})

describe('iconServiceUrl', () => {
  it('builds the fallback service URL from the host', () => {
    expect(iconServiceUrl('https://blog.site.test/posts')).toBe(
      'https://icons.duckduckgo.com/ip3/blog.site.test.ico',
    )
  })

  it('returns null for something that is not a URL', () => {
    expect(iconServiceUrl('nope')).toBeNull()
  })
})

describe('extensionForContentType', () => {
  it.each([
    ['image/png', 'png'],
    ['image/x-icon', 'ico'],
    ['image/svg+xml; charset=utf-8', 'svg'],
  ])('maps %s', (type, expected) => {
    expect(extensionForContentType(type)).toBe(expected)
  })

  it('returns null for a type it does not know', () => {
    expect(extensionForContentType('text/html')).toBeNull()
    expect(extensionForContentType(null)).toBeNull()
  })
})

describe('resolveFavicon', () => {
  let dataDir: string

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'feedly-favicon-'))
  })
  afterEach(() => rmSync(dataDir, { recursive: true, force: true }))

  it('prefers the icon the page declares and caches it under the feed id', async () => {
    const http = createFakeHttp({
      'https://site.test/': {
        body: '<head><link rel="icon" href="/logo.png"></head>',
        headers: { 'content-type': 'text/html' },
      },
      'https://site.test/logo.png': { body: PNG, headers: { 'content-type': 'image/png' } },
    })

    const result = await resolveFavicon({
      feedId: 7,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result).toEqual({
      iconPath: 'favicons/7.png',
      sourceUrl: 'https://site.test/logo.png',
    })
    expect(readFileSync(join(dataDir, 'favicons', '7.png'))).toEqual(Buffer.from(PNG))
  })

  it('falls back to /favicon.ico when the page declares none', async () => {
    const http = createFakeHttp({
      'https://site.test/': { body: '<head></head>', headers: { 'content-type': 'text/html' } },
      'https://site.test/favicon.ico': { body: ICO, headers: { 'content-type': 'image/x-icon' } },
    })

    const result = await resolveFavicon({
      feedId: 1,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result?.iconPath).toBe('favicons/1.ico')
  })

  it('falls back to the icon service when the site serves nothing', async () => {
    const http = createFakeHttp({
      'https://icons.duckduckgo.com/ip3/site.test.ico': {
        body: ICO,
        headers: { 'content-type': 'image/x-icon' },
      },
    })

    const result = await resolveFavicon({
      feedId: 2,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result?.sourceUrl).toBe('https://icons.duckduckgo.com/ip3/site.test.ico')
  })

  it('skips a declared icon that fails to download', async () => {
    const http = createFakeHttp({
      'https://site.test/': {
        body: '<head><link rel="icon" href="/missing.png"></head>',
        headers: { 'content-type': 'text/html' },
      },
      'https://site.test/favicon.ico': { body: ICO, headers: { 'content-type': 'image/x-icon' } },
    })

    const result = await resolveFavicon({
      feedId: 3,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result?.sourceUrl).toBe('https://site.test/favicon.ico')
  })

  it('returns null when nothing works, leaving the generic RSS glyph to the UI', async () => {
    const http = createFakeHttp({})

    const result = await resolveFavicon({
      feedId: 4,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result).toBeNull()
    expect(existsSync(join(dataDir, 'favicons', '4.ico'))).toBe(false)
  })

  it('returns null for a feed with no site URL, without any request', async () => {
    const http = createFakeHttp({})

    expect(
      await resolveFavicon({ feedId: 5, siteUrl: null, dataDir, fetchImpl: http.fetch }),
    ).toBeNull()
    expect(http.requests).toHaveLength(0)
  })

  it('rejects an empty response body', async () => {
    const http = createFakeHttp({
      'https://site.test/': { body: '<head></head>', headers: { 'content-type': 'text/html' } },
      'https://site.test/favicon.ico': {
        body: new Uint8Array(),
        headers: { 'content-type': 'image/x-icon' },
      },
    })

    const result = await resolveFavicon({
      feedId: 6,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result).toBeNull()
  })

  it('survives a site that times out', async () => {
    const http = createFakeHttp({
      'https://site.test/': { throws: Object.assign(new Error('x'), { name: 'TimeoutError' }) },
      'https://site.test/favicon.ico': { body: ICO, headers: { 'content-type': 'image/x-icon' } },
    })

    const result = await resolveFavicon({
      feedId: 8,
      siteUrl: 'https://site.test/',
      dataDir,
      fetchImpl: http.fetch,
    })

    expect(result?.iconPath).toBe('favicons/8.ico')
  })
})
