# Healthcheck Template V2

> Filter in Vercel logs: `"tag":"sunsreader_health"`

## Common Fields (all routes)

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `"sunsreader_health"` | Log filter key |
| `v` | `1` | Schema version |
| `ts` | ISO 8601 string | Timestamp |
| `env` | string | `VERCEL_ENV` or `"local"` |
| `requestId` | string (8 chars) | Per-request correlation ID |
| `route` | string | One of `/api/search`, `/api/resolve`, `/api/extract`, `/api/videos` |
| `type` | string | One of `search`, `resolve`, `extract`, `videos` |
| `ok` | boolean | `true` = success, `false` = failure |
| `durationMs` | number | Total wall-clock time in ms |

## Error Fields (when `ok=false`)

| Field | Type | Description |
|-------|------|-------------|
| `errorReason` | HealthErrorReason | Normalized error bucket (see taxonomy) |
| `errorMessage` | string (max 300 chars) | Truncated error message |

### Error Reason Taxonomy (v2)

| Reason | Meaning |
|--------|---------|
| `timeout` | Request timed out or was aborted |
| `blocked` | HTTP 401, 403, 429, or generic anti-bot blocking |
| `paywall` | Soft paywall / subscribe-wall detected |
| `fetch_error` | Network-level failure (ECONNREFUSED, ENOTFOUND, DNS) |
| `http_4xx` | Non-blocking 4xx response (e.g. 404 Not Found) |
| `http_5xx` | Server errors (500-599) |
| `non_html` | Response content-type was not HTML |
| `readability_empty` | Readability returned null or empty content |
| `quality_gate_failed` | Content too short, title too short, or JSON error payload |
| `invalid_url` | Missing, malformed, or homepage URL |
| `unknown` | Unclassified error |

---

## Route: `/api/search`

| Field | Type | Description |
|-------|------|-------------|
| `source` | `"google_news_rss"` | Feed source |
| `query` | string (max 80 chars) | Search query |
| `itemsReturned` | number | Items in API response |
| `itemsParsed` | number | Items successfully parsed |
| `duplicatesRemoved` | number? | Deduplication count |
| `uniqueDomains` | number? | Distinct publisher domains |

### Example (success)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "a1b2c3d4",
  "route": "/api/search",
  "type": "search",
  "ok": true,
  "durationMs": 850,
  "source": "google_news_rss",
  "query": "Phoenix Suns",
  "itemsReturned": 15,
  "itemsParsed": 15
}
```

---

## Route: `/api/resolve`

| Field | Type | Description |
|-------|------|-------------|
| `inputHost` | string | Hostname of input URL |
| `resolvedHost` | string? | Hostname of resolved URL (on success) |
| `isGoogleNewsUrl` | boolean | Whether input was a Google News URL |
| `strategyUsed` | string? | Which resolution strategy succeeded |
| `methodsTried` | string[] | All strategies attempted |
| `cacheStatus` | CacheStatus | `hit`, `miss`, `bypass`, `none` |
| `cacheTtlSec` | number? | Cache TTL in seconds |

### Example (success)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "e5f6g7h8",
  "route": "/api/resolve",
  "type": "resolve",
  "ok": true,
  "durationMs": 420,
  "inputHost": "news.google.com",
  "resolvedHost": "azcentral.com",
  "isGoogleNewsUrl": true,
  "strategyUsed": "base64_decode",
  "methodsTried": ["base64_decode"],
  "cacheStatus": "miss"
}
```

---

## Route: `/api/extract`

| Field | Type | Description |
|-------|------|-------------|
| `publisherHost` | string | Publisher domain (www stripped) |
| `httpStatus` | number? | HTTP status from publisher fetch |
| `contentType` | string? | Response content-type (max 60 chars) |
| `blockedDetected` | boolean? | Whether blocking was detected |
| `titleLength` | number? | Extracted title character count |
| `textLength` | number? | Extracted text character count |
| `readabilityOk` | boolean? | Whether Readability returned content |
| `qualityGatePassed` | boolean? | Whether quality gate passed |
| `playwrightUsed` | boolean? | Whether Playwright was used |
| `extractMethod` | ExtractMethod? | Which extraction method produced the result |
| `fallbackUsed` | boolean? | Whether fallbackExtract() was used |
| `cacheStatus` | CacheStatus | `hit`, `miss`, `bypass`, `none` |
| `cacheMode` | CacheMode? | `normal` or `refresh_bypass` |
| `cacheLayer` | `"l1"` or `"l2"`? | Which cache tier served the hit |
| `cacheTtlSec` | number? | TTL of cache entry |
| `cacheAgeSec` | number? | Age of KV cache entry |
| `computeMs` | number? | Extraction compute time (excludes cache lookup) |
| `kvWriteAttempted` | boolean? | Whether a KV cache write was attempted |
| `kvWriteOk` | boolean? | Whether the KV write succeeded |

