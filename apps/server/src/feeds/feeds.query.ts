import { sql } from 'drizzle-orm'
import type { Feed } from '@feedly/shared'
import type { AppDatabase } from '../db/client.ts'

/**
 * The feed list the API serves, with unread counts and folder membership.
 *
 * One statement, like the sidebar: `GET /api/feeds` is also called with two
 * hundred feeds behind it (RNF-02).
 */

interface FeedListRow {
  id: number
  feed_url: string
  site_url: string | null
  title: string
  icon_path: string | null
  is_favorite: number
  error_count: number
  last_error: string | null
  last_fetched_at: number | null
  unread_count: number
  /** Comma-separated ids, which is how SQLite aggregates them. */
  category_ids: string | null
}

const FEEDS_SQL = sql`
  select
    f.id, f.feed_url, f.site_url, f.title, f.icon_path, f.is_favorite,
    f.error_count, f.last_error, f.last_fetched_at,
    coalesce(u.unread_count, 0) as unread_count,
    (
      select group_concat(fc.category_id)
      from feed_categories fc
      where fc.feed_id = f.id
      order by fc.sort_order, fc.category_id
    ) as category_ids
  from feeds f
  left join (
    select feed_id, count(*) as unread_count from entries where is_read = 0 group by feed_id
  ) u on u.feed_id = f.id
  order by f.sort_order, f.id
`

function parseIds(value: string | null): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => Number(part))
    .filter((id) => Number.isInteger(id))
}

export function listFeedsWithCounts(db: AppDatabase): Feed[] {
  return db.all<FeedListRow>(FEEDS_SQL).map((row) => ({
    id: row.id,
    feedUrl: row.feed_url,
    siteUrl: row.site_url,
    title: row.title,
    iconPath: row.icon_path,
    isFavorite: row.is_favorite === 1,
    unreadCount: row.unread_count,
    categoryIds: parseIds(row.category_ids),
    errorCount: row.error_count,
    lastError: row.last_error,
    lastFetchedAt: row.last_fetched_at,
  }))
}
