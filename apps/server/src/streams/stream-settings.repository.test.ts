import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { makeFeed } from '../testing/fixtures.ts'
import { writePreferences } from '../preferences/preferences.repository.ts'
import { resolveStreamSettings, writeStreamSettings } from './stream-settings.repository.ts'

describe('stream settings repository', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('inherits the global preferences when a stream has no override', () => {
    expect(resolveStreamSettings(ctx.db, { kind: 'all' })).toEqual({
      viewMode: 'magazine',
      sort: 'newest',
      hideRead: false,
    })
  })

  it('follows a change of the global preference', () => {
    writePreferences(ctx.db, { defaultView: 'cards', hideRead: true })

    expect(resolveStreamSettings(ctx.db, { kind: 'all' })).toMatchObject({
      viewMode: 'cards',
      hideRead: true,
    })
  })

  it('overrides only the fields the stream sets', () => {
    const feed = makeFeed(ctx.db, 'Feed')

    const settings = writeStreamSettings(ctx.db, { kind: 'feed', feedId: feed.id }, {
      viewMode: 'title_only',
    })

    expect(settings).toEqual({ viewMode: 'title_only', sort: 'newest', hideRead: false })
  })

  it('keeps each stream independent', () => {
    writeStreamSettings(ctx.db, { kind: 'all' }, { viewMode: 'article' })

    expect(resolveStreamSettings(ctx.db, { kind: 'all' }).viewMode).toBe('article')
    expect(resolveStreamSettings(ctx.db, { kind: 'saved' }).viewMode).toBe('magazine')
  })

  it('merges a later patch into the existing override', () => {
    writeStreamSettings(ctx.db, { kind: 'all' }, { viewMode: 'cards' })

    const settings = writeStreamSettings(ctx.db, { kind: 'all' }, { sort: 'oldest' })

    expect(settings).toMatchObject({ viewMode: 'cards', sort: 'oldest' })
  })

  it('ignores a stored value that is no longer a valid option', () => {
    ctx.db.$client
      .prepare(`insert into stream_settings (stream_id, view_mode) values ('all', 'mosaic')`)
      .run()

    expect(resolveStreamSettings(ctx.db, { kind: 'all' }).viewMode).toBe('magazine')
  })
})
