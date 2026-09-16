import { describe, expect, it } from 'vitest'
import { formatStreamId, parseStreamId, type StreamRef } from './stream-id.ts'

describe('parseStreamId', () => {
  it.each([
    ['all', { kind: 'all' }],
    ['saved', { kind: 'saved' }],
    ['read', { kind: 'read' }],
    ['category:12', { kind: 'category', categoryId: 12 }],
    ['feed:3', { kind: 'feed', feedId: 3 }],
  ])('parses %s', (input, expected) => {
    expect(parseStreamId(input)).toEqual(expected)
  })

  it.each(['', 'nope', 'feed:', 'feed:abc', 'feed:-1', 'feed:0', 'category:1:2', 'FEED:1'])(
    'rejects %s',
    (input) => {
      expect(parseStreamId(input)).toBeNull()
    },
  )
})

describe('formatStreamId', () => {
  it.each<StreamRef>([
    { kind: 'all' },
    { kind: 'saved' },
    { kind: 'read' },
    { kind: 'category', categoryId: 12 },
    { kind: 'feed', feedId: 3 },
  ])('round-trips %j', (ref) => {
    expect(parseStreamId(formatStreamId(ref))).toEqual(ref)
  })
})
