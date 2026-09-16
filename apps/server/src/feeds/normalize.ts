import { createHash } from 'node:crypto'
import { parseFeed } from 'feedsmith'
import { resolvePublishedAt } from './dates.ts'
import { firstImageUrl, sanitizeContent, toSummary } from './sanitize.ts'

/**
 * Turning a parsed feed of any format into the rows this app stores
 * (spec, section 6).
 *
 * feedsmith returns a deeply partial, per-format shape; everything below reads
 * it through small defensive accessors instead of trusting the types, because
 * the only guarantee a real feed gives is that some field will be missing.
 */

export type FeedFormat = 'rss' | 'atom' | 'rdf' | 'json'

export interface NormalizedEntry {
  /** Stable identity inside the feed; deduping keys on it. */
  guid: string
  url: string | null
  title: string
  author: string | null
  summary: string | null
  contentHtml: string | null
  imageUrl: string | null
  publishedAt: number
}

export interface NormalizedFeed {
  format: FeedFormat
  title: string
  siteUrl: string | null
  description: string | null
  language: string | null
  entries: NormalizedEntry[]
}

export interface NormalizeOptions {
  /** URL the feed was fetched from, used when the feed declares no site. */
  feedUrl: string
  /** Fallback publication date, and the reference for "is this in the future". */
  fetchedAt: number
}

export const UNTITLED = 'Sem título'

type Loose = Record<string, unknown>

function asRecord(value: unknown): Loose | null {
  return typeof value === 'object' && value !== null ? (value as Loose) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Reads a field that some formats give as a string and others as `{ value }`. */
function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value
  const record = asRecord(value)
  const inner = record?.value
  return typeof inner === 'string' && inner.trim() !== '' ? inner : null
}

function absoluteUrl(value: string | null, baseUrl: string | null): string | null {
  if (!value) return null
  try {
    return new URL(value, baseUrl ?? undefined).toString()
  } catch {
    return null
  }
}

/** Strips markup and collapses whitespace; titles arrive with both. */
function plainTitle(value: unknown): string {
  const text = toSummary(asText(value) ?? '', 500)
  return text ?? UNTITLED
}

/** Atom link with `rel="alternate"`, which is the human-readable page. */
function atomAlternateHref(links: unknown): string | null {
  const candidates = asArray(links).map(asRecord)
  const alternate =
    candidates.find((link) => link?.rel === 'alternate' && typeof link?.href === 'string') ??
    candidates.find((link) => link?.rel === undefined && typeof link?.href === 'string')
  return typeof alternate?.href === 'string' ? alternate.href : null
}

function firstPersonName(people: unknown): string | null {
  for (const person of asArray(people)) {
    const name = asText(asRecord(person)?.name) ?? asText(person)
    if (name) return name
  }
  return null
}

/**
 * Image for the entry: a media namespace image, then an image enclosure, then
 * the first absolute `<img>` of the content. Video `media:content` — a YouTube
 * embed, say — is skipped: it is not a thumbnail.
 */
function pickImageUrl(item: Loose, contentHtml: string | null, baseUrl: string | null) {
  const media = asRecord(item.media)

  for (const raw of asArray(media?.contents)) {
    const content = asRecord(raw)
    const url = typeof content?.url === 'string' ? content.url : null
    const isImage =
      content?.medium === 'image' ||
      (typeof content?.type === 'string' && content.type.startsWith('image/'))
    if (url && isImage) return absoluteUrl(url, baseUrl)
  }

  for (const raw of asArray(media?.thumbnails)) {
    const url = asRecord(raw)?.url
    if (typeof url === 'string') return absoluteUrl(url, baseUrl)
  }

  for (const raw of asArray(item.enclosures)) {
    const enclosure = asRecord(raw)
    const url = typeof enclosure?.url === 'string' ? enclosure.url : null
    if (url && typeof enclosure?.type === 'string' && enclosure.type.startsWith('image/')) {
      return absoluteUrl(url, baseUrl)
    }
  }

  const jsonImage = typeof item.image === 'string' ? item.image : null
  const jsonBanner = typeof item.banner_image === 'string' ? item.banner_image : null
  if (jsonImage ?? jsonBanner) return absoluteUrl(jsonImage ?? jsonBanner, baseUrl)

  return firstImageUrl(contentHtml)
}

