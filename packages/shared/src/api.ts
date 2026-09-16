import { z } from 'zod'

/**
 * The contract between the server and the web app (spec, section 7).
 *
 * Every route validates its input against the schemas here, and the web client
 * derives its types from the same file, so a change to a payload breaks the
 * build on both sides rather than at runtime.
 */

export const API_PREFIX = '/api'

/* ------------------------------------------------------------------ errors */

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

/* ------------------------------------------------------------ enumerations */

export const viewModeSchema = z.enum(['title_only', 'magazine', 'cards', 'article'])
export const sortSchema = z.enum(['newest', 'oldest', 'most_shared', 'most_shared_newest'])
/** The two sorts this slice actually implements; the others show as disabled. */
export const supportedSortSchema = z.enum(['newest', 'oldest'])
export const themeSchema = z.enum(['system', 'light', 'dark'])
export const fontFamilySchema = z.enum([
  'merriweather',
  'inter',
  'sans_serif',
  'open_dyslexic',
  'noto_sans',
])
export const textSizeSchema = z.enum(['small', 'medium', 'large', 'extra_large'])
export const densitySchema = z.enum(['compact', 'cozy', 'comfortable'])
export const startPageSchema = z.enum(['today', 'first_folder', 'all'])
export const markReadOnScrollSchema = z.enum(['article_only', 'all_views', 'off'])

export type ViewMode = z.infer<typeof viewModeSchema>
export type Sort = z.infer<typeof sortSchema>
export type Theme = z.infer<typeof themeSchema>
export type FontFamily = z.infer<typeof fontFamilySchema>
export type TextSize = z.infer<typeof textSizeSchema>
export type Density = z.infer<typeof densitySchema>
export type StartPage = z.infer<typeof startPageSchema>
export type MarkReadOnScroll = z.infer<typeof markReadOnScrollSchema>

/* ----------------------------------------------------------------- streams */

/** `all`, `saved`, `read`, `category:<id>` or `feed:<id>`. */
export const streamIdSchema = z
  .string()
  .regex(/^(all|saved|read|category:[1-9]\d*|feed:[1-9]\d*)$/, 'stream inválido')
export type StreamId = z.infer<typeof streamIdSchema>

export const streamEntriesQuerySchema = z.object({
  sort: supportedSortSchema.optional(),
  unreadOnly: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
export type StreamEntriesQuery = z.infer<typeof streamEntriesQuerySchema>

export const streamSettingsSchema = z.object({
  viewMode: viewModeSchema,
  sort: sortSchema,
  hideRead: z.boolean(),
})
export type StreamSettings = z.infer<typeof streamSettingsSchema>

export const streamSettingsPatchSchema = z
  .object({
    viewMode: viewModeSchema.optional(),
    sort: sortSchema.optional(),
    hideRead: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'nada para atualizar' })
export type StreamSettingsPatch = z.infer<typeof streamSettingsPatchSchema>

export const markStreamReadBodySchema = z.object({
  /** Only mark entries published before this instant (the "older than" menu). */
  olderThan: z.number().int().positive().optional(),
})
export type MarkStreamReadBody = z.infer<typeof markStreamReadBodySchema>

/* ----------------------------------------------------------------- entries */

export const entryFeedSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  iconPath: z.string().nullable(),
  siteUrl: z.string().nullable(),
})

export const entrySummarySchema = z.object({
  id: z.number().int(),
  feedId: z.number().int(),
  url: z.string().nullable(),
  title: z.string(),
  author: z.string().nullable(),
  summary: z.string().nullable(),
  imageUrl: z.string().nullable(),
  publishedAt: z.number().int(),
  isRead: z.boolean(),
  readAt: z.number().int().nullable(),
  isSaved: z.boolean(),
  savedAt: z.number().int().nullable(),
  feed: entryFeedSchema,
})
export type EntrySummary = z.infer<typeof entrySummarySchema>

export const entryDetailSchema = entrySummarySchema.extend({
  contentHtml: z.string().nullable(),
})
export type EntryDetail = z.infer<typeof entryDetailSchema>

export const streamEntriesResponseSchema = z.object({
  entries: z.array(entrySummarySchema),
  nextCursor: z.string().nullable(),
})
export type StreamEntriesResponse = z.infer<typeof streamEntriesResponseSchema>

const entryIdsSchema = z.array(z.number().int().positive()).min(1).max(1000)

export const markEntriesBodySchema = z.object({ ids: entryIdsSchema, read: z.boolean() })
export type MarkEntriesBody = z.infer<typeof markEntriesBodySchema>

export const saveEntriesBodySchema = z.object({ ids: entryIdsSchema, saved: z.boolean() })
export type SaveEntriesBody = z.infer<typeof saveEntriesBodySchema>

export const affectedResponseSchema = z.object({ affected: z.number().int() })
export type AffectedResponse = z.infer<typeof affectedResponseSchema>

/* ------------------------------------------------------------------- feeds */

export const feedSchema = z.object({
  id: z.number().int(),
  feedUrl: z.string(),
  siteUrl: z.string().nullable(),
  title: z.string(),
  iconPath: z.string().nullable(),
  isFavorite: z.boolean(),
  unreadCount: z.number().int(),
  categoryIds: z.array(z.number().int()),
  errorCount: z.number().int(),
  lastError: z.string().nullable(),
  lastFetchedAt: z.number().int().nullable(),
})
export type Feed = z.infer<typeof feedSchema>

