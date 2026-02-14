# Suns Reader -- Logging Audit

Audit of logging coverage against the current codebase, performed by analyzing actual call sites, schemas, and control flow. No guesswork -- every finding references specific code.

---

## 1. Current Logging Schemas

### 1a. `sunsreader_health` (healthLog)

**File:** `app/lib/healthLog.ts`
**Tag:** `"sunsreader_health"` | **Versioned:** `v: 1` | **Sampling:** 100% of requests

Envelope fields emitted on every event:

| Field | Type | Source |
|---|---|---|
| `tag` | `"sunsreader_health"` | Hardcoded |
| `v` | `1` | Hardcoded |
| `ts` | ISO 8601 string | `new Date().toISOString()` |
| `env` | string | `process.env.VERCEL_ENV ?? 'local'` |
| `requestId` | UUID string | Passed from caller |
| `route` | `'/api/search' \| '/api/resolve' \| '/api/extract'` | Passed from caller |
| `type` | `'search' \| 'resolve' \| 'extract'` | Passed from caller |
| `ok` | boolean | Passed from caller |
| `durationMs` | number | Passed from caller |

**Search-specific fields** (`type: 'search'`):

| Field | Type | Always present? | Notes |
|---|---|---|---|
| `source` | `'google_news_rss'` | Yes | Hardcoded |
| `query` | string (truncated 80) | Yes | |
| `itemsReturned` | number | Yes | Count of articles returned to client |
| `itemsParsed` | number | Yes | Count before 24h filter + normalization |
| `duplicatesRemoved` | number | Only if set | **Never populated** -- defined in type but never passed |
| `uniqueDomains` | number | On success | Distinct source domains in results |
| `errorReason` | HealthErrorReason | On failure | |
| `errorMessage` | string (truncated 300) | On failure | |

**Resolve-specific fields** (`type: 'resolve'`):

| Field | Type | Always present? | Notes |
|---|---|---|---|
| `inputHost` | string | Yes | Hostname of input URL |
| `resolvedHost` | string | On success | Hostname of resolved publisher URL |
| `isGoogleNewsUrl` | boolean | Yes | Whether input was a Google News wrapper |
| `strategyUsed` | string | On success | e.g. `'base64_decode'`, `'batchexecute'`, etc. |
| `methodsTried` | string[] | Yes | List of strategies attempted |
| `cacheStatus` | `'hit' \| 'miss'` | Yes | Only emits `hit` or `miss` (never `bypass` or `none`) |
| `cacheTtlSec` | number | On cache hit | Rounded CACHE_TTL_MS / 1000 |
| `errorReason` | HealthErrorReason | On failure | |
| `errorMessage` | string | On failure | |

**Extract-specific fields** (`type: 'extract'`):

| Field | Type | Always present? | Notes |
|---|---|---|---|
| `publisherHost` | string | Yes | Hostname derived from payload URL |
| `httpStatus` | number | Only if passed | **Rarely populated** -- only passed on 2 finalize paths (the rare ones with explicit healthExtra) |
| `contentType` | string (truncated 60) | If available | From publisher response header |
| `blockedDetected` | boolean | Yes (derived) | Falls back to checking `status === 'blocked'` |
| `titleLength` | number | Yes (derived) | From payload |
| `textLength` | number | Yes (derived) | From payload |
| `readabilityOk` | boolean | Yes (derived) | `success && titleLength > 0 && textLength > 0` |
| `qualityGatePassed` | boolean | Yes (derived) | `success && titleLength >= 8 && textLength >= 400` |
| `playwrightUsed` | boolean | Yes | From payload |
| `cacheStatus` | CacheStatus | Yes (derived) | Only explicit for 2 cache-hit paths; defaults to `'bypass'` if refresh, else `'miss'` |
| `cacheMode` | CacheMode | Yes (derived) | `'refresh_bypass'` or `'normal'` |
| `cacheLayer` | `'l1' \| 'l2'` | Only on cache hits | Only the 2 explicit cache-hit paths |
| `cacheTtlSec` | number | On cache hit | |
| `cacheAgeSec` | number | On L2 hit only | |
| `computeMs` | number | Rarely | Only when `healthExtra.computeStartedAt` passed (never in current code) |
| `errorReason` | HealthErrorReason | On failure | |
| `errorMessage` | string | On failure | |

