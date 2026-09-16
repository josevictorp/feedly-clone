# Feedly Research Reference (for a visually faithful clone with premium features)

Compiled 2026-09-16 from primary sources (feedly.com, docs.feedly.com, developers.feedly.com, feedly.com/new-features) plus Feedly's own production CSS (`s1.feedly.com/web/main/main.*.css`, fetched directly) and a handful of third-party write-ups where the primary pages are JS-rendered and could not be scraped. Where sources disagree, the disagreement is noted rather than resolved.

---

## 1. Pricing tiers and what each includes (2025-2026)

### 1.1 Plan lineup and prices

Feedly today sells two product families: the **News Reader** (Free / Pro / Pro+ / Enterprise) and the **Intelligence** products (Threat Intelligence and Market Intelligence, "Standard" and "Advanced"). The older "Business" and "Teams" tier names still appear in docs as legacy labels.

| Plan | Price (annual billing) | Price (monthly billing) | Notes |
|---|---|---|---|
| Free ("Basic") | $0 | $0 | 100 sources, 3 feeds/folders, 3 boards |
| Pro | $6/mo ($72/yr) | $6.99/mo | search, notes, highlights, integrations; no AI |
| Pro+ | $8.25/mo ($99/yr) | $12.99/mo | adds Feedly AI (Leo), AI Feeds, newsletters, RSS Builder, mute filters |
| Enterprise (News Reader) | annual contract, quote | — | up to 7,500 sources, team feeds/boards, SSO, API |
| Market Intelligence Standard | $1,600/mo billed annually | — | up to 10 seats |
| Market Intelligence Advanced | $2,400/mo billed annually | — | up to 25 seats |
| Threat Intelligence Standard / Advanced | "Request pricing" | — | third parties cite $1,600 / $3,200 per month |

