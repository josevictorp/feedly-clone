import type { EntryDetail, EntrySummary } from '@feedly/shared'
import type { EntryRow } from '../db/schema.ts'
import type { StreamEntry } from '../entries/entries.repository.ts'

/**
 * Database rows to API payloads.
 *
 * Kept apart from the routes so every route answers with the same shape, and so
 * `content_html` — by far the biggest column — only ever leaves the server on
 * the single-entry route.
 */

export function toEntrySummary(row: StreamEntry): EntrySummary {
  const { entry, feed } = row

  return {
    id: entry.id,
    feedId: entry.feedId,
    url: entry.url,
    title: entry.title,
    author: entry.author,
    summary: entry.summary,
    imageUrl: entry.imageUrl,
    publishedAt: entry.publishedAt,
    isRead: entry.isRead,
    readAt: entry.readAt,
    isSaved: entry.isSaved,
    savedAt: entry.savedAt,
    feed,
  }
}

export function toEntryDetail(
  entry: EntryRow,
  feed: EntrySummary['feed'],
): EntryDetail {
  return {
    ...toEntrySummary({ entry, feed }),
    contentHtml: entry.contentHtml,
  }
}
