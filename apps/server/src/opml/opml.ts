import { generateOpml, parseOpml } from 'feedsmith'
import type { AppDatabase } from '../db/client.ts'
import { ensureCategory, listCategories } from '../categories/categories.repository.ts'
import {
  createFeed,
  findFeedByUrl,
  getFeedCategoryIds,
  listFeeds,
} from '../feeds/feeds.repository.ts'

/**
 * OPML import and export (spec, section 6).
 *
 * Import is the first thing a Feedly user does with this app, so it is
 * deliberately forgiving: nested folders become folders, feeds already followed
 * are skipped rather than duplicated, and a malformed outline is ignored
 * instead of failing the whole file.
 */

export interface OpmlFeed {
  feedUrl: string
  title: string
  siteUrl: string | null
  /** Folder names this feed sits in; empty means uncategorized. */
  categories: string[]
}

export interface ParsedOpml {
  title: string | null
  feeds: OpmlFeed[]
}

type Loose = Record<string, unknown>

function asRecord(value: unknown): Loose | null {
  return typeof value === 'object' && value !== null ? (value as Loose) : null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Walks the outline tree, collecting feeds with the folder path they sit under.
 *
 * Only the folders themselves nest in Feedly's export, so nesting deeper than
 * one level is flattened onto the outermost folder name — which is what the
 * sidebar can show.
 */
function collectOutlines(outlines: unknown, path: string[], into: OpmlFeed[]): void {
  if (!Array.isArray(outlines)) return

  for (const raw of outlines) {
    const outline = asRecord(raw)
    if (!outline) continue

    const feedUrl = asText(outline.xmlUrl)
    const label = asText(outline.title) ?? asText(outline.text)

    if (feedUrl) {
      into.push({
        feedUrl,
        title: label ?? feedUrl,
        siteUrl: asText(outline.htmlUrl),
        categories: path.slice(0, 1),
      })
      continue
    }

    // No xmlUrl: this outline is a folder.
    if (label) collectOutlines(outline.outlines, [...path, label], into)
  }
}

/** Thrown when the uploaded file is not OPML at all, so the API can answer 400. */
export class InvalidOpmlError extends Error {
  constructor(cause?: unknown) {
    super('O arquivo enviado não é um OPML válido.')
    this.name = 'InvalidOpmlError'
    this.cause = cause
  }
}

export function parseOpmlDocument(xml: string): ParsedOpml {
  let document: Loose
  try {
    document = parseOpml(xml) as unknown as Loose
  } catch (error) {
    throw new InvalidOpmlError(error)
  }

  const head = asRecord(document.head)
  const body = asRecord(document.body)

  const feeds: OpmlFeed[] = []
  collectOutlines(body?.outlines, [], feeds)

  return { title: asText(head?.title), feeds }
}

export interface ImportOpmlResult {
  added: number
  skipped: number
  categoriesCreated: number
  /** Ids of the feeds added, so the caller can queue an immediate fetch. */
  addedFeedIds: number[]
}

export interface ImportOpmlOptions {
  now?: number
}

/**
 * Imports an OPML file into the database.
 *
 * A feed already followed is counted as skipped and left untouched — including
 * its folders, so re-importing an export never reshuffles the sidebar.
 */
export function importOpml(
  db: AppDatabase,
  xml: string,
  options: ImportOpmlOptions = {},
): ImportOpmlResult {
  const now = options.now ?? Date.now()
  const parsed = parseOpmlDocument(xml)

  const categoriesBefore = listCategories(db).length
  const result: ImportOpmlResult = {
    added: 0,
    skipped: 0,
    categoriesCreated: 0,
    addedFeedIds: [],
  }

  const seenUrls = new Set<string>()

  for (const feed of parsed.feeds) {
    if (seenUrls.has(feed.feedUrl) || findFeedByUrl(db, feed.feedUrl)) {
      result.skipped += 1
      continue
    }
    seenUrls.add(feed.feedUrl)

    const categoryIds = feed.categories.map((label) => ensureCategory(db, label, now).id)

    const created = createFeed(db, {
      feedUrl: feed.feedUrl,
      title: feed.title,
      siteUrl: feed.siteUrl,
      categoryIds,
      now,
    })

    result.added += 1
    result.addedFeedIds.push(created.id)
  }

  result.categoriesCreated = listCategories(db).length - categoriesBefore
  return result
}

/** Exports every followed feed, grouped by folder, in Feedly's own shape. */
export function exportOpml(db: AppDatabase, title = 'Feedly Clone subscriptions'): string {
  const categories = listCategories(db)
  const feeds = listFeeds(db)

  const byCategory = new Map<number, ReturnType<typeof listFeeds>>()
  const uncategorized: ReturnType<typeof listFeeds> = []

  for (const feed of feeds) {
    const categoryIds = getFeedCategoryIds(db, feed.id)
    if (categoryIds.length === 0) {
      uncategorized.push(feed)
      continue
    }
    for (const categoryId of categoryIds) {
      const list = byCategory.get(categoryId) ?? []
      list.push(feed)
      byCategory.set(categoryId, list)
    }
  }

  const feedOutline = (feed: (typeof feeds)[number]) => ({
    text: feed.title,
    title: feed.title,
    type: 'rss',
    xmlUrl: feed.feedUrl,
    ...(feed.siteUrl ? { htmlUrl: feed.siteUrl } : {}),
  })

  const outlines = [
    ...categories.map((category) => ({
      text: category.label,
      title: category.label,
      outlines: (byCategory.get(category.id) ?? []).map(feedOutline),
    })),
    ...uncategorized.map(feedOutline),
  ]

  // feedsmith refuses to generate a document with no outlines, but exporting an
  // empty account still has to yield a valid file.
  if (outlines.length === 0) return emptyOpml(title)

  return generateOpml({ head: { title }, body: { outlines } })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emptyOpml(title: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>${escapeXml(title)}</title>`,
    '  </head>',
    '  <body/>',
    '</opml>',
    '',
  ].join('\n')
}