export const discoverBodySchema = z.object({ query: z.string().min(1).max(2048) })
export type DiscoverBody = z.infer<typeof discoverBodySchema>

export const feedCandidateSchema = z.object({
  feedUrl: z.string(),
  title: z.string().nullable(),
  source: z.enum(['direct', 'link-tag', 'common-path']),
})
export type FeedCandidate = z.infer<typeof feedCandidateSchema>

export const discoverResponseSchema = z.object({ candidates: z.array(feedCandidateSchema) })
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>

export const followFeedBodySchema = z.object({
  feedUrl: z.string().url().max(2048),
  title: z.string().min(1).max(500).optional(),
  categoryIds: z.array(z.number().int().positive()).default([]),
})
export type FollowFeedBody = z.infer<typeof followFeedBodySchema>

export const updateFeedBodySchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    isFavorite: z.boolean().optional(),
    categoryIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'nada para atualizar' })
export type UpdateFeedBody = z.infer<typeof updateFeedBodySchema>

/* -------------------------------------------------------------- categories */

export const categorySchema = z.object({
  id: z.number().int(),
  label: z.string(),
  sortOrder: z.number().int(),
  isCollapsed: z.boolean(),
  unreadCount: z.number().int(),
  feedIds: z.array(z.number().int()),
})
export type Category = z.infer<typeof categorySchema>

export const createCategoryBodySchema = z.object({ label: z.string().min(1).max(200) })
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>

export const updateCategoryBodySchema = z
  .object({
    label: z.string().min(1).max(200).optional(),
    sortOrder: z.number().int().optional(),
    isCollapsed: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'nada para atualizar' })
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>

/* ----------------------------------------------------------------- sidebar */

export const sidebarFeedSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  iconPath: z.string().nullable(),
  siteUrl: z.string().nullable(),
  isFavorite: z.boolean(),
  unreadCount: z.number().int(),
  errorCount: z.number().int(),
  lastError: z.string().nullable(),
})
export type SidebarFeed = z.infer<typeof sidebarFeedSchema>

export const sidebarCategorySchema = z.object({
  id: z.number().int(),
  label: z.string(),
  isCollapsed: z.boolean(),
  unreadCount: z.number().int(),
  feeds: z.array(sidebarFeedSchema),
})
export type SidebarCategory = z.infer<typeof sidebarCategorySchema>

export const sidebarResponseSchema = z.object({
  categories: z.array(sidebarCategorySchema),
  uncategorized: z.array(sidebarFeedSchema),
  totalUnread: z.number().int(),
})
export type SidebarResponse = z.infer<typeof sidebarResponseSchema>

/* ------------------------------------------------------------------- today */

export const todayGroupSchema = z.object({
  /** Null for the group of feeds that belong to no folder. */
  categoryId: z.number().int().nullable(),
  label: z.string(),
  unreadCount: z.number().int(),
  entries: z.array(entrySummarySchema),
})
export type TodayGroup = z.infer<typeof todayGroupSchema>

export const todayResponseSchema = z.object({ groups: z.array(todayGroupSchema) })
export type TodayResponse = z.infer<typeof todayResponseSchema>

/* ------------------------------------------------------------------- OPML  */

export const importOpmlResponseSchema = z.object({
  added: z.number().int(),
  skipped: z.number().int(),
  categoriesCreated: z.number().int(),
})
export type ImportOpmlResponse = z.infer<typeof importOpmlResponseSchema>

/* ------------------------------------------------------------ preferences  */

export const preferencesSchema = z.object({
  startPage: startPageSchema,
  defaultView: viewModeSchema,
  defaultSort: sortSchema,
  hideRead: z.boolean(),
  theme: themeSchema,
  fontFamily: fontFamilySchema,
  textSize: textSizeSchema,
  density: densitySchema,
  sidebarPinned: z.boolean(),
  fetchIntervalMin: z.number().int().min(1).max(1440),
  giantMarkReadButton: z.boolean(),
  markReadOnScroll: markReadOnScrollSchema,
  markReadOnNp: z.boolean(),
  markReadOnCountClick: z.boolean(),
  markAllShowsOlderThanMenu: z.boolean(),
  profileGivenName: z.string().max(200),
  profileFamilyName: z.string().max(200),
  profilePicturePath: z.string().nullable(),
  locale: z.string(),
})
export type Preferences = z.infer<typeof preferencesSchema>

export const preferencesPatchSchema = preferencesSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'nada para atualizar' })
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>

/* ------------------------------------------------------------------ events */

export const appEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('feed.updated'),
    feedId: z.number().int(),
    newEntries: z.number().int(),
  }),
  z.object({ type: z.literal('feed.error'), feedId: z.number().int(), message: z.string() }),
  z.object({ type: z.literal('counts.changed') }),
])
export type AppEvent = z.infer<typeof appEventSchema>
export type AppEventType = AppEvent['type']

/* ------------------------------------------------------------------ health */

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptimeSeconds: z.number(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type HealthStatus = HealthResponse['status']
