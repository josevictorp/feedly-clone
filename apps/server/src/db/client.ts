import DatabaseConstructor, { type Database as SqliteDatabase } from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'

export type AppDatabase = BetterSQLite3Database<typeof schema> & { $client: SqliteDatabase }

/** The handle drizzle hands to a `db.transaction()` callback. */
export type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0]

/** Anything that can run queries: the database itself or an open transaction. */
export type DbOrTx = AppDatabase | Transaction

export interface OpenDatabaseOptions {
  /** Called once per SQL statement; used by tests to prove there is no N+1. */
  onQuery?: (query: string, params: unknown[]) => void
}

/**
 * Opens (and creates, if needed) the SQLite database.
 *
 * Pass `':memory:'` for tests. WAL keeps reads from blocking the scheduler's
 * writes; foreign keys must be enabled per connection in SQLite.
 */
export function openDatabase(file: string, options: OpenDatabaseOptions = {}): AppDatabase {
  const sqlite = new DatabaseConstructor(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return drizzle(sqlite, {
    schema,
    ...(options.onQuery ? { logger: { logQuery: options.onQuery } } : {}),
  }) as AppDatabase
}
