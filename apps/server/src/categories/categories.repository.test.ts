import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../testing/test-db.ts'
import { makeCategory, makeFeed } from '../testing/fixtures.ts'
import { findFeedById, getFeedCategoryIds } from '../feeds/feeds.repository.ts'
import {
  deleteCategory,
  ensureCategory,
  listCategories,
  updateCategory,
} from './categories.repository.ts'

describe('categories repository', () => {
  let ctx: TestDatabase

  beforeEach(() => {
    ctx = createTestDatabase()
  })
  afterEach(() => ctx.close())

  it('appends new folders at the end of the list', () => {
    makeCategory(ctx.db, 'Primeira')
    makeCategory(ctx.db, 'Segunda')

    expect(listCategories(ctx.db).map((c) => c.label)).toEqual(['Primeira', 'Segunda'])
  })

  it('reuses an existing folder with the same label', () => {
    const first = ensureCategory(ctx.db, 'Tecnologia')
    const second = ensureCategory(ctx.db, 'Tecnologia')

    expect(second.id).toBe(first.id)
    expect(listCategories(ctx.db)).toHaveLength(1)
  })

  it('renames, reorders and collapses a folder', () => {
    const category = makeCategory(ctx.db, 'Antiga')

    const updated = updateCategory(ctx.db, category.id, {
      label: 'Nova',
      sortOrder: 5,
      isCollapsed: true,
    })

    expect(updated).toMatchObject({ label: 'Nova', sortOrder: 5, isCollapsed: true })
  })

  it('keeps the feeds when the folder is deleted (RF-04)', () => {
    const category = makeCategory(ctx.db, 'Some')
    const feed = makeFeed(ctx.db, 'Fica', { categoryIds: [category.id] })

    expect(deleteCategory(ctx.db, category.id)).toBe(true)

    expect(findFeedById(ctx.db, feed.id)).toBeDefined()
    expect(getFeedCategoryIds(ctx.db, feed.id)).toEqual([])
  })

  it('reports nothing deleted for an unknown folder', () => {
    expect(deleteCategory(ctx.db, 999)).toBe(false)
  })
})
