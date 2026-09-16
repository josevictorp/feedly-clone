import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Database schema — see the spec, section 5.
 *
 * Timestamps are integers holding milliseconds since the Unix epoch, UTC.
 * Unread counts are never stored: they are always derived by query.
 */

export const feeds = sqliteTable('feeds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  feedUrl: text('feed_url').notNull().unique(),
  siteUrl: text('site_url'),
  /** Editable by the user; falls back to `originalTitle` when never renamed. */
  title: text('title').notNull(),
  /** Title as announced by the feed itself. */
  originalTitle: text('original_title'),
  description: text('description'),
  /** Path of the cached favicon, relative to the data directory. */
  iconPath: text('icon_path'),
  language: text('language'),
  /** Conditional GET validators from the last successful fetch. */
  etag: text('etag'),
  lastModified: text('last_modified'),
  lastFetchedAt: integer('last_fetched_at'),
  nextFetchAt: integer('next_fetch_at'),
  /** Consecutive failures; drives the backoff in the scheduler. */
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isCollapsed: integer('is_collapsed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
})

/** A feed may sit in more than one folder, as in Feedly. */
export const feedCategories = sqliteTable(
  'feed_categories',
  {
    feedId: integer('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    /** Position of the feed inside this folder. */
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.feedId, table.categoryId] })],
)

export const entries = sqliteTable(
  'entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    feedId: integer('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    /** Stable identity inside the feed: guid, else a hash. Deduped per feed. */
    guid: text('guid').notNull(),
    url: text('url'),
    title: text('title').notNull(),
    author: text('author'),
    /** Plain text, capped at 400 characters. */
    summary: text('summary'),
    /** Sanitized on the server; never raw feed HTML. */
    contentHtml: text('content_html'),
    imageUrl: text('image_url'),
    publishedAt: integer('published_at').notNull(),
    crawledAt: integer('crawled_at').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: integer('read_at'),
    isSaved: integer('is_saved', { mode: 'boolean' }).notNull().default(false),
    savedAt: integer('saved_at'),
    /** Popularity. Always null in slice 1; sorting by it is disabled in the UI. */
    engagement: integer('engagement'),
  },
  (table) => [
    uniqueIndex('entries_feed_id_guid_unique').on(table.feedId, table.guid),
    index('entries_feed_id_is_read_idx').on(table.feedId, table.isRead),
    index('entries_published_at_idx').on(table.publishedAt),
    index('entries_is_saved_saved_at_idx').on(table.isSaved, table.savedAt),
    index('entries_read_at_idx').on(table.readAt),
  ],
)

/**
 * Per-stream overrides of the global preferences. A null column means
 * "inherit the global value".
 *
 * `stream_id` is `all`, `category:<id>`, `feed:<id>`, `saved` or `read`.
 */
export const streamSettings = sqliteTable('stream_settings', {
  streamId: text('stream_id').primaryKey(),
  viewMode: text('view_mode'),
  sort: text('sort'),
  hideRead: integer('hide_read', { mode: 'boolean' }),
})

/** Global preferences. `value` holds JSON so every preference type fits. */
export const preferences = sqliteTable('preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type FeedRow = typeof feeds.$inferSelect
export type NewFeedRow = typeof feeds.$inferInsert
export type CategoryRow = typeof categories.$inferSelect
export type NewCategoryRow = typeof categories.$inferInsert
export type EntryRow = typeof entries.$inferSelect
export type NewEntryRow = typeof entries.$inferInsert
export type StreamSettingsRow = typeof streamSettings.$inferSelect
