import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { DEFAULT_PREFERENCES, PREFERENCE_NAMES } from './defaults.ts'
import { readPreferences, seedPreferences, writePreferences } from './preferences.repository.ts'

describe('preferences repository', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('seeds every preference with the Feedly default on first run', () => {
    expect(readPreferences(ctx.db)).toEqual(DEFAULT_PREFERENCES)
  })

  it('stores one row per preference', () => {
    const rows = ctx.db.$client.prepare('select count(*) as n from preferences').get() as {
      n: number
    }
    expect(rows.n).toBe(PREFERENCE_NAMES.length)
  })

  it('keeps user values when seeding runs again on a later boot', () => {
    writePreferences(ctx.db, { theme: 'dark', fetchIntervalMin: 30 })

    seedPreferences(ctx.db)

    expect(readPreferences(ctx.db)).toMatchObject({ theme: 'dark', fetchIntervalMin: 30 })
  })

  it('applies a partial patch and leaves the rest alone', () => {
    const updated = writePreferences(ctx.db, { hideRead: true })

    expect(updated.hideRead).toBe(true)
    expect(updated.defaultView).toBe(DEFAULT_PREFERENCES.defaultView)
  })

  it('round-trips values that are not strings', () => {
    writePreferences(ctx.db, {
      fetchIntervalMin: 45,
      markReadOnNp: true,
      profilePicturePath: null,
    })

    expect(readPreferences(ctx.db)).toMatchObject({
      fetchIntervalMin: 45,
      markReadOnNp: true,
      profilePicturePath: null,
    })
  })

  it('falls back to the default when a stored value is not valid JSON', () => {
    ctx.db.$client.prepare(`update preferences set value = 'oops' where key = 'theme'`).run()

    expect(readPreferences(ctx.db).theme).toBe(DEFAULT_PREFERENCES.theme)
  })

  it('survives a reopen, which is what RF-40 asks for', () => {
    writePreferences(ctx.db, { density: 'compact' })

    expect(readPreferences(ctx.db).density).toBe('compact')
  })
})