### 1b. `telemetry` (recordTelemetry)

**File:** `app/lib/telemetry.ts`
**Tag:** `"telemetry"` | **Sampling:** 100% failures, ~15% successes

| Field | Type | Notes |
|---|---|---|
| `tag` | `"telemetry"` | Hardcoded |
| `ts` | ISO 8601 string | |
| `req_id` | string (8 char) | Short random ID |
| `stage` | `'resolve' \| 'extract'` | |
| `domain` | string | Hostname (www-stripped) |
| `ok` | boolean | |
| `reason` | TelemetryReason | On failure only |
| `duration_ms` | number | |
| `playwright_candidate` | boolean | On failure only |

**TelemetryReason values:** `timeout`, `http_401`, `http_403`, `http_404`, `http_429`, `http_5xx`, `empty`, `parse_error`, `blocked`, `paywall`, `unknown`

### 1c. Legacy `console.log(JSON.stringify(...))` lines

Three routes emit their own ad-hoc JSON lines (separate from healthLog):

| Route | Tag/Identifier | Key Fields | Notes |
|---|---|---|---|
| `/api/search` | `type: 'search'` | requestId, ts, durationMs, query, rssUrlHost, rssFetchStatus, itemsReturned, cacheBustUsed, error | Pre-dates healthLog, partially redundant |
| `/api/resolve` | `type: 'resolve'` | ts, requestId, success, cached, strategy, methodsTried, durationMs, inputHost, publisherHost, error | Pre-dates healthLog, partially redundant |
| `/api/extract` | `type: 'extract'` | requestId, ts, durationMs, inputUrl, host, success, status, playwrightUsed, contentType, titleLength, textLength, fetchedUrl, error | Pre-dates healthLog, partially redundant |

These are the "v0" logs that existed before healthLog was introduced. They still fire on every request.

---

## 2. Call-site Inventory

### `/api/search` -- `app/api/search/route.ts`

| Call site | Function | What fires |
|---|---|---|
| `finalize()` (line 153) | `console.log(JSON.stringify({...}))` | Legacy search log |
| `finalize()` (line 169) | `healthLog({...})` | Health telemetry |
| **No telemetry call** | -- | `recordTelemetry` is not imported or called |

`finalize()` is called exactly 2 times: once on success (line 242), once on error (line 259).

### `/api/resolve` -- `app/api/resolve/route.ts`

| Call site | Function | What fires |
|---|---|---|
| `logAndReturn()` (line 439) | `console.log(JSON.stringify({...}))` | Legacy resolve log |
| `logAndReturn()` (line 455) | `tel.record({...})` | Telemetry (skips cache hits) |
| `logAndReturn()` (line 468) | `healthLog({...})` | Health telemetry |

`logAndReturn()` is called from many internal code paths within `resolveUrl()`. All resolve outcomes flow through this single function.

### `/api/extract` -- `app/api/extract/route.ts`

| Call site | Function | What fires |
|---|---|---|
| `finalize()` (line 166) | `console.log(JSON.stringify({...}))` | Legacy extract log |
| `finalize()` (line 187) | `recordTelemetry({...})` | Telemetry |
| `finalize()` (line 212) | `healthLog({...})` | Health telemetry |

`finalize()` is called from **47 distinct code paths** within `GET()`. All outcomes centralize through `finalize()`.

### `/api/videos` -- `app/api/videos/route.ts`

| Call site | Function | What fires |
|---|---|---|
| (various) | `console.log(...)` / `console.error(...)` | **Unstructured** `[videos]`-prefixed console lines only |

**No `healthLog`, no `recordTelemetry`, no structured JSON logging.**

### `/api/health` -- `app/api/health/route.ts`

No logging at all. Returns `{ ok: true, time, env }`.

---

## 3. Coverage by System Area

### Articles: `/api/search`

