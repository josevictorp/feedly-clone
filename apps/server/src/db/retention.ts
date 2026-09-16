import { sql } from 'drizzle-orm'
import type { AppDatabase } from './client.ts'

/**
 * Retention (spec, section 5; grill decision G12).
 *
 * Read entries are dropped after 30 days, and each feed is capped at 1000
 * entries with the oldest read ones going first. Unread and saved entries are
 * never deleted, whatever their age.
 */

export const READ_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
export const MAX_ENTRIES_PER_FEED = 1000

export interface RetentionOptions {
  /** Injected so the job is deterministic under test. */
  now: number
  readRetentionMs?: number
  maxEntriesPerFeed?: number
}

export interface RetentionResult {
  deletedByAge: number
  deletedByCap: number
}

/**
 * Runs one retention pass. Deterministic given `now`, so a test can freeze the
 * clock instead of waiting a day.
 */
export function runRetention(db: AppDatabase, options: RetentionOptions): RetentionResult {
  const readRetentionMs = options.readRetentionMs ?? READ_RETENTION_MS
  const maxEntriesPerFeed = options.maxEntriesPerFeed ?? MAX_ENTRIES_PER_FEED
  const cutoff = options.now - readRetentionMs

  return db.transaction((tx) => {
    const byAge = tx.run(sql`
      delete from entries
      where is_read = 1
        and is_saved = 0
        and coalesce(read_at, crawled_at) < ${cutoff}
    `)

    // Rank every entry of a feed by recency, then delete only the read and
    // unsaved ones that fall past the cap, so a feed with 2000 unread keeps all.
    const byCap = tx.run(sql`
      delete from entries
      where id in (
        select id from (
          select
            id,
            is_read,
            is_saved,
            row_number() over (
              partition by feed_id order by published_at desc, id desc
            ) as rn
          from entries
        )
        where rn > ${maxEntriesPerFeed} and is_read = 1 and is_saved = 0
      )
    `)

    return { deletedByAge: byAge.changes, deletedByCap: byCap.changes }
  })
}

export const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * Schedules the retention pass to run daily, plus once right away.
 * Returns a function that stops it.
 */
export function scheduleRetention(
  db: AppDatabase,
  onResult?: (result: RetentionResult) => void,
): () => void {
  const tick = () => onResult?.(runRetention(db, { now: Date.now() }))

  tick()
  const timer = setInterval(tick, RETENTION_INTERVAL_MS)
  timer.unref()

  return () => clearInterval(timer)
}
