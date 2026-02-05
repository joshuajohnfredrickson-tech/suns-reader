/**
 * Client-side extraction cache using localStorage.
 * LRU-ish eviction with TTL expiry.
 *
 * Only successful extracts are cached.
 * Failures are never cached.
 */

const STORAGE_KEY = 'suns-reader-extract-cache-v1';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_ENTRIES = 50;

interface CacheEntry {
  ts: number;
  payload: any;
}

interface CacheStore {
  version: 1;
  index: string[];                    // URLs oldest → newest
  entries: { [url: string]: CacheEntry };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function emptyStore(): CacheStore {
  return { version: 1, index: [], entries: {} };
}

function safeLoad(): CacheStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return emptyStore();
    return parsed as CacheStore;
  } catch {
    return emptyStore();
  }
}

function safeSave(store: CacheStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded — try aggressive eviction (keep newest half)
    try {
      const half = Math.ceil(store.index.length / 2);
      const removed = store.index.splice(0, half);
      for (const url of removed) {
        delete store.entries[url];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Still failing — abandon silently
    }
  }
}

function purgeExpired(store: CacheStore): void {
  const now = Date.now();
  const expired: string[] = [];

  for (const url of store.index) {
    const entry = store.entries[url];
    if (!entry || now - entry.ts > TTL_MS) {
      expired.push(url);
    }
  }

  for (const url of expired) {
    delete store.entries[url];
    const idx = store.index.indexOf(url);
    if (idx !== -1) store.index.splice(idx, 1);
  }
}

function bumpToEnd(store: CacheStore, url: string): void {
  const idx = store.index.indexOf(url);
  if (idx !== -1) store.index.splice(idx, 1);
  store.index.push(url);
}

function evictOldest(store: CacheStore): void {
  while (store.index.length > MAX_ENTRIES) {
    const oldest = store.index.shift();
    if (oldest) delete store.entries[oldest];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a cached extract for the given URL.
 * Returns the payload or null if not found / expired.
 */
export function getCachedExtract(url: string): any | null {
  const store = safeLoad();
  purgeExpired(store);

  const entry = store.entries[url];
  if (!entry) return null;

  // Bump to most-recent position
  bumpToEnd(store, url);
  safeSave(store);

  if (process.env.NODE_ENV === 'development') {
    console.log('[ExtractCache] HIT', url);
  }

  return entry.payload;
}

/**
 * Store a successful extract response in the cache.
 * Only call this for successful extractions with content.
 */
export function setCachedExtract(url: string, payload: any): void {
  const store = safeLoad();
  purgeExpired(store);

  // Upsert
  store.entries[url] = { ts: Date.now(), payload };
  bumpToEnd(store, url);
  evictOldest(store);
  safeSave(store);

  if (process.env.NODE_ENV === 'development') {
    console.log('[ExtractCache] SET', url, `(${store.index.length} entries)`);
  }
}