| Aspect | Covered? | Notes |
|---|---|---|
| Request success/failure | Yes | healthLog `ok` field |
| Duration | Yes | `durationMs` |
| Items returned | Yes | `itemsReturned` |
| Items parsed (pre-filter) | Yes | `itemsParsed` |
| Unique domains | Yes | `uniqueDomains` |
| RSS fetch HTTP status | **Partial** | In legacy log (`rssFetchStatus`) but **not** in healthLog |
| Cache-bust param used | **Partial** | In legacy log (`cacheBustUsed`) but **not** in healthLog |
| Duplicates removed count | **No** | Field defined in type but never populated |

### Articles: `/api/resolve`

| Aspect | Covered? | Notes |
|---|---|---|
| Request success/failure | Yes | healthLog + telemetry |
| Duration | Yes | |
| Strategy used | Yes | healthLog `strategyUsed` + `methodsTried` |
| Cache hit/miss | Yes | healthLog `cacheStatus` |
| Error taxonomy | Yes | healthLog `errorReason` + telemetry `reason` |
| Playwright candidate flag | Yes | telemetry only (always `false` for resolve) |

### Articles: `/api/extract`

| Aspect | Covered? | Notes |
|---|---|---|
| Request success/failure | Yes | All three systems fire |
| Duration | Yes | `durationMs` |
| Cache status | Yes | `cacheStatus` (hit/miss/bypass) |
| Cache layer (L1/L2) | **Partial** | Only on the 2 cache-hit paths |
| Cache age | **Partial** | Only on L2 hits |
| Compute time (excl. cache) | **Effectively No** | `computeMs` field exists but `computeStartedAt` is never passed to `finalize()` -- see Gap #5 |
| Publisher host | Yes | `publisherHost` |
| HTTP status code | **Rarely** | `httpStatus` only populated on 2 out of 47 finalize calls |
| Content type | **Partial** | From payload, not always set |
| Blocked detection | Yes (derived) | |
| Readability outcome | Yes (derived) | |
| Quality gate | Yes (derived) | |
| Playwright usage | Yes | |
| Error taxonomy | Yes | Both healthLog `errorReason` and telemetry `reason` |
| Extraction method used | **No** | No field for Readability vs fallback vs Google-News-unwrap path |

### Videos: `/api/videos`

| Aspect | Covered? | Notes |
|---|---|---|
| Request success/failure | **No** | No structured logging |
| Duration | **No** | |
| Cache hit/miss | **No** | Only `console.log("[videos] cache hit/miss")` |
| YouTube API response status | **No** | |
| Videos returned | **No** | |
| Videos filtered (blacklist drops) | **No** | Only unstructured console.log |
| Primary/secondary query status | **No** | |
| Pagination behavior | **No** | |
| Quota-relevant metrics | **No** | |

### Settings & Other Routes

No server-side logging (these are client-rendered pages with no API calls).

---

## 4. Gaps / Drift Since Logging v1

### Gap 1: `/api/videos` has zero structured logging

**Severity: Critical**

The entire video pipeline is a logging blind spot. You cannot answer basic questions like:
- What's the video API success rate?
- How often does the secondary query fail?
- How many videos are being filtered out by the blacklist?
- Are we approaching YouTube API quota limits?

Videos were added as a major feature after the logging system was designed. The logging system was never extended to cover it.

### Gap 2: `httpStatus` almost never populated in extract healthLog

**Severity: High**

The `httpStatus` field on ExtractHealthFields is defined but almost never makes it into the log. Of 47 `finalize()` calls, 45 pass `undefined` for both `telemetryReqId` and `httpStatus` (positional params 5 and 6). The HTTP status code of the publisher fetch is critical for diagnosing extraction failures, but the call sites that actually fetch from publishers don't thread it through to `finalize()`.

**Verification:** The `finalize()` signature is `finalize(requestId, startedAt, inputUrl, payload, telemetryReqId?, httpStatus?, healthExtra?, isRefreshBypass?)`. Almost every call passes `undefined, undefined, undefined, refreshMode` for the last 4 params.

