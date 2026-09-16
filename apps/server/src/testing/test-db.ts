import { openDatabase, type AppDatabase } from '../db/client.ts'
import { runMigrations } from '../db/migrate.ts'
import { seedPreferences } from '../preferences/preferences.repository.ts'

export interface TestDatabase {
  db: AppDatabase
  /** Number of SQL statements drizzle has run since the counter was reset. */
  queryCount: () => number
  resetQueryCount: () => void
  close: () => void
}

/**
 * A migrated, seeded, in-memory database for tests, with a query counter so a
 * test can assert that an aggregate query really is a single statement.
 */
export function createTestDatabase(): TestDatabase {
  let queries = 0
  const db = openDatabase(':memory:', { onQuery: () => (queries += 1) })

  runMigrations(db)
  seedPreferences(db)

  return {
    db,
    queryCount: () => queries,
    resetQueryCount: () => (queries = 0),
    close: () => db.$client.close(),
  }
}
