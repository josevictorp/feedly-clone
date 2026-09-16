import { sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.ts'

/**
 * The whole sidebar in one round trip.
 *
 * RNF-02 asks for a single query for a sidebar with 200 feeds, so this is raw
 * SQL rather than a per-folder loop: one statement returns every folder, every
 * feed and its unread count, and the tree is assembled in memory.
 */

export interface SidebarFeed {
  id: number
  title: string
  iconPath: string | null
  siteUrl: string | null
  isFavorite: boolean
  unreadCount: number
  /** Set when the last fetch failed; the sidebar shows an alert icon (RF-09). */
  errorCount: number
  lastError: string | null
}

export interface SidebarCategory {
  id: number
  label: string
  isCollapsed: boolean
  unreadCount: number
  feeds: SidebarFeed[]
}

export interface Sidebar {
  categories: SidebarCategory[]
  /** Feeds that belong to no folder; Feedly lists them after the folders. */
  uncategorized: SidebarFeed[]
  totalUnread: number
}

interface SidebarRow {
  category_id: number | null
  category_label: string | null
  category_sort_order: number | null
  category_is_collapsed: number | null
  feed_id: number | null
  feed_title: string | null
  feed_icon_path: string | null
  feed_site_url: string | null
  feed_is_favorite: number | null
  feed_error_count: number | null
  feed_last_error: string | null
  feed_sort_order: number | null
  unread_count: number
}

const SIDEBAR_SQL = sql`
  with unread as (
    select feed_id, count(*) as unread_count
    from entries
    where is_read = 0
    group by feed_id
  )
  select
    c.id                        as category_id,
    c.label                     as category_label,
    c.sort_order                as category_sort_order,
    c.is_collapsed              as category_is_collapsed,
    f.id                        as feed_id,
    f.title                     as feed_title,
    f.icon_path                 as feed_icon_path,
    f.site_url                  as feed_site_url,
    f.is_favorite               as feed_is_favorite,
    f.error_count               as feed_error_count,
    f.last_error                as feed_last_error,
    fc.sort_order               as feed_sort_order,
    coalesce(u.unread_count, 0) as unread_count
  from categories c
  left join feed_categories fc on fc.category_id = c.id
  left join feeds f            on f.id = fc.feed_id
  left join unread u           on u.feed_id = f.id

  union all

  select
    null, null, null, null,
    f.id, f.title, f.icon_path, f.site_url, f.is_favorite, f.error_count, f.last_error,
    f.sort_order,
    coalesce(u.unread_count, 0)
  from feeds f
  left join unread u on u.feed_id = f.id
  where not exists (select 1 from feed_categories fc where fc.feed_id = f.id)

  order by category_sort_order, category_id, feed_sort_order, feed_id
`

function toSidebarFeed(row: SidebarRow): SidebarFeed {
  return {
    id: row.feed_id as number,
    title: row.feed_title ?? '',
    iconPath: row.feed_icon_path,
    siteUrl: row.feed_site_url,
    isFavorite: row.feed_is_favorite === 1,
    unreadCount: row.unread_count,
    errorCount: row.feed_error_count ?? 0,
    lastError: row.feed_last_error,
  }
}

export function getSidebar(db: AppDatabase): Sidebar {
  const rows = db.all<SidebarRow>(SIDEBAR_SQL)

  const categories = new Map<number, SidebarCategory>()
  const uncategorized: SidebarFeed[] = []
  // A feed can sit in two folders, so unread totals are summed over feed ids.
  const unreadByFeed = new Map<number, number>()

  for (const row of rows) {
    if (row.feed_id !== null) {
      unreadByFeed.set(row.feed_id, row.unread_count)
    }

    if (row.category_id === null) {
      if (row.feed_id !== null) uncategorized.push(toSidebarFeed(row))
      continue
    }

    let category = categories.get(row.category_id)
    if (!category) {
      category = {
        id: row.category_id,
        label: row.category_label ?? '',
        isCollapsed: row.category_is_collapsed === 1,
        unreadCount: 0,
        feeds: [],
      }
      categories.set(row.category_id, category)
    }

    if (row.feed_id !== null) {
      category.feeds.push(toSidebarFeed(row))
      category.unreadCount += row.unread_count
    }
  }

  let totalUnread = 0
  for (const count of unreadByFeed.values()) totalUnread += count

  return {
    categories: [...categories.values()],
    uncategorized,
    totalUnread,
  }
}
