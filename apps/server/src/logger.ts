import { pino } from 'pino'

/**
 * Application logger. Level comes from LOG_LEVEL and defaults to `info`, as the
 * spec requires (section 10). Tests silence it through LOG_LEVEL=silent.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: undefined,
})

export type Logger = typeof logger
