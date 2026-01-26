/**
 * Lightweight telemetry for resolve/extract pipeline reliability analysis.
 *
 * - Always logs failures (ok=false)
 * - Samples successes at TELEMETRY_SAMPLE_RATE (default 15%)
 * - Never throws; errors are silently swallowed
 * - Outputs single-line JSON for Vercel log filtering
 *
 * Filter in Vercel logs: "tag":"telemetry"
 */

export type TelemetryStage = 'resolve' | 'extract';

export type TelemetryReason =
  | 'timeout'
  | 'http_401'
  | 'http_403'
  | 'http_404'
  | 'http_429'
  | 'http_5xx'
  | 'empty'
  | 'parse_error'
  | 'blocked'
  | 'paywall'
  | 'unknown';

export interface TelemetryEvent {
  req_id: string;
  stage: TelemetryStage;
  domain: string;
  ok: boolean;
  reason?: TelemetryReason;
  duration_ms: number;
  playwright_candidate?: boolean;
}

// Read configuration from environment
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED !== 'false';
const TELEMETRY_SAMPLE_RATE = parseFloat(process.env.TELEMETRY_SAMPLE_RATE || '0.15');

/**
 * Extract hostname from URL, stripping www. prefix
 * Returns "unknown" on failure
 */
export function extractDomain(url: string | null | undefined): string {
  if (!url) return 'unknown';
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Generate a short request ID (8 characters)
 */
export function generateReqId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Bucket HTTP status codes into reason categories
 */
export function httpStatusToReason(status: number): TelemetryReason {
  if (status === 401) return 'http_401';
  if (status === 403) return 'http_403';
  if (status === 404) return 'http_404';
  if (status === 429) return 'http_429';
  if (status >= 500 && status < 600) return 'http_5xx';
  return 'unknown';
}

/**
 * Determine if a failure looks like it could benefit from Playwright rendering.
 * True when: HTTP 200/OK but empty/blocked content (JS rendering needed)
 */
export function isPlaywrightCandidate(params: {
  httpStatus?: number;
  reason?: TelemetryReason;
  contentEmpty?: boolean;
}): boolean {
  const { httpStatus, reason, contentEmpty } = params;

  // If we got a 200 but content is empty or blocked, likely needs JS rendering
  if (httpStatus === 200 || httpStatus === undefined) {
    if (reason === 'empty' || reason === 'blocked') {
      return true;
    }
    if (contentEmpty) {
      return true;
    }
  }

  return false;
}

/**
 * Record a telemetry event.
 * - Applies sampling for successes (ok=true)
 * - Always logs failures (ok=false)
 * - Never throws
 */
export function recordTelemetry(event: TelemetryEvent): void {
  try {
    // Bail early if telemetry is disabled
    if (!TELEMETRY_ENABLED) return;

    // Apply sampling: always log failures, sample successes
    if (event.ok && Math.random() >= TELEMETRY_SAMPLE_RATE) {
      return;
    }

    const logEntry = {
      tag: 'telemetry',
      ts: new Date().toISOString(),
      req_id: event.req_id,
      stage: event.stage,
      domain: event.domain,
      ok: event.ok,
      reason: event.ok ? undefined : (event.reason || 'unknown'),
      duration_ms: event.duration_ms,
      playwright_candidate: event.ok ? undefined : (event.playwright_candidate ?? false),
    };

    // Output as single-line JSON
    console.log(JSON.stringify(logEntry));
  } catch {
    // Silently swallow any errors - telemetry must never break the pipeline
  }
}

/**
 * Helper to create a telemetry context for a request.
 * Usage:
 *   const tel = createTelemetryContext('resolve', inputUrl);
 *   // ... do work ...
 *   tel.record({ ok: true });
 *   // or
 *   tel.record({ ok: false, reason: 'timeout', playwright_candidate: false });
 */
export function createTelemetryContext(
  stage: TelemetryStage,
  url: string | null | undefined
) {
  const startTime = Date.now();
  const reqId = generateReqId();
  const domain = extractDomain(url);

  return {
    reqId,
    domain,
    record(result: {
      ok: boolean;
      reason?: TelemetryReason;
      playwright_candidate?: boolean;
    }) {
      recordTelemetry({
        req_id: reqId,
        stage,
        domain,
        ok: result.ok,
        reason: result.reason,
        duration_ms: Date.now() - startTime,
        playwright_candidate: result.playwright_candidate,
      });
    },
  };
}
