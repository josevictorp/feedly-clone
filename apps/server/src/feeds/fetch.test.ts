import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createFakeHttp } from '../testing/http.ts'
import { fetchFeed, USER_AGENT } from './fetch.ts'

const FEED_URL = 'https://fixture.test/feed.xml'

const utf8Feed = readFileSync(
  fileURLToPath(new URL('./__fixtures__/rss2-techcrunch.xml', import.meta.url)),
  'utf8',
)
const latin1Bytes = new Uint8Array(
  readFileSync(fileURLToPath(new URL('./__fixtures__/rss2-iso-8859-1.xml', import.meta.url))),
)

describe('fetchFeed', () => {
  it('returns the decoded body and the caching validators', async () => {
    const http = createFakeHttp({
      [FEED_URL]: {
        body: utf8Feed,
        headers: {
          'content-type': 'application/rss+xml; charset=UTF-8',
          etag: 'W/"abc"',
          'last-modified': 'Wed, 16 Sep 2026 12:00:00 GMT',
        },
      },
    })

    const result = await fetchFeed(FEED_URL, { fetchImpl: http.fetch })

    expect(result).toMatchObject({
      status: 'ok',
      etag: 'W/"abc"',
      lastModified: 'Wed, 16 Sep 2026 12:00:00 GMT',
    })
    expect(result.status === 'ok' && result.text).toContain('TechCrunch')
  })

  it('identifies itself with the agreed User-Agent', async () => {
    const http = createFakeHttp({ [FEED_URL]: { body: utf8Feed } })

    await fetchFeed(FEED_URL, { fetchImpl: http.fetch })

    expect(http.requests[0]?.headers['user-agent']).toBe(USER_AGENT)
  })

  it('sends the conditional headers when it has validators', async () => {
    const http = createFakeHttp({ [FEED_URL]: { body: utf8Feed } })

    await fetchFeed(FEED_URL, {
      fetchImpl: http.fetch,
      etag: 'W/"abc"',
      lastModified: 'Wed, 16 Sep 2026 12:00:00 GMT',
    })

    expect(http.requests[0]?.headers['if-none-match']).toBe('W/"abc"')
    expect(http.requests[0]?.headers['if-modified-since']).toBe('Wed, 16 Sep 2026 12:00:00 GMT')
  })

  it('sends no conditional headers on a first fetch', async () => {
    const http = createFakeHttp({ [FEED_URL]: { body: utf8Feed } })

    await fetchFeed(FEED_URL, { fetchImpl: http.fetch })

    expect(http.requests[0]?.headers['if-none-match']).toBeUndefined()
    expect(http.requests[0]?.headers['if-modified-since']).toBeUndefined()
  })

  it('reports a 304 as not-modified, with no body to parse', async () => {
    const http = createFakeHttp({ [FEED_URL]: { status: 304 } })

    expect(await fetchFeed(FEED_URL, { fetchImpl: http.fetch, etag: 'W/"abc"' })).toEqual({
      status: 'not-modified',
    })
  })

  it('decodes a latin-1 body using the header charset', async () => {
    const http = createFakeHttp({
      [FEED_URL]: { body: latin1Bytes, headers: { 'content-type': 'text/xml; charset=ISO-8859-1' } },
    })

    const result = await fetchFeed(FEED_URL, { fetchImpl: http.fetch })

    expect(result.status === 'ok' && result.text).toContain('Informação e manutenção')
  })

  it('reports an HTTP error instead of throwing', async () => {
    const http = createFakeHttp({ [FEED_URL]: { status: 500 } })

    expect(await fetchFeed(FEED_URL, { fetchImpl: http.fetch })).toMatchObject({
      status: 'error',
      httpStatus: 500,
    })
  })

  it('reports an unreachable host instead of throwing', async () => {
    const http = createFakeHttp({
      [FEED_URL]: { throws: Object.assign(new Error('getaddrinfo ENOTFOUND'), { name: 'TypeError' }) },
    })

    expect(await fetchFeed(FEED_URL, { fetchImpl: http.fetch })).toMatchObject({
      status: 'error',
      httpStatus: null,
      message: expect.stringContaining('ENOTFOUND'),
    })
  })

  it('reports a timeout in words the sidebar can show', async () => {
    const http = createFakeHttp({
      [FEED_URL]: { throws: Object.assign(new Error('aborted'), { name: 'TimeoutError' }) },
    })

    const result = await fetchFeed(FEED_URL, { fetchImpl: http.fetch, timeoutMs: 5 })

    expect(result).toEqual({ status: 'error', httpStatus: null, message: 'tempo esgotado' })
  })

  it('follows redirects and reports where it landed', async () => {
    const http = createFakeHttp({
      [FEED_URL]: { body: utf8Feed, url: 'https://fixture.test/new-feed.xml' },
    })

    const result = await fetchFeed(FEED_URL, { fetchImpl: http.fetch })

    expect(result.status === 'ok' && result.finalUrl).toBe('https://fixture.test/new-feed.xml')
  })
})