Sources:
- Readless pricing breakdown (Mar/Apr 2026): https://www.readless.app/blog/feedly-pricing-2026-free-vs-pro-limits
- Readless Pro+ analysis (May/Jun 2026): https://www.readless.app/blog/feedly-pro-pricing-vs-readless-2026
- SocialRails pricing breakdown (Mar 2026): https://socialrails.com/blog/feedly-pricing
- Feedly Market Intelligence pricing (primary): https://feedly.com/market-intelligence/pricing
- Feedly Threat Intelligence pricing (primary): https://feedly.com/threat-intelligence/pricing
- Feedly docs, plan differences (primary, high-level only): https://docs.feedly.com/article/140-what-is-the-difference-between-feedly-basic-pro-and-teams
- Feedly docs, Plans category: https://docs.feedly.com/category/502-plans
- Pro+ launch coverage (Dec 2019, updated Jun 2026): https://coywolf.com/news/productivity/feedly-pro-plus-leo-ai/
- Growhackscale feature list (mirrors Feedly's pro page copy): https://growhackscale.com/products/feedly

Note: `https://feedly.com/pricing` and `https://feedly.com/i/pro` are JS-rendered SPAs; the raw HTML contains no plan data, so the detailed feature matrix below is reconstructed from Feedly docs articles (limits) and the marketing copy mirrored by third parties.

### 1.2 Feature matrix by tier (exhaustive)

**Free / Basic**
- Up to 100 sources (feeds followed). (Readless, SocialRails)
- Up to 3 feeds/folders ("3 feeds" in SocialRails wording, "3 folders" in Readless). (Readless, SocialRails)
- Up to 3 Boards. https://docs.feedly.com/article/63-how-many-boards-can-i-create
- Read Later, Today view, basic Magazine/Title/Cards/Article views, web + iOS + Android apps, browser extensions.
- Sources allowed on Free: websites/blogs/news/trade publications, research journals, RSS feeds, YouTube channels, podcasts, keyword alerts (Google Alerts RSS), Reddit (subreddits, searches, flairs; 1,000 posts/day/source). https://feedly.com/new-features/posts/the-10-types-of-sources-you-can-add-on-feedly and https://feedly.com/new-features/posts/follow-reddit-in-feedly
- No Power Search, no notes/highlights, no integrations (Zapier/IFTTT/Evernote/etc.), no Feedly AI/Leo, no mute filters, no newsletters, no Twitter, no Google News feeds, ads shown ("sponsored ads"), free fonts only (premium fonts are Pro). https://docs.feedly.com/article/210-how-to-customize-the-font-size-and-family
- Dark mode is available to all plans. https://docs.feedly.com/article/259-how-can-i-enable-dark-mode
- Go To (Cmd/Ctrl+K palette) available on all plans (Apr 2026). https://feedly.com/new-features/posts/navigate-feedly-faster-with-go-to

**Pro**
- Up to 1,000 sources.
- Unlimited feeds/folders (SocialRails: "Unlimited feeds").
- Up to 250 personal Boards. https://docs.feedly.com/article/63-how-many-boards-can-i-create
- Notes and highlights (annotations on saved articles; searchable via "Annotated" scope). https://geeknewscentral.com/2017/04/12/feedly-introduces-boards-notes-highlights/
- Power Search (search across all feeds, boards, annotated, recently read, "Beyond your Feedly" web search, with filters). https://docs.feedly.com/article/78-how-can-i-search-within-my-feedly
- Save to Evernote, Pocket, and OneNote.
- Share to LinkedIn, Buffer, IFTTT, Zapier, Hootsuite.
- "Get new articles up to 10x faster" (priority fetching).
- Hide sponsored ads.
- Premium fonts.
- Premium support.
- Shared boards (public board URL/RSS).
- Mute filters: legacy Pro users have 25 mute filters; current Pro marketing does not list mute filters (they are Pro+). https://docs.feedly.com/article/246-how-many-mute-filters-can-i-have
- No Feedly AI / Leo, no AI Feeds, no newsletters, no RSS Builder, no Twitter, no Google News feeds.

Sources: https://growhackscale.com/products/feedly (mirrors Feedly pro-page copy), https://www.readless.app/blog/feedly-pro-pricing-vs-readless-2026, https://socialrails.com/blog/feedly-pricing

**Pro+**
- Everything in Pro, plus:
- Up to 2,500 sources (Coywolf 2019, Growhackscale, Readless). SocialRails says "Unlimited" — treat 2,500 as the documented limit.
- Feedly AI (formerly "Leo") core skills: Topics, Like Board, Business Events, Deduplication, Mute Filters, Summarization, priorities, "more like this / less like this" feedback.
- AI Feeds: 25 AI Feeds (Readless). https://feedly.com/new-features/posts/track-specific-topics-and-trends-with-feedly-ai (AI Feeds "included in the Pro+ plan")
- Mute filters: 100 (Pro+), vs 200 Business, 500 Enterprise. https://docs.feedly.com/article/246-how-many-mute-filters-can-i-have
- Newsletters: docs say Pro+ 50 / Business 100 / Enterprise 200 (https://docs.feedly.com/article/362-how-many-newsletter-feeds-can-i-create); the April 2023 Twitter-retirement post raised Pro+ from 50 to 75 and Readless (2026) reports 75. https://feedly.com/new-features/posts/update-regarding-the-feedly-twitter-integration
- RSS Builder (create feeds for sites without RSS): 50 feeds on Pro+, 100 on Enterprise (raised from 25 in 2023). https://docs.feedly.com/article/597-are-there-limits-to-the-number-of-rss-feeds-i-can-create-with-the-rss-builder
- Google News keyword feeds ("Google News feeds").
- Twitter/X feeds: original integration retired April 2023 when the API was discontinued; now requires the user's own X API key, and the docs FAQ says it is available only to Threat Intelligence / Market Intelligence plans, 1,000 tweets/day/feed. https://docs.feedly.com/article/674-faqs-about-the-feedly-twitter-integration
- Deduplication (85%+ overlap, across sources, 31-day window; toggle at feedly.com/i/account/ai). https://docs.feedly.com/article/218-how-does-deduplication-work
- IFTTT "New prioritized article" trigger (Pro+ and Business only). https://docs.feedly.com/article/396-what-triggers-are-available-in-ifttt
- Ad-free, faster delivery, Evernote/Pocket/OneNote, LinkedIn/Buffer/IFTTT/Zapier/Hootsuite (inherited from Pro).

**Enterprise (News Reader "Enterprise", also historically "Business"/"Teams")**
- Up to 7,500 sources.
- Team Feeds and Team Boards (unlimited Team Boards). https://docs.feedly.com/article/63-how-many-boards-can-i-create
- Create and send Newsletters (automated newsletters from AI Feeds/Boards, branded). https://docs.feedly.com/article/692-guide-to-automated-newsletters
- Slack and Microsoft Teams integrations. https://docs.feedly.com/article/816-how-to-use-feedlys-integration-for-slack-v2 , https://docs.feedly.com/article/678-feedly-and-microsoft-teams-integration-setup
- API access (Feedly Cloud/Enterprise API, webhooks).
- SSO/SAML. https://docs.feedly.com/article/756-feedly-enterprise-sso-integration-guide
- Onboarding and training.
- Advanced AI skills: industry intelligence, cybersecurity threat intelligence, biopharma research, competitive intelligence.
- Team Admin (users, newsletters, analytics), "Annotated" and "Recently Read" sidebar sections, team notes, mentions.
- Mute filters 500, newsletters 200, RSS Builder 100.
- Third-party summaries: "Advanced AI, 100-200 AI feeds, API access, SSO, 5-25 team seats" (Readless).

**Market Intelligence (primary: https://feedly.com/market-intelligence/pricing)**
- Standard, $1,600/mo billed annually, up to 10 seats: Market Intelligence AI Models, 100 AI Feeds, 5 Newsletter Templates, Company and Trend Insights Cards, team collaboration, dedicated customer service manager.
- Advanced, $2,400/mo billed annually, up to 25 seats: everything in Standard plus 200 AI Feeds, Ask AI, 20 Newsletter Templates, Emerging Trends Dashboards, Startup Innovation Radar, API access, SSO, unlimited workshops/training, multilingual AI, Large Company Lists (add-on). Newsletter recipients do not need a seat.

**Threat Intelligence (primary: https://feedly.com/threat-intelligence/pricing)**
- Standard: 1000+ TI AI Models; CVE, Threat Actor, Malware Insights Cards; 50 AI Feeds; 5 Newsletter Templates; Ask AI (CTI-optimized LLM and Report Builder); dedicated TI advisor; whole-team access.
- Advanced: everything in Standard plus Vulnerability/TTP/Cyberattack Intel Agents; 100 AI Feeds; 10 Newsletter Templates; OpenCTI, XSOAR, MISP no-code integrations; Slack and Microsoft Teams; Threat Graph STIX API; Threat Graph MCP Server; senior TI advisor; early access; add-ons (Third Party Intelligence, Dark Web Agents, Commercial Access).

### 1.3 Integrations reference (which plan, what triggers)

- Zapier triggers: New Article Saved in Read Later, New Article in Personal Board, New Article in Team Board, New Team Note, New Article in Feed, New Personal Note, New Article in Source. Actions: Add Article to Personal Board, Subscribe to Source, Add Article to Team Board, Create New Article. https://docs.feedly.com/article/25-what-are-the-feedly-triggers-and-actions-supported-in-the-feedly-zapier-integration
- IFTTT triggers: New article saved for later, New prioritized article (Pro+/Business), New article in Board, New Popular article from category, New note, New highlight, New article from category, New source added. Actions: Save an article for later, Add to personal Board, Add to Team Board, Add a new source. https://docs.feedly.com/article/396-what-triggers-are-available-in-ifttt
- Integrations collection (OneNote, SharePoint, Dropbox backup, MISP, OpenCTI, Cortex XSOAR, SSO): https://docs.feedly.com/collection/420-integrations
- OneNote setup: https://docs.feedly.com/article/507-setting-up-onenote-integration
- Slack v2: https://docs.feedly.com/article/816-how-to-use-feedlys-integration-for-slack-v2
- Microsoft Teams: https://docs.feedly.com/article/678-feedly-and-microsoft-teams-integration-setup
- Google Alerts as RSS (any plan): https://docs.feedly.com/article/294-how-to-add-follow-google-alerts-in-my-feedly ; non-Google keyword alerts: https://docs.feedly.com/article/72-can-i-create-a-keyword-alert-for-non-google-news-sites
- Newsletter feeds category: https://docs.feedly.com/category/445-newsletter-feeds
- Reddit category: https://docs.feedly.com/category/484-reddit ; per-day limit: https://docs.feedly.com/article/543-what-is-the-limit-for-posts-from-reddit-per-day ; types: https://docs.feedly.com/article/383-what-types-of-reddit-subreddit-feeds-can-i-add-to-feedly
- Twitter category: https://docs.feedly.com/category/440-twitter
- RSS Builder category: https://docs.feedly.com/category/592-rss-builder

---

## 2. UI / visual design

### 2.1 Overall layout (web app, 2025-2026)

Three-region layout: a **left navigation sidebar** ("Leftnav"), a **main content column** (stream/list) with a 56px top header bar, and an optional **right-hand article panel** (`#feedlyChrome__preview-wrapper`, fixed, 907px wide, border-left 1px) used for "side peek" reading; when open the frame gets `margin-right: 908px`. (Feedly production CSS, `main.ff8e7d27b11b002af538.css`.)

Key measurements from the production CSS:
- `.TopHeaderBar`: height 56px, white background, `border-bottom: 1px solid rgba(0,0,0,.05)`, z-index 497; `#feedlyFrame { scroll-padding-top: 56px }`.
- `.BaseLeftnav__list`: `background-color: var(--semanticColorBackgroundLight)` (#f7f7f7 light / #1a1a1a dark), `border-right: 1px solid var(--semanticColorBorderLightest)`, full height, scrollable area with 12px scrollbar.
- `.LeftnavItem__content`: height 30px; child items indent 26px; label line-height 1.5rem, single-line ellipsis; unread count 24px wide, font-size .625rem, weight 300, color ContentLight.
- `.LeftnavHeading__content`: height 30px, padding .25rem .5rem; `.LeftnavSection`: padding 0 .5rem 1.5rem (collapsed: .5rem bottom).
- Sidebar item states: `--leftnav-item-background-color` = AccentLight (#eaf7ed) when selected, StatesLightHover (#f2f2f2) on hover, StatesLightActive (#ecedee) when active. Row radius .375rem.
- `.LeftnavProfileItem` (top-left account/workspace dropdown): padding 7px .5rem, button radius .375rem.
- Pin/unpin sidebar: `[` shortcut; `.LeftnavPinButton`, `.LeftnavHoverBar` (fixed, z-index 502) for the unpinned hover state.
- Extra-wide page variant: `.Page__wrapper--extraWide { padding: 0 40px }`.
- Magazine column: `.magazine { width: min(100%, 624px) }`.
- Card grid item: `.LargeCardLayout { width: 420px; padding: 12px; border-radius: .375rem }`, visual height 272px, title clamp, summary clamped to 3 lines, hover toolbar top-right (1.25rem).
- Mini-magazine row: `.MiniMagazineLayout { display:flex; gap:1rem; max-width:420px; padding:.5rem; border-radius:.375rem }`, thumbnail 130x78.
- Inline (expanded-in-place) article: `.InlineArticle { border:1px solid rgba(0,0,0,.05); border-radius:3px; padding:33px; min-height:136px; margin-bottom:34px }`; in title-only view `margin-bottom:-1px`; in magazine views it bleeds 20px on both sides.
- Full article title: `.ArticleTitle { font-size:1.625rem; font-weight:650; letter-spacing:-0.4px; line-height:2rem; margin-top:3rem; margin-bottom:.5rem }`.
- Floating (full-screen) reader: `.floatingEntryContent { position:fixed; inset:0 0 0 auto; z-index:506 }`; content slide `margin: 3rem auto`.
- Selected/focused row: background `--semanticColorBackgroundLight`, focus border `--semanticColorBorderAccent`.

### 2.2 Left sidebar contents (top to bottom)

From the Feb 20, 2025 sidebar redesign post and the "How to navigate the left side menu" doc:
1. **Profile / workspace dropdown** (top-left): account, workspace, personalization settings consolidated into a single dropdown. Settings pages live at `feedly.com/i/account/general`, `/i/account/appearance`, `/i/account/ai`.
2. **Quick actions**: Go To (Cmd/Ctrl+K), Create AI Feeds, Follow Sources (Discover, "RSS icon"/`+` icon), Search (Power Search at `/i/powerSearch/in/`).
3. **Today** and **Read Later** (top-left of the dashboard on every plan). Docs describe Read Later as "at the bottom of your left sidebar" in one article and "top-left" in others; the 2025 sidebar lets users reorder.
4. **Favorites** (heart icon on any feed/folder/board/insight card/dashboard) pinned near the top.
5. **Team** section (Enterprise): Team Feeds (AI feeds or source feeds), Team Boards.
6. **Personal** section: Personal Feeds (folders containing sources, each with unread count), Personal Boards, AI Feeds, Dashboards; each section collapsible and drag-and-drop reorderable.
7. Business/Enterprise extras: Annotated, Team Admin, Recently Read.
8. Bottom utilities historically: theme toggle (moon/sun icon), gift icon (new features), `?` help, Feedly AI (Leo) entry ("Train Leo", Priorities, Mute Filters, Deduplication settings).
9. Every row has a "..." (three-dot) actions menu with Mark as Read, Rename, Add to Favorites, etc. (replacing right-click as the only path; right-click menus were added in Aug 2019).

Sources: https://feedly.com/new-features/posts/meet-your-new-sidebar-less-clutter-more-personalization ; https://docs.feedly.com/article/801-how-to-navigate-through-feedly ; https://www.elegantthemes.com/blog/marketing/how-to-use-feedly-the-ultimate-guide ; https://www.androidpolice.com/2019/08/31/feedly-updates-web-app-with-dark-mode-right-click-menus-and-more/ ; https://feedly.com/new-features/posts/navigate-feedly-faster-with-go-to

### 2.3 Header / toolbar of a stream

- Feed/folder title, unread count, "Mark all as read" (Shift+A / checkmark), refresh, layout picker ("Select one of the three layout options on the top right of your screen" on desktop), sort (Latest / Most Popular), filter (unread only / all), Top Stories tab (AI Feeds/Boards/Folders; qualifies when five or more sources cover a story), bulk-select checkbox on AI Feeds (selects the first 25 articles for Ask AI / mark read / hide / board actions).
- Search: search icon in nav opens Power Search with scope (All Feeds, All Boards, Annotated, Recently Read, Beyond Your Feedly, AI Feeds, specific feed/board), Everything vs Title only, date range (Today / 7 days / 30 days / Forever / Custom), sort Newest vs Popularity, media type (Any / Video / Audio / Documents).
- Sources: https://docs.feedly.com/article/276-how-do-i-change-the-views-of-my-feeds-and-source ; https://docs.feedly.com/article/78-how-can-i-search-within-my-feedly ; https://feedly.com/new-features/posts/top-stories-market-intelligence ; https://feedly.com/new-features/posts/bulk-article-selection

### 2.4 Reading view modes

Per-feed and per-folder layout preference is remembered ("each feed and category can have its own view"). Desktop shows three layout options in the top-right; mobile offers Text-only / Magazine / Cards plus density Compact / Comfortable.

- **Title-only**: dense single-line rows (favicon/source, title, snippet, time, hover toolbar `.TitleOnlyEntry__toolbar`); "crunch through lots of content"; pressing `o`/click expands the article inline (`.InlineArticle--titleOnly`).
- **Magazine** (default): title + thumbnail + first lines; column width 624px; a "mini-magazine" variant with 130x78 thumbnails is used in narrower/side contexts.
- **Cards**: image-forward 420px cards with 272px visual, title, 3-line summary; grid.
- **Article / Full**: every story rendered in full, scroll to read, no clicking.
- Reader: inline expansion in place, right-side "side peek" panel (907px), or full floating overlay; `v` opens original in new tab; summary sentences can be highlighted in blue (Feedly AI summarization, can be disabled in preferences); Read Later bookmark icon, Save to Board star, share, notes/highlights toolbar; "Less like this"/"More like this" thumbs for AI feedback; duplicates count shown in a small grey box at the bottom-right of a feed.
- Sources: https://docs.feedly.com/article/276-how-do-i-change-the-views-of-my-feeds-and-source ; https://www.hongkiat.com/blog/feedly-shortcuts-tips-tricks/ ; https://devhd.wordpress.com/2013/11/14/the-new-title-only-and-card-views/ ; https://feedly.com/new-features/posts/feedly-ai-and-summarization ; https://docs.feedly.com/article/338-saving-an-article-to-your-read-later-section

### 2.5 Today page

- Described as "a frontpage of a newspaper": the **10 most shared unread articles across all your feeds** (ranked by Facebook share metrics), plus per-feed groupings in the classic layout; the Explore/Discover entry is reachable from Today.
- "Most Popular" sort shows stories many Feedly users bookmark.
- Source: https://docs.feedly.com/article/530-how-are-the-articles-in-the-today-view-compiled ; https://www.elegantthemes.com/blog/marketing/how-to-use-feedly-the-ultimate-guide

### 2.6 Explore / Discover ("Follow Sources")

- Opened from the left nav (`+` / RSS icon). A search box at top accepts a topic, `#hashtag`, website name or URL. Results are source cards with follower counts and +FOLLOW (with folder picker). Sort options: Best Match (popularity + relevance), Followers, Relevance. "Similar sources" link on each source. Curated bundles (e.g., Cybersecurity, Vulnerability intelligence, National newspapers, Foreign affairs, Threat intelligence, Tech and innovation) with hover tooltip "view feeds". Also entry points for Newsletters (unique email address), Reddit, X/Twitter (own API key), RSS Builder, OPML import.
- Sources: https://docs.feedly.com/article/287-how-to-find-and-add-follow-sources ; https://docs.feedly.com/article/768-follow-sources-in-feedly ; https://blog.feedly.com/6-ways-to-discover-great-content-with-feedly/ ; https://feedly.com/new-features/posts/discover-subject-matter-experts

### 2.7 Settings / preferences

- Account > General: default start page (Today, All, a feed, etc.). https://docs.feedly.com/article/284-how-can-i-set-up-default-starting-page
- Account > Appearance: theme (Light / Dark / System preference; a third "night" theme exists in CSS), font family (Inter default, OpenDyslexic, Merriweather, Noto Sans, "Helvetica Neue/Open Sans" fallbacks; premium fonts Pro), font size, density. https://docs.feedly.com/article/259-how-can-i-enable-dark-mode ; https://docs.feedly.com/article/210-how-to-customize-the-font-size-and-family
- Account > Feedly AI (`/i/account/ai`): deduplication on/off, AI feedback prompts on/off, summary highlighting. https://docs.feedly.com/article/374-how-can-i-disable-deduplication ; https://docs.feedly.com/article/610-how-can-i-turn-off-the-feedly-ai-feedback-prompts
- Preferences: auto-mark-as-read on scroll (`.feedlyFrame--mark-read-on-scroll`), mini toolbar sharing tools, keyboard shortcuts. https://docs.feedly.com/category/471-preferences

### 2.8 Keyboard shortcuts (official doc)

Navigation: `Cmd/Ctrl+K` Go To; `g t` Today; `g a` All; `g l` Read Later; `g i` Index; `g o` Organize Feeds; `g p` Preferences; `g g` Jump To; `g f` Favorites; `Shift+J` / `Shift+K` next/previous feed or folder; `/` open Ask AI; `r` refresh; `[` pin/hide sidebar; `?` show shortcuts overlay.
Article list: `j` / `k` inline next/previous article; `n` / `p` select next/previous without opening; `Shift+A` mark all as read.
Selected article: `o` inline open/close; `v` view original in new tab; `Shift+V` preview; `m` toggle read; `x` mark read and hide; `s` save to Read Later; `t` save to Board; `b` Buffer; `c` clip to Evernote.
Sources: https://docs.feedly.com/article/81-what-are-the-keyboard-shortcuts ; https://keycheck.dev/apps/feedly/ ; https://www.hongkiat.com/blog/feedly-shortcuts-tips-tricks/

### 2.9 Colors (from Feedly's production design tokens)

Brand green is **#2bb24c** ("Feedly Eucalyptus"; RGB 43,178,76). https://brandcolors.net/b/feedly ; https://www.designpieces.com/palette/feedly-color-palette-hex-and-rgb/

Feedly's app uses a semantic token system (`--semanticColor*`, `--semanticSpacing*`, `--semanticSizing*`) defined on `:root, .theme--light`, `.theme--dark`, and `.theme--night`. Core values (light / dark):

| Token | Light | Dark |
|---|---|---|
| BackgroundLightest (page) | #ffffff | #121212 |
| BackgroundLight (sidebar, selected rows) | #f7f7f7 | #1a1a1a |
| BackgroundMedium | #e6e6e6 | #4c4c4c |
| BackgroundBold / Boldest | #9e9e9e / #333333 | #757575 / #e6e6e6 |
| BackgroundElevationLight / Medium / Bold | #ffffff / #ffffff / #121212 | #202020 / #262626 / #262626 |
| BackgroundAccent | #2bb24c | #6bc982 |
| BackgroundAccentLight / Medium / Bold | #eaf7ed / #d5f0db / #bfe8c9 | #0b2d13 / #0d3517 / #11471e |
| BackgroundAccentMain (navy) | #061427 | #e6e6e6 |
| StatesAccentHover / AccentBoldHover | #228e3d / #55c170 | #40ba5e / #228e3d |
| StatesLightHover / LightActive | #f2f2f2 / #ecedee | #262626 / #333333 |
| ContentBold (primary text) | #333333 | #e6e6e6 |
| ContentMedium (secondary) | #757575 | #9e9e9e |
| ContentLight (tertiary) | #9e9e9e | #757575 |
| ContentAccent | #2bb24c | #6bc982 |
| ContentAccentVivid / VividBold | #8df4bc / #22e059 | same |
| BorderLightest / Light / Medium / Bold | #f2f2f2 / #d9d9d9 / #bfbfbf / #333333 | #262626 / #333333 / #646464 / #e6e6e6 |
| BorderAccent | #2bb24c | #6bc982 |
| Danger / Warning / Info / Aware / Success | #f44336 / #ff9800 / #3979cc / #ffca0d / #2bb24c | same |
| HighlightYellow / HighlightGreen (annotations) | #fff7aa / #dff3e4 | #665f22 / #0d3517 |
| BackgroundYellow | #ffee55 | #ffee55 |
| Overlay medium / bold | rgba(0,0,0,.38) / rgba(0,0,0,.64) | same |
| Services: Feedly / Google / Twitter / Reddit / Bluesky / Apple / SSO | #2bb24c / #4285f4 / #1da1f2 / #ff4500 / #1185fe / #000000 / #6d747d | same |
| DataViz primary / secondary / tertiary / quaternary / quinary / sextenary | #5da2c1 / #e59e4d / #ce6969 / #69b487 / #facf53 / #bc9d6e | #3687ac / #b8701d / #a44343 / #2a825e / #c99f26 / #6c593b |
| Text selection | #d1dcfa | #2c3859 |

Other literal colors in the sheet: dark body `background:#121212; color:#e6e6e6; scrollbar-color:#2a2a2a #181818`; dark borders/hr #2a2a2a; light entry text #333, snippet/summary #9e9e9e (13px/17px); focus ring #2bb14c.

Source: Feedly production stylesheet `https://s1.feedly.com/web/main/main.ff8e7d27b11b002af538.css` (referenced by https://feedly.com/i/pro), fetched 2026-09-16. The hash will rotate; look for `s1.feedly.com/web/main/main.*.css` in the page source.

### 2.10 Typography

- App UI font: **Inter** (variable), `--font-sans-serif: 'InterVariable', 'InterVariable Fallback', sans-serif` (with `'Inter'` static fallback), loaded from `https://s1.feedly.com/styles/inter.css` / `s1.feedly.com/fonts/inter/InterVariable.woff2`. Uses `font-feature-settings: "liga" 1, "calt" 1` and `font-variation-settings: "opsz" var(--font-optical-sizing)` with optical sizes 14/20/24/28/32.
- Marketing site (feedly.com, Next.js): headings in **Aeonik Pro VF** (`s1.feedly.com/fonts/aeonik/aeonikprovf-latin.woff2`), body Inter.
- Reader font options: OpenDyslexic, Merriweather (serif), Noto Sans; code `SF Mono, SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas`.
- Most common sizes: .875rem (14px) body/list, 1rem, .8125rem (13px) nav rename/meta, .75rem (12px) captions, .625rem (10px) unread counts, 1.25rem subheads, 1.625rem article title, 2.125rem page hero.
- Weights: 550 (medium, most common), 400, 650 (titles), 300 (counts). Inter variable enables the 550/650 values.
- Sources: production CSS and homepage HTML (fetched); https://docs.feedly.com/article/210-how-to-customize-the-font-size-and-family

### 2.11 Spacing, radii, icons

- Spacing scale (`--semanticSpacingPositive*`): 0, 100=.125rem, 200=.25rem, 300=.5rem, 400=.75rem, 500=1rem, 600=1.5rem, 700=2rem, 750=2.5rem, 800=3rem, 825=3.25rem, 900=4rem, 1000=5rem, 1100=6rem (smaller values at narrow breakpoints). Sizing scale mirrors this plus 550=1.25rem, 650=1.75rem, 775=2.75rem, 850=3.5rem.
- Border radii: .375rem (6px) is the default for rows, buttons, cards; .75rem (12px) for larger panels/modals; 50% for avatars/favicons; 500rem pills; 3px for inline article frames.
- Icons: a custom icon font ("icomoon") plus inline SVGs; 16px favicons in the nav; 20px small icons; 40px empty-state icons. Style is thin/rounded line icons, monochrome, tinted with Content tokens; the brand mark is the green "feedly" wordmark with the origami-style "f" logo.
- Design principles page (no tokens published): https://design.feedly.com/ ("Simple yet powerful", "Prioritizing user agency", "Open knowledge", "Ethical, accessible and inclusive").

### 2.12 Dark mode

- Settings > Appearance > Theme: Light / Dark / System preference (system sync added after the Aug 2019 launch); mobile: left sidebar > "Choose Theme". CSS implements `.theme--light`, `.theme--dark`, `.theme--night` (night is a darker variant with the same #121212 base and a few different accents) and a `prefers-color-scheme: dark` media query.
- Sources: https://docs.feedly.com/article/259-how-can-i-enable-dark-mode ; https://www.androidpolice.com/2019/08/31/feedly-updates-web-app-with-dark-mode-right-click-menus-and-more/

### 2.13 Design articles and history

- Feb 2025: "Meet your new sidebar: less clutter, more personalization" (dock removed, drag-and-drop sections, favorites, consolidated settings dropdown, "..." row menus). https://feedly.com/new-features/posts/meet-your-new-sidebar-less-clutter-more-personalization
- Apr 2026: "Navigate Feedly Faster with Go To" (Cmd+K palette). https://feedly.com/new-features/posts/navigate-feedly-faster-with-go-to
- Jan 2025: bulk selection checkbox on AI Feeds. https://feedly.com/new-features/posts/bulk-article-selection
- Sep 2024: Top Stories tab. https://feedly.com/new-features/posts/top-stories-market-intelligence
- Aug 2019: web redesign with dark mode, big "+" add-content button, inline rename, drag-and-drop, right-click menus. https://www.androidpolice.com/2019/08/31/feedly-updates-web-app-with-dark-mode-right-click-menus-and-more/
- 2018: mobile redesign with bottom tabs. https://www.androidauthority.com/feedly-redesign-924883/
- 2013: title-only and cards views introduced. https://devhd.wordpress.com/2013/11/14/the-new-title-only-and-card-views/
- 2014: pin/unpin left nav. https://devhd.wordpress.com/2014/03/19/fixit-march-7-pinunpin-the-left-navigation-bar/
- Older Feedly blog design reviews (now redirect to feedly.com/resources): blog.feedly.com/exploring-some-design-changes/ and blog.feedly.com/organize/
- Community concepts: Behance "feedly Redesign Concept" (2015) https://www.behance.net/gallery/28638285/feedly-Redesign-Concept ; Dribbble tag (61 shots) https://dribbble.com/tags/feedly ; Behance search https://www.behance.net/search/projects/?search=feedly
- Feedly changelog (weekly, mostly intelligence products): https://feedly.com/changelog ; new features index: https://feedly.com/new-features

---

## 3. Feedly AI (Leo) features

Leo launched as a beta in 2019 and became generally available with the Pro+ plan (Dec 2019, $12/mo then). It was rebranded "Feedly AI" around 2022; the docs now say "Feedly AI" but "Leo" persists in shortcuts (`Train Leo`) and marketing.

- **Priorities ("Train Leo")**: from the All tab (Personal or Team Feeds) or a specific feed, choose a priority type: **Topic** (1,000+ pre-trained topics), **Industry**, **Like Board** (train by example from a board you curate), **Business Event** (funding, partnerships, product launches, leadership changes, M&A), **keywords/entities**; combine with AND/OR layers; prioritized articles are surfaced at the top / in a "Priority" section and can trigger IFTTT "New prioritized article". Feedback via thumbs / "More like this" / "Less like this" (downvote arrow on hover opens a refinement popup). https://coywolf.com/news/productivity/feedly-pro-plus-leo-ai/ ; https://www.elegantthemes.com/blog/marketing/how-to-use-feedly-the-ultimate-guide ; https://docs.feedly.com/collection/411-train-feedly-ai
- **Mute filters**: keywords, companies, people, topics, authors (`author:`), sites (`site:`), title-only (`title:`); duration 1 day / 1 week / 1 month / forever; scope one folder or all folders; created from Profile > Feedly AI > Mute Filters or by highlighting text > "Mute This Phrase" / "Less Like This". Limits: 25 legacy Pro, 100 Pro+, 200 Business, 500 Enterprise (an older 2019 post cites 25 terms per feed on Pro+). https://docs.feedly.com/article/109-how-can-i-add-create-a-mute-filter ; https://docs.feedly.com/article/246-how-many-mute-filters-can-i-have ; https://feedly.com/new-features/posts/feedly-ai-and-mute-filters ; https://docs.feedly.com/category/706-mute-filters
- **Deduplication**: articles whose content overlaps by more than 85% (across different sources, within the last 31 days) are collapsed to one; marking one read marks all versions; count shown in a grey box at bottom-right of the feed and in feed Analytics; articles under ~200 words are skipped (older note); on by default, toggle at `/i/account/ai`; not applied through third-party sync clients. Pro+ and above. https://docs.feedly.com/article/218-how-does-deduplication-work ; https://docs.feedly.com/article/374-how-can-i-disable-deduplication ; engineering post on clustering latency https://feedly.com/engineering/posts/reducing-clustering-latency
- **Summarization**: extractive; Leo picks the key sentences (API exposes `leoSummary` = "two most salient sentences" with position/score), shows them as list descriptions and highlights them in blue in the article; also used for board newsletters and Slack; Pro+ and Business. Dec 2019. https://feedly.com/new-features/posts/feedly-ai-and-summarization
- **Topics and Trends**: 1,000+ pre-trained topics plus trend/entity models; Emerging Trends dashboards (Market Intelligence Advanced); Trend Insight Cards. https://feedly.com/new-features/posts/track-specific-topics-and-trends-with-feedly-ai ; https://feedly.com/new-features/posts/unlock-industry-insights-to-drive-smarter-decisions
- **AI Feeds** (2022+): a builder where you pick AI Models (topics, companies, business events, technologies, threat entities), combine with AND/OR/NOT, then choose sources (Web = millions of sources, "Top sources" ~30% highest quality, your feeds/folders, curated bundles) and language (English only vs All Web); target 10-20 articles/week; refine via downvote feedback. 25 AI Feeds on Pro+, 50-200 on intelligence plans. https://feedly.com/new-features/posts/track-specific-topics-and-trends-with-feedly-ai ; https://docs.feedly.com/article/767-refining-ai-feeds-feedly ; https://docs.feedly.com/article/765-building-ai-feeds-using-pirs-feedly ; https://docs.feedly.com/article/549-refining-feedly-ai-feeds
- **Top Stories**: tab in AI Feeds/Boards/Folders filtering stories covered by five or more sources, each with an Insights Card (sources, trend chart, Ask AI). https://feedly.com/new-features/posts/top-stories-market-intelligence ; https://feedly.com/new-features/posts/top-stories-ti
- **Ask AI** (2025, intelligence plans): `/` shortcut; run prompts over up to 25 selected articles (summaries, translations, tables of funding/launches, IoC/TTP extraction) with inline citations back to source articles; available in AI Feeds, Team Boards and Search results; "AI Actions" (summary, translation, prediction) stored per article; API endpoints `search-ask-ai` and `ai-actions-experimental`. https://feedly.com/new-features/posts/new-feedly-ask-ai-from-information-overload-to-actionable-insights ; https://feedly.com/new-features/posts/new-feedly-ask-ai-synthesize-threat-reports-and-articles-in-minutes-with-high-accuracy ; https://docs.feedly.com/article/723-guide-to-ai-actions-threat-intelligence ; https://feedly.com/new-features/posts/bulk-article-selection
- **Industry AI Models** (May 2025): per-industry models powering AI Feeds, Emerging Trend dashboards, Use Case tables. https://feedly.com/new-features/posts/unlock-industry-insights-to-drive-smarter-decisions
- **Leo skills summary**: prioritize topics/trends/keywords, deduplicate, mute, summarize, business events, like-board, industry, threat intel (CVE, malware, threat actors), competitive intel. https://futuretools.io/tools/feedly-leo ; https://completeaitraining.com/ai-tools/feedly-leo/

---

## 4. Feedly API and data-model concepts

The public "Feedly Cloud API" reference (developer.feedly.com/v3/...) has been replaced by an Enterprise/Threat-Intel-focused portal at https://developers.feedly.com/ (index: https://developers.feedly.com/llms.txt ; append `.md` to any page for markdown). The classic v3 resource concepts are still what the app and API use.

### 4.1 Transport
- Base `https://api.feedly.com`, REST with GET/POST/DELETE, JSON, timestamps as epoch milliseconds, `Authorization: Bearer <token>` (older docs: `OAuth <token>`), rate limited, pagination via `continuation` tokens. https://developers.feedly.com/reference/introduction ; https://developers.feedly.com/docs/understanding-continuation ; https://developers.feedly.com/reference/request-limits

### 4.2 Identifiers (the core of the data model)
- User: `user/<uuid>`
- Feed (source): `feed/<feed-url>` e.g. `feed/http://feeds.engadget.com/weblogsinc/engadget`
- Category (folder): `user/<uuid>/category/<label-or-uuid>`; enterprise: `enterprise/<company>/category/<uuid>`
- Tag (board): `user/<uuid>/tag/<label-or-uuid>`; enterprise boards: `enterprise/<company>/tag/<uuid>`
- Global/system streams: `user/<uuid>/category/global.all` (everything), `global.must` (Must Read / prioritized), `global.uncategorized`, `user/<uuid>/tag/global.saved` (Read Later), `global.read` (recently read; present as a tag when explicitly marked read), `global.annotated`
- Priority (Leo) streams: `user/<uuid>/priority/<uuid>`; AI feeds appear via `sources[].streamId`
- Entry id: opaque, e.g. `Dz51gkBgvGUvFOfTATCYLB2uqVaBIaGGazzxpZh2WL0=_16549c827dd:1645ba:3da9d93` (unique and immutable)
- Sources: https://gist.github.com/d3m3vilurr/5904029 ; https://github.com/feedly/python-api-client/blob/master/README.md ; https://rdrr.io/github/hrbrmstr/seymour/man/feedly_stream.html ; https://developers.feedly.com/reference/collect-articles

### 4.3 Resources and endpoints (classic v3 + current)
- **Profile**: `GET /v3/profile` (id, email, fullName, picture, locale, wave/plan, client). 
- **Subscriptions (feeds)**: `GET/POST /v3/subscriptions`, `DELETE /v3/subscriptions/:feedId`; a subscription has `id`, `title`, `website`, `categories[{id,label}]`, `updated`, `velocity` (articles/week), `topics`, `visualUrl`, `iconUrl`, `coverUrl`, `subscribers`.
- **Feeds metadata / search**: `GET /v3/feeds/:feedId`, `GET /v3/search/feeds?query=` (Discover: title, description, subscribers, velocity, topics, language, deliciousTags).
- **Categories (folders)**: `GET /v3/categories`, `POST /v3/categories/:id` (rename), `DELETE /v3/categories/:id`; enterprise: `GET /v3/enterprise/categories` (team folders) https://developers.feedly.com/reference/getteamfolders
- **Tags (boards)**: `GET /v3/tags`, `PUT /v3/tags/:tagId` (tag entries), `DELETE /v3/tags/:tagId/:entryId` (untag); boards carry `id`, `label`, `description`, `cover`, `isPublic`, `htmlUrl`; team boards: https://developers.feedly.com/reference/get-list-of-team-boards ; add/remove: https://developers.feedly.com/reference/add-articles-to-board , https://developers.feedly.com/reference/delete-article-from-board
- **Streams**: `GET /v3/streams/contents?streamId=&count=(1-100; classic max 1000 via continuation)&ranked=newest|oldest&unreadOnly=&newerThan=&olderThan=&continuation=&includeAiActions=&similar=` returns `{id, title, updated, continuation, items[]}`; `GET /v3/streams/ids` returns only entry ids. https://developers.feedly.com/reference/collect-articles
- **Entries**: `GET /v3/entries/:id`, `POST /v3/entries/.mget` (batch), `POST /v3/entries` (create own entry). https://developers.feedly.com/reference/get-article-metadata ; https://developers.feedly.com/reference/get-multiple-article-metadata
- **Markers**: `GET /v3/markers/counts` (unread counts per stream, `{unreadcounts:[{id,count,updated}]}`), `POST /v3/markers` with `{action: markAsRead|keepUnread|markAsSaved|markAsUnsaved|undoMarkAsRead, type: entries|feeds|categories|tags, entryIds|feedIds|categoryIds|tagIds, lastReadEntryId|asOf}`, `GET /v3/markers/reads` (since), `GET /v3/markers/tags`, `GET /v3/markers/latest`.
- **Mixes**: `GET /v3/mixes/contents?streamId=&count=&hours=&newerThan=&backfill=&locale=` — the "most engaging" / Most Popular ranking used by Today.
- **Search**: `POST /v3/search` (Power Search over streams with query, fields, layers, dates, `ranked`), `GET /v3/search/contents`. https://developers.feedly.com/docs/using-the-search-api ; https://developers.feedly.com/reference/search
- **Priorities (Leo)**: `GET/POST/DELETE /v3/priorities` (layers of topics/entities/keywords, streamIds, `active`, unread counts).
- **Annotations**: highlights + comments on entries, `POST /v3/annotations`. https://developers.feedly.com/docs/annotations ; https://developers.feedly.com/reference/annotate-articles
- **AI Feeds list**: https://developers.feedly.com/reference/get-list-of-ai-feeds ; **Ask AI**: https://developers.feedly.com/reference/search-ask-ai ; structured outputs: https://developers.feedly.com/reference/ai-actions-experimental
- **Webhooks** (enterprise): NewEntrySaved, NewAnnotation, NewWebAlertEntry. https://developers.feedly.com/reference/create-or-update-a-webhook
- **Deduplication in streams** (experimental guide): https://developers.feedly.com/docs/removing-duplicates-from-streams-api
- **Enterprise users**: https://developers.feedly.com/reference/listenterpriseusers
- Official clients: https://github.com/feedly/python-api-client ; unofficial: https://github.com/hrbrmstr/seymour (R), https://pkg.go.dev/github.com/seiji/feedly (Go), http://hildjj.github.io/node-feedly/doc/class/Feedly.html (Node)

### 4.4 Entry (Article) JSON (current "Article JSON" reference)
https://developers.feedly.com/reference/articlejson

Core: `id`, `originId`, `fingerprint`, `sid`, `title`, `author`, `authorDetails{fullname,username,url,icon,picture,source}`, `crawled`, `published`, `updated`, `recrawled`, `language`.
Content: `content{content,direction}`, `summary{content,direction}`, `fullContent`, `linked[]`.
Links/source: `alternate[{href,type}]`, `canonicalUrl`, `origin{streamId,title,htmlUrl}`, `enclosure[{href,type,length}]`, `visual{url,width,height,contentType}`, `keywords[]`.
Organization: `categories[{id,label}]` (folders), `tags[{id,label,addedBy,actionTimestamp}]` (boards, Read Later = global.saved, global.read), `sources[{streamId,title,feedlyFeedType,searchTerms}]` (AI feeds).
State/metrics: `unread` (auto-archived after 30 days), `readTime`, `engagement`, `engagementRate`.
AI enrichment: `leoSummary{sentences[{text,position,score}]}`, `commonTopics[{type,id,label,score,salienceLevel}]`, `entities[{type,id,label,mentions,salienceLevel}]`, `businessEvents[{id,label,score}]`, `duplicates[]` (85%+ overlap), `clusters[{id}]`, `featuredMeme{id,label,score}`, `priorities[]`, `aiActions[{summary|translation|prediction, created}]`, `annotations[{author,created,highlight,comment,mentions}]`, `previewSearchTerms`, plus TI fields (`indicatorsOfCompromise`, `attackNavigator`).

### 4.5 Suggested clone data model derived from the above
- User (id, email, name, avatar, plan, preferences{theme, font, density, defaultView, startPage, markReadOnScroll, dedupe, aiFeedback}).
- Source/Feed (id = `feed/<url>`, title, website, iconUrl, visualUrl, coverUrl, velocity, topics, lastFetched, type: rss|youtube|reddit|newsletter|twitter|googlenews|rssbuilder|keywordalert).
- Category/Folder (id, label, order, view preference, sources[]), Team vs Personal scope.
- Entry (fields above), per-user EntryState (unread, saved, readAt, hidden, priority score, duplicateOf).
- Tag/Board (id, label, description, cover, isPublic, htmlUrl, team|personal), BoardEntry (entryId, addedBy, addedAt), Annotation (highlight, comment).
- Priority (layers of topics/entities/keywords/like-board, scope streamIds, active), MuteFilter (keyword|topic|author|site|title, scope, expiresAt), AIFeed (models + AND/OR/NOT, sources scope, language), Favorites (ordered refs), Sidebar order.
- Markers: unread counts per stream, mark-as-read operations, "Most Popular" (engagement) and "Today" (top 10 unread by engagement) derived views.

---

## 5. Open-source Feedly clones and comparable readers

### 5.1 Repos that explicitly clone Feedly's UI
| Repo | Stack | Notes |
|---|---|---|
| https://github.com/greggawatt/reedly (reedly.io) | Backbone.js SPA + Rails | "An open source implementation of a single paged rss reader. A clone of feedly." Feeds, categories, accounts. |
| https://github.com/AlexanderRichey/NewsJunkie | Ruby on Rails + React, Feedjira, Nokogiri, pgSearch, Paperclip/AWS | Feed caching (15-min), search, read history, Facebook OAuth. |
| https://github.com/etgrieco/easy-feeds | Rails + PostgreSQL, React/Redux, Feedjira, MetaInspector | Responsive nav (collapses under 700px), modal story view. |
| https://github.com/cnguyen714/Feedr | Rails API + PostgreSQL, React/Redux, Webpack | Sidebar listing subscriptions/collections, nested feed index components. |
| https://github.com/finneysm7/Greedly | Backbone.js + Rails API | Sliding sidebar transitions, regex search endpoint. |
| https://github.com/Concrete18/Feedly-Clone ("Feedler") | React/Redux, Express, Sequelize, PostgreSQL | CRUD feeds/sources, live RSS population, demo login. |
| https://github.com/Saiteja2003/nexus-reader-client | React/Next.js, Context/Redux, Tailwind/Styled Components, Axios | "Frontend for the Feedly clone project", responsive. |

### 5.2 Mature open-source readers (useful for architecture and UI patterns)
| Reader | Language / stack | License | Model | Notes |
|---|---|---|---|---|
| FreshRSS https://github.com/FreshRSS/FreshRSS | PHP (+ SQLite/MySQL/PostgreSQL) | AGPL-3.0 | self-hosted, multi-user | Google Reader + Fever APIs, 1M+ articles, extensions, OPML. |
| Miniflux https://github.com/miniflux/v2 | Go single binary + PostgreSQL | Apache-2.0 | self-hosted | Minimalist, keyboard-driven, Fever/Google Reader APIs, no JS frameworks. |
| NewsBlur https://github.com/samuelclay/NewsBlur | Python/Django + Backbone.js, PostgreSQL, MongoDB, Redis, Elasticsearch, Celery | MIT | hosted + self-host | "Intelligence trainer" (like/dislike per author/tag/title), Grid/List/Split/Magazine views, dark mode, MCP server. Closest feature analogue to Leo. |
| Feedbin https://github.com/feedbin/feedbin | Ruby on Rails, PostgreSQL, Elasticsearch, Redis, Node extract service | MIT | hosted (self-host discouraged) | Full-content extraction, image proxy, face-detection crops, newsletters, Feedbin API used by many clients. |
| NetNewsWire https://github.com/Ranchero-Software/NetNewsWire | Swift (macOS/iOS) | MIT | native | Syncs with Feedbin, Feedly, iCloud, FreshRSS, Miniflux, NewsBlur, etc. |
| yarr https://github.com/nkanaev/yarr | Go + embedded SQLite, vanilla JS | MIT | single binary | Tray app or headless; Fever API. |
| Fluent Reader https://github.com/yang991178/fluent-reader | Electron, React, Redux, Fluent UI, Lovefield, Mercury Parser | BSD-3-Clause | desktop | Cards/list/magazine/compact layouts, dark mode, syncs with Inoreader, Feedbin, The Old Reader, BazQux, Fever, Google Reader API. |
| Folo (Follow) https://github.com/RSSNext/Folo | TypeScript, React, Electron, mobile apps | AGPL-3.0 | hosted + apps | AI translation/summaries, 39k+ stars, media views, lists. |
| CommaFeed https://github.com/Athou/commafeed | Java (Quarkus) + React | Apache-2.0 | self-hosted | Google Reader-inspired, folders, tags, search. |
| Tiny Tiny RSS https://git.tt-rss.org/fox/tt-rss | PHP | GPL-3.0 | self-hosted | Filters, plugins. |
| Nextcloud News https://github.com/nextcloud/news | PHP + Vue | AGPL-3.0 | Nextcloud app | |
| selfoss https://github.com/fossar/selfoss | PHP/JS | GPL-3.0 | self-hosted | |
| Fusion https://github.com/0x2E/fusion | Go | MIT | self-hosted | Lightweight, PWA. |
| Refeed https://github.com/michaelhthomas/refeed | TypeScript | MIT | self-hosted | Timed bookmarks, newsletter-to-RSS. |
| Glance https://github.com/glanceapp/glance | Go | AGPL-3.0 | dashboard | |
| Stringer https://github.com/stringer-rss/stringer | Ruby | MIT | self-hosted | "Anti-social" reader. |
| Newsboat https://github.com/newsboat/newsboat | C++ (TUI) | MIT | terminal | vi keys. |
| RSSHub https://github.com/DIYgod/RSSHub | TypeScript | AGPL-3.0 | feed generator | Equivalent of Feedly's RSS Builder for sites without feeds. |
| RSS-Bridge https://github.com/RSS-Bridge/rss-bridge | PHP | Unlicense | feed generator | |
| Feeder https://github.com/spacecowboy/Feeder | Kotlin (Android) | GPL-3.0 | mobile | Material You. |
| Raven Reader, RSS Guard, Liferea, QuiteRSS | Vue/Electron, C++/Qt, C/GTK, C++/Qt | MIT/GPL | desktop | |
| Inoreader (https://www.inoreader.com), Reeder (https://reederapp.com) | proprietary | — | hosted / native Swift | Closest commercial analogues (Inoreader: rules, dedupe, Team, 150 free feeds). |

Sources: comparison gist of 24 readers https://gist.github.com/kevinmichaelchen/9d40fde5b8408fc0417f187359e07001/ ; https://opensourceprojects.cc/alternatives/feedly ; https://www.newsblur.com/alternative/open-source-rss-reader ; https://www.pistack.xyz/posts/self-hosted-rss-readers/ ; https://www.readless.app/blog/best-rss-readers-2026 ; repo READMEs fetched for Feedbin, NewsBlur, Folo, Fluent Reader and the Feedly clones listed above.

---

## 6. Quick "build sheet" for a faithful clone

- Shell: 56px top bar; sidebar bg #f7f7f7 (dark #1a1a1a) with 1px #f2f2f2 (dark #262626) right border; 30px rows, 6px radius, selected row #eaf7ed (dark #0b2d13) with green text; unread counts 10px/300 weight; child indent 26px; sections collapsible with "..." menus; heart = favorite; profile dropdown top-left; `[` pins/unpins.
- Content column: white (dark #121212); magazine column 624px; cards 420px with 272px image; title-only rows with inline expand; hover toolbars (bookmark = Read Later, star = Board, checkmark = read, hide, share, "less like this"); layout switcher top-right; per-stream layout memory; mark-read-on-scroll option.
- Reader: side panel 907px or floating overlay; title 26px/650/-0.4px; body Inter 16px, snippet 13px #9e9e9e; blue-highlighted summary sentences; notes/highlights with yellow (#fff7aa) and green (#dff3e4) highlight backgrounds.
- Green #2bb24c for primary buttons/links/active states, hover #228e3d; navy #061427 as secondary "AccentMain"; semantic Danger #f44336, Warning #ff9800, Info #3979cc.
- Fonts: Inter variable (UI), Aeonik Pro (marketing headings), Merriweather/OpenDyslexic/Noto Sans as reader options.
- Views: Today (10 most-shared unread), Read Later (`global.saved`, ordered by save time), Boards (star), Feeds/folders, AI Feeds, Explore/Follow Sources (search + bundles + cards with follower counts and +FOLLOW), Power Search with scopes and filters, Settings (General / Appearance / Feedly AI), keyboard shortcuts overlay (`?`), Go To palette (Cmd+K), dark/system theme.
- Premium gating: Free 100 sources / 3 folders / 3 boards, no search, no AI; Pro 1,000 sources, search, notes/highlights, integrations, 250 boards, premium fonts, ad-free; Pro+ 2,500 sources, Leo (priorities, mute 100, dedupe 85%, summaries, AI feeds 25), newsletters 75, RSS Builder 50, Google News/Twitter feeds; Enterprise 7,500 sources, teams, newsletters, Slack/Teams, API, SSO.
