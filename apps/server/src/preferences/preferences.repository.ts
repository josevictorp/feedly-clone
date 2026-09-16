import { sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.ts'
import { preferences as preferencesTable } from '../db/schema.ts'
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  PREFERENCE_NAMES,
  type Preferences,
} from './defaults.ts'

const KEY_TO_NAME = new Map(
  PREFERENCE_NAMES.map((name) => [PREFERENCE_KEYS[name], name] as const),
)

/**
 * Preferences live as JSON strings under a `key`, so a single table holds
 * values of every type. Unknown or corrupt rows fall back to the default.
 */
export function readPreferences(db: AppDatabase): Preferences {
  const rows = db.select().from(preferencesTable).all()
  const result: Preferences = { ...DEFAULT_PREFERENCES }

  for (const row of rows) {
    const name = KEY_TO_NAME.get(row.key)
    if (!name) continue
    try {
      Object.assign(result, { [name]: JSON.parse(row.value) as unknown })
    } catch {
      // Keep the default: a preference is never worth failing a boot over.
    }
  }

  return result
}

/** Applies a partial update and returns the full, current set. */
export function writePreferences(db: AppDatabase, patch: Partial<Preferences>): Preferences {
  const rows = PREFERENCE_NAMES.filter((name) => name in patch).map((name) => ({
    key: PREFERENCE_KEYS[name],
    value: JSON.stringify(patch[name] ?? null),
  }))

  if (rows.length > 0) {
    db.insert(preferencesTable)
      .values(rows)
      .onConflictDoUpdate({
        target: preferencesTable.key,
        set: { value: sql`excluded.value` },
      })
      .run()
  }

  return readPreferences(db)
}

/**
 * Writes every default that is not in the table yet. Runs on each boot so a
 * preference added in a later release lands with its default value.
 */
export function seedPreferences(db: AppDatabase): Preferences {
  const rows = PREFERENCE_NAMES.map((name) => ({
    key: PREFERENCE_KEYS[name],
    value: JSON.stringify(DEFAULT_PREFERENCES[name]),
  }))

  db.insert(preferencesTable).values(rows).onConflictDoNothing().run()

  return readPreferences(db)
}
