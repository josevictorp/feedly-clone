import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from './client.ts'
import { countPendingMigrations, MIGRATIONS_FOLDER, runMigrations } from './migrate.ts'

/** Appends a migration to a copy of the migrations folder, journal included. */
function addMigration(folder: string, tag: string, sqlText: string): void {
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[]
  }
  const previous = journal.entries.at(-1)
  journal.entries.push({
    idx: (previous?.idx ?? -1) + 1,
    version: previous?.version ?? '6',
    when: (previous?.when ?? 0) + 1,
    tag,
    breakpoints: true,
  })

  writeFileSync(join(folder, `${tag}.sql`), sqlText)
  writeFileSync(journalPath, JSON.stringify(journal, null, 2))
}

describe('runMigrations', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'feedly-migrate-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates every table of the schema', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)

    const tables = db.$client
      .prepare(`select name from sqlite_master where type = 'table'`)
      .all()
      .map((row) => (row as { name: string }).name)

    expect(tables).toEqual(
      expect.arrayContaining([
        'feeds',
        'categories',
        'feed_categories',
        'entries',
        'stream_settings',
        'preferences',
      ]),
    )
  })

  it('creates the indexes the spec lists for entries', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)

    const indexes = db.$client
      .prepare(`select name from sqlite_master where type = 'index' and tbl_name = 'entries'`)
      .all()
      .map((row) => (row as { name: string }).name)

    expect(indexes).toEqual(
      expect.arrayContaining([
        'entries_feed_id_guid_unique',
        'entries_feed_id_is_read_idx',
        'entries_published_at_idx',
        'entries_is_saved_saved_at_idx',
        'entries_read_at_idx',
      ]),
    )
  })

  it('reports nothing pending once the migrations have run', () => {
    const db = openDatabase(':memory:')
    expect(countPendingMigrations(db)).toBeGreaterThan(0)

    runMigrations(db)

    expect(countPendingMigrations(db)).toBe(0)
  })

  it('does not back up a database it just created', () => {
    const file = join(dir, 'feedly.db')

    const db = openDatabase(file)
    const result = runMigrations(db, { databaseFile: file })
    db.$client.close()

    expect(result.applied).toBeGreaterThan(0)
    expect(result.backupFile).toBeNull()
  })

  it('does nothing, and backs nothing up, when the database is up to date', () => {
    const file = join(dir, 'feedly.db')

    const first = openDatabase(file)
    runMigrations(first, { databaseFile: file })
    first.$client.close()

    const second = openDatabase(file)
    const result = runMigrations(second, { databaseFile: file })
    second.$client.close()

    expect(result.applied).toBe(0)
    expect(result.backupFile).toBeNull()
  })

  it('backs the database up before applying a migration to an existing database', () => {
    const file = join(dir, 'feedly.db')
    const folder = join(dir, 'migrations')
    cpSync(MIGRATIONS_FOLDER, folder, { recursive: true })

    const first = openDatabase(file)
    runMigrations(first, { databaseFile: file, migrationsFolder: folder })
    first.$client.close()

    addMigration(folder, 'add_placeholder', 'CREATE TABLE `placeholder` (`id` integer);')

    const second = openDatabase(file)
    const result = runMigrations(second, {
      databaseFile: file,
      migrationsFolder: folder,
      now: () => new Date('2026-01-02T03:04:05.678Z'),
    })
    const hasPlaceholder = second.$client
      .prepare(`select count(*) as n from sqlite_master where name = 'placeholder'`)
      .get() as { n: number }
    second.$client.close()

    expect(result.applied).toBe(1)
    expect(hasPlaceholder.n).toBe(1)
    expect(result.backupFile).toBe(`${file}.backup-2026-01-02T03-04-05-678Z`)
    expect(existsSync(result.backupFile as string)).toBe(true)
  })
})
