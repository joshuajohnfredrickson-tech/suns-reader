import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { randomUUID } from 'crypto';

// Local only; disabled on Vercel. Set ENABLE_PLAYWRIGHT=1 to enable Playwright fallback.
const ENABLE_PLAYWRIGHT = process.env.ENABLE_PLAYWRIGHT === '1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExtractResult {
  success: boolean;
  url: string | null;
  title?: string;
  byline?: string;
  siteName?: string;
  contentHtml?: string;
  textContent?: string;
  excerpt?: string;
  length?: number;
  error?: string | null;
  // Debug fields
  fetchedUrl?: string | null;
  resolvedUrl?: string | null;
  status?: string | number; // Semantic string ("ok", "blocked", "no_reader", "invalid_url") or legacy number
  contentType?: string | null;
  pageTitle?: string | null;
  textPreview?: string | null;
  playwrightUsed?: boolean;
  debug?: {
    inputHost?: string;
    finalHost?: string;
    httpStatus?: number;
    contentType?: string;
    fetchedUrl?: string;
    redirectChainCount?: number;
    htmlLength?: number;
    htmlHead?: string;
    pageTitle?: string;
    readabilityTitle?: string;
    readabilityTextLength?: number;
    readabilityTextHead?: string;
  };
}

/**
 * Build a consistent ExtractResult response with all required keys
 */
function buildExtractResponse(overrides: Partial<ExtractResult>): ExtractResult {
  // Start with a base object containing ALL required keys with safe defaults
  const base: ExtractResult = {
    url: overrides.url ?? null,
    resolvedUrl: overrides.resolvedUrl ?? null,
    fetchedUrl: overrides.fetchedUrl ?? null,
    contentType: overrides.contentType ?? null,
    playwrightUsed: overrides.playwrightUsed ?? false,
    pageTitle: overrides.pageTitle ?? null,

    success: overrides.success ?? false,
    status: overrides.status ?? "no_reader",   // SEMANTIC string, NOT http code
    error: overrides.error ?? null,

    title: overrides.title ?? "",
    contentHtml: overrides.contentHtml ?? "",
    textContent: overrides.textContent ?? "",
    textPreview: overrides.textPreview ?? "",
    length: overrides.length ?? (overrides.textContent ? overrides.textContent.length : 0),
  };

  // Include optional fields if provided
  if (overrides.byline !== undefined) base.byline = overrides.byline;
  if (overrides.siteName !== undefined) base.siteName = overrides.siteName;
  if (overrides.excerpt !== undefined) base.excerpt = overrides.excerpt;

  return base;
}

/**
 * Finalize the request: log metrics and return response
 */
function finalize(
  requestId: string,
  startedAt: number,
  inputUrl: string,
  payload: ExtractResult
): NextResponse<ExtractResult> {
  // Compute metrics from payload
  const host = (() => {
    try {
      return new URL(payload.url || payload.fetchedUrl || inputUrl).hostname;
    } catch {
      return 'unknown';
    }
  })();

  const titleLength = payload.title?.length || 0;
  const textLength = payload.textContent?.length || 0;
  const durationMs = Date.now() - startedAt;

  // Log single JSON line
  console.log(JSON.stringify({
    type: 'extract',
    requestId,
    ts: new Date().toISOString(),
    durationMs,
    inputUrl,
    host,
    success: payload.success,
    status: payload.status,
    playwrightUsed: payload.playwrightUsed || false,
    contentType: payload.contentType || null,
    titleLength,
    textLength,
    fetchedUrl: payload.fetchedUrl || null,
    error: payload.error || null,
  }));

  return NextResponse.json(payload);
}

// Simple in-memory cache with TTL
const cache = new Map<string, { result: ExtractResult; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expires) {
      cache.delete(key);
    }
  }
}

// Known domains that frequently block server-side fetches or require JavaScript rendering
const KNOWN_BLOCKED_DOMAINS = ['espn.com', 'espn.go.com'];
const JS_REQUIRED_DOMAINS = ['espn.com', 'espn.go.com']; // Domains that need JS to render content properly

/**
 * Detect if a response indicates blocking by CDN or anti-bot protection
 */
function isBlockedResponse(status: number, hostname: string, headers: Headers, bodyPreview?: string): boolean {
  // Explicit blocking status codes
  if (status === 403 || status === 429) {
    console.log('[Extract] Detected blocking via status code:', status);
    return true;
  }

  // 404 on known blocked domains with CDN hints
  if (status === 404) {
    // Check if it's a known problematic domain
    const isKnownBlockedDomain = KNOWN_BLOCKED_DOMAINS.some(domain => hostname.includes(domain));

    // Check for CDN blocking headers/patterns
    const server = headers.get('server')?.toLowerCase() || '';
    const viaHeader = headers.get('via')?.toLowerCase() || '';
    const cfRay = headers.get('cf-ray');
    const xCache = headers.get('x-cache')?.toLowerCase() || '';

    const hasCDNHints = server.includes('cloudfront') ||
                        server.includes('varnish') ||
                        viaHeader.includes('cloudfront') ||
                        cfRay !== null ||
                        xCache.includes('error');

    if (isKnownBlockedDomain || hasCDNHints) {
      console.log('[Extract] Detected blocking via 404 + CDN hints:', {
        hostname,
        server,
        via: viaHeader,
        cfRay,
        xCache,
        isKnownBlockedDomain
      });
      return true;
    }
  }

  return false;
}

/**
 * Check if a domain requires JavaScript rendering for proper content extraction
 */
function requiresJavaScript(hostname: string): boolean {
  return JS_REQUIRED_DOMAINS.some(domain => hostname.includes(domain));
}

/**
 * Detect if ESPN returned a shell page instead of actual article content
 */
function isESPNShellPage(html: string, title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerHtml = html.toLowerCase();

  // Check for generic ESPN title
  if (lowerTitle.includes('espn - serving sports fans') ||
      lowerTitle === 'espn' ||
      lowerTitle === 'espn.com') {
    console.log('[Extract] ESPN shell page detected via title:', title);

    // Verify it's actually a shell by checking content
    const hasNFLScoreboard = lowerHtml.includes('nfl') && lowerHtml.includes('scoreboard');
    const hasSeeAll = lowerHtml.includes('see all') && lowerHtml.includes('scores');
    const lacksStoryMarkers = !lowerHtml.includes('story') &&
                               !lowerHtml.includes('article') &&
                               lowerHtml.split('<p>').length < 5; // Few paragraphs

    if (hasNFLScoreboard || hasSeeAll || lacksStoryMarkers) {
      return true;
    }
  }

  return false;
}

/**
 * Detect ESPN shell pages from Readability results (before quality gate)
 * Catches false positives like "null - ESPN" titles that pass quality gates
 */
function isEspnShellResult(params: {
  title: string;
  textContent: string;
  contentHtml: string;
  isEspnDomain: boolean;
}): boolean {
  if (!params.isEspnDomain) return false;

  const title = (params.title ?? '').trim();
  const lowerTitle = title.toLowerCase();

  // Detect "null - ESPN" or similar malformed titles
  if (title.startsWith('null') ||
      title.startsWith('undefined') ||
      lowerTitle === 'espn' ||
      lowerTitle === 'espn.com' ||
      (lowerTitle.includes('- espn') && (lowerTitle.includes('null') || lowerTitle.includes('undefined')))) {
    console.log('[Extract] ESPN shell result detected via malformed title:', title);
    return true;
  }

  // Detect JSON error payload in content
  const text = (params.textContent ?? '').trim();
  if (text.startsWith('{') &&
      (text.includes('"status":404') || text.includes('"status": 404')) &&
      text.includes('"error"')) {
    console.log('[Extract] ESPN shell result detected via JSON error payload');
    return true;
  }

  // Detect very short content that looks like a shell page
  const html = (params.contentHtml ?? '').trim();
  if (html.length < 500 && text.length < 300) {
    console.log('[Extract] ESPN shell result detected via insufficient content');
    return true;
  }

  return false;
}

/**
 * Fetch HTML using Playwright when regular fetch is blocked.
 * Local only; disabled on Vercel. Returns null if Playwright is disabled.
 */
