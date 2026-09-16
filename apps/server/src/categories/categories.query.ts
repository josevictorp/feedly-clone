import { sql } from 'drizzle-orm'
import type { Category } from '@feedly/shared'
import type { AppDatabase } from '../db/client.ts'

/** Folders with their unread counts and feed ids, in one statement. */

interface CategoryListRow {
  id: number
  label: string
  sort_order: number
  is_collapsed: number
  unread_count: number
  feed_ids: string | null
}

const CATEGORIES_SQL = sql`
  select
    c.id, c.label, c.sort_order, c.is_collapsed,
    coalesce((
      select count(*)
      from entries e
      join feed_categories fc on fc.feed_id = e.feed_id
      where fc.category_id = c.id and e.is_read = 0
    ), 0) as unread_count,
    (
      select group_concat(fc.feed_id)
      from feed_categories fc
      where fc.category_id = c.id
      order by fc.sort_order, fc.feed_id
    ) as feed_ids
  from categories c
  order by c.sort_order, c.id
`

export function listCategoriesWithCounts(db: AppDatabase): Category[] {
  return db.all<CategoryListRow>(CATEGORIES_SQL).map((row) => ({
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
    isCollapsed: row.is_collapsed === 1,
    unreadCount: row.unread_count,
    feedIds: row.feed_ids
      ? row.feed_ids
          .split(',')
          .map(Number)
          .filter((id) => Number.isInteger(id))
      : [],
  }))
}
