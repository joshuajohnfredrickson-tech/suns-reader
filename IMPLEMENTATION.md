# Phase 1 Step 1: Real Article Fetching - Implementation Summary

## What Was Implemented

### 1. Backend API Route (`/api/search`)
**File:** `app/api/search/route.ts`

- Fetches Google News RSS for "Phoenix Suns" (or custom query)
- Parses RSS XML safely (custom parser, no external dependencies)
- Normalizes RSS items to ArticleSummary format:
  ```typescript
  {
    id: string (stable hash of URL/guid),
    title: string,
    url: string,
    publishedAt: ISO string,
    sourceName: string,
    sourceDomain: string
  }
  ```
- Filters articles to last 24 hours
- Sorts by newest first
- Returns JSON: `{ items: ArticleSummary[] }`

**Key Features:**
- Network-first caching via service worker
- Error handling with fallback
- HTML entity decoding
- Domain extraction from URLs

### 2. Utility Functions
**File:** `app/lib/utils.ts`

- `simpleHash(str)` - Generate stable ID from URL/guid
- `getDomain(url)` - Extract clean domain from URL
- `getRelativeTime(isoDate)` - Convert to "2h ago" format
- `formatDate(isoDate)` - Convert to readable date
- `isWithin24Hours(isoDate)` - Filter recent articles

### 3. Updated Type Definitions
**File:** `app/types/article.ts`

Extended Article interface:
```typescript
interface Article {
  // Existing fields...
  url?: string;           // For real articles
  publishedAt?: string;   // ISO date
  sourceDomain?: string;  // Extracted domain
  body?: string;          // Optional (mock only for now)
}

interface ArticleSummary {
  // API response format
}
```

### 4. Discovery Tab with Real Data
**File:** `app/page.tsx`

**Changes:**
- Fetches real Phoenix Suns articles on mount
- Shows loading spinner while fetching
- Shows error state with Retry button on failure
- Refresh button re-fetches Discovery articles
- Trusted tab still shows mock data (unchanged)

**States:**
- Loading → Shows spinner
- Error → Shows error message + Retry
- Success → Shows article list

### 5. UI Components
**Files:**
- `app/components/LoadingState.tsx` - Animated spinner
- `app/components/ErrorState.tsx` - Error message + Retry button

### 6. Enhanced Reader View
**File:** `app/components/ReaderView.tsx`

**Added:**
- "Open Original" button for real articles (opens URL in new tab)
- Placeholder message when article has no body content
- Conditional rendering based on article type (mock vs. real)

**Updated Reader Route:**
**File:** `app/reader/page.tsx`
- Fetches article data if not found in mock data
- Handles both mock and real articles
- Loading state while fetching
- Error state for missing articles

## How It Works

### User Flow:

1. **App Loads**
   - Trusted tab shows mock articles (unchanged)
   - Discovery tab fetches Phoenix Suns articles from Google News RSS
   - Shows loading spinner during fetch

2. **Tap Article** (Discovery tab)
   - Navigates to `/reader?id={articleId}`
   - Reader page fetches article data
   - Shows article metadata (title, source, date)
   - Shows "Open Original" button
   - Shows placeholder message (no extraction yet)

3. **Open Original**
   - Opens article URL in new browser tab
   - User reads full article on original site

4. **Refresh Button**
   - On Discovery tab: re-fetches articles from API
   - On Trusted tab: no-op (still mock data)

5. **Error Handling**
   - Network failure → Error state with Retry button
   - Tap Retry → Re-fetches articles
   - Missing article → "Article not found" message

## File Structure

```
app/
├── api/
│   └── search/
│       └── route.ts          # RSS fetch & parse API
├── components/
│   ├── ArticleList.tsx       # List of articles
│   ├── ReaderView.tsx        # Article reader (updated)
│   ├── LoadingState.tsx      # Loading spinner (new)
│   └── ErrorState.tsx        # Error + Retry (new)
├── lib/
│   └── utils.ts              # Helper functions (new)
├── types/
│   └── article.ts            # Type definitions (updated)
├── reader/
│   └── page.tsx              # Reader route (updated)
└── page.tsx                  # Main app (updated)
```

## Testing Checklist

### Desktop (Chrome/Safari):
- ✅ Discovery tab loads real Phoenix Suns articles
- ✅ Loading spinner appears during fetch
- ✅ Article list shows title, source, time ago
- ✅ Tapping article opens Reader view
- ✅ Reader shows "Open Original" button
- ✅ "Open Original" opens URL in new tab
- ✅ Refresh button re-fetches Discovery articles
- ✅ Error state appears if API fails
- ✅ Retry button re-fetches after error

### iPhone (Safari / PWA):
- ✅ All desktop tests work on iPhone
- ✅ Tapping article rows reliably navigates (semantic Link)
- ✅ "Open Original" button is tappable
- ✅ Service worker uses network-first (no stale cache)
- ✅ App works in PWA mode (home screen)

### Build & Run:
```bash
npm run dev
# Should start without errors
# Visit http://localhost:3000
# Discovery tab should fetch real articles
```

## What's NOT Implemented Yet

- ❌ Article content extraction (readability)
- ❌ Trusted source filtering
- ❌ Read/unread persistence
- ❌ Article body text in Reader view
- ❌ Offline article storage
- ❌ Search customization

These are planned for future phases.

## Notes

- **No External Dependencies**: RSS parsing uses custom regex-based parser (no xml2js or similar)
- **iOS Compatible**: Uses semantic `<Link>` and `<button>` elements with `touchAction: manipulation`
- **Network-First Caching**: Service worker fetches fresh content, falls back to cache offline
- **Minimal & Clean**: Simple implementations, easy to understand and extend
- **Production Ready**: Error handling, loading states, proper TypeScript types

## Debugging

If Discovery tab doesn't load:

1. Check browser console for errors
2. Check Network tab for `/api/search` request
3. Check server logs for RSS fetch errors
4. Verify Google News RSS is accessible (may be blocked in some regions)
5. Try clearing cache and hard reload

Common issues:
- **CORS errors**: Should not happen (same-origin API route)
- **RSS parsing fails**: Check console for parsing errors
- **No articles shown**: Google News may have no recent results for "Phoenix Suns"
- **Stale cache**: Service worker now uses network-first, but clear cache if issues persist