### Gap 3: `computeMs` is effectively dead

**Severity: Medium**

The extract route defines `computeStartedAt` (line 927) but never passes it to `finalize()` via `healthExtra.computeStartedAt`. The only way `computeMs` gets set is via explicit `healthExtra`, which only happens on the 2 cache-hit paths (where compute time is 0 by definition). For actual extraction work, `computeMs` is always `undefined`.

**What it should track:** The time spent on fetch+parse+extract, excluding cache lookups. Currently `durationMs` includes cache lookup overhead, making it a poor proxy for extraction cost.

### Gap 4: `duplicatesRemoved` field is defined but never set

**Severity: Low**

`SearchHealthFields` defines `duplicatesRemoved?: number` but `finalize()` in search never populates it. The search route does deduplicate by guid, but doesn't count how many were removed.

### Gap 5: No extraction-method field

**Severity: Medium**

When extraction succeeds, there's no field indicating *how* it succeeded:
- Readability on direct fetch?
- Readability on Google News redirect-unwrap?
- Readability on Google News HTML-parse-unwrap?
- Readability on Google News output=1 fallback?
- Fallback extraction (largest-div)?
- Playwright?

The `playwrightUsed` boolean captures one dimension, but the specific unwrap strategy and extraction method are invisible. The console.log lines say things like `[Extract] Success via Readability (redirect unwrap)` but this isn't captured in structured telemetry.

### Gap 6: Legacy JSON logs overlap with healthLog

**Severity: Low (noise, not a gap)**

Each route emits both a legacy `console.log(JSON.stringify({...}))` line AND a `healthLog()` line. These are partially redundant but have different schemas. The legacy logs include some fields healthLog doesn't (e.g. `rssFetchStatus` in search, `inputUrl` in extract) and vice versa.

### Gap 7: Error reason taxonomies diverge between healthLog and telemetry

**Severity: Medium**

`HealthErrorReason` and `TelemetryReason` classify the same failures differently:

| healthLog (`HealthErrorReason`) | telemetry (`TelemetryReason`) | Notes |
|---|---|---|
| `blocked_401_403_429` | `http_401`, `http_403`, `http_429` (separate) | Health bundles, telemetry splits |
| `readability_empty` | `empty` | Different names for similar concept |
| `quality_gate_failed` | No equivalent | Telemetry can't distinguish quality gate from empty |
| `non_html` | No equivalent | |
| `invalid_url` | No equivalent | |
| No equivalent | `http_404`, `http_5xx` | Health bundles 4xx/5xx into `blocked_401_403_429` |
| No equivalent | `parse_error` | |
| No equivalent | `paywall` | Defined but never set in current code |
| No equivalent | `blocked` | Telemetry has separate `blocked` reason |

This makes cross-referencing between the two systems harder than necessary.

### Gap 8: Search doesn't emit telemetry at all

**Severity: Low-Medium**

`/api/search` calls `healthLog()` but not `recordTelemetry()`. This means the telemetry system (which was designed for pipeline reliability analysis) has no visibility into RSS feed reliability. If Google News starts returning errors or empty feeds, only healthLog captures it.

### Gap 9: Resolve telemetry skips cache hits

**Severity: Low**

`tel.record()` in resolve is guarded by `if (!cached)`. This means telemetry never sees resolve cache hits. healthLog does capture them (with `cacheStatus: 'hit'`), so the data exists, but the telemetry system's view is incomplete.

### Gap 10: No KV cache write success/failure logging

**Severity: Medium**

When extract writes to Upstash Redis (L2 cache), it fires-and-forgets: `void setCachedExtract(...).catch(() => {})`. KV write failures are silently swallowed. There's no logging of:
- How often KV writes succeed vs fail
- KV write latency
- KV connection errors

Similarly, KV read failures in the L2 cache check are caught and silently continued.

---

## 5. Recommendations (Logging v2)

### R1: Add structured healthLog to `/api/videos`

Add a new `VideoHealthFields` type and corresponding healthLog calls:

