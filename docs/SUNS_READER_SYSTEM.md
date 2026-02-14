# Suns Reader -- System Documentation

## 1. Product Overview

Suns Reader is a **Phoenix Suns news aggregator** delivered as a mobile-first Progressive Web App (PWA). It provides two primary content streams:

- **Articles** -- News articles about the Phoenix Suns, sourced from Google News RSS, presented in a clean reader view.
- **Videos** -- YouTube videos about the Phoenix Suns, sourced from the YouTube Data API v3.

Both streams support a **Trusted / Discovery** tab model. Users curate a list of trusted sources; content from those sources appears in the Trusted tab, while everything else appears in Discovery. Users can promote sources from Discovery to Trusted with one tap.

The app is designed for daily use by Suns fans. Content is scoped to the last 24 hours, read/watched state is tracked per-device, and the reader view extracts clean article text from publisher sites.

### Core Screens

| Route | Purpose |
|---|---|
| `/app` | Article feed (Trusted / Discovery tabs) |
| `/app/reader` | Reader view for a single article |
| `/app/videos` | Video feed (Trusted / Discovery tabs) |
| `/app/settings` | Manage trusted sources, theme, read status |
| `/` and `/home` | Marketing / landing pages |
| `/about` | About page |

---

## 2. High-Level Architecture

```
+-------------------+         +--------------------+
|   Client (PWA)    |         |   Vercel Serverless |
|   Next.js React   | <-----> |   API Routes        |
|   Tailwind CSS    |         |                    |
+-------------------+         +--------------------+
        |                           |    |    |
        |                           |    |    +---> YouTube Data API
        |                           |    +--------> Google News RSS
        |                           +-------------> Publisher Sites (fetch + Readability)
        |                                    |
        |  localStorage (client state)       +---> Upstash Redis (KV extraction cache)
        |  sessionStorage (feed cache)
```

### Major Components

| Layer | Technology | Role |
|---|---|---|
| Client app | Next.js 16 (App Router), React 19, Tailwind CSS 4 | PWA shell, routing, UI |
| API routes | Next.js Route Handlers (Node.js runtime) | Feed fetching, URL resolution, article extraction |
| Feed ingestion | Google News RSS | Article source |
| Video ingestion | YouTube Data API v3 | Video source |
| Article extraction | JSDOM + @mozilla/readability | Converts publisher HTML to clean reader content |
| L1 cache (server) | In-memory `Map` per serverless instance | 10-minute TTL for extraction results, 10-minute for video pages, 6-hour for resolve |
| L2 cache (server) | Upstash Redis via `@upstash/redis` | 24-hour TTL durable extraction cache across instances |
| Client cache | localStorage (extraction, read state, trusted sources, theme), sessionStorage (feed cache, scroll position) | Offline resilience, instant back-nav |
| Service worker | Custom `sw.js` generated at build time | PWA install, asset caching, update management |
| Hosting | Vercel | Serverless functions, edge CDN |

---

## 3. Article Feed Pipeline

### Source

Articles are fetched from **Google News RSS** using a search query:

```
https://news.google.com/rss/search?q=Phoenix+Suns&hl=en-US&gl=US&ceid=US:en
```

### Flow

1. **Client** calls `GET /api/search?q=Phoenix+Suns` with a cache-buster timestamp.
2. **`/api/search`** fetches the Google News RSS XML (no-store, force-dynamic).
3. **RSS parsing** -- A regex-based XML parser extracts `<item>` elements. For each item it pulls: `title`, `link` (Google News wrapper URL), `pubDate`, `guid`, `source` (publisher name), and `sourceUrl` (publisher domain).
4. **Normalization** -- Each item becomes an `ArticleSummary` with a stable `id` (hash of guid or URL), the Google News wrapper URL (not the publisher URL), `publishedAt`, `sourceName`, and `sourceDomain`.
5. **24-hour filter** -- Items older than 24 hours are dropped.
6. **Sort** -- Newest first by `publishedAt`.
7. **Response** -- JSON array of `ArticleSummary` objects returned to the client.

