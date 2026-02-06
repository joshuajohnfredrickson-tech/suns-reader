export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createTelemetryContext,
  TelemetryReason,
} from "../../lib/telemetry";
import { healthLog, safeHost, normalizeError } from "../../lib/healthLog";

// =============================================================================
// Cache Configuration
// =============================================================================
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const NETWORK_TIMEOUT_MS = 10000; // 10 seconds for all network calls

interface CacheEntry {
  publisherUrl: string;
  expiresAt: number;
}

const resolveCache = new Map<string, CacheEntry>();

/**
 * Clean expired cache entries (called periodically)
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, entry] of resolveCache.entries()) {
    if (now > entry.expiresAt) {
      resolveCache.delete(key);
    }
  }
}

/**
 * Get cached result if valid
 */
function getCached(inputUrl: string): string | null {
  const entry = resolveCache.get(inputUrl);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.publisherUrl;
  }
  if (entry) {
    resolveCache.delete(inputUrl);
  }
  return null;
}

/**
 * Store result in cache
 */
function setCache(inputUrl: string, publisherUrl: string): void {
  resolveCache.set(inputUrl, {
    publisherUrl,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// =============================================================================
// URL Utilities
// =============================================================================

/**
 * Extract hostname safely, return "unknown" on failure
 */
function safeHostname(url: string | null): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Normalize Google News RSS wrapper URLs to standard article URLs
 * /rss/articles/<token>?... -> /articles/<token>?...
 */
function normalizeGoogleNewsUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl);
    if (url.hostname !== "news.google.com") {
      return inputUrl;
    }
    if (url.pathname.startsWith("/rss/articles/")) {
      url.pathname = url.pathname.replace("/rss/articles/", "/articles/");
      return url.toString();
    }
    return inputUrl;
  } catch {
    return inputUrl;
  }
}

/**
 * Check if a URL is a valid non-Google publisher URL
 */
function isValidPublisherUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      !urlObj.hostname.includes("google.com") &&
      urlObj.pathname !== "/" &&
      urlObj.pathname !== ""
    );
  } catch {
    return false;
  }
}

/**
 * Extract article token from Google News URL
 */
function extractArticleToken(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/(?:rss\/)?articles\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Decode base64 token to find embedded publisher URL (no network, fast)
 */
function decodePublisherUrlFromToken(token: string): string | null {
  try {
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const urlMatch = decoded.match(/(https?:\/\/[^\s\x00-\x1f\x7f"'<>]+)/);
    if (urlMatch && isValidPublisherUrl(urlMatch[1])) {
      return urlMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Resolution Strategies
// =============================================================================

/**
 * Strategy: Follow redirects with GET request
 * Timeout: 10s
 */
async function tryRedirectFollow(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);
    const finalUrl = response.url;
    if (isValidPublisherUrl(finalUrl)) {
      return finalUrl;
    }
    return null;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("resolve_timeout");
    }
    return null;
  }
}

/**
 * Strategy: Google News batchexecute API
 * Uses Google's internal API to decode article URLs by:
 * 1. Fetching the article page to extract signature and timestamp
 * 2. Calling the batchexecute endpoint with these params
 * Timeout: 10s per network call
 */
async function tryBatchExecute(token: string): Promise<string | null> {
  // Step 1: Fetch the RSS article page to get decoding params
  const controller1 = new AbortController();
  const timeout1 = setTimeout(() => controller1.abort(), NETWORK_TIMEOUT_MS);

  let html: string;
  try {
    const articlePageUrl = `https://news.google.com/rss/articles/${token}`;
    const pageResponse = await fetch(articlePageUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller1.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout1);

    if (!pageResponse.ok) {
      return null;
    }
    html = await pageResponse.text();
  } catch (err) {
    clearTimeout(timeout1);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("resolve_timeout");
    }
    return null;
  }

  // Extract data-n-a-sg (signature) and data-n-a-ts (timestamp)
  const signatureMatch = html.match(/data-n-a-sg="([^"]+)"/);
  const timestampMatch = html.match(/data-n-a-ts="([^"]+)"/);
  if (!signatureMatch || !timestampMatch) {
    return null;
  }
  const signature = signatureMatch[1];
  const timestamp = timestampMatch[1];

  // Step 2: Call batchexecute API
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), NETWORK_TIMEOUT_MS);

  try {
    const reqPayload = [
      [
        "Fbv4je",
        `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${token}",${timestamp},"${signature}"]`,
      ],
    ];

    const batchResponse = await fetch(
      "https://news.google.com/_/DotsSplashUi/data/batchexecute",
      {
        method: "POST",
        signal: controller2.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: `f.req=${encodeURIComponent(JSON.stringify([reqPayload]))}`,
      }
    );
    clearTimeout(timeout2);

    if (!batchResponse.ok) {
      return null;
    }

    const batchText = await batchResponse.text();

    // Parse response - skip the )]}' prefix and find the JSON
    const lines = batchText.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      if (line.startsWith(")]}'")) continue;
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (Array.isArray(item) && item[0] === "wrb.fr" && item[1] === "Fbv4je" && item[2]) {
              const innerData = JSON.parse(item[2]);
              if (typeof innerData === "string" && innerData.startsWith("http")) {
                if (isValidPublisherUrl(innerData)) {
                  return innerData;
                }
              } else if (Array.isArray(innerData) && innerData[1]) {
                if (typeof innerData[1] === "string" && innerData[1].startsWith("http")) {
                  if (isValidPublisherUrl(innerData[1])) {
                    return innerData[1];
                  }
                }
              }
            }
          }
        }
      } catch {
        // Not valid JSON, continue
      }
    }
    return null;
  } catch (err) {
    clearTimeout(timeout2);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("resolve_timeout");
    }
    return null;
  }
}

