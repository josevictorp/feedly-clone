import { asc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.ts'
import { categories, feedCategories, type CategoryRow } from '../db/schema.ts'

export interface CreateCategoryInput {
  label: string
  sortOrder?: number
  now?: number
}

export interface UpdateCategoryInput {
  label?: string
  sortOrder?: number
  isCollapsed?: boolean
}

export function listCategories(db: AppDatabase): CategoryRow[] {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)).all()
}

export function findCategoryById(db: AppDatabase, id: number): CategoryRow | undefined {
  return db.select().from(categories).where(eq(categories.id, id)).get()
}

export function findCategoryByLabel(db: AppDatabase, label: string): CategoryRow | undefined {
  return db.select().from(categories).where(eq(categories.label, label)).get()
}

export function createCategory(db: AppDatabase, input: CreateCategoryInput): CategoryRow {
  const nextSortOrder =
    input.sortOrder ??
    (db.select({ value: sql<number>`coalesce(max(${categories.sortOrder}), -1) + 1` }).from(categories).get()
      ?.value ??
      0)

  return db
    .insert(categories)
    .values({
      label: input.label,
      sortOrder: nextSortOrder,
      createdAt: input.now ?? Date.now(),
    })
    .returning()
    .get()
}

/** Creates the folder only if a folder with the same label is not there yet. */
export function ensureCategory(db: AppDatabase, label: string, now?: number): CategoryRow {
  return findCategoryByLabel(db, label) ?? createCategory(db, { label, ...(now ? { now } : {}) })
}

export function updateCategory(
  db: AppDatabase,
  id: number,
  patch: UpdateCategoryInput,
): CategoryRow | undefined {
  if (Object.keys(patch).length === 0) return findCategoryById(db, id)

  return db.update(categories).set(patch).where(eq(categories.id, id)).returning().get()
}

/** Deleting a folder never deletes its feeds; they become uncategorized (RF-04). */
export function deleteCategory(db: AppDatabase, id: number): boolean {
  db.delete(feedCategories).where(eq(feedCategories.categoryId, id)).run()
  const deleted = db.delete(categories).where(eq(categories.id, id)).returning().all()
  return deleted.length > 0
}
