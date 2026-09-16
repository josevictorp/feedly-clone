import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  charsetFromContentType,
  charsetFromXmlProlog,
  decodeFeedBytes,
  detectCharset,
} from './charset.ts'

const latin1Bytes = new Uint8Array(
  readFileSync(fileURLToPath(new URL('./__fixtures__/rss2-iso-8859-1.xml', import.meta.url))),
)
const slashdotBytes = new Uint8Array(
  readFileSync(fileURLToPath(new URL('./__fixtures__/rdf-slashdot.xml', import.meta.url))),
)
const utf8Bytes = new Uint8Array(
  readFileSync(fileURLToPath(new URL('./__fixtures__/rss2-techcrunch.xml', import.meta.url))),
)

describe('charsetFromContentType', () => {
  it.each([
    ['text/xml;charset=UTF-8', 'utf-8'],
    ['application/rss+xml; charset=ISO-8859-1', 'iso-8859-1'],
    ['text/xml; charset="windows-1252"', 'windows-1252'],
  ])('reads %s', (header, expected) => {
    expect(charsetFromContentType(header)).toBe(expected)
  })

  it('returns null when the header says nothing', () => {
    expect(charsetFromContentType('application/rss+xml')).toBeNull()
    expect(charsetFromContentType(null)).toBeNull()
  })
})

describe('charsetFromXmlProlog', () => {
  it('reads the encoding of a real latin-1 feed', () => {
    expect(charsetFromXmlProlog(slashdotBytes)).toBe('iso-8859-1')
  })

  it('returns null when the prologue declares nothing', () => {
    expect(charsetFromXmlProlog(new TextEncoder().encode('<rss version="2.0">'))).toBeNull()
  })
})

describe('detectCharset', () => {
  it('prefers the HTTP header over the prologue', () => {
    expect(detectCharset(slashdotBytes, 'text/xml; charset=utf-8')).toEqual({
      charset: 'utf-8',
      source: 'header',
    })
  })

  it('falls back to the prologue when the header is silent', () => {
    expect(detectCharset(slashdotBytes, 'text/xml')).toEqual({
      charset: 'iso-8859-1',
      source: 'prolog',
    })
  })

  it('falls back to UTF-8 when neither says anything', () => {
    expect(detectCharset(utf8Bytes, null).source).toBe('prolog')
    expect(detectCharset(new TextEncoder().encode('<rss/>'), null)).toEqual({
      charset: 'utf-8',
      source: 'default',
    })
  })

  it('ignores a charset Node cannot decode', () => {
    expect(detectCharset(utf8Bytes, 'text/xml; charset=x-made-up').source).not.toBe('header')
  })
})

describe('decodeFeedBytes', () => {
  it('decodes a latin-1 feed with its accents intact', () => {
    const text = decodeFeedBytes(latin1Bytes, 'text/xml')

    expect(text).toContain('Informação e manutenção')
    expect(text).toContain('Acúmulo de água no são João.')
    expect(text).not.toContain('�')
  })

  it('mangles the same bytes when told the wrong charset, which is the bug this prevents', () => {
    const wrong = new TextDecoder('utf-8').decode(latin1Bytes)

    expect(wrong).toContain('�')
  })

  it('decodes a UTF-8 feed unchanged', () => {
    const text = decodeFeedBytes(utf8Bytes, 'application/rss+xml; charset=UTF-8')

    expect(text).toContain('<rss')
    expect(text).not.toContain('�')
  })
})
