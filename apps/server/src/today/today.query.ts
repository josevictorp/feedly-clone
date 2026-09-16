import { sql } from 'drizzle-orm'
import type { EntrySummary, TodayGroup } from '@feedly/shared'
import type { AppDatabase } from '../db/client.ts'

/**
 * The Today page (RF-28, grill decision G18).
 *
 * Feedly's "Eu" tab shows the most recent unread articles of each folder, in
 * sidebar order. A feed that sits in two folders shows up under both, as it
 * does in Feedly.
 */

export const TODAY_ENTRIES_PER_GROUP = 10

/** Label for the group of feeds that belong to no folder. */
export const UNCATEGORIZED_LABEL = 'Sem pasta'

interface TodayRow {
  category_id: number | null
  category_label: string | null
  category_sort_order: number | null
  entry_id: number
  feed_id: number
  url: string | null
  title: string
  author: string | null
  summary: string | null
  image_url: string | null
  published_at: number
  is_read: number
  read_at: number | null
  is_saved: number
  saved_at: number | null
  feed_title: string
  feed_icon_path: string | null
  feed_site_url: string | null
  unread_count: number
}

/**
 * Ranks unread entries inside each folder and keeps the top N.
 *
 * `category_id` is null for the uncategorized group; `coalesce(..., -1)` gives
 * that group a partition key of its own.
 */
const TODAY_SQL = sql`
  with membership as (
    select e.id as entry_id, fc.category_id
    from entries e
    join feed_categories fc on fc.feed_id = e.feed_id
    where e.is_read = 0

    union all

    select e.id as entry_id, null as category_id
    from entries e
    where e.is_read = 0
      and not exists (select 1 from feed_categories fc where fc.feed_id = e.feed_id)
  ),
  ranked as (
    select
      m.entry_id,
      m.category_id,
      count(*) over (partition by coalesce(m.category_id, -1)) as unread_count,
      row_number() over (
        partition by coalesce(m.category_id, -1)
        order by e.published_at desc, e.id desc
      ) as rn
    from membership m
    join entries e on e.id = m.entry_id
  )
  select
    r.category_id,
    c.label       as category_label,
    c.sort_order  as category_sort_order,
    e.id          as entry_id,
    e.feed_id, e.url, e.title, e.author, e.summary, e.image_url,
    e.published_at, e.is_read, e.read_at, e.is_saved, e.saved_at,
    f.title       as feed_title,
    f.icon_path   as feed_icon_path,
    f.site_url    as feed_site_url,
    r.unread_count
  from ranked r
  join entries e   on e.id = r.entry_id
  join feeds f     on f.id = e.feed_id
  left join categories c on c.id = r.category_id
  where r.rn <= ${TODAY_ENTRIES_PER_GROUP}
  order by c.sort_order, r.category_id, e.published_at desc, e.id desc
`

function toEntrySummary(row: TodayRow): EntrySummary {
  return {
    id: row.entry_id,
    feedId: row.feed_id,
    url: row.url,
    title: row.title,
    author: row.author,
    summary: row.summary,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    isRead: row.is_read === 1,
    readAt: row.read_at,
    isSaved: row.is_saved === 1,
    savedAt: row.saved_at,
    feed: {
      id: row.feed_id,
      title: row.feed_title,
      iconPath: row.feed_icon_path,
      siteUrl: row.feed_site_url,
    },
  }
}

export function getTodayGroups(db: AppDatabase): TodayGroup[] {
  const rows = db.all<TodayRow>(TODAY_SQL)

  const groups = new Map<number, TodayGroup>()

  for (const row of rows) {
    const key = row.category_id ?? -1

    let group = groups.get(key)
    if (!group) {
      group = {
        categoryId: row.category_id,
        label: row.category_label ?? UNCATEGORIZED_LABEL,
        unreadCount: row.unread_count,
        entries: [],
      }
      groups.set(key, group)
    }

    group.entries.push(toEntrySummary(row))
  }

  // The uncategorized group goes last, as it does in the sidebar.
  return [...groups.values()].sort((a, b) => {
    if (a.categoryId === null) return 1
    if (b.categoryId === null) return -1
    return 0
  })
}
