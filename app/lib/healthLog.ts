/**
 * Structured health telemetry for Suns Reader pipeline monitoring.
 *
 * Emits one JSON log line per API request with tag "sunsreader_health".
 * Filter in Vercel logs: "tag":"sunsreader_health"
 *
 * Rules:
 * - 100% of requests logged (no sampling)
 * - Never logs article HTML, extracted text, or RSS XML
 * - Never logs full URLs — only host + truncated path
 * - Each log line kept under ~1KB
 * - Non-blocking: console.log only, no awaits, no network calls
 * - Never throws; errors silently swallowed
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthRoute = '/api/search' | '/api/resolve' | '/api/extract';
export type HealthType = 'search' | 'resolve' | 'extract';
export type CacheStatus = 'hit' | 'miss' | 'bypass' | 'stale' | 'none';
export type CacheMode = 'normal' | 'refresh_bypass';

export type HealthErrorReason =
  | 'timeout'
  | 'blocked_401_403_429'
  | 'fetch_error'
  | 'non_html'
  | 'readability_empty'
  | 'quality_gate_failed'
  | 'invalid_url'
  | 'unknown';

/** Base fields present on every health log event */
interface HealthEventBase {
  route: HealthRoute;
  type: HealthType;
  ok: boolean;
  durationMs: number;
  requestId: string;
}

/** Search-specific fields */
export interface SearchHealthFields extends HealthEventBase {
  type: 'search';
  route: '/api/search';
  source: 'google_news_rss';
  query: string;
  itemsReturned: number;
  itemsParsed: number;
  duplicatesRemoved?: number;
  uniqueDomains?: number;
  errorReason?: HealthErrorReason;
  errorMessage?: string;
}

/** Resolve-specific fields */
export interface ResolveHealthFields extends HealthEventBase {
  type: 'resolve';
  route: '/api/resolve';
  inputHost: string;
  resolvedHost?: string;
  isGoogleNewsUrl: boolean;
  strategyUsed?: string;
  methodsTried: string[];
  cacheStatus: CacheStatus;
  cacheTtlSec?: number;
  errorReason?: HealthErrorReason;
  errorMessage?: string;
}

/** Extract-specific fields */
export interface ExtractHealthFields extends HealthEventBase {
  type: 'extract';
  route: '/api/extract';
  publisherHost: string;
  httpStatus?: number;
  contentType?: string;
  blockedDetected?: boolean;
  titleLength?: number;
  textLength?: number;
  readabilityOk?: boolean;
  qualityGatePassed?: boolean;
  playwrightUsed?: boolean;
  cacheStatus: CacheStatus;
  cacheMode?: CacheMode;
  cacheLayer?: 'l1' | 'l2';
  cacheTtlSec?: number;
  cacheAgeSec?: number;
  computeMs?: number;
  errorReason?: HealthErrorReason;
  errorMessage?: string;
}

export type HealthEvent = SearchHealthFields | ResolveHealthFields | ExtractHealthFields;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short request ID (8 chars) */
export function makeRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/** Truncate a string to maxLen, appending "…" if truncated */
function truncate(str: string | undefined | null, maxLen: number): string | undefined {
  if (!str) return undefined;
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}

