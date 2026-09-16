import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.ts'
import { streamSettings } from '../db/schema.ts'
import { readPreferences } from '../preferences/preferences.repository.ts'
import { SORTS, VIEW_MODES, type Sort, type ViewMode } from '../preferences/defaults.ts'
import { formatStreamId, type StreamRef } from './stream-id.ts'

/** What a stream ends up using, after the per-stream override is applied. */
export interface ResolvedStreamSettings {
  viewMode: ViewMode
  sort: Sort
  hideRead: boolean
}

export interface StreamSettingsPatch {
  viewMode?: ViewMode
  sort?: Sort
  hideRead?: boolean
}

function asViewMode(value: string | null): ViewMode | null {
  return VIEW_MODES.includes(value as ViewMode) ? (value as ViewMode) : null
}

function asSort(value: string | null): Sort | null {
  return SORTS.includes(value as Sort) ? (value as Sort) : null
}

/**
 * Per-stream settings override the global preference; a column left null means
 * "inherit". This is how Feedly remembers a view per feed and per folder.
 */
export function resolveStreamSettings(db: AppDatabase, ref: StreamRef): ResolvedStreamSettings {
  const prefs = readPreferences(db)
  const row = db
    .select()
    .from(streamSettings)
    .where(eq(streamSettings.streamId, formatStreamId(ref)))
    .get()

  return {
    viewMode: (row ? asViewMode(row.viewMode) : null) ?? prefs.defaultView,
    sort: (row ? asSort(row.sort) : null) ?? prefs.defaultSort,
    hideRead: row?.hideRead ?? prefs.hideRead,
  }
}

export function writeStreamSettings(
  db: AppDatabase,
  ref: StreamRef,
  patch: StreamSettingsPatch,
): ResolvedStreamSettings {
  const streamId = formatStreamId(ref)

  db.insert(streamSettings)
    .values({
      streamId,
      viewMode: patch.viewMode ?? null,
      sort: patch.sort ?? null,
      hideRead: patch.hideRead ?? null,
    })
    .onConflictDoUpdate({
      target: streamSettings.streamId,
      set: {
        viewMode: sql`coalesce(excluded.view_mode, ${streamSettings.viewMode})`,
        sort: sql`coalesce(excluded.sort, ${streamSettings.sort})`,
        hideRead: sql`coalesce(excluded.hide_read, ${streamSettings.hideRead})`,
      },
    })
    .run()

  return resolveStreamSettings(db, ref)
}
