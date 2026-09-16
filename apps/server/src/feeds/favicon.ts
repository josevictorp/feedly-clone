import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { USER_AGENT, type FetchLike } from './fetch.ts'

/**
 * Favicon resolution and caching (spec, section 6).
 *
 * Order: the icon the page declares, then `/favicon.ico`, then DuckDuckGo's
 * icon service. A feed with no icon at all is fine — the sidebar falls back to
 * a generic RSS glyph, so nothing here is allowed to fail loudly.
 */

/** `<link rel>` values that carry a site icon. */
const ICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed']

const MAX_ICON_BYTES = 512 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null
}

/** Icon URLs a page declares, in document order. */
export function iconLinksInHtml(html: string, pageUrl: string): string[] {
  const found: string[] = []

  for (const match of html.slice(0, 200_000).matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0]
    const rel = attribute(tag, 'rel')?.toLowerCase().trim()
    if (!rel || !ICON_RELS.includes(rel)) continue

    const href = attribute(tag, 'href')
    if (!href) continue

    try {
      found.push(new URL(href, pageUrl).toString())
    } catch {
      // A malformed href is simply not a candidate.
    }
  }

  return found
}

/** DuckDuckGo's icon service, the last resort before giving up. */
export function iconServiceUrl(siteUrl: string): string | null {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(siteUrl).hostname}.ico`
  } catch {
    return null
  }
}

export function extensionForContentType(contentType: string | null | undefined): string | null {
  const type = contentType?.toLowerCase().split(';')[0]?.trim()
  return type ? (EXTENSION_BY_TYPE[type] ?? null) : null
}

export interface ResolveFaviconOptions {
  /** Feed id, which names the cached file. */
  feedId: number
  /** Site the feed belongs to; icons are looked for there, not at the feed URL. */
  siteUrl: string | null
  /** Root data directory; icons land in `<dataDir>/favicons`. */
  dataDir: string
  fetchImpl?: FetchLike
  timeoutMs?: number
}

/** Path of the cached icon, relative to the data directory. */
export interface ResolvedFavicon {
  iconPath: string
  sourceUrl: string
}

async function fetchBinary(
  url: string,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!response.ok) return null

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_ICON_BYTES) return null

    return { bytes, contentType: response.headers.get('content-type') }
  } catch {
    return null
  }
}

async function fetchHtml(url: string, fetchImpl: FetchLike, timeoutMs: number) {
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    if (!response.ok) return null
    return { text: await response.text(), finalUrl: response.url || url }
  } catch {
    return null
  }
}

/**
 * Downloads the best icon it can find and caches it under `data/favicons/`.
 * Returns null when there is nothing usable; the UI then shows the RSS glyph.
 */
export async function resolveFavicon(
  options: ResolveFaviconOptions,
): Promise<ResolvedFavicon | null> {
  const { siteUrl } = options
  if (!siteUrl) return null

  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 10_000

  const candidates: string[] = []

  const page = await fetchHtml(siteUrl, fetchImpl, timeoutMs)
  if (page) candidates.push(...iconLinksInHtml(page.text, page.finalUrl))

  try {
    candidates.push(new URL('/favicon.ico', siteUrl).toString())
  } catch {
    // siteUrl is not a URL; the service fallback below will not fire either.
  }

  const service = iconServiceUrl(siteUrl)
  if (service) candidates.push(service)

  for (const candidate of candidates) {
    const icon = await fetchBinary(candidate, fetchImpl, timeoutMs)
    if (!icon) continue

    const extension = extensionForContentType(icon.contentType) ?? 'ico'
    const directory = join(options.dataDir, 'favicons')
    mkdirSync(directory, { recursive: true })

    const fileName = `${options.feedId}.${extension}`
    writeFileSync(join(directory, fileName), icon.bytes)

    return { iconPath: `favicons/${fileName}`, sourceUrl: candidate }
  }

  return null
}