```
New type: 'videos'
New route: '/api/videos'

Fields:
  videosReturned: number          // Count in response
  primaryQueryOk: boolean         // Did primary query succeed?
  secondaryQueryOk: boolean       // Did secondary query succeed?
  primaryCount: number            // Videos from primary before merge
  secondaryCount: number          // Videos from secondary before merge
  blacklistDropped: number        // Videos removed by negative keywords
  cacheStatus: 'hit' | 'miss'    // In-memory cache
  forceRefresh: boolean           // Was ?refresh=1 used
  pageToken: boolean              // Was this a page-2+ request
  queryCreditsUsed: number        // 1 for page-2+ (single query), 2 for page-1 (dual query)
```

**When emitted:** Single call at the end of `GET()`, similar to other routes' `finalize()` pattern.

### R2: Thread `httpStatus` through to `finalize()` in extract

The publisher fetch HTTP status is available in every code path but gets lost before reaching `finalize()`. Two options:

- **Option A (minimal):** Set `httpStatus` on the `ExtractResult` payload object (it already has a `status` field that sometimes holds the HTTP code). Then read it in `finalize()`.
- **Option B (clean):** Refactor `finalize()` to accept a context object instead of 8 positional params. This would also fix the readability issues with `undefined, undefined, undefined, refreshMode`.

Recommended: Option B. The current positional API is the root cause of most "field never populated" bugs.

### R3: Add `extractionMethod` field to extract healthLog

New field: `extractionMethod: string`

Values: `'readability_direct'`, `'readability_redirect_unwrap'`, `'readability_html_unwrap'`, `'readability_output1_fallback'`, `'fallback_direct'`, `'fallback_redirect_unwrap'`, `'fallback_html_unwrap'`, `'fallback_output1'`, `'playwright_readability'`, `'playwright_fallback'`

**Where to set:** Each code path that calls `finalize()` on a successful extraction already has a console.log saying which method worked. Convert that to a field.

### R4: Fix `computeMs` by passing `computeStartedAt` through

Either:
- Include `computeStartedAt` in every non-cache-hit `finalize()` call via healthExtra
- Or (cleaner with R2-Option-B) include it in the context object

### R5: Populate `duplicatesRemoved` in search

The search route already deduplicates by guid. Add a counter and pass it through.

### R6: Normalize error reason taxonomy

Create a single unified error reason enum used by both healthLog and telemetry:

```
Proposed unified taxonomy:
  'timeout'
  'http_401'
  'http_403'
  'http_404'
  'http_429'
  'http_5xx'
  'blocked_cdn'           // CloudFront/Cloudflare blocks
  'non_html'
  'readability_empty'
  'quality_gate_failed'
  'invalid_url'
  'paywall'               // Detected paywall
  'fetch_error'           // Network-level failures
  'parse_error'
  'unknown'
```

**Deprecate:** `blocked_401_403_429` (split into specific codes), `empty` (rename to `readability_empty`).

### R7: Add KV cache operation logging

Add lightweight logging (not full healthLog events) for KV operations:

```
Tag: 'sunsreader_kv'
Fields:
  operation: 'read' | 'write'
  ok: boolean
  latencyMs: number
  keyPrefix: string (first 8 chars of hash)
  errorMessage?: string
```

**Sampling:** 100% for failures, 10% for successes (KV ops are high-volume).

### R8: Deprecate legacy JSON log lines

The legacy `console.log(JSON.stringify({type: 'search/resolve/extract', ...}))` lines predate healthLog and are now redundant. They add noise and carry slightly different schemas.

**Recommendation:** Remove them in a single cleanup PR after verifying no dashboards or log queries depend on the legacy format. If anything unique exists in the legacy lines (like `rssFetchStatus` or `inputUrl`), promote those fields into healthLog first.

### R9: Add `rssFetchStatus` to search healthLog

The RSS fetch HTTP status code is available in the search route and logged in the legacy line, but not in healthLog. Add it:

```
rssFetchStatus?: number   // HTTP status from Google News RSS fetch
```

---

## 6. Healthcheck v2 Recommendations

### 6a. Metrics Computable from Current Logs

