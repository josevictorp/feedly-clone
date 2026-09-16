/**
 * Date normalization (spec, section 6).
 *
 * Feeds lie about dates constantly: missing, unparseable, or set decades in the
 * future so the item pins itself to the top of the list. The reader's ordering
 * depends on this column, so it is never allowed to be NaN.
 */

/** How far ahead of `now` a publication date is still believed. */
export const FUTURE_TOLERANCE_MS = 60 * 60 * 1000

export function parseDate(value: unknown): number | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime()
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed === '') return null

  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Resolves the publication date of an entry: published, then updated, then the
 * time of the fetch. A date more than an hour in the future is clamped to now,
 * which is how Feedly keeps a misconfigured feed from owning the top of the list.
 */
export function resolvePublishedAt(
  candidates: readonly unknown[],
  fetchedAt: number,
): number {
  for (const candidate of candidates) {
    const parsed = parseDate(candidate)
    if (parsed === null) continue
    return parsed > fetchedAt + FUTURE_TOLERANCE_MS ? fetchedAt : parsed
  }
  return fetchedAt
}
