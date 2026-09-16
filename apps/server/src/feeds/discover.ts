import { parseFeed } from 'feedsmith'
import { decodeFeedBytes } from './charset.ts'
import { USER_AGENT, type FetchLike } from './fetch.ts'

/**
 * Feed discovery from any URL the user pastes (spec, section 6).
 *
 * Three steps, in order, stopping at the first that yields something:
 *  1. the URL is already a feed;
 *  2. the page links to one with `<link rel="alternate">`;
 *  3. the usual paths a site puts its feed under.
 *
 * HTML is scanned with a focused regex rather than a parser: the only markup
 * that matters here is `<link>` and `<base>` in the head, and the stack has no
 * HTML parser (spec, section 13).
 */

export const FEED_MIME_TYPES = [
  'application/rss+xml',
  'application/atom+xml',
  'application/feed+json',
  'application/json',
  'application/xml',
  'text/xml',
]

/** Paths tried when a page advertises no feed at all. */
export const COMMON_FEED_PATHS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feed.xml',
  '/feed.json',
  '/feeds/posts/default',
]

export interface FeedCandidate {
  feedUrl: string
  title: string | null
  /** Which of the three steps found it; the UI lists direct hits first. */
  source: 'direct' | 'link-tag' | 'common-path'
}

export interface DiscoverOptions {
  fetchImpl?: FetchLike
  timeoutMs?: number
  /** Cap on how many common paths are probed, to bound a discovery attempt. */
  maxCommonPaths?: number
}

/** Adds a scheme when the user types `example.com`, as they usually do. */
export function normalizeInputUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Whether the text parses as a feed of any supported format. */
export function looksLikeFeed(text: string): boolean {
  try {
    parseFeed(text)
    return true
  } catch {
    return false
  }
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null
}

/**
 * Feed URLs advertised by a page, in document order.
 * `<base href>` is honoured, because sites that use it break relative hrefs.
 */
export function feedLinksInHtml(html: string, pageUrl: string): FeedCandidate[] {
  const head = html.slice(0, 200_000)

  const baseTag = /<base\b[^>]*>/i.exec(head)?.[0]
  const baseHref = baseTag ? attribute(baseTag, 'href') : null
  let base = pageUrl
  if (baseHref) {
    try {
      base = new URL(baseHref, pageUrl).toString()
    } catch {
      base = pageUrl
    }
  }

  const found: FeedCandidate[] = []
  const seen = new Set<string>()

  for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0]
    const rel = attribute(tag, 'rel')?.toLowerCase()
    if (rel !== 'alternate' && rel !== 'alternate feed') continue

    const type = attribute(tag, 'type')?.toLowerCase().split(';')[0]?.trim()
    if (!type || !FEED_MIME_TYPES.includes(type)) continue

    const href = attribute(tag, 'href')
    if (!href) continue

    let absolute: string
    try {
      absolute = new URL(href, base).toString()
    } catch {
      continue
    }
    if (seen.has(absolute)) continue
    seen.add(absolute)

    found.push({ feedUrl: absolute, title: attribute(tag, 'title'), source: 'link-tag' })
  }

  return found
}

async function getText(
  url: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<{ text: string; finalUrl: string } | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type')
    const bytes = new Uint8Array(await response.arrayBuffer())
    return { text: decodeFeedBytes(bytes, contentType), finalUrl: response.url || url }
  } catch {
    return null
  }
}

/** Title of a feed, used to label a candidate in the follow dialog. */
function feedTitle(text: string): string | null {
  try {
    const { feed } = parseFeed(text)
    const title = (feed as { title?: unknown }).title
    return typeof title === 'string' && title.trim() !== '' ? title : null
  } catch {
    return null
  }
}

/**
 * Finds the feeds reachable from a URL. Returns an empty list rather than
 * throwing, so the UI can show "Nenhum feed encontrado" (spec, section 10).
 */
export async function discoverFeeds(
  input: string,
  options: DiscoverOptions = {},
): Promise<FeedCandidate[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxCommonPaths = options.maxCommonPaths ?? COMMON_FEED_PATHS.length

  const url = normalizeInputUrl(input)
  if (!url) return []

  const fetched = await getText(url, fetchImpl, timeoutMs)

  // 1. The URL is the feed.
  if (fetched && looksLikeFeed(fetched.text)) {
    return [{ feedUrl: fetched.finalUrl, title: feedTitle(fetched.text), source: 'direct' }]
  }

  // 2. The page points at one.
  if (fetched) {
    const advertised = feedLinksInHtml(fetched.text, fetched.finalUrl)
    if (advertised.length > 0) {
      const confirmed: FeedCandidate[] = []
      for (const candidate of advertised) {
        const probe = await getText(candidate.feedUrl, fetchImpl, timeoutMs)
        if (probe && looksLikeFeed(probe.text)) {
          confirmed.push({ ...candidate, title: candidate.title ?? feedTitle(probe.text) })
        }
      }
      if (confirmed.length > 0) return confirmed
    }
  }

  // 3. The paths sites usually use.
  const origin = new URL(url).origin
  for (const path of COMMON_FEED_PATHS.slice(0, maxCommonPaths)) {
    const guess = new URL(path, origin).toString()
    if (guess === url) continue

    const probe = await getText(guess, fetchImpl, timeoutMs)
    if (probe && looksLikeFeed(probe.text)) {
      return [{ feedUrl: probe.finalUrl, title: feedTitle(probe.text), source: 'common-path' }]
    }
  }

  return []
}