async function fetchWithPlaywright(url: string): Promise<{ html: string; finalUrl: string } | null> {
  // Skip Playwright if not enabled (e.g., on Vercel)
  if (!ENABLE_PLAYWRIGHT) {
    console.log('[Extract] Playwright disabled (ENABLE_PLAYWRIGHT not set)');
    return null;
  }

  console.log('[Extract] Attempting Playwright fallback for:', url);

  // Dynamic import to avoid bundling Playwright on Vercel
  const { chromium } = await import('playwright');

  let browser;
  try {
    const urlObj = new URL(url);
    const isESPN = urlObj.hostname.includes('espn.com');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    });

    const page = await context.newPage();

    // Navigate with longer timeout for ESPN
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: isESPN ? 45000 : 15000
    });

    // ESPN-specific: Wait for article content to load
    if (isESPN) {
      console.log('[Extract] ESPN detected, waiting for article content...');

      // Try multiple article selectors in order
      const articleSelectors = [
        'article',
        '[data-testid="article-body"]',
        '[class*="Article__Content"]',
        'main article',
        'section article',
      ];

      let articleFound = false;

      // First attempt: try selectors with reasonable timeout
      for (const selector of articleSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 8000 });
          console.log(`[Extract] ESPN article found with selector: ${selector}`);
          articleFound = true;
          break;
        } catch {
          // Continue to next selector
        }
      }

      // If no article found, try scrolling and waiting
      if (!articleFound) {
        console.log('[Extract] Article not found, trying scroll and retry...');

        // Wait a bit for dynamic content
        await page.waitForTimeout(3000);

        // Scroll down to trigger lazy loading
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(1000);

        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(1000);

        // Wait for network idle
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.log('[Extract] Network idle timeout after scroll (non-fatal)');
        });

        // Retry selectors once
        for (const selector of articleSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            console.log(`[Extract] ESPN article found on retry with selector: ${selector}`);
            articleFound = true;
            break;
          } catch {
            // Continue to next selector
          }
        }
      }

      if (!articleFound) {
        console.warn('[Extract] ESPN article content not found with any selector');
      }
    } else {
      // Non-ESPN: just wait for network idle
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('[Extract] Network idle timeout (non-fatal)');
      });
    }

    const html = await page.content();
    const finalUrl = page.url();

    console.log('[Extract] Playwright fetch successful:', finalUrl);

    return { html, finalUrl };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function isPrivateIP(hostname: string): boolean {
  // Reject localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }

  // Check for private IP ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, a, b] = match.map(Number);

    // 10.0.0.0/8
    if (a === 10) return true;

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // 127.0.0.0/8
    if (a === 127) return true;
  }

  return false;
}

function validateUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }

    // Check for private IPs
    if (isPrivateIP(url.hostname)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }

    return { valid: true, url };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function isGoogleNewsUrl(url: URL): boolean {
  // ONLY match URLs actually hosted on news.google.com
  // DO NOT match publisher URLs that happen to have /news/ in path
  return url.hostname === 'news.google.com';
}

/**
 * Normalize Google News RSS wrapper URL to standard article URL
 * Example: /rss/articles/CBMi... -> /articles/CBMi...
 */
function normalizeGoogleNewsUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    // Check if it's a Google News RSS wrapper URL
    if (url.hostname === 'news.google.com' && url.pathname.startsWith('/rss/articles/')) {
      // Convert /rss/articles/ to /articles/
      const token = url.pathname.replace('/rss/articles/', '');
      const normalized = `https://news.google.com/articles/${token}`;
      console.log('[Extract] Normalized Google News RSS URL:', urlString, '->', normalized);
      return normalized;
    }

    return urlString;
  } catch {
    return urlString;
  }
}

/**
 * Extract publisher URL from Google News HTML
 * Supports multiple patterns:
 * 1. google.com/url?...&url=<encoded_publisher_url>
 * 2. Direct outbound links (non-Google)
 * 3. Canonical/og:url (non-Google)
 */
function findPublisherUrlFromGoogleNews(html: string, baseUrl: string): string | null {
  console.log('[Extract] Searching for publisher URL in Google News HTML...');

  // Pattern 1: Look for google.com/url redirect links with url= parameter
  // Example: https://www.google.com/url?rct=j&sa=t&url=https%3A%2F%2Fwww.example.com%2Farticle
  const googleUrlPattern = /https?:\/\/(?:www\.)?google\.com\/url\?[^"'\s]*url=([^&"'\s]+)/gi;
  let match;

  while ((match = googleUrlPattern.exec(html)) !== null) {
    try {
      const encodedUrl = match[1];
      const decodedUrl = decodeURIComponent(encodedUrl);

      // Validate it's a real URL and not a Google domain
      const testUrl = new URL(decodedUrl);
      if (!testUrl.hostname.includes('google.com') &&
          (testUrl.protocol === 'http:' || testUrl.protocol === 'https:')) {
        console.log('[Extract] Found publisher URL via google.com/url redirect:', decodedUrl);
        return decodedUrl;
      }
    } catch {
      // Invalid URL, continue searching
    }
  }

  // Pattern 2: Use JSDOM to parse structured data
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const doc = dom.window.document;

    // Try canonical link (non-Google)
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) {
      const href = canonical.getAttribute('href');
      if (href && !href.includes('google.com')) {
        try {
          const canonicalUrl = new URL(href, baseUrl);
          console.log('[Extract] Found publisher URL via canonical:', canonicalUrl.href);
          return canonicalUrl.href;
        } catch {
          // Invalid URL
        }
      }
    }

    // Try og:url meta tag (non-Google)
    const ogUrl = doc.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      const content = ogUrl.getAttribute('content');
      if (content && !content.includes('google.com')) {
        try {
          const ogUrlParsed = new URL(content, baseUrl);
          console.log('[Extract] Found publisher URL via og:url:', ogUrlParsed.href);
          return ogUrlParsed.href;
        } catch {
          // Invalid URL
        }
      }
    }

    // Pattern 3: Scan for first real outbound link (non-Google, non-relative)
    const links = Array.from(doc.querySelectorAll('a[href]'));
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        try {
          const linkUrl = new URL(href);
          if (!linkUrl.hostname.includes('google.com') &&
              linkUrl.pathname !== '/' &&
              linkUrl.pathname !== '') {
            console.log('[Extract] Found publisher URL via outbound link:', linkUrl.href);
            return linkUrl.href;
          }
        } catch {
          // Invalid URL
        }
      }
    }
  } catch (error) {
    console.error('[Extract] Error parsing Google News HTML with JSDOM:', error);
  }

  console.log('[Extract] No publisher URL found in Google News HTML');
  return null;
}

/**
 * Decode Google News article token to extract embedded publisher URL
 * Many tokens (especially those starting with "CBMi") contain base64-encoded publisher URLs
 */
