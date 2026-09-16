import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { firstImageUrl, sanitizeContent, toSummary } from './sanitize.ts'

const maliciousFeed = readFileSync(
  fileURLToPath(new URL('./__fixtures__/rss2-malicious-html.xml', import.meta.url)),
  'utf8',
)

/** The CDATA body of the crafted hostile fixture. */
const hostileHtml = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(maliciousFeed)?.[1] ?? ''

describe('sanitizeContent', () => {
  it('has something to work with', () => {
    expect(hostileHtml).toContain('<script>')
  })

  it('removes scripts, including their source text', () => {
    const clean = sanitizeContent(hostileHtml) ?? ''

    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('attacker.example/steal')
    expect(clean).not.toContain('document.cookie')
  })

  it('removes event handlers and inline styles', () => {
    const clean = sanitizeContent(hostileHtml) ?? ''

    expect(clean).not.toContain('onerror')
    expect(clean).not.toContain('onclick')
    expect(clean).not.toContain('position:fixed')
  })

  it('removes forms and their fields', () => {
    const clean = sanitizeContent(hostileHtml) ?? ''

    expect(clean).not.toContain('<form')
    expect(clean).not.toContain('<input')
    expect(clean).not.toContain('senha')
  })

  it('drops a javascript: link but keeps its text', () => {
    const clean = sanitizeContent('<a href="javascript:alert(1)">clique</a>') ?? ''

    expect(clean).not.toContain('javascript:')
    expect(clean).toContain('clique')
  })

  it('keeps the rich text markup a reader needs', () => {
    const clean = sanitizeContent(hostileHtml) ?? ''

    for (const tag of ['<strong>', '<em>', '<ul>', '<li>', '<pre>', '<code>', '<table>', '<blockquote>']) {
      expect(clean).toContain(tag)
    }
  })

  it('keeps YouTube and Vimeo iframes and drops every other one', () => {
    const clean = sanitizeContent(hostileHtml) ?? ''

    expect(clean).toContain('https://www.youtube.com/embed/abc123')
    expect(clean).toContain('https://player.vimeo.com/video/12345')
    expect(clean).not.toContain('attacker.example/frame')
  })

  it('sandboxes the iframes it keeps', () => {
    const clean = sanitizeContent('<iframe src="https://www.youtube.com/embed/x"></iframe>') ?? ''

    expect(clean).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"')
  })

  it('opens links in a new tab without handing over the opener', () => {
    const clean = sanitizeContent('<a href="https://ok.example">ok</a>') ?? ''

    expect(clean).toContain('rel="noopener noreferrer nofollow"')
    expect(clean).toContain('target="_blank"')
  })

  it('resolves relative links and images against the site URL', () => {
    const clean =
      sanitizeContent('<p><a href="../sobre">sobre</a></p><img src="imagens/capa.png">', {
        baseUrl: 'https://relative.example/blog/',
      }) ?? ''

    expect(clean).toContain('https://relative.example/sobre')
    expect(clean).toContain('https://relative.example/blog/imagens/capa.png')
  })

  it('leaves absolute URLs alone', () => {
    const clean =
      sanitizeContent('<img src="https://cdn.example/a.png">', {
        baseUrl: 'https://relative.example/blog/',
      }) ?? ''

    expect(clean).toContain('https://cdn.example/a.png')
  })

  it('returns null for empty or whitespace-only content', () => {
    expect(sanitizeContent(null)).toBeNull()
    expect(sanitizeContent('')).toBeNull()
    expect(sanitizeContent('<script>x()</script>')).toBeNull()
  })
})

describe('toSummary', () => {
  it('strips markup and collapses whitespace', () => {
    expect(toSummary('<p>Um  <strong>texto</strong>\n  curto.</p>')).toBe('Um texto curto.')
  })

  it('caps long text on a word boundary with an ellipsis', () => {
    const summary = toSummary(`<p>${'palavra '.repeat(200)}</p>`)

    expect(summary).toBeTruthy()
    expect(summary?.length).toBeLessThanOrEqual(401)
    expect(summary?.endsWith('…')).toBe(true)
    expect(summary).not.toContain('palavr…')
  })

  it('decodes entities', () => {
    expect(toSummary('<p>Informa&ccedil;&atilde;o &amp; cia</p>')).toBe('Informação & cia')
  })

  it('returns null when there is no text left', () => {
    expect(toSummary('<img src="https://a.example/x.png">')).toBeNull()
    expect(toSummary(null)).toBeNull()
  })
})

describe('firstImageUrl', () => {
  it('returns the first absolute image', () => {
    const html = '<p>oi</p><img src="https://cdn.example/1.png"><img src="https://cdn.example/2.png">'

    expect(firstImageUrl(html)).toBe('https://cdn.example/1.png')
  })

  it('skips relative images, which are not usable as a thumbnail', () => {
    expect(firstImageUrl('<img src="/local.png">')).toBeNull()
  })

  it('returns null when there is no image', () => {
    expect(firstImageUrl('<p>sem imagem</p>')).toBeNull()
  })
})
