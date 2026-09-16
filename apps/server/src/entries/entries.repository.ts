import { and, asc, desc, eq, gt, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.ts'
import { entries, feeds, type EntryRow, type NewEntryRow } from '../db/schema.ts'
import type { StreamRef } from '../streams/stream-id.ts'

/** How long an entry stays in the "recently read" stream (spec, section 5). */
export const RECENTLY_READ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type StreamSort = 'newest' | 'oldest'

export interface StreamQuery {
  stream: StreamRef
  sort?: StreamSort
  unreadOnly?: boolean
  /** Opaque cursor from a previous page. */
  cursor?: string | null
  limit?: number
  /** Injected so tests and the "recently read" window use a fixed clock. */
  now?: number
}

/** An entry as a stream returns it, with the feed it came from embedded. */
export interface StreamEntry {
  entry: EntryRow
  feed: { id: number; title: string; iconPath: string | null; siteUrl: string | null }
}

export interface StreamPage {
  entries: StreamEntry[]
  /** Null when the last page was reached. */
  nextCursor: string | null
}

/**
 * Column a stream is ordered and paginated by.
 *
 * "Ler depois" is ordered by when it was saved and "Lidos recentemente" by when
 * it was read; everything else by publication date (spec, section 5).
 */
function orderColumn(stream: StreamRef) {
  if (stream.kind === 'saved') return entries.savedAt
  if (stream.kind === 'read') return entries.readAt
  return entries.publishedAt
}

function encodeCursor(orderValue: number, id: number): string {
  return `${orderValue}:${id}`
}

function decodeCursor(cursor: string): { orderValue: number; id: number } | null {
  const match = /^(-?\d+):(\d+)$/.exec(cursor)
  if (!match?.[1] || !match[2]) return null
  return { orderValue: Number(match[1]), id: Number(match[2]) }
}

function streamFilter(stream: StreamRef, now: number): SQL | undefined {
  switch (stream.kind) {
    case 'all':
      return undefined
    case 'feed':
      return eq(entries.feedId, stream.feedId)
    case 'category':
      return sql`${entries.feedId} in (
        select feed_id from feed_categories where category_id = ${stream.categoryId}
      )`
    case 'saved':
      return eq(entries.isSaved, true)
    case 'read':
      return and(eq(entries.isRead, true), gt(entries.readAt, now - RECENTLY_READ_WINDOW_MS))
  }
}

/**
 * One page of a stream, paginated by a `(orderValue, id)` cursor rather than an
 * offset, so pages stay stable while the scheduler inserts new entries.
 */
export function getStreamEntries(db: AppDatabase, query: StreamQuery): StreamPage {
  const { stream } = query
  const sort: StreamSort = query.sort ?? 'newest'
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200)
  const now = query.now ?? Date.now()
  const column = orderColumn(stream)

  const conditions: (SQL | undefined)[] = [streamFilter(stream, now)]

  // "Recently read" is by definition read; filtering it by unread empties it.
  if (query.unreadOnly && stream.kind !== 'read') {
    conditions.push(eq(entries.isRead, false))
  }

  if (query.cursor) {
    const decoded = decodeCursor(query.cursor)
    if (!decoded) throw new Error(`invalid cursor: ${query.cursor}`)
    const { orderValue, id } = decoded
    conditions.push(
      sort === 'newest'
        ? or(lt(column, orderValue), and(eq(column, orderValue), lt(entries.id, id)))
        : or(gt(column, orderValue), and(eq(column, orderValue), gt(entries.id, id))),
    )
  }

  const order = sort === 'newest' ? [desc(column), desc(entries.id)] : [asc(column), asc(entries.id)]

  const rows = db
    .select({
      entry: entries,
      feed: {
        id: feeds.id,
        title: feeds.title,
        iconPath: feeds.iconPath,
        siteUrl: feeds.siteUrl,
      },
    })
    .from(entries)
    .innerJoin(feeds, eq(feeds.id, entries.feedId))
    .where(and(...conditions.filter((c): c is SQL => c !== undefined)))
    .orderBy(...order)
    // One extra row tells us whether another page exists, without a count query.
    .limit(limit + 1)
    .all()

  const page = rows.slice(0, limit)
  const last = page.at(-1)
  const hasMore = rows.length > limit

  return {
    entries: page,
    nextCursor:
      hasMore && last
        ? encodeCursor(Number(last.entry[columnName(stream)] ?? 0), last.entry.id)
        : null,
  }
}

function columnName(stream: StreamRef): 'savedAt' | 'readAt' | 'publishedAt' {
  if (stream.kind === 'saved') return 'savedAt'
  if (stream.kind === 'read') return 'readAt'
  return 'publishedAt'
}

export function findEntryById(db: AppDatabase, id: number): EntryRow | undefined {
  return db.select().from(entries).where(eq(entries.id, id)).get()
}

/**
 * Inserts new entries and refreshes the content of the ones already there.
 *
 * Dedupe is per feed, by `guid`. An update must never touch `is_read`,
 * `is_saved` or their timestamps: a post edited upstream does not come back
 * as unread (spec, section 6).
 */
export function upsertEntries(db: AppDatabase, rows: NewEntryRow[]): { inserted: number } {
  if (rows.length === 0) return { inserted: 0 }

  return db.transaction((tx) => {
    const before = tx.select({ value: sql<number>`count(*)` }).from(entries).get()?.value ?? 0

    for (const row of rows) {
      tx.insert(entries)
        .values(row)
        .onConflictDoUpdate({
          target: [entries.feedId, entries.guid],
          set: {
            url: sql`excluded.url`,
            title: sql`excluded.title`,
            author: sql`excluded.author`,
            summary: sql`excluded.summary`,
            contentHtml: sql`excluded.content_html`,
            imageUrl: sql`excluded.image_url`,
            publishedAt: sql`excluded.published_at`,
          },
        })
        .run()
    }

    const after = tx.select({ value: sql<number>`count(*)` }).from(entries).get()?.value ?? 0
    return { inserted: after - before }
  })
}

export function setEntriesRead(
  db: AppDatabase,
  ids: number[],
  read: boolean,
  now = Date.now(),
): number {
  if (ids.length === 0) return 0
  return db
    .update(entries)
    .set({ isRead: read, readAt: read ? now : null })
    .where(inArray(entries.id, ids))
    .returning({ id: entries.id })
    .all().length
}

export function setEntriesSaved(
  db: AppDatabase,
  ids: number[],
  saved: boolean,
  now = Date.now(),
): number {
  if (ids.length === 0) return 0
  return db
    .update(entries)
    .set({ isSaved: saved, savedAt: saved ? now : null })
    .where(inArray(entries.id, ids))
    .returning({ id: entries.id })
    .all().length
}

export interface MarkStreamReadOptions {
  /** Only mark entries published before this timestamp (the "older than" menu). */
  olderThan?: number
  now?: number
}

/** Marks a whole stream as read, as the header's "mark all" action does. */
export function markStreamRead(
  db: AppDatabase,
  stream: StreamRef,
  options: MarkStreamReadOptions = {},
): number {
  const now = options.now ?? Date.now()
  const conditions: (SQL | undefined)[] = [streamFilter(stream, now), eq(entries.isRead, false)]
  if (options.olderThan !== undefined) {
    conditions.push(lt(entries.publishedAt, options.olderThan))
  }

  return db
    .update(entries)
    .set({ isRead: true, readAt: now })
    .where(and(...conditions.filter((c): c is SQL => c !== undefined)))
    .returning({ id: entries.id })
    .all().length
}
