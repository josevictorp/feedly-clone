import { decodeFeedBytes } from './charset.ts'

/**
 * HTTP fetching for feeds (spec, section 6).
 *
 * Conditional GET is not an optimization here: it is what keeps a 15-minute
 * poll of 200 feeds from being rude. A 304 means nothing changed and nothing is
 * re-parsed.
 */

export const USER_AGENT = 'FeedlyClone/1.0 (+local)'
export const DEFAULT_TIMEOUT_MS = 20_000

/** Injected so tests never touch the network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface FetchFeedOptions {
  /** Validators from the last successful fetch. */
  etag?: string | null
  lastModified?: string | null
  timeoutMs?: number
  fetchImpl?: FetchLike
  signal?: AbortSignal
}

export type FetchFeedResult =
  | {
      status: 'ok'
      /** Decoded feed text, ready for the parser. */
      text: string
      etag: string | null
      lastModified: string | null
      contentType: string | null
      finalUrl: string
    }
  | { status: 'not-modified' }
  | { status: 'error'; httpStatus: number | null; message: string }

/** Turns anything thrown into a short, loggable message. */
export function describeFetchError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'tempo esgotado'
    return error.message
  }
  return String(error)
}

/**
 * Fetches a feed with a timeout and conditional headers.
 *
 * Never throws: a broken feed must not be able to take the scheduler down
 * (RNF-03), so every failure comes back as an `error` result.
 */
export async function fetchFeed(
  url: string,
  options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8',
  }
  if (options.etag) headers['if-none-match'] = options.etag
  if (options.lastModified) headers['if-modified-since'] = options.lastModified

  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout

  try {
    const response = await fetchImpl(url, { headers, signal, redirect: 'follow' })

    if (response.status === 304) return { status: 'not-modified' }

    if (!response.ok) {
      return {
        status: 'error',
        httpStatus: response.status,
        message: `HTTP ${response.status} ${response.statusText}`.trim(),
      }
    }

    const contentType = response.headers.get('content-type')
    const bytes = new Uint8Array(await response.arrayBuffer())

    return {
      status: 'ok',
      text: decodeFeedBytes(bytes, contentType),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentType,
      finalUrl: response.url || url,
    }
  } catch (error) {
    return { status: 'error', httpStatus: null, message: describeFetchError(error) }
  }
}
