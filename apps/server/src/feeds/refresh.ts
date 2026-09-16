import type { AppDatabase } from '../db/client.ts'
import type { NewEntryRow, FeedRow } from '../db/schema.ts'
import { upsertEntries } from '../entries/entries.repository.ts'
import { updateFeed, updateFetchState } from './feeds.repository.ts'
import { fetchFeed, type FetchLike } from './fetch.ts'
import { normalizeFeed } from './normalize.ts'

/**
 * One fetch-and-store cycle for a single feed: the step the scheduler (M3)
 * repeats for every feed that comes due.
 *
 * It owns the whole round trip — HTTP, decoding, parsing, sanitizing, writing —
 * and reports what happened rather than throwing, so one broken feed can never
 * stop the others (RNF-03).
 */

export type RefreshOutcome =
  | { status: 'updated'; newEntries: number; totalEntries: number }
  | { status: 'not-modified' }
  | { status: 'error'; message: string; httpStatus: number | null }

export interface RefreshFeedOptions {
  fetchImpl?: FetchLike
  timeoutMs?: number
  /** Injected clock, so scheduler tests stay deterministic. */
  now?: number
  /** Skip the conditional headers, as a manual refresh may want to. */
  ignoreValidators?: boolean
}

/**
 * Whether the feed's own metadata should be refreshed from the document.
 *
 * The user's rename of a feed always wins, so `title` is only overwritten while
 * it still matches the title the feed itself announced (RF-03).
 */
function feedMetadataPatch(
  feed: FeedRow,
  parsed: { title: string; siteUrl: string | null; description: string | null; language: string | null },
) {
  const patch: Parameters<typeof updateFeed>[2] = {}

  const wasRenamed = feed.originalTitle !== null && feed.title !== feed.originalTitle
  if (!wasRenamed && parsed.title && parsed.title !== feed.title) patch.title = parsed.title
  if (parsed.title && parsed.title !== feed.originalTitle) patch.originalTitle = parsed.title
  if (parsed.siteUrl && parsed.siteUrl !== feed.siteUrl) patch.siteUrl = parsed.siteUrl
  if (parsed.description !== feed.description) patch.description = parsed.description
  if (parsed.language && parsed.language !== feed.language) patch.language = parsed.language

  return patch
}

/**
 * Fetches a feed and stores what came back.
 *
 * Does not decide when to run again — that is the scheduler's job — but does
 * record the validators and the error state a scheduler needs.
 */
export async function refreshFeed(
  db: AppDatabase,
  feed: FeedRow,
  options: RefreshFeedOptions = {},
): Promise<RefreshOutcome> {
  const now = options.now ?? Date.now()

  const fetched = await fetchFeed(feed.feedUrl, {
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.ignoreValidators ? {} : { etag: feed.etag, lastModified: feed.lastModified }),
  })

  if (fetched.status === 'not-modified') return { status: 'not-modified' }

  if (fetched.status === 'error') {
    return { status: 'error', message: fetched.message, httpStatus: fetched.httpStatus }
  }

  let parsed
  try {
    parsed = normalizeFeed(fetched.text, { feedUrl: feed.feedUrl, fetchedAt: now })
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'feed ilegível',
      httpStatus: null,
    }
  }

  const rows: NewEntryRow[] = parsed.entries.map((entry) => ({
    feedId: feed.id,
    guid: entry.guid,
    url: entry.url,
    title: entry.title,
    author: entry.author,
    summary: entry.summary,
    contentHtml: entry.contentHtml,
    imageUrl: entry.imageUrl,
    publishedAt: entry.publishedAt,
    crawledAt: now,
  }))

  const { inserted } = upsertEntries(db, rows)

  const patch = feedMetadataPatch(feed, parsed)
  if (Object.keys(patch).length > 0) updateFeed(db, feed.id, patch)

  updateFetchState(db, feed.id, { etag: fetched.etag, lastModified: fetched.lastModified })

  return { status: 'updated', newEntries: inserted, totalEntries: rows.length }
}
