import type { Context } from 'hono'
import type { AppDatabase } from '../db/client.ts'
import type { EventBus } from '../events/events.ts'
import type { FetchLike } from '../feeds/fetch.ts'
import type { Logger } from '../logger.ts'
import type { Scheduler } from '../scheduler/scheduler.ts'

/**
 * Everything the routes need, handed in rather than imported, so the whole API
 * can be built against an in-memory database and a stubbed fetch in tests.
 */
export interface AppContext {
  db: AppDatabase
  events: EventBus
  scheduler: Scheduler
  logger: Logger
  /** Root data directory; favicons are served from below it. */
  dataDir: string
  /** Used by feed discovery and favicon download. */
  fetchImpl?: FetchLike
  /** Injected clock, so integration tests can pin "now". */
  now?: () => number
}

/** Error codes the API answers with; the web client switches on these. */
export type ApiErrorCode =
  | 'not_found'
  | 'invalid_request'
  | 'conflict'
  | 'upstream_failed'
  | 'internal'

const STATUS_BY_CODE = {
  not_found: 404,
  invalid_request: 400,
  conflict: 409,
  upstream_failed: 502,
  internal: 500,
} as const satisfies Record<ApiErrorCode, number>

/** An error meant for the user, with the status the API should answer. */
export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }

  get status() {
    return STATUS_BY_CODE[this.code]
  }
}

export function notFound(message: string) {
  return new ApiError('not_found', message)
}

export function invalidRequest(message: string) {
  return new ApiError('invalid_request', message)
}

/** Writes an ApiError as the documented `{ error: { code, message } }` body. */
export function errorResponse(c: Context, error: ApiError) {
  return c.json({ error: { code: error.code, message: error.message } }, error.status)
}
