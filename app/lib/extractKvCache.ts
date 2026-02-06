/**
 * L2 extraction cache using Upstash Redis (Vercel KV replacement).
 *
 * Provides durable, cross-instance caching for successful article extractions.
 * All operations are best-effort: failures are silently swallowed and the
 * extraction pipeline continues as if the cache didn't exist.
 *
 * Env vars (provided by Vercel when KV/Upstash is connected):
 *   KV_REST_API_URL  — Upstash REST endpoint
 *   KV_REST_API_TOKEN — Upstash REST auth token
 *
 * If env vars are missing, all operations return null/void (cache disabled).
 */

import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedExtract {
  v: 1;
  normalizedUrl: string;
  title: string;
  byline?: string;
  siteName?: string;
  contentHtml: string;
  textContent: string;
  excerpt?: string;
  length: number;
  cachedAt: number; // unix ms
}

// ---------------------------------------------------------------------------
// Redis client (lazy singleton)
// ---------------------------------------------------------------------------

// Use `any` for the internal client to avoid coupling to Upstash's complex
// generic types. All public APIs are strongly typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _redis: any | null | undefined; // undefined = not yet initialized

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRedis(): any | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    _redis = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis');
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    _redis = null;
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL Normalization
// ---------------------------------------------------------------------------

/** Tracking params to strip from URLs before cache keying */
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'mc_cid', 'mc_eid',
  'ref', 'ref_src', 's', 'cmpid',
]);

/**
 * Normalize a URL for consistent cache keying.
 *
 * - Lowercase hostname
 * - Strip www. prefix
 * - Remove fragment/hash
 * - Remove known tracking & utm_* params
 * - Sort remaining query params
 * - Remove trailing slash (unless path is "/")
 */
export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);

    // Lowercase hostname and strip www.
    url.hostname = url.hostname.toLowerCase();
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
    }

    // Remove fragment
    url.hash = '';

    // Filter and sort query params
    const params = new URLSearchParams();
    const sorted: [string, string][] = [];
    url.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith('utm_')) return;
      if (TRACKING_PARAMS.has(lowerKey)) return;
      sorted.push([key, value]);
    });
    sorted.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    for (const [k, v] of sorted) {
      params.append(k, v);
    }
    url.search = params.toString() ? `?${params.toString()}` : '';

    // Remove trailing slash (unless root)
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    // If URL parsing fails, return as-is (will likely fail downstream too)
    return input;
  }
}

// ---------------------------------------------------------------------------
// Cache Key
// ---------------------------------------------------------------------------

const CACHE_KEY_PREFIX = 'sr:ext:v1:';

/**
 * Create a short, collision-resistant cache key from a normalized URL.
 * Format: sr:ext:v1:<16-char-sha256-hex>
 */
export function makeCacheKey(normalizedUrl: string): string {
  const hash = createHash('sha256').update(normalizedUrl).digest('hex').substring(0, 16);
  return `${CACHE_KEY_PREFIX}${hash}`;
}

// ---------------------------------------------------------------------------
// Cache Operations
// ---------------------------------------------------------------------------

const KV_TTL_SECONDS = 86400; // 24 hours

/**
 * Retrieve a cached extraction result from KV.
 * Returns null on miss, expiry, error, or if KV is not configured.
 */
export async function getCachedExtract(normalizedUrl: string): Promise<CachedExtract | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;

    const key = makeCacheKey(normalizedUrl);
    const data = await redis.get(key) as CachedExtract | null;

    // Validate schema version
    if (data && data.v === 1 && data.contentHtml && data.title) {
      return data;
    }
    return null;
  } catch {
    // KV failure — silently fall back to extraction
    return null;
  }
}

/**
 * Store a successful extraction in KV with TTL.
 * Best-effort: never throws. Caller should use fire-and-forget pattern:
 *   void setCachedExtract(...).catch(() => {})
 */
export async function setCachedExtract(normalizedUrl: string, payload: CachedExtract): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const key = makeCacheKey(normalizedUrl);
    await redis.set(key, payload, { ex: KV_TTL_SECONDS });
  } catch {
    // KV failure — silently ignore
  }
}

/**
 * Build a CachedExtract from an extraction result.
 * Only call for successful extractions with content.
 */
export function buildCachedPayload(
  normalizedUrl: string,
  result: {
    title?: string;
    byline?: string;
    siteName?: string;
    contentHtml?: string;
    textContent?: string;
    excerpt?: string;
    length?: number;
  }
): CachedExtract | null {
  // Only cache if we have the minimum required fields
  if (!result.title || !result.contentHtml) return null;

  return {
    v: 1,
    normalizedUrl,
    title: result.title,
    byline: result.byline,
    siteName: result.siteName,
    contentHtml: result.contentHtml,
    textContent: result.textContent || '',
    excerpt: result.excerpt,
    length: result.length || result.textContent?.length || 0,
    cachedAt: Date.now(),
  };
}

/** KV TTL in seconds (exported for telemetry) */
export const KV_TTL_SEC = KV_TTL_SECONDS;
