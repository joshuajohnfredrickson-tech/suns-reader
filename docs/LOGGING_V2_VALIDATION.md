# Logging V2 Validation Checklist

Use this checklist to validate the v2 logging changes after deployment.

## Pre-Deployment

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] No new environment variables required (no .env changes)
- [ ] Legacy JSON logs still present (marked with `TODO(logging-v2)`)

## Post-Deployment Smoke Tests

### 1. Search Route (`/api/search`)

**Test:** Visit the app homepage and let it load articles.

**Verify in Vercel logs:**
```
"tag":"sunsreader_health" AND type:search
```

- [ ] `ok: true` with `itemsReturned > 0`
- [ ] `query` field populated (truncated to 80 chars max)
- [ ] `durationMs` is reasonable (< 5000ms)
- [ ] Legacy JSON line also present (type: "search")

### 2. Resolve Route (`/api/resolve`)

**Test:** Click an article that came from Google News RSS.

**Verify in Vercel logs:**
```
"tag":"sunsreader_health" AND type:resolve
```

- [ ] `ok: true` with `resolvedHost` populated
- [ ] `isGoogleNewsUrl: true`
- [ ] `strategyUsed` shows which method worked
- [ ] `methodsTried` is an array
- [ ] `cacheStatus` is `miss` on first call, `hit` on repeat

### 3. Extract Route (`/api/extract`)

**Test:** Open several articles in reader view. Include:
- A normal article (e.g. azcentral.com)
- A refresh of the same article (should be L1 cache hit)
- An ESPN article (should fail with blocked)

**Verify in Vercel logs:**
```
"tag":"sunsreader_health" AND type:extract
```

- [ ] **New fields present:**
  - [ ] `extractMethod` is one of: `readability`, `fallback`, `playwright_readability`, `playwright_fallback`, `none`
  - [ ] `fallbackUsed` is boolean
  - [ ] `httpStatus` populated on cache misses
  - [ ] `computeMs` populated on cache misses (should be < `durationMs`)
  - [ ] `kvWriteAttempted: true` on successful extractions
- [ ] **Cache hits:**
  - [ ] L1 hit: `cacheStatus: "hit"`, `cacheLayer: "l1"`, no `extractMethod`
  - [ ] L2 hit: `cacheStatus: "hit"`, `cacheLayer: "l2"`, `cacheAgeSec` populated
- [ ] **Failures:**
  - [ ] ESPN blocked: `errorReason: "blocked"`, `blockedDetected: true`
  - [ ] 404 page: `errorReason: "http_4xx"`
  - [ ] Non-HTML: `errorReason: "non_html"`

### 4. Videos Route (`/api/videos`)

**Test:** Navigate to the Videos tab.

**Verify in Vercel logs:**
```
"tag":"sunsreader_health" AND type:videos
```

- [ ] `ok: true` (first time seeing videos health logs!)
- [ ] `primaryRawCount` > 0
- [ ] `primaryFilteredCount` <= `primaryRawCount`
- [ ] `secondaryRawCount` present (page 1 only)
- [ ] `mergedCount` = final video count
- [ ] `duplicatesRemoved` >= 0
- [ ] `cacheStatus` is `miss` first time, `hit` on repeat within 10 min
- [ ] Page 2+ requests have `pageToken` populated

### 5. Error Taxonomy Validation

**Verify that `errorReason` values match the v2 taxonomy:**

- [ ] No `blocked_401_403_429` values (old taxonomy)
- [ ] Blocked sites show `errorReason: "blocked"` (not `blocked_401_403_429`)
- [ ] Timeout errors show `errorReason: "timeout"`
- [ ] 404s show `errorReason: "http_4xx"` (not `unknown`)

### 6. Legacy Log Coexistence

**Verify legacy logs still work alongside healthLog:**

```
type:"extract" AND NOT "tag":"sunsreader_health"
```

- [ ] Legacy JSON logs still emitting
- [ ] Legacy logs have `TODO(logging-v2)` comment in source
- [ ] No duplicate data issues (legacy + health both fire)

## Metrics to Monitor (First 48h)

| Metric | Expected | Alert If |
|--------|----------|----------|
| Extract success rate | ~70-85% | < 50% |
| L1 cache hit rate | ~30-50% | < 10% |
| L2 cache hit rate | ~10-20% | N/A (best-effort) |
| Resolve success rate | ~90%+ | < 70% |
| Search success rate | ~95%+ | < 80% |
| Videos success rate | ~95%+ | < 80% |
| P95 extract latency | < 5s | > 10s |
| P95 search latency | < 3s | > 5s |
| Readability method % | ~60-80% | N/A |
| Fallback method % | ~5-15% | N/A |
| Playwright method % | ~5-15% | N/A |

## Follow-Up Tasks (After Validation)

- [ ] Remove legacy JSON logs (search for `TODO(logging-v2)`)
- [ ] Remove `telemetry.ts` recordTelemetry system (superseded by healthLog)
- [ ] Add `kvWriteOk` tracking (requires async KV write result)
- [ ] Add video filter branch counting (deferred from v2)
- [ ] Set up Vercel log drain + dashboard if not already configured
- [ ] Consider bumping `v` field to `2` after legacy removal