/** Extract hostname from URL, stripping www. prefix. Returns "unknown" on failure. */
export function safeHost(url: string | null | undefined): string {
  if (!url) return 'unknown';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an error into a standard reason + truncated message.
 * Works for search/resolve/extract failures.
 */
export function normalizeError(
  error: string | Error | null | undefined,
  httpStatus?: number
): { errorReason: HealthErrorReason; errorMessage?: string } {
  const msg = error instanceof Error ? error.message : (error || '');
  const lower = msg.toLowerCase();

  let reason: HealthErrorReason = 'unknown';

  // Timeout
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('abort')) {
    reason = 'timeout';
  }
  // HTTP blocking status codes
  else if (
    httpStatus === 401 || httpStatus === 403 || httpStatus === 429 ||
    lower.includes('401') || lower.includes('403') || lower.includes('429') ||
    lower.includes('blocked')
  ) {
    reason = 'blocked_401_403_429';
  }
  // Fetch errors
  else if (lower.includes('fetch') || lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('network')) {
    reason = 'fetch_error';
  }
  // Non-HTML content
  else if (lower.includes('non-html') || lower.includes('not html') || lower.includes('content type') || lower.includes('application/json')) {
    reason = 'non_html';
  }
  // Readability empty
  else if (lower.includes('readability') || lower.includes('no_reader') || lower.includes('reader view') || lower.includes('empty')) {
    reason = 'readability_empty';
  }
  // Quality gate
  else if (lower.includes('quality') || lower.includes('too short') || lower.includes('title') || lower.includes('insufficient')) {
    reason = 'quality_gate_failed';
  }
  // Invalid URL
  else if (lower.includes('invalid') || lower.includes('url') || lower.includes('missing')) {
    reason = 'invalid_url';
  }

  return {
    errorReason: reason,
    errorMessage: truncate(msg, 300) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Main logger
// ---------------------------------------------------------------------------

/**
 * Emit a single structured health log line.
 * Non-blocking, never throws.
 */
export function healthLog(event: HealthEvent): void {
  try {
    const entry: Record<string, unknown> = {
      tag: 'sunsreader_health',
      v: 1,
      ts: new Date().toISOString(),
      env: process.env.VERCEL_ENV ?? 'local',
      requestId: event.requestId,
      route: event.route,
      type: event.type,
      ok: event.ok,
      durationMs: event.durationMs,
    };

    // Add type-specific fields
    switch (event.type) {
      case 'search': {
        const e = event as SearchHealthFields;
        entry.source = e.source;
        entry.query = truncate(e.query, 80);
        entry.itemsReturned = e.itemsReturned;
        entry.itemsParsed = e.itemsParsed;
        if (e.duplicatesRemoved !== undefined) entry.duplicatesRemoved = e.duplicatesRemoved;
        if (e.uniqueDomains !== undefined) entry.uniqueDomains = e.uniqueDomains;
        if (!e.ok) {
          if (e.errorReason) entry.errorReason = e.errorReason;
          if (e.errorMessage) entry.errorMessage = truncate(e.errorMessage, 300);
        }
        break;
      }
      case 'resolve': {
        const e = event as ResolveHealthFields;
        entry.inputHost = e.inputHost;
        if (e.resolvedHost) entry.resolvedHost = e.resolvedHost;
        entry.isGoogleNewsUrl = e.isGoogleNewsUrl;
        if (e.strategyUsed) entry.strategyUsed = e.strategyUsed;
        entry.methodsTried = e.methodsTried;
        entry.cacheStatus = e.cacheStatus;
        if (e.cacheTtlSec !== undefined) entry.cacheTtlSec = e.cacheTtlSec;
        if (!e.ok) {
          if (e.errorReason) entry.errorReason = e.errorReason;
          if (e.errorMessage) entry.errorMessage = truncate(e.errorMessage, 300);
        }
        break;
      }
      case 'extract': {
        const e = event as ExtractHealthFields;
        entry.publisherHost = e.publisherHost;
        if (e.httpStatus !== undefined) entry.httpStatus = e.httpStatus;
        if (e.contentType) entry.contentType = truncate(e.contentType, 60);
        if (e.blockedDetected !== undefined) entry.blockedDetected = e.blockedDetected;
        if (e.titleLength !== undefined) entry.titleLength = e.titleLength;
        if (e.textLength !== undefined) entry.textLength = e.textLength;
        if (e.readabilityOk !== undefined) entry.readabilityOk = e.readabilityOk;
        if (e.qualityGatePassed !== undefined) entry.qualityGatePassed = e.qualityGatePassed;
        if (e.playwrightUsed !== undefined) entry.playwrightUsed = e.playwrightUsed;
        entry.cacheStatus = e.cacheStatus;
        if (e.cacheMode) entry.cacheMode = e.cacheMode;
        if (e.cacheLayer) entry.cacheLayer = e.cacheLayer;
        if (e.cacheTtlSec !== undefined) entry.cacheTtlSec = e.cacheTtlSec;
        if (e.cacheAgeSec !== undefined) entry.cacheAgeSec = e.cacheAgeSec;
        if (e.computeMs !== undefined) entry.computeMs = e.computeMs;
        if (!e.ok) {
          if (e.errorReason) entry.errorReason = e.errorReason;
          if (e.errorMessage) entry.errorMessage = truncate(e.errorMessage, 300);
        }
        break;
      }
    }

    console.log(JSON.stringify(entry));
  } catch {
    // Silently swallow — telemetry must never break the pipeline
  }
}