### ExtractMethod Values

| Value | Meaning |
|-------|---------|
| `readability` | @mozilla/readability succeeded (fetch) |
| `fallback` | fallbackExtract() used after readability failed (fetch) |
| `playwright_readability` | Readability succeeded with Playwright-fetched HTML |
| `playwright_fallback` | fallbackExtract() used with Playwright-fetched HTML |
| `none` | No extraction method succeeded / not attempted |

### Example (success, cache miss)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "i9j0k1l2",
  "route": "/api/extract",
  "type": "extract",
  "ok": true,
  "durationMs": 2300,
  "publisherHost": "azcentral.com",
  "httpStatus": 200,
  "contentType": "text/html; charset=utf-8",
  "titleLength": 65,
  "textLength": 4200,
  "readabilityOk": true,
  "qualityGatePassed": true,
  "playwrightUsed": false,
  "extractMethod": "readability",
  "fallbackUsed": false,
  "cacheStatus": "miss",
  "cacheMode": "normal",
  "computeMs": 1800,
  "kvWriteAttempted": true
}
```

### Example (L2 cache hit)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "m3n4o5p6",
  "route": "/api/extract",
  "type": "extract",
  "ok": true,
  "durationMs": 45,
  "publisherHost": "azcentral.com",
  "cacheStatus": "hit",
  "cacheMode": "normal",
  "cacheLayer": "l2",
  "cacheAgeSec": 180
}
```

### Example (failure, blocked)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "q7r8s9t0",
  "route": "/api/extract",
  "type": "extract",
  "ok": false,
  "durationMs": 3500,
  "publisherHost": "espn.com",
  "httpStatus": 200,
  "blockedDetected": true,
  "extractMethod": "none",
  "cacheStatus": "miss",
  "errorReason": "blocked",
  "errorMessage": "ESPN blocks reader mode"
}
```

---

## Route: `/api/videos`

| Field | Type | Description |
|-------|------|-------------|
| `primaryRawCount` | number | Raw items from primary YouTube query |
| `primaryFilteredCount` | number | Items after relevance filtering (primary) |
| `secondaryRawCount` | number? | Raw items from secondary query (page 1 only) |
| `secondaryFilteredCount` | number? | Items after filtering (secondary, page 1 only) |
| `mergedCount` | number | Final video count after merge + dedup |
| `duplicatesRemoved` | number | Videos removed by deduplication |
| `cacheStatus` | CacheStatus | `hit` if all queries cached, else `miss` |
| `pageToken` | string? | Pagination token (page 2+ requests) |

### Example (success, page 1)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "u1v2w3x4",
  "route": "/api/videos",
  "type": "videos",
  "ok": true,
  "durationMs": 1200,
  "primaryRawCount": 50,
  "primaryFilteredCount": 18,
  "secondaryRawCount": 50,
  "secondaryFilteredCount": 12,
  "mergedCount": 25,
  "duplicatesRemoved": 5,
  "cacheStatus": "miss"
}
```

### Example (success, page 2+)
```json
{
  "tag": "sunsreader_health",
  "v": 1,
  "ts": "2025-01-15T12:00:00.000Z",
  "env": "production",
  "requestId": "y5z6a7b8",
  "route": "/api/videos",
  "type": "videos",
  "ok": true,
  "durationMs": 650,
  "primaryRawCount": 50,
  "primaryFilteredCount": 14,
  "mergedCount": 14,
  "duplicatesRemoved": 0,
  "cacheStatus": "miss",
  "pageToken": "CDIQAA"
}
```

---

## Dashboard Queries (Vercel Log Drains / jq)

### Overall success rate
```
"tag":"sunsreader_health" | group by type | ok:true / total
```

### Extract failure breakdown
```
"tag":"sunsreader_health" AND type:extract AND ok:false | group by errorReason
```

### Extract method distribution
```
"tag":"sunsreader_health" AND type:extract AND ok:true | group by extractMethod
```

### Cache hit rate by route
```
"tag":"sunsreader_health" AND cacheStatus:hit | group by route
```

### KV write success rate
```
"tag":"sunsreader_health" AND type:extract AND kvWriteAttempted:true | kvWriteOk:true / total
```

### P95 latency per route
```
"tag":"sunsreader_health" | group by route | percentile(durationMs, 95)
```

### Video filter effectiveness
```
"tag":"sunsreader_health" AND type:videos | avg(primaryFilteredCount / primaryRawCount)
```

### Blocked publishers
```
"tag":"sunsreader_health" AND type:extract AND errorReason:blocked | group by publisherHost | top 10
```
