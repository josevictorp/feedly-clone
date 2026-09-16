import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { AppDatabase, DbOrTx } from '../db/client.ts'
import { entries, feedCategories, feeds, type FeedRow } from '../db/schema.ts'

export interface CreateFeedInput {
  feedUrl: string
  title: string
  siteUrl?: string | null
  originalTitle?: string | null
  description?: string | null
  language?: string | null
  categoryIds?: number[]
  now?: number
}

export interface UpdateFeedInput {
  title?: string
  siteUrl?: string | null
  originalTitle?: string | null
  description?: string | null
  iconPath?: string | null
  language?: string | null
  isFavorite?: boolean
  sortOrder?: number
}

/** Bookkeeping the scheduler writes after each fetch attempt (M3 uses it). */
export interface FetchStateInput {
  etag?: string | null
  lastModified?: string | null
  lastFetchedAt?: number
  nextFetchAt?: number
  errorCount?: number
  lastError?: string | null
}

export function listFeeds(db: AppDatabase): FeedRow[] {
  return db.select().from(feeds).orderBy(asc(feeds.sortOrder), asc(feeds.id)).all()
}

export function findFeedById(db: AppDatabase, id: number): FeedRow | undefined {
  return db.select().from(feeds).where(eq(feeds.id, id)).get()
}

export function findFeedByUrl(db: AppDatabase, feedUrl: string): FeedRow | undefined {
  return db.select().from(feeds).where(eq(feeds.feedUrl, feedUrl)).get()
}

export function createFeed(db: AppDatabase, input: CreateFeedInput): FeedRow {
  const now = input.now ?? Date.now()

  return db.transaction((tx) => {
    const sortOrder =
      tx.select({ value: sql<number>`coalesce(max(${feeds.sortOrder}), -1) + 1` }).from(feeds).get()
        ?.value ?? 0

    const feed = tx
      .insert(feeds)
      .values({
        feedUrl: input.feedUrl,
        title: input.title,
        siteUrl: input.siteUrl ?? null,
        originalTitle: input.originalTitle ?? input.title,
        description: input.description ?? null,
        language: input.language ?? null,
        sortOrder,
        createdAt: now,
        // Due immediately: the scheduler fetches a newly followed feed at once.
        nextFetchAt: now,
      })
      .returning()
      .get()

    setFeedCategoriesIn(tx, feed.id, input.categoryIds ?? [])
    return feed
  })
}

export function updateFeed(
  db: AppDatabase,
  id: number,
  patch: UpdateFeedInput,
): FeedRow | undefined {
  if (Object.keys(patch).length === 0) return findFeedById(db, id)
  return db.update(feeds).set(patch).where(eq(feeds.id, id)).returning().get()
}

export function updateFetchState(
  db: AppDatabase,
  id: number,
  state: FetchStateInput,
): FeedRow | undefined {
  if (Object.keys(state).length === 0) return findFeedById(db, id)
  return db.update(feeds).set(state).where(eq(feeds.id, id)).returning().get()
}

/** Unfollowing a feed deletes its entries too (spec, section 5). */
export function deleteFeed(db: AppDatabase, id: number): boolean {
  return db.transaction((tx) => {
    tx.delete(entries).where(eq(entries.feedId, id)).run()
    tx.delete(feedCategories).where(eq(feedCategories.feedId, id)).run()
    return tx.delete(feeds).where(eq(feeds.id, id)).returning().all().length > 0
  })
}

export function getFeedCategoryIds(db: AppDatabase, feedId: number): number[] {
  return db
    .select({ categoryId: feedCategories.categoryId })
    .from(feedCategories)
    .where(eq(feedCategories.feedId, feedId))
    .orderBy(asc(feedCategories.sortOrder), asc(feedCategories.categoryId))
    .all()
    .map((row) => row.categoryId)
}

function setFeedCategoriesIn(db: DbOrTx, feedId: number, categoryIds: number[]): void {
  db.delete(feedCategories).where(eq(feedCategories.feedId, feedId)).run()
  if (categoryIds.length === 0) return

  const unique = [...new Set(categoryIds)]
  db.insert(feedCategories)
    .values(unique.map((categoryId, index) => ({ feedId, categoryId, sortOrder: index })))
    .run()
}

/** Replaces the folders of a feed. A feed may belong to several (RF-02). */
export function setFeedCategories(db: AppDatabase, feedId: number, categoryIds: number[]): number[] {
  db.transaction((tx) => setFeedCategoriesIn(tx, feedId, categoryIds))
  return getFeedCategoryIds(db, feedId)
}

/** Feeds whose `next_fetch_at` is due; the scheduler's work queue (M3). */
export function findFeedsDueForFetch(db: AppDatabase, now: number, limit = 50): FeedRow[] {
  return db
    .select()
    .from(feeds)
    .where(and(sql`${feeds.nextFetchAt} is not null`, sql`${feeds.nextFetchAt} <= ${now}`))
    .orderBy(asc(feeds.nextFetchAt), asc(feeds.id))
    .limit(limit)
    .all()
}

export function findFeedsByIds(db: AppDatabase, ids: number[]): FeedRow[] {
  if (ids.length === 0) return []
  return db.select().from(feeds).where(inArray(feeds.id, ids)).all()
}