/**
 * Strategy: Parse HTML for canonical/og:url/refresh meta tags
 * Timeout: 10s
 */
async function tryHtmlParsing(url: string): Promise<{ publisherUrl: string | null; strategy: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { publisherUrl: null, strategy: null };
    }

    const html = await response.text();

    // Try canonical link
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
                           html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    if (canonicalMatch?.[1]) {
      try {
        const canonicalUrl = new URL(canonicalMatch[1], url).toString();
        if (isValidPublisherUrl(canonicalUrl)) {
          return { publisherUrl: canonicalUrl, strategy: "canonical" };
        }
      } catch { /* invalid URL */ }
    }

    // Try og:url meta tag
    const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i);
    if (ogUrlMatch?.[1]) {
      try {
        const ogUrl = new URL(ogUrlMatch[1], url).toString();
        if (isValidPublisherUrl(ogUrl)) {
          return { publisherUrl: ogUrl, strategy: "og" };
        }
      } catch { /* invalid URL */ }
    }

    // Try http-equiv refresh meta tag
    const refreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'>\s]+)/i);
    if (refreshMatch?.[1]) {
      try {
        const refreshUrl = new URL(refreshMatch[1], url).toString();
        if (isValidPublisherUrl(refreshUrl)) {
          return { publisherUrl: refreshUrl, strategy: "refresh" };
        }
      } catch { /* invalid URL */ }
    }

    // Try google.com/url redirect pattern
    const googleUrlMatch = html.match(/https?:\/\/(?:www\.)?google\.com\/url\?[^"'\s]*url=([^&"'\s]+)/i);
    if (googleUrlMatch?.[1]) {
      try {
        const decodedUrl = decodeURIComponent(googleUrlMatch[1]);
        if (isValidPublisherUrl(decodedUrl)) {
          return { publisherUrl: decodedUrl, strategy: "google_redirect" };
        }
      } catch { /* invalid URL */ }
    }

    return { publisherUrl: null, strategy: null };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("resolve_timeout");
    }
    return { publisherUrl: null, strategy: null };
  }
}

// =============================================================================
// Main Resolver
// =============================================================================

interface ResolveResult {
  success: boolean;
  publisherUrl?: string;
  error?: string;
  debug?: {
    inputUrl: string;
    normalizedUrl: string;
    strategy: string | null;
    methodsTried: string[];
  };
}

/**
 * Map error string to telemetry reason bucket
 */
function errorToTelemetryReason(error: string | null): TelemetryReason {
  if (!error) return "unknown";
  if (error.includes("timeout")) return "timeout";
  if (error.includes("401")) return "http_401";
  if (error.includes("403")) return "http_403";
  if (error.includes("404")) return "http_404";
  if (error.includes("429")) return "http_429";
  if (error.includes("5") && /50[0-9]|5[1-9][0-9]/.test(error)) return "http_5xx";
  return "unknown";
}

/**
 * Main resolver function - shared by GET and POST
 */