These can be computed today by querying `tag:"sunsreader_health"`:

| Metric | Query | Notes |
|---|---|---|
| **Extract success rate** | `ok=true / total WHERE type='extract'` | Works well |
| **Extract P50/P95 latency** | `durationMs WHERE type='extract'` | Includes cache-hit latency (fast) which skews P50 down |
| **Cache hit rate (extract)** | `cacheStatus='hit' / total WHERE type='extract'` | Works |
| **L1 vs L2 cache split** | `cacheLayer='l1' vs 'l2' WHERE cacheStatus='hit'` | Works |
| **Resolve success rate** | `ok=true / total WHERE type='resolve'` | Works |
| **Resolve cache hit rate** | `cacheStatus='hit' / total WHERE type='resolve'` | Works |
| **Resolve strategy distribution** | `GROUP BY strategyUsed WHERE type='resolve' AND ok=true` | Works |
| **Search success rate** | `ok=true / total WHERE type='search'` | Works |
| **Search items per request** | `AVG(itemsReturned) WHERE type='search'` | Works |
| **Top error reasons (all)** | `GROUP BY errorReason WHERE ok=false` | Works but taxonomy is inconsistent |
| **Blocked publisher domains** | `publisherHost WHERE blockedDetected=true` | Works |
| **Quality gate failure rate** | `qualityGatePassed=false / total WHERE type='extract'` | Derived field, works |
| **Readability failure rate** | `readabilityOk=false / total WHERE type='extract' AND cacheStatus='miss'` | Excludes cache hits |
| **Playwright candidate rate** | From telemetry: `playwright_candidate=true / total WHERE stage='extract' AND ok=false` | Works |

### 6b. Metrics That Need New Fields

| Metric | Blocked By | Fix |
|---|---|---|
| **Video API success rate** | No structured video logging | R1 |
| **Video API latency** | No structured video logging | R1 |
| **YouTube quota burn rate** | No query credit tracking | R1 (`queryCreditsUsed`) |
| **Extract compute time (excl. cache)** | `computeMs` dead | R4 |
| **Publisher HTTP status distribution** | `httpStatus` rarely set | R2 |
| **Extraction method distribution** | No `extractionMethod` field | R3 |
| **KV cache reliability** | No KV operation logging | R7 |
| **RSS feed HTTP reliability** | `rssFetchStatus` not in healthLog | R9 |

### 6c. Suggested Weekly Report Sections

Based on what's available now + the proposed additions:

#### Section 1: Pipeline Health (available now)
- Extract success rate (7d trend)
- Resolve success rate (7d trend)
- Search success rate (7d trend)
- Top 5 error reasons by volume

#### Section 2: Cache Performance (available now)
- Extract L1/L2 hit rates
- Resolve cache hit rate
- Cache-hit vs miss latency comparison

#### Section 3: Publisher Reliability (partially available, needs R2)
- Top 10 publishers by extract volume
- Per-publisher success rate
- Per-publisher blocked rate
- Per-publisher HTTP status distribution (needs R2)

#### Section 4: Video Pipeline (needs R1)
- Video API success rate
- Primary vs secondary query reliability
- Blacklist filter impact
- Estimated daily YouTube quota usage

#### Section 5: Extraction Quality (needs R3)
- Readability vs fallback extraction ratio
- Quality gate pass rate
- Mean title/text lengths (success only)
- Extraction method distribution

#### Section 6: Infrastructure (needs R7)
- KV cache read/write success rate
- KV latency P50/P95
- Serverless cold start impact (proxy via L1 miss rate trend)

---

## Verification Notes

- All call-site counts verified via `grep -c` against the actual source files.
- The "47 finalize calls" count in extract was verified by `grep 'return finalize(' app/api/extract/route.ts | wc -l`.
- The "45 pass undefined for healthExtra" was verified by grep for the specific positional pattern.
- Field schemas cross-referenced between `healthLog.ts` TypeScript interfaces and actual `healthLog()` call-site payloads.
- Video route confirmed to have zero imports of healthLog, recordTelemetry, or any structured logging module.
