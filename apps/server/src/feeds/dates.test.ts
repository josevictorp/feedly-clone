import { describe, expect, it } from 'vitest'
import { parseDate, resolvePublishedAt } from './dates.ts'

const NOW = Date.parse('2026-09-16T12:00:00.000Z')

describe('parseDate', () => {
  it.each([
    ['Tue, 15 Sep 2026 10:00:00 GMT', Date.parse('2026-09-15T10:00:00Z')],
    ['2026-09-15T10:00:00Z', Date.parse('2026-09-15T10:00:00Z')],
    ['2026-09-15T10:00:00+02:00', Date.parse('2026-09-15T08:00:00Z')],
  ])('parses %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })

  it.each([null, undefined, '', '   ', 'not a date at all', {}, NaN])(
    'returns null for %j',
    (input) => {
      expect(parseDate(input)).toBeNull()
    },
  )

  it('accepts a Date and rejects an invalid one', () => {
    expect(parseDate(new Date(NOW))).toBe(NOW)
    expect(parseDate(new Date('nope'))).toBeNull()
  })
})

describe('resolvePublishedAt', () => {
  it('takes the first candidate that parses', () => {
    expect(resolvePublishedAt(['garbage', '2026-09-15T10:00:00Z'], NOW)).toBe(
      Date.parse('2026-09-15T10:00:00Z'),
    )
  })

  it('falls back to the fetch time when nothing parses', () => {
    expect(resolvePublishedAt(['nope', '', null], NOW)).toBe(NOW)
  })

  it('falls back to the fetch time when there are no candidates', () => {
    expect(resolvePublishedAt([], NOW)).toBe(NOW)
  })

  it('clamps a date far in the future to now', () => {
    expect(resolvePublishedAt(['2091-01-01T00:00:00Z'], NOW)).toBe(NOW)
  })

  it('tolerates a slightly-ahead clock', () => {
    const slightlyAhead = new Date(NOW + 60_000).toISOString()

    expect(resolvePublishedAt([slightlyAhead], NOW)).toBe(NOW + 60_000)
  })

  it('never returns NaN', () => {
    expect(Number.isFinite(resolvePublishedAt([NaN, undefined, 'x'], NOW))).toBe(true)
  })
})