async function resolveUrl(inputUrl: string, debug: boolean = false): Promise<ResolveResult> {
  const requestId = randomUUID();
  const startedAt = Date.now();

  // Create telemetry context for this request
  const tel = createTelemetryContext("resolve", inputUrl);

  // Clean cache periodically (1 in 100 requests)
  if (Math.random() < 0.01) {
    cleanCache();
  }

  // Helper to log and return
  const logAndReturn = (
    success: boolean,
    strategy: string | null,
    publisherUrl: string | null,
    error: string | null,
    methodsTried: string[],
    cached: boolean = false
  ): ResolveResult => {
    const durationMs = Date.now() - startedAt;

    console.log(JSON.stringify({
      type: "resolve",
      ts: new Date().toISOString(),
      requestId,
      success,
      cached,
      strategy,
      methodsTried,
      durationMs,
      inputHost: safeHostname(inputUrl),
      publisherHost: safeHostname(publisherUrl),
      error: success ? null : (error || "Could not resolve publisher URL"),
    }));

    // Record telemetry (skip cache hits to avoid noise)
    if (!cached) {
      tel.record({
        ok: success,
        reason: success ? undefined : errorToTelemetryReason(error),
        // Resolve failures are generally not playwright candidates
        // (the URL resolution step doesn't involve JS rendering)
        playwright_candidate: false,
      });
    }

    // Health telemetry
    const isGoogleNewsUrl = safeHostname(inputUrl).includes("news.google.com");
    const cacheStatus = cached ? "hit" as const : "miss" as const;
    const errorInfo = success ? {} : normalizeError(error);
    healthLog({
      route: '/api/resolve',
      type: 'resolve',
      ok: success,
      durationMs,
      requestId,
      inputHost: safeHost(inputUrl),
      resolvedHost: publisherUrl ? safeHost(publisherUrl) : undefined,
      isGoogleNewsUrl,
      strategyUsed: strategy || undefined,
      methodsTried,
      cacheStatus,
      cacheTtlSec: cached ? Math.round(CACHE_TTL_MS / 1000) : undefined,
      ...(success ? {} : errorInfo),
    });

    if (success && publisherUrl) {
      return debug
        ? { success: true, publisherUrl, debug: { inputUrl, normalizedUrl: normalizeGoogleNewsUrl(inputUrl), strategy, methodsTried } }
        : { success: true, publisherUrl };
    }
    return debug
      ? { success: false, error: error || "Could not resolve publisher URL", debug: { inputUrl, normalizedUrl: normalizeGoogleNewsUrl(inputUrl), strategy: null, methodsTried } }
      : { success: false, error: error || "Could not resolve publisher URL" };
  };

  // Check cache first
  const cachedUrl = getCached(inputUrl);
  if (cachedUrl) {
    return logAndReturn(true, "cache", cachedUrl, null, ["cache"], true);
  }

  // Normalize RSS wrapper URLs
  const normalizedUrl = normalizeGoogleNewsUrl(inputUrl);
  const methodsTried: string[] = [];

  let publisherUrl: string | null = null;
  let strategy: string | null = null;

  try {
    // Strategy 1: Try base64 token decode (fastest, no network)
    const token = extractArticleToken(normalizedUrl);
    if (token) {
      methodsTried.push("base64_decode");
      const decodedUrl = decodePublisherUrlFromToken(token);
      if (decodedUrl) {
        publisherUrl = decodedUrl;
        strategy = "base64_decode";
      }
    }

    // Strategy 2: Google News batchexecute API (most reliable for Google News URLs)
    if (!publisherUrl && token) {
      methodsTried.push("batchexecute");
      const batchUrl = await tryBatchExecute(token);
      if (batchUrl) {
        publisherUrl = batchUrl;
        strategy = "batchexecute";
      }
    }

    // Strategy 3: Follow redirects
    if (!publisherUrl) {
      methodsTried.push("redirect");
      const redirectUrl = await tryRedirectFollow(normalizedUrl);
      if (redirectUrl) {
        publisherUrl = redirectUrl;
        strategy = "redirect";
      }
    }

    // Strategy 4: Parse HTML for meta tags
    if (!publisherUrl) {
      methodsTried.push("html_parse");
      const htmlResult = await tryHtmlParsing(normalizedUrl);
      if (htmlResult.publisherUrl) {
        publisherUrl = htmlResult.publisherUrl;
        strategy = htmlResult.strategy;
      }
    }

    // Cache successful result
    if (publisherUrl) {
      setCache(inputUrl, publisherUrl);
      return logAndReturn(true, strategy, publisherUrl, null, methodsTried);
    }

    return logAndReturn(false, null, null, "Could not resolve publisher URL", methodsTried);
  } catch (err) {
    // Handle timeout errors specifically
    if (err instanceof Error && err.message === "resolve_timeout") {
      return logAndReturn(false, null, null, "resolve_timeout", methodsTried);
    }
    // Re-throw unexpected errors
    throw err;
  }
}

// =============================================================================
// HTTP Handlers
// =============================================================================

/**
 * GET handler - read URL from query param
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inputUrl = searchParams.get("url");
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";

    if (!inputUrl) {
      return NextResponse.json({ success: false, error: "Missing url parameter" }, { status: 400 });
    }

    const result = await resolveUrl(inputUrl, debug);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Resolve] GET Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST handler - read URL from JSON body
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const inputUrl = body?.url;
    const debug = Boolean(body?.debug);

    if (!inputUrl) {
      return NextResponse.json({ success: false, error: "Missing url in request body" }, { status: 400 });
    }

    const result = await resolveUrl(inputUrl, debug);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Resolve] POST Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
