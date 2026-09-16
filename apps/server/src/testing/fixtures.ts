import type { AppDatabase } from '../db/client.ts'
import { entries, type EntryRow } from '../db/schema.ts'
import { createCategory } from '../categories/categories.repository.ts'
import { createFeed } from '../feeds/feeds.repository.ts'

/** A fixed clock, so every test timestamp is readable and stable. */
export const NOW = Date.parse('2026-09-16T12:00:00.000Z')
export const DAY_MS = 24 * 60 * 60 * 1000

export function makeCategory(db: AppDatabase, label: string) {
  return createCategory(db, { label, now: NOW })
}

export function makeFeed(
  db: AppDatabase,
  title: string,
  options: { categoryIds?: number[]; feedUrl?: string } = {},
) {
  return createFeed(db, {
    feedUrl: options.feedUrl ?? `https://example.test/${title.toLowerCase()}.xml`,
    title,
    siteUrl: `https://example.test/${title.toLowerCase()}`,
    categoryIds: options.categoryIds ?? [],
    now: NOW,
  })
}

export interface MakeEntryOptions {
  guid?: string
  title?: string
  publishedAt?: number
  isRead?: boolean
  readAt?: number | null
  isSaved?: boolean
  savedAt?: number | null
  crawledAt?: number
}

let guidCounter = 0

export function makeEntry(
  db: AppDatabase,
  feedId: number,
  options: MakeEntryOptions = {},
): EntryRow {
  guidCounter += 1
  const publishedAt = options.publishedAt ?? NOW
  const isRead = options.isRead ?? false
  const isSaved = options.isSaved ?? false

  return db
    .insert(entries)
    .values({
      feedId,
      guid: options.guid ?? `guid-${guidCounter}`,
      url: `https://example.test/post/${guidCounter}`,
      title: options.title ?? `Entry ${guidCounter}`,
      publishedAt,
      crawledAt: options.crawledAt ?? publishedAt,
      isRead,
      readAt: options.readAt !== undefined ? options.readAt : isRead ? publishedAt : null,
      isSaved,
      savedAt: options.savedAt !== undefined ? options.savedAt : isSaved ? publishedAt : null,
    })
    .returning()
    .get()
}
