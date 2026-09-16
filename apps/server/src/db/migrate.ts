import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { AppDatabase } from './client.ts'

/** Folder holding the generated SQL plus drizzle's journal. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations/', import.meta.url))

interface MigrationJournal {
  entries: { idx: number; tag: string }[]
}

/** Migrations drizzle recorded as applied. Zero when the table is not there yet. */
export function countAppliedMigrations(db: AppDatabase): number {
  const row = db.$client
    .prepare(
      `SELECT COUNT(*) AS applied FROM sqlite_master
       WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    .get() as { applied: number }
  if (row.applied === 0) return 0

  const applied = db.$client
    .prepare('SELECT COUNT(*) AS applied FROM __drizzle_migrations')
    .get() as { applied: number }
  return applied.applied
}

/** How many migrations the folder has that this database has not run yet. */
export function countPendingMigrations(db: AppDatabase, migrationsFolder = MIGRATIONS_FOLDER) {
  const journalPath = join(migrationsFolder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as MigrationJournal
  return Math.max(0, journal.entries.length - countAppliedMigrations(db))
}

export interface RunMigrationsOptions {
  /** Path of the database file, or undefined for `:memory:` (nothing to back up). */
  databaseFile?: string | undefined
  migrationsFolder?: string
  now?: () => Date
}

export interface RunMigrationsResult {
  applied: number
  /** Path of the backup taken before migrating, or null when none was needed. */
  backupFile: string | null
}

/**
 * Applies pending migrations, copying the database file aside first.
 *
 * The backup is what makes a failed migration survivable on a machine with no
 * other copy of the user's feeds (spec, section 10).
 */
export function runMigrations(
  db: AppDatabase,
  options: RunMigrationsOptions = {},
): RunMigrationsResult {
  const migrationsFolder = options.migrationsFolder ?? MIGRATIONS_FOLDER
  const pending = countPendingMigrations(db, migrationsFolder)

  // Only an existing database is worth backing up: a first boot creates the
  // file empty, so a copy of it would protect nothing.
  const isUpgrade = pending > 0 && countAppliedMigrations(db) > 0

  let backupFile: string | null = null
  if (isUpgrade && options.databaseFile && existsSync(options.databaseFile)) {
    const stamp = (options.now?.() ?? new Date()).toISOString().replace(/[:.]/g, '-')
    backupFile = `${options.databaseFile}.backup-${stamp}`
    copyFileSync(options.databaseFile, backupFile)
  }

  migrate(db, { migrationsFolder })

  return { applied: pending, backupFile }
}