function decodePublisherUrlFromToken(token: string): string | null {
  console.log('[Extract] Attempting token decode fallback...');

  try {
    // Handle URL-safe base64 (replace - with +, _ with /)
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Try to decode
    let decoded: string;
    try {
      // Try Node.js Buffer decode
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
      // Fallback to atob if Buffer fails
      try {
        decoded = atob(base64);
      } catch {
        console.log('[Extract] Token decode failed: Unable to base64 decode');
        return null;
      }
    }

    // Search for URL pattern in decoded string
    const urlMatch = decoded.match(/(https?:\/\/[^\s\x00-\x1f\x7f"'<>]+)/);
    if (urlMatch) {
      const candidateUrl = urlMatch[1];

      // Validate it's a real URL and not a Google domain
      try {
        const testUrl = new URL(candidateUrl);
        if (!testUrl.hostname.includes('google.com') &&
            (testUrl.protocol === 'http:' || testUrl.protocol === 'https:') &&
            testUrl.pathname !== '/' &&
            testUrl.pathname !== '') {
          console.log('[Extract] Token decode found URL:', candidateUrl);
          return candidateUrl;
        } else {
          console.log('[Extract] Token decode found URL but it was invalid (Google domain or homepage):', candidateUrl);
        }
      } catch {
        console.log('[Extract] Token decode found string but it was not a valid URL:', candidateUrl);
      }
    } else {
      console.log('[Extract] Token decode failed: No URL pattern found in decoded string');
    }

    return null;
  } catch (error) {
    console.log('[Extract] Token decode failed with error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function fallbackExtract(doc: Document): { html: string; text: string } | null {
  // Try semantic elements first
  const candidates = [
    doc.querySelector('article'),
    doc.querySelector('main'),
    doc.querySelector('[itemprop="articleBody"]'),
  ];

  for (const elem of candidates) {
    if (elem && elem.textContent && elem.textContent.trim().length > 400) {
      return {
        html: elem.innerHTML,
        text: elem.textContent.trim(),
      };
    }
  }

  // Find largest div by text content
  const allDivs = Array.from(doc.querySelectorAll('div'));
  const excludeTags = ['nav', 'header', 'footer', 'aside'];

  let largestDiv: HTMLElement | null = null;
  let maxLength = 0;

  for (const div of allDivs) {
    // Skip if inside excluded elements
    if (excludeTags.some(tag => div.closest(tag))) {
      continue;
    }

    const textLength = div.textContent?.trim().length || 0;
    if (textLength > maxLength) {
      maxLength = textLength;
      largestDiv = div;
    }
  }

  if (largestDiv && maxLength > 400) {
    return {
      html: largestDiv.innerHTML,
      text: largestDiv.textContent?.trim() || '',
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null as any);
    const url = body?.url;
    const debug = body?.debug;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Missing url" }), {
        status: "no_reader",
        headers: { "content-type": "application/json" },
      });
    }

    const u = new URL(request.url);
    u.searchParams.set("url", url);
    if (debug) {
      u.searchParams.set("debug", "1");
    }

    // Reuse the existing GET logic by calling it with a Request that has the URL param
    return GET(new Request(u.toString(), { method: "GET" }));
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "POST failed" }), {
      status: "no_reader",
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  cleanCache(); // Clean expired cache entries

  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');
    const debugMode = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';

    if (!urlParam) {
      return finalize(
        requestId,
        startedAt,
        '',
        buildExtractResponse({
          success: false,
          url: '',
          status: 'invalid_url',
          error: 'URL parameter is required'
        })
      );
    }

    if (debugMode) {
      console.log('[Extract] Debug mode enabled for:', urlParam);
    }

    // HARD GUARD: Reject Google News wrapper URLs
    try {
      const urlObj = new URL(urlParam);
      if (urlObj.hostname.includes('news.google.com')) {
        console.error('[Extract] Rejected Google News wrapper URL:', urlParam);
        return finalize(
          requestId,
          startedAt,
          urlParam,
          buildExtractResponse({
            success: false,
            url: urlParam,
            status: 'invalid_url',
            error: 'Google News wrapper URLs not supported. Call /api/resolve first to get the publisher URL.'
          })
        );
      }
    } catch (urlParseError) {
      // If URL parsing fails, let it fall through to the existing validation below
    }

    // Check cache first (skip cache in debug mode)
    if (!debugMode) {
      const cached = cache.get(urlParam);
      if (cached && Date.now() < cached.expires) {
        console.log('[Extract] Cache hit for:', urlParam);
        return finalize(requestId, startedAt, urlParam, cached.result);
      }
    } else {
      console.log('[Extract] Skipping cache (debug mode)');
    }

    // Validate URL
    const validation = validateUrl(urlParam);
    if (!validation.valid) {
      return finalize(
        requestId,
        startedAt,
        urlParam,
        buildExtractResponse({
          success: false,
          url: urlParam,
          status: 'invalid_url',
          error: validation.error || 'Invalid URL',
          fetchedUrl: urlParam,
        })
      );
    }

    console.log('[Extract] Input URL:', urlParam);

    const isGoogleNews = isGoogleNewsUrl(validation.url!);

    // Normalize Google News RSS wrapper URLs (/rss/articles/ -> /articles/)
    let normalizedUrl = urlParam;
    if (isGoogleNews) {
      normalizedUrl = normalizeGoogleNewsUrl(urlParam);
    }

    // Safety check: Detect non-Google homepage URLs (should not happen with wrapper URLs)
    if (!isGoogleNews) {
      const urlObj2 = new URL(urlParam);
      if (urlObj2.pathname === '/' || urlObj2.pathname === '') {
        console.warn('[Extract] WARNING: Received homepage URL instead of article URL:', urlParam);
        return finalize(
          requestId,
          startedAt,
          urlParam,
          buildExtractResponse({
            success: false,
            url: urlParam,
            status: 'invalid_url',
            error: 'Homepage URL: This appears to be a site homepage, not an article. Please report this issue.',
            fetchedUrl: urlParam,
            resolvedUrl: urlParam,
          })
        );
      }
    }

    // Handle Google News wrapper URLs - unwrap to publisher URL first
    if (isGoogleNews) {
      console.log('[Extract] Detected Google News URL, unwrapping to publisher...');

      // Add query parameters for better unwrapping
      const urlWithParams = normalizedUrl.includes('?')
        ? `${normalizedUrl}&hl=en-US&gl=US&ceid=US:en`
        : `${normalizedUrl}?hl=en-US&gl=US&ceid=US:en`;

      let publisherUrlFromRedirect: string | null = null;

      // Method 1: Try manual redirect to capture Location header
      console.log('[Extract] Attempting manual redirect unwrap...');
      const controller1a = new AbortController();
      const timeout1a = setTimeout(() => controller1a.abort(), 10000);

      try {
        const manualRedirectResponse = await fetch(urlWithParams, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller1a.signal,
          redirect: 'manual',
        });

        clearTimeout(timeout1a);

        console.log('[Extract] Manual redirect status:', manualRedirectResponse.status);

        if (manualRedirectResponse.status >= 300 && manualRedirectResponse.status < 400) {
          const location = manualRedirectResponse.headers.get('location');
          if (location) {
            console.log('[Extract] Manual redirect location:', location);

            try {
              const absoluteUrl = new URL(location, urlWithParams);
              if (!absoluteUrl.hostname.includes('google.com') &&
                  absoluteUrl.pathname !== '/' &&
                  absoluteUrl.pathname !== '') {
                publisherUrlFromRedirect = absoluteUrl.href;
                console.log('[Extract] Found publisher URL via manual redirect:', publisherUrlFromRedirect);
              } else {
                console.log('[Extract] Manual redirect location was Google domain or homepage, ignoring');
              }
            } catch {
              console.log('[Extract] Manual redirect location was invalid URL');
            }
          } else {
            console.log('[Extract] Manual redirect had no Location header');
          }
        } else {
          console.log('[Extract] No redirect (status not 3xx)');
        }
      } catch (error) {
        clearTimeout(timeout1a);
        console.log('[Extract] Manual redirect failed:', error instanceof Error ? error.message : String(error));
      }

      // Method 2: Try following redirects and check final URL
      if (!publisherUrlFromRedirect) {
        console.log('[Extract] Attempting follow redirect unwrap...');
        const controller1b = new AbortController();
        const timeout1b = setTimeout(() => controller1b.abort(), 10000);

        try {
          const followRedirectResponse = await fetch(urlWithParams, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller1b.signal,
            redirect: 'follow',
          });

          clearTimeout(timeout1b);

          console.log('[Extract] Follow redirect finalUrl:', followRedirectResponse.url);

          if (followRedirectResponse.ok) {
            try {
              const finalUrl = new URL(followRedirectResponse.url);
              if (!finalUrl.hostname.includes('google.com') &&
                  finalUrl.pathname !== '/' &&
                  finalUrl.pathname !== '') {
                publisherUrlFromRedirect = followRedirectResponse.url;
                console.log('[Extract] Found publisher URL via follow redirect:', publisherUrlFromRedirect);
              } else {
                console.log('[Extract] Follow redirect stayed on Google domain or homepage');
              }
            } catch {
              console.log('[Extract] Follow redirect finalUrl was invalid');
            }
          }
        } catch (error) {
          clearTimeout(timeout1b);
          console.log('[Extract] Follow redirect failed:', error instanceof Error ? error.message : String(error));
        }
      }

      // If we found publisher URL via redirect, fetch and extract it
      if (publisherUrlFromRedirect) {
        console.log('[Extract] Using publisher URL from redirect:', publisherUrlFromRedirect);

        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);

        try {
          const publisherResponse = await fetch(publisherUrlFromRedirect, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller2.signal,
            redirect: 'follow',
          });

          clearTimeout(timeout2);

          console.log('[Extract] Publisher fetch status (redirect):', publisherResponse.status, 'URL:', publisherResponse.url);

          if (!publisherResponse.ok) {
            const result: ExtractResult = {
              success: false,
              url: urlParam,
              error: `Publisher blocked: HTTP ${publisherResponse.status}`,
              fetchedUrl: normalizedUrl,
              resolvedUrl: publisherUrlFromRedirect,
              status: "no_reader",
            };
            return finalize(requestId, startedAt, urlParam, result);
          }

          const publisherHtml = await publisherResponse.text();
          const finalPublisherUrl = publisherResponse.url;

          // Parse with Readability
          const dom = new JSDOM(publisherHtml, { url: finalPublisherUrl });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          if (article) {
            // ESPN shell detection + quality gate for Google News redirect unwrap
            const parsedUrl = new URL(finalPublisherUrl);
            const host = parsedUrl.hostname.toLowerCase();
            const isEspn = host.includes("espn.com");
            const safeTitle = (article.title ?? "").trim();
            const safeText = (article.textContent ?? "").trim();
            const textLen = safeText.length;
            const titleLen = safeTitle.length;

            // ESPN shell detection BEFORE quality gate
            if (isEspnShellResult({
              title: safeTitle,
              textContent: safeText,
              contentHtml: article.content,
              isEspnDomain: isEspn
            })) {
              const result: ExtractResult = {
                success: false,
                url: finalPublisherUrl,
                title: "",
                contentHtml: "",
                textContent: "",
                length: 0,
                fetchedUrl: normalizedUrl,
                resolvedUrl: finalPublisherUrl,
                status: "blocked",
                contentType: publisherResponse.headers.get('content-type') || '',
                error: "ESPN blocks reader mode",
              };
              console.log('[Extract] ESPN shell result rejected (Google News redirect unwrap)');
              return finalize(requestId, startedAt, urlParam, result);
            }

            // Detect JSON error payload disguised as text
            const looksLikeJsonError =
              safeText.startsWith("{") &&
              (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
              safeText.includes('"error"');

            // Quality gate
            const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

            if (!passesQualityGate) {
              // Convert false positive into controlled failure
              const result: ExtractResult = {
                success: false,
                url: finalPublisherUrl,
                title: "",
                byline: article.byline || undefined,
                siteName: article.siteName || undefined,
                contentHtml: "",
                textContent: safeText,
                excerpt: article.excerpt || undefined,
                length: textLen,
                fetchedUrl: normalizedUrl,
                resolvedUrl: finalPublisherUrl,
                status: isEspn ? "blocked" : "no_reader",
                contentType: publisherResponse.headers.get('content-type') || '',
                error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
              };

              console.log('[Extract] Google News redirect quality gate failed:', {
                titleLen,
                textLen,
                looksLikeJsonError,
                isEspn,
                url: finalPublisherUrl
              });

              return finalize(requestId, startedAt, urlParam, result);
            }

            // Quality gate passed
            const result: ExtractResult = {
              success: true,
              url: finalPublisherUrl,
              title: article.title,
              byline: article.byline || undefined,
              siteName: article.siteName || undefined,
              contentHtml: article.content,
              textContent: article.textContent,
              excerpt: article.excerpt || undefined,
              length: article.length,
              fetchedUrl: normalizedUrl,
              resolvedUrl: finalPublisherUrl,
              status: "ok",
              contentType: publisherResponse.headers.get('content-type') || '',
            };

            cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
            console.log('[Extract] Success via Readability (redirect unwrap):', article.title);
            return finalize(requestId, startedAt, urlParam, result);
          }

          // Readability failed, try fallback extraction
          console.log('[Extract] Readability returned null, trying fallback...');
          const fallback = fallbackExtract(dom.window.document);

          if (fallback) {
            // Apply quality gate to Google News fallback result
            const parsedUrl = new URL(finalPublisherUrl);
            const host = parsedUrl.hostname.toLowerCase();
            const isEspn = host.includes("espn.com");
            const safeTitle = (dom.window.document.title ?? "").trim();
            const safeText = (fallback.text ?? "").trim();
            const textLen = safeText.length;
            const titleLen = safeTitle.length;

            // Detect JSON error payload disguised as text
            const looksLikeJsonError =
              safeText.startsWith("{") &&
              (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
              safeText.includes('"error"');

            // Quality gate
            const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

            if (!passesQualityGate) {
              // Convert false positive into controlled failure
              const result: ExtractResult = {
                success: false,
                url: finalPublisherUrl,
                title: "",
                contentHtml: "",
                textContent: safeText,
                length: textLen,
                fetchedUrl: normalizedUrl,
                resolvedUrl: finalPublisherUrl,
                status: isEspn ? "blocked" : "no_reader",
                contentType: publisherResponse.headers.get('content-type') || '',
                error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
              };

              console.log('[Extract] Google News fallback quality gate failed:', {
                titleLen,
                textLen,
                looksLikeJsonError,
                isEspn,
                url: finalPublisherUrl
              });

              return finalize(requestId, startedAt, urlParam, result);
            }

            // Quality gate passed
            const result: ExtractResult = {
              success: true,
              url: finalPublisherUrl,
              title: dom.window.document.title || 'Untitled',
              contentHtml: fallback.html,
              textContent: fallback.text,
              length: fallback.text.length,
              fetchedUrl: normalizedUrl,
              resolvedUrl: finalPublisherUrl,
              status: "ok",
              contentType: publisherResponse.headers.get('content-type') || '',
            };

            cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
            console.log('[Extract] Success via fallback extraction (redirect unwrap)');
            return finalize(requestId, startedAt, urlParam, result);
          }

          // All extraction failed
          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: 'Readability-null: Could not extract readable content from publisher page',
            fetchedUrl: normalizedUrl,
            resolvedUrl: finalPublisherUrl,
            status: "no_reader",
            contentType: publisherResponse.headers.get('content-type') || '',
          };
          cache.set(urlParam, { result, expires: Date.now() + (2 * 60 * 1000) });
          return finalize(requestId, startedAt, urlParam, result);
        } catch (publisherError) {
          clearTimeout(timeout2);

          let errorMessage = 'Failed to fetch publisher article (redirect)';
          if (publisherError instanceof Error) {
            if (publisherError.name === 'AbortError') {
              errorMessage = 'Timeout: Publisher request took too long (>10s)';
            } else {
              errorMessage = `Publisher fetch error: ${publisherError.message}`;
            }
          }

          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: errorMessage,
            fetchedUrl: normalizedUrl,
            resolvedUrl: publisherUrlFromRedirect,
          };
          return finalize(requestId, startedAt, urlParam, result);
        }
      }

      // Method 3: Fallback to HTML parsing if redirect didn't work
      console.log('[Extract] Redirect unwrap failed, trying HTML parsing...');
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 10000);

      try {
        // Fetch Google News page
        const googleResponse = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller1.signal,
          redirect: 'follow',
        });

        clearTimeout(timeout1);

        console.log('[Extract] Google News fetch status:', googleResponse.status, 'URL:', googleResponse.url);

        if (googleResponse.ok) {
          const googleHtml = await googleResponse.text();

          // Try to find publisher URL from Google News HTML
          const publisherUrl = findPublisherUrlFromGoogleNews(googleHtml, googleResponse.url);

          if (publisherUrl) {
            console.log('[Extract] Found publisher URL:', publisherUrl);

            // Now fetch the actual publisher article
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 10000);

            try {
              const publisherResponse = await fetch(publisherUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: controller2.signal,
                redirect: 'follow',
              });

              clearTimeout(timeout2);

              console.log('[Extract] Publisher fetch status:', publisherResponse.status, 'URL:', publisherResponse.url);

              if (!publisherResponse.ok) {
                const result: ExtractResult = {
                  success: false,
                  url: urlParam,
                  error: `Publisher blocked: HTTP ${publisherResponse.status}`,
                  fetchedUrl: normalizedUrl,
                  resolvedUrl: publisherUrl,
                  status: "no_reader",
                };
                return finalize(requestId, startedAt, urlParam, result);
              }

              const publisherHtml = await publisherResponse.text();
              const finalPublisherUrl = publisherResponse.url;

              // Parse with Readability
              const dom = new JSDOM(publisherHtml, { url: finalPublisherUrl });
              const reader = new Readability(dom.window.document);
              const article = reader.parse();

              if (article) {
                // ESPN shell detection + quality gate for Google News HTML parsing
                const parsedUrl = new URL(finalPublisherUrl);
                const host = parsedUrl.hostname.toLowerCase();
                const isEspn = host.includes("espn.com");
                const safeTitle = (article.title ?? "").trim();
                const safeText = (article.textContent ?? "").trim();
                const textLen = safeText.length;
                const titleLen = safeTitle.length;

                // ESPN shell detection BEFORE quality gate
                if (isEspnShellResult({
                  title: safeTitle,
                  textContent: safeText,
                  contentHtml: article.content,
                  isEspnDomain: isEspn
                })) {
                  const result: ExtractResult = {
                    success: false,
                    url: finalPublisherUrl,
                    title: "",
                    contentHtml: "",
                    textContent: "",
                    length: 0,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: finalPublisherUrl,
                    status: "blocked",
                    contentType: publisherResponse.headers.get('content-type') || '',
                    error: "ESPN blocks reader mode",
                  };
                  console.log('[Extract] ESPN shell result rejected (Google News HTML parsing)');
                  return finalize(requestId, startedAt, urlParam, result);
                }

                // Detect JSON error payload disguised as text
                const looksLikeJsonError =
                  safeText.startsWith("{") &&
                  (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
                  safeText.includes('"error"');

                // Quality gate
                const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

                if (!passesQualityGate) {
                  // Convert false positive into controlled failure
                  const result: ExtractResult = {
                    success: false,
                    url: finalPublisherUrl,
                    title: "",
                    byline: article.byline || undefined,
                    siteName: article.siteName || undefined,
                    contentHtml: "",
                    textContent: safeText,
                    excerpt: article.excerpt || undefined,
                    length: textLen,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: finalPublisherUrl,
                    status: isEspn ? "blocked" : "no_reader",
                    contentType: publisherResponse.headers.get('content-type') || '',
                    error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
                  };

                  console.log('[Extract] Google News HTML parsing quality gate failed:', {
                    titleLen,
                    textLen,
                    looksLikeJsonError,
                    isEspn,
                    url: finalPublisherUrl
                  });

                  return finalize(requestId, startedAt, urlParam, result);
                }

                // Quality gate passed
                const result: ExtractResult = {
                  success: true,
                  url: finalPublisherUrl,
                  title: article.title,
                  byline: article.byline || undefined,
                  siteName: article.siteName || undefined,
                  contentHtml: article.content,
                  textContent: article.textContent,
                  excerpt: article.excerpt || undefined,
                  length: article.length,
                  fetchedUrl: normalizedUrl,
                  resolvedUrl: finalPublisherUrl,
                  status: "ok",
                  contentType: publisherResponse.headers.get('content-type') || '',
                };

                cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
                console.log('[Extract] Success via Readability (Google News unwrapped):', article.title);
                return finalize(requestId, startedAt, urlParam, result);
              }

              // Readability failed, try fallback
              console.log('[Extract] Readability returned null, trying fallback...');
              const fallback = fallbackExtract(dom.window.document);

              if (fallback) {
                // Apply quality gate to Google News fallback result
                const parsedUrl = new URL(finalPublisherUrl);
                const host = parsedUrl.hostname.toLowerCase();
                const isEspn = host.includes("espn.com");
                const safeTitle = (dom.window.document.title ?? "").trim();
                const safeText = (fallback.text ?? "").trim();
                const textLen = safeText.length;
                const titleLen = safeTitle.length;

                // Detect JSON error payload disguised as text
                const looksLikeJsonError =
                  safeText.startsWith("{") &&
                  (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
                  safeText.includes('"error"');

                // Quality gate
                const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

                if (!passesQualityGate) {
                  // Convert false positive into controlled failure
                  const result: ExtractResult = {
                    success: false,
                    url: finalPublisherUrl,
                    title: "",
                    contentHtml: "",
                    textContent: safeText,
                    length: textLen,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: finalPublisherUrl,
                    status: isEspn ? "blocked" : "no_reader",
                    contentType: publisherResponse.headers.get('content-type') || '',
                    error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
                  };

                  console.log('[Extract] Google News fallback quality gate failed:', {
                    titleLen,
                    textLen,
                    looksLikeJsonError,
                    isEspn,
                    url: finalPublisherUrl
                  });

                  return finalize(requestId, startedAt, urlParam, result);
                }

                // Quality gate passed
                const result: ExtractResult = {
                  success: true,
                  url: finalPublisherUrl,
                  title: dom.window.document.title || 'Untitled',
                  contentHtml: fallback.html,
                  textContent: fallback.text,
                  length: fallback.text.length,
                  fetchedUrl: normalizedUrl,
                  resolvedUrl: finalPublisherUrl,
                  status: "ok",
                  contentType: publisherResponse.headers.get('content-type') || '',
                };

                cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
                console.log('[Extract] Success via fallback extraction (Google News unwrapped)');
                return finalize(requestId, startedAt, urlParam, result);
              }

              // All extraction failed
              const result: ExtractResult = {
                success: false,
                url: urlParam,
                error: 'Readability-null: Could not extract readable content from publisher page',
                fetchedUrl: normalizedUrl,
                resolvedUrl: finalPublisherUrl,
                status: "no_reader",
                contentType: publisherResponse.headers.get('content-type') || '',
              };
              cache.set(urlParam, { result, expires: Date.now() + (2 * 60 * 1000) });
              return finalize(requestId, startedAt, urlParam, result);
            } catch (publisherError) {
              clearTimeout(timeout2);

              let errorMessage = 'Failed to fetch publisher article';
              if (publisherError instanceof Error) {
                if (publisherError.name === 'AbortError') {
                  errorMessage = 'Timeout: Publisher request took too long (>10s)';
                } else {
                  errorMessage = `Publisher fetch error: ${publisherError.message}`;
                }
              }

              const result: ExtractResult = {
                success: false,
                url: urlParam,
                error: errorMessage,
                fetchedUrl: normalizedUrl,
                resolvedUrl: publisherUrl,
              };
              return finalize(requestId, startedAt, urlParam, result);
            }
          } else {
            // Fallback A: Try fetching with output=1 parameter for simplified HTML
            console.log('[Extract] Retrying Google News fetch with output=1...');

            const urlWithOutput = normalizedUrl.includes('?')
              ? `${normalizedUrl}&output=1&hl=en-US&gl=US&ceid=US:en`
              : `${normalizedUrl}?output=1&hl=en-US&gl=US&ceid=US:en`;

            const controller1b = new AbortController();
            const timeout1b = setTimeout(() => controller1b.abort(), 10000);

            let publisherUrlFromFallback: string | null = null;

            try {
              const googleResponse2 = await fetch(urlWithOutput, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: controller1b.signal,
                redirect: 'follow',
              });

              clearTimeout(timeout1b);

              console.log('[Extract] output=1 fetch status:', googleResponse2.status, 'URL:', googleResponse2.url);

              if (googleResponse2.ok) {
                const googleHtml2 = await googleResponse2.text();
                publisherUrlFromFallback = findPublisherUrlFromGoogleNews(googleHtml2, googleResponse2.url);
              }
            } catch (error) {
              clearTimeout(timeout1b);
              console.log('[Extract] output=1 fetch failed:', error instanceof Error ? error.message : String(error));
            }

            // Fallback B: Try token decode if output=1 didn't work
            if (!publisherUrlFromFallback) {
              // Extract token from normalized URL
              const tokenMatch = normalizedUrl.match(/\/articles\/([^/?]+)/);
              if (tokenMatch) {
                const token = tokenMatch[1];
                publisherUrlFromFallback = decodePublisherUrlFromToken(token);
              }
            }

            // If we found a publisher URL via fallbacks, fetch it
            if (publisherUrlFromFallback) {
              console.log('[Extract] Found publisher URL via fallback:', publisherUrlFromFallback);

              const controller2 = new AbortController();
              const timeout2 = setTimeout(() => controller2.abort(), 10000);

              try {
                const publisherResponse = await fetch(publisherUrlFromFallback, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                  },
                  signal: controller2.signal,
                  redirect: 'follow',
                });

                clearTimeout(timeout2);

                console.log('[Extract] Publisher fetch status (fallback):', publisherResponse.status, 'URL:', publisherResponse.url);

                if (!publisherResponse.ok) {
                  const result: ExtractResult = {
                    success: false,
                    url: urlParam,
                    error: `Publisher blocked: HTTP ${publisherResponse.status}`,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: publisherUrlFromFallback,
                    status: "no_reader",
                  };
                  return finalize(requestId, startedAt, urlParam, result);
                }

                const publisherHtml = await publisherResponse.text();
                const finalPublisherUrl = publisherResponse.url;

                // Parse with Readability
                const dom = new JSDOM(publisherHtml, { url: finalPublisherUrl });
                const reader = new Readability(dom.window.document);
                const article = reader.parse();

                if (article) {
                  // ESPN shell detection + quality gate for Google News fallback unwrap
                  const parsedUrl = new URL(finalPublisherUrl);
                  const host = parsedUrl.hostname.toLowerCase();
                  const isEspn = host.includes("espn.com");
                  const safeTitle = (article.title ?? "").trim();
                  const safeText = (article.textContent ?? "").trim();
                  const textLen = safeText.length;
                  const titleLen = safeTitle.length;

                  // ESPN shell detection BEFORE quality gate
                  if (isEspnShellResult({
                    title: safeTitle,
                    textContent: safeText,
                    contentHtml: article.content,
                    isEspnDomain: isEspn
                  })) {
                    const result: ExtractResult = {
                      success: false,
                      url: finalPublisherUrl,
                      title: "",
                      contentHtml: "",
                      textContent: "",
                      length: 0,
                      fetchedUrl: normalizedUrl,
                      resolvedUrl: finalPublisherUrl,
                      status: "blocked",
                      contentType: publisherResponse.headers.get('content-type') || '',
                      error: "ESPN blocks reader mode",
                    };
                    console.log('[Extract] ESPN shell result rejected (Google News fallback unwrap)');
                    return finalize(requestId, startedAt, urlParam, result);
                  }

                  // Detect JSON error payload disguised as text
                  const looksLikeJsonError =
                    safeText.startsWith("{") &&
                    (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
                    safeText.includes('"error"');

                  // Quality gate
                  const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

                  if (!passesQualityGate) {
                    // Convert false positive into controlled failure
                    const result: ExtractResult = {
                      success: false,
                      url: finalPublisherUrl,
                      title: "",
                      byline: article.byline || undefined,
                      siteName: article.siteName || undefined,
                      contentHtml: "",
                      textContent: safeText,
                      excerpt: article.excerpt || undefined,
                      length: textLen,
                      fetchedUrl: normalizedUrl,
                      resolvedUrl: finalPublisherUrl,
                      status: isEspn ? "blocked" : "no_reader",
                      contentType: publisherResponse.headers.get('content-type') || '',
                      error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
                    };

                    console.log('[Extract] Google News fallback unwrap quality gate failed:', {
                      titleLen,
                      textLen,
                      looksLikeJsonError,
                      isEspn,
                      url: finalPublisherUrl
                    });

                    return finalize(requestId, startedAt, urlParam, result);
                  }

                  // Quality gate passed
                  const result: ExtractResult = {
                    success: true,
                    url: finalPublisherUrl,
                    title: article.title,
                    byline: article.byline || undefined,
                    siteName: article.siteName || undefined,
                    contentHtml: article.content,
                    textContent: article.textContent,
                    excerpt: article.excerpt || undefined,
                    length: article.length,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: finalPublisherUrl,
                    status: "ok",
                    contentType: publisherResponse.headers.get('content-type') || '',
                  };

                  cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
                  console.log('[Extract] Success via Readability (Google News unwrapped via fallback):', article.title);
                  return finalize(requestId, startedAt, urlParam, result);
                }

                // Readability failed, try fallback extraction
                console.log('[Extract] Readability returned null, trying fallback...');
                const fallback = fallbackExtract(dom.window.document);

                if (fallback) {
                  // Apply quality gate to Google News fallback extraction result
                  const parsedUrl = new URL(finalPublisherUrl);
                  const host = parsedUrl.hostname.toLowerCase();
                  const isEspn = host.includes("espn.com");
                  const safeTitle = (dom.window.document.title ?? "").trim();
                  const safeText = (fallback.text ?? "").trim();
                  const textLen = safeText.length;
                  const titleLen = safeTitle.length;

                  // Detect JSON error payload disguised as text
                  const looksLikeJsonError =
                    safeText.startsWith("{") &&
                    (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
                    safeText.includes('"error"');

                  // Quality gate
                  const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

                  if (!passesQualityGate) {
                    // Convert false positive into controlled failure
                    const result: ExtractResult = {
                      success: false,
                      url: finalPublisherUrl,
                      title: "",
                      contentHtml: "",
                      textContent: safeText,
                      length: textLen,
                      fetchedUrl: normalizedUrl,
                      resolvedUrl: finalPublisherUrl,
                      status: isEspn ? "blocked" : "no_reader",
                      contentType: publisherResponse.headers.get('content-type') || '',
                      error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
                    };

                    console.log('[Extract] Google News fallback extraction quality gate failed:', {
                      titleLen,
                      textLen,
                      looksLikeJsonError,
                      isEspn,
                      url: finalPublisherUrl
                    });

                    return finalize(requestId, startedAt, urlParam, result);
                  }

                  // Quality gate passed
                  const result: ExtractResult = {
                    success: true,
                    url: finalPublisherUrl,
                    title: dom.window.document.title || 'Untitled',
                    contentHtml: fallback.html,
                    textContent: fallback.text,
                    length: fallback.text.length,
                    fetchedUrl: normalizedUrl,
                    resolvedUrl: finalPublisherUrl,
                    status: "ok",
                    contentType: publisherResponse.headers.get('content-type') || '',
                  };

                  cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
                  console.log('[Extract] Success via fallback extraction (Google News unwrapped via fallback)');
                  return finalize(requestId, startedAt, urlParam, result);
                }

                // All extraction failed
                const result: ExtractResult = {
                  success: false,
                  url: urlParam,
                  error: 'Readability-null: Could not extract readable content from publisher page',
                  fetchedUrl: normalizedUrl,
                  resolvedUrl: finalPublisherUrl,
                  status: "no_reader",
                  contentType: publisherResponse.headers.get('content-type') || '',
                };
                cache.set(urlParam, { result, expires: Date.now() + (2 * 60 * 1000) });
                return finalize(requestId, startedAt, urlParam, result);
              } catch (publisherError) {
                clearTimeout(timeout2);

                let errorMessage = 'Failed to fetch publisher article (fallback)';
                if (publisherError instanceof Error) {
                  if (publisherError.name === 'AbortError') {
                    errorMessage = 'Timeout: Publisher request took too long (>10s)';
                  } else {
                    errorMessage = `Publisher fetch error: ${publisherError.message}`;
                  }
                }

                const result: ExtractResult = {
                  success: false,
                  url: urlParam,
                  error: errorMessage,
                  fetchedUrl: normalizedUrl,
                  resolvedUrl: publisherUrlFromFallback,
                };
                return finalize(requestId, startedAt, urlParam, result);
              }
            }

            // All fallbacks failed - add debug logging
            console.log("[Extract] Google HTML markers:", {
              hasGoogleUrl: googleHtml.includes("https://www.google.com/url?"),
              hasDataNAU: googleHtml.includes("data-n-au"),
              hasDataUrl: googleHtml.includes("data-url"),
              hasOgUrl: googleHtml.includes('property="og:url"'),
              hasCanonical: googleHtml.includes('rel="canonical"'),
              hasApplicationLd: googleHtml.includes("application/ld+json"),
              length: googleHtml.length,
              finalUrl: googleResponse.url
            });
            console.log("[Extract] Google HTML head snippet:", googleHtml.slice(0, 1500));
            console.log("[Extract] Google HTML tail snippet:", googleHtml.slice(Math.max(0, googleHtml.length - 1500)));

            const result: ExtractResult = {
              success: false,
              url: urlParam,
              error: 'Could not unwrap Google News URL: No publisher URL found (tried output=1 and token decode)',
              fetchedUrl: normalizedUrl,
              resolvedUrl: googleResponse.url,
            };
            return finalize(requestId, startedAt, urlParam, result);
          }
        } else {
          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: `Google News blocked: HTTP ${googleResponse.status}`,
            fetchedUrl: normalizedUrl,
            resolvedUrl: googleResponse.url,
            status: googleResponse.status,
          };
          return finalize(requestId, startedAt, urlParam, result);
        }
      } catch (googleError) {
        clearTimeout(timeout1);

        let errorMessage = 'Failed to fetch Google News page';
        if (googleError instanceof Error) {
          if (googleError.name === 'AbortError') {
            errorMessage = 'Timeout: Google News request took too long (>10s)';
          } else {
            errorMessage = `Google News fetch error: ${googleError.message}`;
          }
        }

        const result: ExtractResult = {
          success: false,
          url: urlParam,
          error: errorMessage,
          fetchedUrl: normalizedUrl,
        };
        return finalize(requestId, startedAt, urlParam, result);
      }
    }

    // Non-Google News URL - extract directly
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      let finalUrl = urlParam;
      let html = '';
      let httpStatus = 0;
      let contentTypeHeader = '';
      let playwrightUsed = false;

      console.log('[Extract] Fetching direct (non-Google) URL:', urlParam);

      // First fetch attempt with regular fetch (realistic browser headers)
      const response = await fetch(urlParam, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      httpStatus = response.status;
      contentTypeHeader = response.headers.get('content-type') || '';
      finalUrl = response.url;

      // Check if response is blocked
      const urlObj2 = new URL(urlParam);
      const isBlocked = isBlockedResponse(httpStatus, urlObj2.hostname, response.headers);

      if (isBlocked) {
        console.log('[Extract] Detected blocking, attempting Playwright fallback...');

        try {
          const playwrightResult = await fetchWithPlaywright(urlParam);

          // Playwright disabled or unavailable - return blocked error
          if (!playwrightResult) {
            const result: ExtractResult = {
              success: false,
              url: urlParam,
              error: 'Site may be blocking requests (Playwright fallback disabled)',
              fetchedUrl: urlParam,
              resolvedUrl: response.url,
              status: "blocked",
              contentType: contentTypeHeader,
              playwrightUsed: false,
            };
            return finalize(requestId, startedAt, urlParam, result);
          }

          html = playwrightResult.html;
          finalUrl = playwrightResult.finalUrl;
          playwrightUsed = true;
          httpStatus = 200; // Playwright successful fetch
          console.log('[Extract] Playwright fallback successful');

          // Check for ESPN shell page immediately after Playwright fetch
          const isESPN = urlObj2.hostname.includes('espn.com');
          if (isESPN) {
            const tempDom = new JSDOM(html, { url: finalUrl });
            const tempTitle = tempDom.window.document.title || '';
            if (isESPNShellPage(html, tempTitle)) {
              console.error('[Extract] ESPN returned shell page after Playwright (blocked path)');
              return finalize(
                requestId,
                startedAt,
                urlParam,
                buildExtractResponse({
                  success: false,
                  url: urlParam,
                  status: "blocked",
                  error: 'ESPN blocks reader mode',
                  fetchedUrl: urlParam,
                  resolvedUrl: finalUrl,
                  contentType: 'text/html',
                  playwrightUsed: true,
                  pageTitle: tempTitle,
                })
              );
            }
          }
        } catch (playwrightError) {
          console.error('[Extract] Playwright fallback failed:', playwrightError);
          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: `Blocked and Playwright failed: ${playwrightError instanceof Error ? playwrightError.message : 'Unknown error'}`,
            fetchedUrl: urlParam,
            resolvedUrl: response.url,
            status: "no_reader",
            contentType: contentTypeHeader,
            playwrightUsed: true,
          };
          return finalize(requestId, startedAt, urlParam, result);
        }
      } else if (!response.ok) {
        const result: ExtractResult = {
          success: false,
          url: urlParam,
          error: `HTTP ${response.status}`,
          fetchedUrl: urlParam,
          resolvedUrl: response.url,
          status: "no_reader",
          contentType: contentTypeHeader,
          playwrightUsed: false,
        };
        return finalize(requestId, startedAt, urlParam, result);
      } else {
        // Normal successful response, read HTML
        // Check content type
        if (!contentTypeHeader.includes('text/html') && !contentTypeHeader.includes('application/xhtml')) {
          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: 'Non-HTML: Response is not HTML content',
            fetchedUrl: urlParam,
            resolvedUrl: response.url,
            status: "no_reader",
            contentType: contentTypeHeader,
            playwrightUsed: false,
          };
          return finalize(requestId, startedAt, urlParam, result);
        }

        // Read response with size limit (2MB)
        html = await response.text();
        if (html.length > 2 * 1024 * 1024) {
          const result: ExtractResult = {
            success: false,
            url: urlParam,
            error: 'Response too large (max 2MB)',
            fetchedUrl: urlParam,
            resolvedUrl: response.url,
            status: "no_reader",
            contentType: contentTypeHeader,
            playwrightUsed: false,
          };
          return finalize(requestId, startedAt, urlParam, result);
        }
      }

      // Parse HTML to extract debug info (html is already set from either fetch or Playwright)
      const debugDom = new JSDOM(html, { url: finalUrl });
      const debugDoc = debugDom.window.document;
      const pageTitle = debugDoc.title || '';
      const bodyText = debugDoc.body?.textContent?.trim() || '';
      const textPreview = bodyText.substring(0, 200).trim();

      // Parse with Readability
      const dom = new JSDOM(html, { url: finalUrl });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      // Collect debug info (only included in response if debugMode=true)
      const debugInfo = debugMode ? {
        inputHost: urlObj2.hostname,
        finalHost: new URL(finalUrl).hostname,
        httpStatus,
        contentType: contentTypeHeader,
        fetchedUrl: finalUrl,
        redirectChainCount: finalUrl !== urlParam ? 1 : 0,
        htmlLength: html.length,
        htmlHead: html.substring(0, 300),
        pageTitle,
        readabilityTitle: article?.title || '',
        readabilityTextLength: article?.textContent?.length || 0,
        readabilityTextHead: (article?.textContent || '').substring(0, 200),
      } : undefined; 

      // Check if we got insufficient content from a JS-required domain and haven't used Playwright yet
      const needsJavaScript = requiresJavaScript(urlObj2.hostname);
      const hasInsufficientContent = article && article.textContent && article.textContent.length < 500;

      if (!playwrightUsed && needsJavaScript && (hasInsufficientContent || !article)) {
        console.log('[Extract] JS-required domain with insufficient content, retrying with Playwright...');

        try {
          const playwrightResult = await fetchWithPlaywright(urlParam);

          // Playwright disabled - skip retry and continue with existing content
          if (!playwrightResult) {
            console.log('[Extract] Playwright disabled, skipping JS-required domain retry');
            // Fall through to continue with existing article/fallback extraction
          } else {
            html = playwrightResult.html;
            finalUrl = playwrightResult.finalUrl;
            playwrightUsed = true;

            // Re-parse with Playwright HTML
            const pwDom = new JSDOM(html, { url: finalUrl });
            const pwTitle = pwDom.window.document.title || '';

          // Check for ESPN shell page
          const isESPN = urlObj2.hostname.includes('espn.com');
          if (isESPN && isESPNShellPage(html, pwTitle)) {
            console.error('[Extract] ESPN returned shell page, article body not found');
            return finalize(
              requestId,
              startedAt,
              urlParam,
              buildExtractResponse({
                success: false,
                url: urlParam,
                status: "blocked",
                error: 'ESPN blocks reader mode',
                fetchedUrl: urlParam,
                resolvedUrl: finalUrl,
                contentType: 'text/html',
                playwrightUsed: true,
                pageTitle: pwTitle,
              })
            );
          }

          const pwReader = new Readability(pwDom.window.document);
          const pwArticle = pwReader.parse();

          if (pwArticle) {
            // ESPN shell detection + quality gate for Playwright Readability
            const parsedUrl = new URL(urlParam);
            const host = parsedUrl.hostname.toLowerCase();
            const isEspn = host.includes("espn.com");
            const safeTitle = (pwArticle.title ?? "").trim();
            const safeText = (pwArticle.textContent ?? "").trim();
            const textLen = safeText.length;
            const titleLen = safeTitle.length;

            // ESPN shell detection BEFORE quality gate
            if (isEspnShellResult({
              title: safeTitle,
              textContent: safeText,
              contentHtml: pwArticle.content,
              isEspnDomain: isEspn
            })) {
              const result: ExtractResult = {
                success: false,
                url: finalUrl,
                title: "",
                contentHtml: "",
                textContent: "",
                length: 0,
                fetchedUrl: urlParam,
                resolvedUrl: finalUrl,
                status: "blocked",
                contentType: 'text/html',
                playwrightUsed: true,
                error: "ESPN blocks reader mode",
              };
              console.log('[Extract] ESPN shell result rejected (Playwright retry)');
              return finalize(requestId, startedAt, urlParam, result);
            }

            // Detect JSON error payload disguised as text
            const looksLikeJsonError =
              safeText.startsWith("{") &&
              (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
              safeText.includes('"error"');

            // Quality gate
            const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

            if (!passesQualityGate) {
              // Convert false positive into controlled failure
              const result: ExtractResult = {
                success: false,
                url: finalUrl,
                title: "",
                byline: pwArticle.byline || undefined,
                siteName: pwArticle.siteName || undefined,
                contentHtml: "",
                textContent: safeText,
                excerpt: pwArticle.excerpt || undefined,
                length: textLen,
                fetchedUrl: urlParam,
                resolvedUrl: finalUrl,
                status: isEspn ? "blocked" : "no_reader",
                contentType: 'text/html',
                playwrightUsed: true,
                error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
              };

              console.log('[Extract] Playwright quality gate failed:', {
                titleLen,
                textLen,
                looksLikeJsonError,
                isEspn,
                url: urlParam
              });

              return finalize(requestId, startedAt, urlParam, result);
            }

            // Quality gate passed
            const result: ExtractResult = {
              success: true,
              url: finalUrl,
              title: pwArticle.title,
              byline: pwArticle.byline || undefined,
              siteName: pwArticle.siteName || undefined,
              contentHtml: pwArticle.content,
              textContent: pwArticle.textContent,
              excerpt: pwArticle.excerpt || undefined,
              length: pwArticle.length,
              fetchedUrl: urlParam,
              resolvedUrl: finalUrl,
              status: "ok",
              contentType: 'text/html',
              playwrightUsed: true,
            };

            cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
            console.log('[Extract] Success via Readability (Playwright retry):', pwArticle.title);
            return finalize(requestId, startedAt, urlParam, result);
          }

          // Playwright also failed to extract, try fallback
          const pwFallback = fallbackExtract(pwDom.window.document);
          if (pwFallback) {
            // Apply quality gate to Playwright fallback result
            const parsedUrl = new URL(urlParam);
            const host = parsedUrl.hostname.toLowerCase();
            const isEspn = host.includes("espn.com");
            const safeTitle = (pwTitle ?? "").trim();
            const safeText = (pwFallback.text ?? "").trim();
            const textLen = safeText.length;
            const titleLen = safeTitle.length;

            // Detect JSON error payload disguised as text
            const looksLikeJsonError =
              safeText.startsWith("{") &&
              (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
              safeText.includes('"error"');

            // Quality gate
            const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

            if (!passesQualityGate) {
              // Convert false positive into controlled failure
              const result: ExtractResult = {
                success: false,
                url: finalUrl,
                title: "",
                contentHtml: "",
                textContent: safeText,
                length: textLen,
                fetchedUrl: urlParam,
                resolvedUrl: finalUrl,
                status: isEspn ? "blocked" : "no_reader",
                contentType: 'text/html',
                playwrightUsed: true,
                error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
              };

              console.log('[Extract] Playwright fallback quality gate failed:', {
                titleLen,
                textLen,
                looksLikeJsonError,
                isEspn,
                url: urlParam
              });

              return finalize(requestId, startedAt, urlParam, result);
            }

            // Quality gate passed
            const result: ExtractResult = {
              success: true,
              url: finalUrl,
              title: pwTitle || 'Untitled',
              contentHtml: pwFallback.html,
              textContent: pwFallback.text,
              length: pwFallback.text.length,
              fetchedUrl: urlParam,
              resolvedUrl: finalUrl,
              status: "ok",
              contentType: 'text/html',
              playwrightUsed: true,
            };

            cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });
            console.log('[Extract] Success via fallback extraction (Playwright retry)');
            return finalize(requestId, startedAt, urlParam, result);
          }

            // ESPN with no extractable content
            if (isESPN) {
              console.error('[Extract] ESPN Playwright extraction failed completely');
              return finalize(
                requestId,
                startedAt,
                urlParam,
                buildExtractResponse({
                  success: false,
                  url: urlParam,
                  status: "blocked",
                  error: 'ESPN blocks reader mode',
                  fetchedUrl: urlParam,
                  resolvedUrl: finalUrl,
                  contentType: 'text/html',
                  playwrightUsed: true,
                  pageTitle: pwTitle,
                })
              );
            }
          } // end else (playwrightResult)
        } catch (playwrightError) {
          console.error('[Extract] Playwright retry failed:', playwrightError);

          // ESPN-specific error message
          if (urlObj2.hostname.includes('espn.com')) {
            const result: ExtractResult = {
              success: false,
              url: urlParam,
              error: `Could not load article content: ${playwrightError instanceof Error ? playwrightError.message : 'Unknown error'}`,
              fetchedUrl: urlParam,
              resolvedUrl: finalUrl,
              playwrightUsed: true,
            };
            return finalize(requestId, startedAt, urlParam, result);
          }

          // Continue with original article result or fallback below for non-ESPN
        }
      }

      if (article) {
        // Readability succeeded - check for ESPN shell BEFORE quality gate

        // Compute quality gate values
        const parsedUrl = new URL(urlParam);
        const host = parsedUrl.hostname.toLowerCase();
        const isEspn = host.includes("espn.com");
        const safeTitle = (article.title ?? "").trim();
        const safeText = (article.textContent ?? "").trim();
        const textLen = safeText.length;
        const titleLen = safeTitle.length;

        // ESPN shell detection BEFORE quality gate (catches "null - ESPN" titles)
        if (isEspnShellResult({
          title: safeTitle,
          textContent: safeText,
          contentHtml: article.content,
          isEspnDomain: isEspn
        })) {
          const result: ExtractResult = {
            success: false,
            url: finalUrl,
            title: "",
            contentHtml: "",
            textContent: "",
            length: 0,
            fetchedUrl: urlParam,
            resolvedUrl: finalUrl,
            status: "blocked",
            contentType: contentTypeHeader,
            pageTitle,
            textPreview,
            playwrightUsed,
            error: "ESPN blocks reader mode",
          };
          console.log('[Extract] ESPN shell result rejected (before quality gate)');
          return finalize(requestId, startedAt, urlParam, result);
        }

        // Detect JSON error payload disguised as text
        const looksLikeJsonError =
          safeText.startsWith("{") &&
          (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
          safeText.includes('"error"');

        // Quality gate
        const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

        if (!passesQualityGate) {
          // Convert false positive into controlled failure
          const result: ExtractResult = {
            success: false,
            url: finalUrl,
            title: "",
            byline: article.byline || undefined,
            siteName: article.siteName || undefined,
            contentHtml: "",
            textContent: safeText,
            excerpt: article.excerpt || undefined,
            length: textLen,
            fetchedUrl: urlParam,
            resolvedUrl: finalUrl,
            status: isEspn ? "blocked" : "no_reader",
            contentType: contentTypeHeader,
            pageTitle,
            textPreview,
            playwrightUsed,
            error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
          };

          console.log('[Extract] Quality gate failed:', {
            titleLen,
            textLen,
            looksLikeJsonError,
            isEspn,
            url: urlParam
          });

          if (debugInfo) {
            result.debug = debugInfo;
          }

          return finalize(requestId, startedAt, urlParam, result);
        }

        // Quality gate passed - return success
        const result: ExtractResult = {
          success: true,
          url: finalUrl,
          title: article.title,
          byline: article.byline || undefined,
          siteName: article.siteName || undefined,
          contentHtml: article.content,
          textContent: article.textContent,
          excerpt: article.excerpt || undefined,
          length: article.length,
          fetchedUrl: urlParam,
          resolvedUrl: finalUrl,
          status: "ok",
          contentType: contentTypeHeader,
          pageTitle,
          textPreview,
          playwrightUsed,
        };

        // Add debug info if enabled
        if (debugInfo) {
          result.debug = debugInfo;
        }

        // Cache successful result
        cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });

        console.log('[Extract] Success via Readability:', article.title, playwrightUsed ? '(Playwright)' : '(fetch)');

        return finalize(requestId, startedAt, urlParam, result);
      }

      // Readability failed, try fallback extraction
      console.log('[Extract] Readability returned null, trying fallback...');
      const fallback = fallbackExtract(dom.window.document);

      if (fallback) {
        // Apply quality gate to fallback extraction too
        const parsedUrl = new URL(urlParam);
        const host = parsedUrl.hostname.toLowerCase();
        const isEspn = host.includes("espn.com");
        const safeTitle = (pageTitle ?? "").trim();
        const safeText = (fallback.text ?? "").trim();
        const textLen = safeText.length;
        const titleLen = safeTitle.length;

        // Detect JSON error payload disguised as text
        const looksLikeJsonError =
          safeText.startsWith("{") &&
          (safeText.includes('"status":404') || safeText.includes('"status": 404')) &&
          safeText.includes('"error"');

        // Quality gate
        const passesQualityGate = (titleLen >= 8) && (textLen >= 400) && !looksLikeJsonError;

        if (!passesQualityGate) {
          // Convert false positive into controlled failure
          const result: ExtractResult = {
            success: false,
            url: finalUrl,
            title: "",
            contentHtml: "",
            textContent: safeText,
            length: textLen,
            fetchedUrl: urlParam,
            resolvedUrl: finalUrl,
            status: isEspn ? "blocked" : "no_reader",
            contentType: contentTypeHeader,
            pageTitle,
            textPreview,
            playwrightUsed,
            error: isEspn ? "ESPN blocks reader mode" : "Reader view isn't available",
          };

          console.log('[Extract] Fallback quality gate failed:', {
            titleLen,
            textLen,
            looksLikeJsonError,
            isEspn,
            url: urlParam
          });

          return finalize(requestId, startedAt, urlParam, result);
        }

        // Quality gate passed
        const result: ExtractResult = {
          success: true,
          url: finalUrl,
          title: pageTitle || 'Untitled',
          contentHtml: fallback.html,
          textContent: fallback.text,
          length: fallback.text.length,
          fetchedUrl: urlParam,
          resolvedUrl: finalUrl,
          status: "ok",
          contentType: contentTypeHeader,
          pageTitle,
          textPreview,
          playwrightUsed,
        };

        // Cache successful result
        cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });

        console.log('[Extract] Success via fallback extraction', playwrightUsed ? '(Playwright)' : '(fetch)');

        return finalize(requestId, startedAt, urlParam, result);
      }

      // All extraction methods failed
      const result: ExtractResult = {
        success: false,
        url: urlParam,
        error: 'Readability-null: Could not extract readable content from this page',
        fetchedUrl: urlParam,
        resolvedUrl: finalUrl,
        status: "no_reader",
        contentType: contentTypeHeader,
        pageTitle,
        textPreview,
        playwrightUsed,
      };

      // Cache failure too (shorter TTL)
      cache.set(urlParam, { result, expires: Date.now() + (2 * 60 * 1000) });

      return finalize(requestId, startedAt, urlParam, result);

    } catch (fetchError) {
      clearTimeout(timeout);

      let errorMessage = 'Failed to fetch article';
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          errorMessage = 'Timeout: Request took too long (>10s)';
        } else {
          errorMessage = `Fetch error: ${fetchError.message}`;
        }
      }

      const result: ExtractResult = {
        success: false,
        url: urlParam,
        error: errorMessage,
        fetchedUrl: urlParam,
      };

      return finalize(requestId, startedAt, urlParam, result);
    }

  } catch (error) {
    console.error('[Extract] Error:', error);

    return finalize(
      requestId,
      startedAt,
      '',
      buildExtractResponse({
        success: false,
        url: '',
        status: 'no_reader',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}