const GUID_SEPARATOR = String.fromCharCode(0)

/**
 * Identity of an entry: its declared id, else its link, else a hash of title and
 * date. The fallbacks are hashed and prefixed so they can never collide with a
 * real guid (spec, section 6).
 */
export function entryIdentity(options: {
  guid: string | null
  url: string | null
  title: string
  publishedAt: number
}): string {
  if (options.guid) return options.guid
  if (options.url) return `url:${sha1(options.url)}`
  return `title:${sha1(`${options.title}${GUID_SEPARATOR}${options.publishedAt}`)}`
}

function sha1(value: string): string {
  return createHash('sha1').update(value).digest('hex')
}

function rawContent(item: Loose, format: FeedFormat): string | null {
  if (format === 'json') {
    return asText(item.content_html) ?? asText(item.content_text) ?? asText(item.summary)
  }
  if (format === 'atom') {
    return asText(item.content) ?? asText(item.summary)
  }
  // RSS and RDF: content:encoded wins over description, which is often a teaser.
  return asText(asRecord(item.content)?.encoded) ?? asText(item.description)
}

function rawSummarySource(item: Loose, format: FeedFormat, contentHtml: string | null) {
  if (format === 'json' || format === 'atom') return asText(item.summary) ?? contentHtml
  return asText(item.description) ?? contentHtml
}

function entryUrl(item: Loose, format: FeedFormat): string | null {
  if (format === 'atom') return atomAlternateHref(item.links) ?? asText(item.id)
  if (format === 'json') return asText(item.url) ?? asText(item.external_url)
  return asText(item.link)
}

function entryGuid(item: Loose, format: FeedFormat): string | null {
  if (format === 'atom' || format === 'json') return asText(item.id)
  return asText(item.guid)
}

function entryAuthor(item: Loose): string | null {
  const dc = asRecord(item.dc)
  return (
    firstPersonName(item.authors) ??
    asText(dc?.creator) ??
    (Array.isArray(dc?.creators) ? (asText(dc.creators[0]) ?? null) : null) ??
    asText(item.author)
  )
}

function entryDates(item: Loose, format: FeedFormat): unknown[] {
  const dc = asRecord(item.dc)
  if (format === 'json') return [item.date_published, item.date_modified]
  if (format === 'atom') return [item.published, item.updated]
  return [item.pubDate, dc?.date, Array.isArray(dc?.dates) ? dc.dates[0] : undefined, item.updated]
}

function feedSiteUrl(feed: Loose, format: FeedFormat, feedUrl: string): string | null {
  const declared =
    format === 'atom'
      ? atomAlternateHref(feed.links)
      : format === 'json'
        ? asText(feed.home_page_url)
        : asText(feed.link)

  return absoluteUrl(declared, feedUrl) ?? new URL(feedUrl).origin
}

/** Parses feed text of any supported format and normalizes it for storage. */
export function normalizeFeed(text: string, options: NormalizeOptions): NormalizedFeed {
  const parsed = parseFeed(text)
  const format = parsed.format as FeedFormat
  const feed = parsed.feed as unknown as Loose

  const siteUrl = feedSiteUrl(feed, format, options.feedUrl)
  const items = asArray(format === 'atom' ? feed.entries : feed.items)

  const entries = items.map((raw): NormalizedEntry => {
    const item = asRecord(raw) ?? {}

    const url = absoluteUrl(entryUrl(item, format), siteUrl)
    const title = plainTitle(item.title)
    const publishedAt = resolvePublishedAt(entryDates(item, format), options.fetchedAt)
    const contentHtml = sanitizeContent(rawContent(item, format), { baseUrl: siteUrl })
    const summary = toSummary(rawSummarySource(item, format, contentHtml))

    return {
      guid: entryIdentity({ guid: entryGuid(item, format), url, title, publishedAt }),
      url,
      title,
      author: entryAuthor(item),
      summary,
      contentHtml,
      imageUrl: pickImageUrl(item, contentHtml, siteUrl),
      publishedAt,
    }
  })

  return {
    format,
    title: plainTitle(feed.title),
    siteUrl,
    description: toSummary(asText(feed.description) ?? asText(feed.subtitle)),
    language: asText(feed.language) ?? asText(asRecord(feed.dc)?.language),
    entries,
  }
}