### Client-side Processing

- The client caches the feed in `sessionStorage` (5-minute TTL) for instant back-navigation.
- Articles are split into **Trusted** (sourceDomain is in user's trusted list) and **Discovery** (everything else). The two sets are disjoint.
- Read state (blue dot) is derived from localStorage on each render, using a version counter that increments on read-state changes.
- Title normalization strips trailing site name suffixes (e.g. "Headline - ESPN" becomes "Headline").

---

## 4. Reader Extraction Pipeline

When a user taps an article, the reader view must convert a Google News wrapper URL into clean, readable article content. This involves two stages: **URL resolution** and **content extraction**.

### Stage 1: URL Resolution (Client -> `/api/resolve`)

Google News RSS provides wrapper URLs (`news.google.com/rss/articles/<token>`), not publisher URLs. The resolve endpoint converts these to the actual publisher URL.

**Resolution strategies (tried in order):**

1. **Cache check** -- In-memory Map, 6-hour TTL.
2. **Base64 token decode** -- Many tokens embed the publisher URL in base64. Fastest, no network.
3. **Google batchexecute API** -- Fetches the article page from Google News, extracts `data-n-a-sg` (signature) and `data-n-a-ts` (timestamp), then calls Google's internal batchexecute endpoint to decode the URL.
4. **HTTP redirect follow** -- Follows the wrapper URL's redirects to find the final publisher URL.
5. **HTML meta tag parsing** -- Fetches the wrapper page and looks for `canonical`, `og:url`, `http-equiv=refresh`, or `google.com/url?` redirect patterns.

Each strategy has a 10-second timeout. Successful results are cached for 6 hours.

### Stage 2: Content Extraction (`/api/extract`)

The client calls `/api/extract?url=<publisherUrl>` with the resolved publisher URL. The extract endpoint is a hard guard: it **rejects** Google News wrapper URLs directly -- the client must resolve first.

**Extraction flow:**

1. **L1 cache** -- In-memory Map, 10-minute TTL per serverless instance.
2. **L2 cache** -- Upstash Redis (KV), 24-hour TTL, shared across instances. On hit, result is promoted to L1.
3. **URL validation** -- Rejects private IPs, non-HTTP protocols, homepage URLs.
4. **Fetch HTML** -- Server-side fetch with browser-like User-Agent headers, 10-second timeout.
5. **Blocked detection** -- Checks for 403/429 status, known blocked domains (ESPN), CDN headers (CloudFront, Cloudflare).
6. **JSDOM + Readability** -- Parses HTML with JSDOM, runs Mozilla Readability to extract title, byline, siteName, contentHtml, textContent.
7. **ESPN shell page detection** -- Special logic detects ESPN's JS-rendered shell pages that return generic content instead of the actual article.
8. **Quality gate** -- Extraction must produce a title >= 8 characters and text >= 400 characters, otherwise it's treated as a failure.
9. **Fallback extraction** -- If Readability fails, tries semantic elements (`<article>`, `<main>`, `[itemprop="articleBody"]`), then the largest `<div>` by text content.
10. **Playwright fallback** -- Optional (disabled on Vercel, enabled locally via `ENABLE_PLAYWRIGHT=1`). Uses headless Chromium for JS-rendered sites. Has ESPN-specific wait logic for article selectors.
11. **Cache write** -- Successful extractions are written to L1 and L2 (fire-and-forget for KV).

### URL Normalization for Cache Keys

Before caching, URLs are normalized: lowercase hostname, strip `www.`, remove fragments, strip UTM/tracking params, sort remaining query params, remove trailing slash. A SHA-256 hash of the normalized URL forms the KV cache key.

### What Causes "Article Not Found"

- Google News wrapper URL resolution failed (all 5 strategies exhausted).
- Publisher returned 403/429/paywall.
- Publisher requires JavaScript rendering (e.g. ESPN) and Playwright is disabled.
- Readability produced empty or insufficient content (quality gate failed).
- Publisher returned non-HTML content type.
- Publisher URL is a homepage (no article path).

The user sees a friendly message ("Reader mode isn't available for this article") with a link to open the original.

---

## 5. Video Feed Pipeline

### Source

Videos are fetched from the **YouTube Data API v3** search endpoint.

### Flow

1. **Client** calls `GET /api/videos` (optionally with `?pageToken=...` for pagination or `?refresh=1` to bust cache).
2. **`/api/videos`** runs two YouTube searches in parallel via `Promise.allSettled`:
   - **Primary**: `q="Phoenix Suns"`, 50 results, 8-second timeout.
   - **Secondary**: `q="Suns"`, 50 results, 2.5-second timeout (best-effort).
3. Both queries filter to videos published in the last 24 hours (`publishedAfter`).
4. **Relevance filtering** (per-query, before merge):
   - **Branch 1**: Auto-include if "phoenix suns" appears in title+description+channel (no blacklist).
   - **Branch 2**: If "suns" appears, check title+description for **strong qualifiers** (nba, basketball, highlights, etc. -- 1 needed) or **weak qualifiers** (vs, game, analysis, etc. -- 2 needed). Then must pass **negative keyword** blacklists (astronomy, solar, gaming, other sports).
   - **Branch 3**: Exclude everything else.
5. **Merge + dedupe** -- Results from both queries are deduped by video ID, sorted newest first.
6. **Response** -- JSON with `videos` array and `nextPageToken`.

### Pagination

- Page 1 merges primary + secondary queries.
- Page 2+ uses only the primary query with the provided `pageToken`.
- The client auto-fetches up to 3 pages on initial load to accumulate at least 20 trusted matches.

### In-Memory Cache

Per `(query, pageToken)` key, 10-minute TTL. Cleared on explicit refresh.

---

## 6. Trusted vs Discovery Logic

### Articles

- **Trusted domains** are stored in localStorage (`suns-reader-trusted-domains`).
- A default list of 12 domains ships on first run (arizonasports.com, espn.com, nba.com, etc.).
- Users add sources from the Discovery tab ("Add to Trusted" button per article) or manage in Settings.
- **Trusted tab** shows articles whose `sourceDomain` matches a trusted domain (case-insensitive, www-stripped).
- **Discovery tab** shows articles whose `sourceDomain` does NOT match any trusted domain (disjoint).
- Changes propagate via a custom `trustedDomainsChanged` DOM event and a `sessionStorage` dirty flag for cross-page sync.

### Videos

- **Trusted video sources** are stored in localStorage (`sr:trustedVideoSources:v1`) as `{channelId, channelTitle}` objects.
- A default list of 13 YouTube channels ships on first run (Phoenix Suns, ESPN, NBA, Locked On Suns, etc.).
- Membership is based on `channelId` (stable), not display name.
- On very first run, the seeding function merges hardcoded defaults with fresher display names from the fetched results.
- Same Trusted/Discovery split logic: match by `channelId` set membership.

### Settings

The Settings page (`/app/settings`) provides:
- Sub-tabs to switch between managing article sources and video sources.
- Remove individual sources.
- Reset to defaults.
- Theme selection (System / Light / Dark).
- Mark all as read / Mark all as unread.

---

## 7. Caching Architecture

### Client-side Caching

| Store | Key | TTL | Purpose |
|---|---|---|---|
| sessionStorage | `suns-reader-feed-cache` | 5 min | Article feed cache for instant back-nav |
| sessionStorage | `sr:feed:scrollTop` | Until consumed | Restore scroll position after Reader back-nav |
| sessionStorage | `sr:clicked:<id>` | 30 min | Article metadata for instant Reader header |
| localStorage | `suns-reader-extract-cache-v1` | 24 hours | Client extraction cache (LRU, max 50 entries) |

The client extraction cache is an LRU store in localStorage. On quota exceeded, it evicts the oldest half. It only caches successful extractions.

### Server-side Caching

| Layer | Store | TTL | Scope |
|---|---|---|---|
| L1 (extract) | In-memory Map | 10 min | Per serverless instance |
| L2 (extract) | Upstash Redis | 24 hours | Global (all instances) |
| Resolve cache | In-memory Map | 6 hours | Per serverless instance |
| Video cache | In-memory Map | 10 min | Per serverless instance, per (query, pageToken) |

### Cache Bypass

- **Debug mode** (`?debug=1`): Skips both L1 and L2 extraction cache, skips client extraction cache.
- **Refresh mode** (`?refresh=1`): Skips L1 and L2 extraction cache but still writes results back to cache.
- **Video refresh** (`?refresh=1`): Clears the entire in-memory video cache.

### Cache Invalidation

There is no proactive invalidation. All caches rely on TTL-based expiry. L1 caches are naturally cleared when serverless instances recycle. The periodic cache cleanup on the resolve endpoint (1-in-100 requests) removes expired entries.

---

## 8. Client State & Storage

### localStorage Keys

| Key | Type | Purpose |
|---|---|---|
| `suns-reader-read-state` | `{articleId: timestamp}` | Read/unread tracking. Entries expire after 24 hours. |
| `suns-reader-trusted-domains` | `string[]` | User's trusted article source domains. |
| `sr:trustedVideoSources:v1` | `TrustedVideoSource[]` | User's trusted YouTube channels (`channelId` + `channelTitle`). |
| `suns-reader-video-watched-state` | `{videoId: timestamp}` | Watched/unwatched tracking. Entries expire after 24 hours. |
| `suns-reader-extract-cache-v1` | LRU cache store | Client-side extraction cache (max 50 entries, 24h TTL). |
| `suns-reader-latest-article-ids` | `string[]` | Current article IDs for "Mark all as read" in Settings. |
| `themePreference` | `"system" \| "light" \| "dark"` | Theme preference. |
| `readerTextSize` | `"default" \| "large" \| "larger"` | Reader text size preference. |

### sessionStorage Keys

| Key | Purpose |
|---|---|
| `suns-reader-feed-cache` | Cached article feed for back-nav (5-min TTL) |
| `sr:feed:scrollTop` | Feed scroll position to restore |
| `sr:clicked:<id>` | Article click metadata for instant Reader header |
| `trustedDomainsDirty` | Dirty flag for cross-page trusted domain sync |
| `trustedVideoSourcesDirty` | Dirty flag for cross-page video source sync |
| `sw-reloaded` | One-shot guard to prevent reload loops on SW update |
| `sr:splashReason` | Communicates splash reason (e.g. "update") |

### Read/Watched State Behavior

- Articles are marked as read immediately when the reader page loads (`markAsRead` in reader page `useEffect`).
- Read state is per-article-ID (hash of guid/URL), stored with a timestamp, purged after 24 hours.
- Video watched state is marked when a video is clicked to play.
- Both use a version-counter pattern: components listen for custom DOM events (`readStateChanged`, `videoWatchedStateChanged`) and bump a version counter to trigger re-renders.
- Cross-tab sync uses `StorageEvent` listeners on the relevant localStorage keys.

---

## 9. Logging & Observability

### Structured Health Telemetry (`healthLog`) — v2

Every API request emits a structured JSON log line with tag `sunsreader_health`. 100% of requests are logged (no sampling). Filter in Vercel logs: `"tag":"sunsreader_health"`

**All routes** share common fields: `tag`, `v`, `ts`, `env`, `requestId`, `route`, `type`, `ok`, `durationMs`. Failures add `errorReason` and `errorMessage`.

**Error reason taxonomy (v2):** `timeout`, `blocked`, `paywall`, `fetch_error`, `http_4xx`, `http_5xx`, `non_html`, `readability_empty`, `quality_gate_failed`, `invalid_url`, `unknown`.

Route-specific fields:

- **Search**: `query`, `itemsReturned`, `itemsParsed`, `uniqueDomains`
- **Resolve**: `inputHost`, `resolvedHost`, `strategyUsed`, `methodsTried`, `cacheStatus`
- **Extract**: `publisherHost`, `httpStatus`, `contentType`, `blockedDetected`, `titleLength`, `textLength`, `readabilityOk`, `qualityGatePassed`, `playwrightUsed`, `extractMethod`, `fallbackUsed`, `cacheStatus`, `cacheMode`, `cacheLayer`, `cacheAgeSec`, `computeMs`, `kvWriteAttempted`, `kvWriteOk`
- **Videos**: `primaryRawCount`, `primaryFilteredCount`, `secondaryRawCount`, `secondaryFilteredCount`, `mergedCount`, `duplicatesRemoved`, `cacheStatus`, `pageToken`

New in v2: `extractMethod` (readability/fallback/playwright_readability/playwright_fallback/none), `fallbackUsed`, `kvWriteAttempted`/`kvWriteOk` for KV cache visibility, `computeMs` now properly populated, `httpStatus` now threaded through all extract paths, and full videos route coverage.

Privacy: Never logs article HTML, extracted text, or full URLs. Only hostname + truncated path. Each line kept under ~1KB.

See `/docs/HEALTHCHECK_TEMPLATE_V2.md` for full field reference with examples.

### Lightweight Telemetry (`recordTelemetry`)

A secondary telemetry system that focuses on resolve/extract pipeline reliability:

- 100% of failures logged, successes sampled at 15% (configurable via `TELEMETRY_SAMPLE_RATE`).
- Tag: `telemetry`
- Tracks: `stage`, `domain`, `ok`, `reason`, `duration_ms`, `playwright_candidate`.
- The `playwright_candidate` flag identifies failures that might benefit from JS rendering (HTTP 200 but empty/blocked content).
- **Note**: This system is slated for removal once healthLog v2 is validated in production (see `TODO(logging-v2)` markers).

### Legacy JSON Logs

Each route emits a legacy `console.log(JSON.stringify({...}))` line alongside healthLog. These are marked with `TODO(logging-v2)` comments for future removal once healthLog is validated. They appear in routes: extract, search, resolve.

### Console Logging

Each route also emits human-readable `console.log` lines with `[API]`, `[Extract]`, `[videos]`, `[KV]`, etc. prefixes. These appear in Vercel function logs.

### Health Endpoint

`GET /api/health` returns `{ ok: true, time, env }` -- a simple liveness check.

### Known Logging Gaps

- No client-side error reporting to a server (errors stay in browser console).
- No aggregate dashboards or alerting configured (would need Vercel log drain or external service).
- Video API quota usage is not tracked.
- `kvWriteOk` tracking requires async KV write result (deferred).

---

## 10. Deployment & Infrastructure

### Hosting

**Vercel** -- serverless deployment with automatic previews on branches.

### Server Runtime

- Next.js 16 with App Router
- Node.js runtime (not Edge) -- required for JSDOM and @mozilla/readability
- `force-dynamic` on all API routes (no ISR/static caching at the framework level)

### KV Storage

**Upstash Redis** provides the L2 extraction cache. Connected via Vercel's KV integration.

Env vars:
- `KV_REST_API_URL` -- Upstash REST endpoint
- `KV_REST_API_TOKEN` -- Upstash REST auth token

If these are missing, KV operations silently return null (cache disabled, pipeline continues).

### Environment Variables

| Variable | Purpose |
|---|---|
| `YT_API_KEY` | YouTube Data API v3 key |
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis auth token |
| `ENABLE_PLAYWRIGHT` | Set to `1` to enable Playwright fallback (local dev only) |
| `TELEMETRY_ENABLED` | Set to `false` to disable lightweight telemetry (default: enabled) |
| `TELEMETRY_SAMPLE_RATE` | Success sampling rate for lightweight telemetry (default: `0.15`) |
| `VERCEL_ENV` | Auto-set by Vercel (`production`, `preview`, `development`) |

### Build Process

1. `node scripts/generate-sw.js` -- Generates `public/sw.js` from `public/sw.template.js` with a unique build ID.
2. `next build` -- Standard Next.js build.

### Service Worker

A custom service worker (`sw.js`) handles:
- PWA install capability (manifest.webmanifest)
- Cache headers set to `no-store` on `sw.js` and `manifest.webmanifest` to ensure browsers always check for updates.
- `ServiceWorkerManager` component (mounted in root layout) manages registration, update detection, skip-waiting, and one-shot page reload on controller change.

### PWA Manifest

- `display: standalone`
- `start_url: /app?tab=trusted`
- App icons at 192px and 512px (regular + maskable)

---

## 11. Known Limitations & Failure Modes

### Article Extraction

- **ESPN and JS-heavy sites**: ESPN serves shell pages without JS rendering. Playwright fallback exists but is disabled on Vercel (requires headless browser binary). These articles show "Reader mode isn't available."
- **Paywalled content**: Sites with paywalls (WSJ, The Athletic) return blocked or truncated content. No bypass is attempted.
- **Rate limiting**: Publisher sites may return 429 if many users extract the same article in a burst. The L2 cache mitigates this for repeat reads.
- **Google News URL resolution**: The batchexecute API is undocumented and could break if Google changes its internal API. Base64 decoding is a heuristic.

### Feed Issues

- **RSS parsing**: The regex-based RSS parser is fragile compared to a proper XML parser. Malformed RSS could cause silent item drops.
- **24-hour window**: If Google News RSS is slow to index a story, it may not appear until hours after publication, then drop off quickly.
- **Source attribution**: Publisher domain is derived from the RSS `<source url="">` element. If missing, it falls back to `news.google.com`, which breaks trusted source filtering for those items.

### Video API

- **Quota limits**: YouTube Data API v3 has a daily quota (10,000 units default). Each search request costs 100 units. With primary + secondary queries and up to 3 pages on initial load, a single user session can cost 300-500 units.
- **Relevance filtering**: The keyword-based filtering is heuristic. Edge cases exist (e.g., "Suns" in a non-basketball context that passes the qualifier check).
- **In-memory cache only**: Video results are only cached in-memory (no KV). Serverless cold starts always re-fetch from YouTube.

### Client State

- **Device-local only**: All user state (trusted sources, read state, theme) is in localStorage. No sync across devices, no account system.
- **Storage quota**: localStorage has browser-imposed limits (~5-10MB). The extraction cache aggressively evicts to stay within bounds.
- **No offline support**: The service worker handles PWA install but does not cache API responses for offline reading.

---

## 12. Future Improvement Opportunities

- **Proper XML parser** for RSS -- Replace regex parsing with a library (e.g. `fast-xml-parser`) for robustness.
- **Server-side video caching** -- Add KV cache for video results to reduce YouTube API quota usage and improve cold-start performance.
- **Client-side error reporting** -- Send extraction failures and API errors to an external service for monitoring.
- **Alerting on extraction success rate** -- Use structured health logs to detect degradation (e.g., success rate drops below threshold).
- **YouTube API quota monitoring** -- Track daily usage to prevent hitting limits.
- **Offline reading** -- Cache successfully extracted articles in the service worker for offline access.
- **Cross-device sync** -- Optional account system or cloud backup for trusted sources and read state.
- **Readability improvements** -- Evaluate alternative extraction libraries or tuned Readability configs for better quality on problematic sites.
- **Edge runtime for resolve** -- The resolve endpoint does light processing and could potentially run on Edge for lower latency (currently requires Node.js due to shared imports).
- **Feed deduplication** -- Google News RSS sometimes returns duplicate stories from different outlets about the same event. Content-based deduplication could reduce noise.
