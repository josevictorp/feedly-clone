import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Hono } from 'hono'
import { createApp } from '../app.ts'
import { createEventBus, type EventBus } from '../events/events.ts'
import type { FetchLike } from '../feeds/fetch.ts'
import type { AppEvent } from '@feedly/shared'
import type { Logger } from '../logger.ts'
import { createScheduler, type Scheduler } from '../scheduler/scheduler.ts'
import { createTestDatabase, type TestDatabase } from './test-db.ts'

/**
 * A whole server wired against an in-memory database, a stubbed fetch and a
 * fixed clock, for the API integration tests (spec, section 11).
 */

/** Whatever the API answered; tests narrow it themselves at the assertion. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonValue = any

export interface TestApp {
  app: Hono
  db: TestDatabase['db']
  events: EventBus
  scheduler: Scheduler
  /** Every event the API and the scheduler published, in order. */
  published: AppEvent[]
  dataDir: string
  /** Advances the injected clock. */
  setNow: (value: number) => void
  close: () => void
}

/** Swallows log output; failures surface through assertions, not the console. */
const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger

export interface CreateTestAppOptions {
  fetchImpl?: FetchLike
  now?: number
}

export function createTestApp(options: CreateTestAppOptions = {}): TestApp {
  const ctx = createTestDatabase()
  const dataDir = mkdtempSync(join(tmpdir(), 'feedly-api-'))

  let now = options.now ?? Date.now()
  const published: AppEvent[] = []

  const events = createEventBus()
  events.subscribe((event) => published.push(event))

  const scheduler = createScheduler({
    db: ctx.db,
    events,
    logger: silentLogger,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    now: () => now,
  })

  const app = createApp({
    db: ctx.db,
    events,
    scheduler,
    logger: silentLogger,
    dataDir,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    now: () => now,
  })

  return {
    app,
    db: ctx.db,
    events,
    scheduler,
    published,
    dataDir,
    setNow: (value) => (now = value),
    close: () => {
      scheduler.stop()
      ctx.close()
      rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

/**
 * `app.request` with JSON headers and a parsed body, which every test wants.
 *
 * The body is typed loosely on purpose: these tests assert on the JSON the API
 * really returns, so typing it as the expected shape would hide a regression.
 */
export async function json<T = JsonValue>(
  app: Hono,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const response = await app.request(path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })

  const text = await response.text()
  return {
    status: response.status,
    body: (text === '' ? null : JSON.parse(text)) as T,
  }
}
