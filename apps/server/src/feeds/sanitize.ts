import sanitizeHtml from 'sanitize-html'

/**
 * Sanitization of feed HTML (spec, section 6).
 *
 * Everything a feed sends is hostile until proven otherwise, so this runs on the
 * server and the front end never sanitizes anything itself. The allowlist is
 * wide on text markup — a feed that loses its tables and code blocks reads worse
 * than the original — and narrow on anything that can execute or navigate.
 */

/** The only hosts whose iframes survive: video embeds people actually expect. */
export const ALLOWED_IFRAME_HOSTNAMES = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
]

/** Sandbox applied to every surviving iframe. */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation'

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div', 'span', 'section', 'article',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'blockquote', 'q', 'cite', 'abbr', 'time',
  'code', 'pre', 'kbd', 'samp', 'var',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'figure', 'figcaption', 'picture', 'source',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'iframe', 'video', 'audio',
]

/** Attributes that carry a URL and therefore need resolving against the site. */
const URL_ATTRIBUTES: Record<string, string[]> = {
  a: ['href'],
  img: ['src'],
  source: ['src'],
  video: ['src', 'poster'],
  audio: ['src'],
}

function resolveUrl(value: string, baseUrl: string | null): string {
  if (!baseUrl) return value
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return value
  }
}

export interface SanitizeOptions {
  /** Site URL used to turn relative links and images into absolute ones. */
  baseUrl?: string | null
}

export function sanitizeContent(html: string | null | undefined, options: SanitizeOptions = {}) {
  if (!html) return null

  const baseUrl = options.baseUrl ?? null

  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading'],
      source: ['src', 'srcset', 'sizes', 'type', 'media'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'title', 'sandbox', 'loading'],
      video: ['src', 'poster', 'controls', 'width', 'height', 'preload'],
      audio: ['src', 'controls', 'preload'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      col: ['span'],
      colgroup: ['span'],
      time: ['datetime'],
      blockquote: ['cite'],
      q: ['cite'],
    },
    allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite', 'poster'],
    // Inline styles are how a feed breaks out of the reading column.
    allowedStyles: {},
    // Drop the contents too, not just the tag: a stripped <script> would
    // otherwise leave its source code as visible text.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'form', 'button'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.href ? { href: resolveUrl(attribs.href, baseUrl) } : {}),
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, sandbox: IFRAME_SANDBOX, loading: 'lazy' },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.src ? { src: resolveUrl(attribs.src, baseUrl) } : {}),
          loading: 'lazy',
        },
      }),
      source: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.src ? { src: resolveUrl(attribs.src, baseUrl) } : {}) },
      }),
    },
  })

  const trimmed = clean.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Undoes the escaping sanitize-html applies to its text output.
 *
 * Stripping tags leaves `&`, `<` and friends re-escaped, which is right for
 * HTML and wrong for the plain-text summary column. `&amp;` goes last so
 * `&amp;lt;` does not decode twice.
 */
function decodeBasicEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

export const MAX_SUMMARY_LENGTH = 400

/**
 * Plain-text summary of an entry, capped at 400 characters on a word boundary
 * (spec, section 5). Used by the Magazine and Cards rows.
 */
export function toSummary(html: string | null | undefined, maxLength = MAX_SUMMARY_LENGTH) {
  if (!html) return null

  const stripped = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
  })
  const text = decodeBasicEntities(stripped).replace(/\s+/g, ' ').trim()

  if (text === '') return null
  if (text.length <= maxLength) return text

  const cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** First absolute image in the content, used as the entry thumbnail. */
export function firstImageUrl(html: string | null | undefined): string | null {
  if (!html) return null
  for (const match of html.matchAll(/<img\b[^>]*?\ssrc=["']([^"']+)["']/gi)) {
    const src = match[1]
    if (src && /^https?:\/\//i.test(src)) return src
  }
  return null
}

export { URL_ATTRIBUTES }
