/**
 * Stream identifiers, as used by the API and by `stream_settings.stream_id`:
 * `all`, `category:<id>`, `feed:<id>`, `saved` and `read`.
 */

export type StreamRef =
  | { kind: 'all' }
  | { kind: 'saved' }
  | { kind: 'read' }
  | { kind: 'category'; categoryId: number }
  | { kind: 'feed'; feedId: number }

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** Returns null for anything that is not a valid stream id. */
export function parseStreamId(streamId: string): StreamRef | null {
  if (streamId === 'all') return { kind: 'all' }
  if (streamId === 'saved') return { kind: 'saved' }
  if (streamId === 'read') return { kind: 'read' }

  const [prefix, ...rest] = streamId.split(':')
  const raw = rest.join(':')
  if (rest.length !== 1) return null

  const id = parseId(raw)
  if (id === null) return null

  if (prefix === 'category') return { kind: 'category', categoryId: id }
  if (prefix === 'feed') return { kind: 'feed', feedId: id }
  return null
}

export function formatStreamId(ref: StreamRef): string {
  switch (ref.kind) {
    case 'all':
    case 'saved':
    case 'read':
      return ref.kind
    case 'category':
      return `category:${ref.categoryId}`
    case 'feed':
      return `feed:${ref.feedId}`
  }
}
