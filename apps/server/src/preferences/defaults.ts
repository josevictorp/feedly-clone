/**
 * Global preferences and their defaults.
 *
 * The defaults are the ones the real Feedly ships with, read off the captured
 * Preferences screens (`docs/research/screenshots/30-preferences*.png`). The one
 * deliberate difference is `defaultSort`: Feedly defaults to "Most popular +
 * latest", which this slice shows disabled (grill decision G2), so the fallback
 * is "newest".
 */

export const START_PAGES = ['today', 'first_folder', 'all'] as const
export const VIEW_MODES = ['title_only', 'magazine', 'cards', 'article'] as const
export const SORTS = ['newest', 'oldest', 'most_shared', 'most_shared_newest'] as const
export const THEMES = ['system', 'light', 'dark'] as const
export const FONT_FAMILIES = ['merriweather', 'inter', 'sans_serif', 'open_dyslexic', 'noto_sans'] as const
export const TEXT_SIZES = ['small', 'medium', 'large', 'extra_large'] as const
export const DENSITIES = ['compact', 'cozy', 'comfortable'] as const
export const MARK_READ_ON_SCROLL = ['article_only', 'all_views', 'off'] as const

export type StartPage = (typeof START_PAGES)[number]
export type ViewMode = (typeof VIEW_MODES)[number]
export type Sort = (typeof SORTS)[number]
export type Theme = (typeof THEMES)[number]
export type FontFamily = (typeof FONT_FAMILIES)[number]
export type TextSize = (typeof TEXT_SIZES)[number]
export type Density = (typeof DENSITIES)[number]
export type MarkReadOnScroll = (typeof MARK_READ_ON_SCROLL)[number]

export interface Preferences {
  startPage: StartPage
  defaultView: ViewMode
  defaultSort: Sort
  hideRead: boolean
  theme: Theme
  fontFamily: FontFamily
  textSize: TextSize
  density: Density
  sidebarPinned: boolean
  fetchIntervalMin: number
  giantMarkReadButton: boolean
  markReadOnScroll: MarkReadOnScroll
  markReadOnNp: boolean
  markReadOnCountClick: boolean
  markAllShowsOlderThanMenu: boolean
  profileGivenName: string
  profileFamilyName: string
  profilePicturePath: string | null
  locale: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  startPage: 'today',
  defaultView: 'magazine',
  defaultSort: 'newest',
  hideRead: false,
  theme: 'system',
  fontFamily: 'merriweather',
  textSize: 'medium',
  density: 'cozy',
  sidebarPinned: true,
  fetchIntervalMin: 15,
  giantMarkReadButton: true,
  markReadOnScroll: 'article_only',
  markReadOnNp: false,
  markReadOnCountClick: false,
  markAllShowsOlderThanMenu: true,
  profileGivenName: '',
  profileFamilyName: '',
  profilePicturePath: null,
  locale: 'pt-BR',
}

/** camelCase preference name → the `preferences.key` column value. */
export const PREFERENCE_KEYS: Record<keyof Preferences, string> = {
  startPage: 'start_page',
  defaultView: 'default_view',
  defaultSort: 'default_sort',
  hideRead: 'hide_read',
  theme: 'theme',
  fontFamily: 'font_family',
  textSize: 'text_size',
  density: 'density',
  sidebarPinned: 'sidebar_pinned',
  fetchIntervalMin: 'fetch_interval_min',
  giantMarkReadButton: 'giant_mark_read_button',
  markReadOnScroll: 'mark_read_on_scroll',
  markReadOnNp: 'mark_read_on_np',
  markReadOnCountClick: 'mark_read_on_count_click',
  markAllShowsOlderThanMenu: 'mark_all_shows_older_than_menu',
  profileGivenName: 'profile_given_name',
  profileFamilyName: 'profile_family_name',
  profilePicturePath: 'profile_picture_path',
  locale: 'locale',
}

export const PREFERENCE_NAMES = Object.keys(PREFERENCE_KEYS) as (keyof Preferences)[]
