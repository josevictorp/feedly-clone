import type { AppDatabase } from '../db/client.ts'
import type { FeedRow } from '../db/schema.ts'
import type { EventBus } from '../events/events.ts'
import { findFeedById, findFeedsDueForFetch, updateFetchState } from '../feeds/feeds.repository.ts'
import type { FetchLike } from '../feeds/fetch.ts'
import { refreshFeed, type RefreshOutcome } from '../feeds/refresh.ts'
import { readPreferences } from '../preferences/preferences.repository.ts'
import type { Logger } from '../logger.ts'

/**
 * The background fetch scheduler (spec, section 6).
 *
 * It ticks every minute, picks up the feeds whose `next_fetch_at` has passed
 * and refreshes at most four at a time. A manual refresh jumps the queue but
 * still sends conditional headers, so "atualizar" is cheap to press.
 *
 * Time comes in through `now`, and HTTP through `fetchImpl`, so the whole thing
 * runs deterministically under test with no clock and no network.
 */

export const TICK_INTERVAL_MS = 60_000
export const DEFAULT_CONCURRENCY = 4

/** Waits between retries of a failing feed, in minutes, capped at a day. */
export const BACKOFF_MINUTES = [30, 60, 120, 240, 480, 960, 1440]

/** Delay before the next attempt after `errorCount` consecutive failures. */
export function backoffMs(errorCount: number): number {
  const index = Math.min(Math.max(errorCount, 1), BACKOFF_MINUTES.length) - 1
  return (BACKOFF_MINUTES[index] ?? 1440) * 60_000
}

export interface SchedulerOptions {
  db: AppDatabase
  events: EventBus
  logger: Logger
  fetchImpl?: FetchLike
  concurrency?: number
  /** Injected clock. */
  now?: () => number
  /** Feeds picked up per tick; a bound on how much one tick can do. */
  batchSize?: number
}

export interface Scheduler {
  /** Runs one pass over the due feeds. Resolves when the batch is done. */
  tick: () => Promise<void>
  /** Queues a feed ahead of everything else, ignoring `next_fetch_at`. */
  refreshFeeds: (feedIds: number[]) => Promise<void>
  /** Starts the periodic tick, after one immediate pass over overdue feeds. */
  start: () => void
  stop: () => void
  /** Feeds currently being fetched; used to avoid fetching one twice at once. */
  inFlight: () => number
}

/** Runs `worker` over `items`, at most `limit` at a time. */
async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++]
      if (item !== undefined) await worker(item)
    }
  })

  await Promise.all(runners)
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const { db, events, logger } = options
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const batchSize = options.batchSize ?? 50
  const now = options.now ?? (() => Date.now())

  const running = new Set<number>()
  let timer: NodeJS.Timeout | null = null

  /** Schedules the next attempt and records the outcome of this one. */
  function applyOutcome(feed: FeedRow, outcome: RefreshOutcome, startedAt: number): void {
    const at = now()

    if (outcome.status === 'error') {
      const errorCount = feed.errorCount + 1
      updateFetchState(db, feed.id, {
        lastFetchedAt: at,
        nextFetchAt: at + backoffMs(errorCount),
        errorCount,
        lastError: outcome.message,
      })

      logger.warn(
        { feedId: feed.id, url: feed.feedUrl, ms: at - startedAt, error: outcome.message },
        'feed fetch failed',
      )
      events.emit({ type: 'feed.error', feedId: feed.id, message: outcome.message })
      return
    }

    const intervalMs = readPreferences(db).fetchIntervalMin * 60_000
    updateFetchState(db, feed.id, {
      lastFetchedAt: at,
      nextFetchAt: at + intervalMs,
      errorCount: 0,
      lastError: null,
    })

    const newEntries = outcome.status === 'updated' ? outcome.newEntries : 0

    logger.info(
      {
        feedId: feed.id,
        url: feed.feedUrl,
        status: outcome.status,
        ms: at - startedAt,
        newEntries,
      },
      'feed fetched',
    )

    if (outcome.status === 'updated' && newEntries > 0) {
      events.emit({ type: 'feed.updated', feedId: feed.id, newEntries })
      events.emit({ type: 'counts.changed' })
    }
  }

  async function processFeed(feed: FeedRow, ignoreValidators: boolean): Promise<void> {
    if (running.has(feed.id)) return
    running.add(feed.id)

    const startedAt = now()
    try {
      const outcome = await refreshFeed(db, feed, {
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        now: startedAt,
        ignoreValidators,
      })
      applyOutcome(feed, outcome, startedAt)
    } catch (error) {
      // refreshFeed is meant never to throw; if it ever does, one feed must
      // still not be able to stop the scheduler (RNF-03).
      logger.error({ feedId: feed.id, err: error }, 'unexpected scheduler failure')
      applyOutcome(
        feed,
        { status: 'error', message: 'falha inesperada', httpStatus: null },
        startedAt,
      )
    } finally {
      running.delete(feed.id)
    }
  }

  async function runBatch(feeds: FeedRow[], ignoreValidators: boolean): Promise<void> {
    const pending = feeds.filter((feed) => !running.has(feed.id))
    if (pending.length === 0) return

    await mapWithConcurrency(pending, concurrency, (feed) => processFeed(feed, ignoreValidators))
  }

  return {
    async tick() {
      await runBatch(findFeedsDueForFetch(db, now(), batchSize), false)
    },

    async refreshFeeds(feedIds) {
      const feeds = feedIds
        .map((id) => findFeedById(db, id))
        .filter((feed): feed is FeedRow => feed !== undefined)

      await runBatch(feeds, false)
    },

    start() {
      if (timer) return

      // Feeds already overdue are fetched at boot, not one tick later.
      void this.tick()

      timer = setInterval(() => void this.tick(), TICK_INTERVAL_MS)
      timer.unref()
    },

    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },

    inFlight: () => running.size,
  }
}
