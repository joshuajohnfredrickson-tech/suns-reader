import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

interface ExtractResult {
  success: boolean;
  url: string;
  title?: string;
  byline?: string;
  siteName?: string;
  contentHtml?: string;
  textContent?: string;
  excerpt?: string;
  length?: number;
  error?: string;
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

export async function GET(request: Request) {
  cleanCache(); // Clean expired cache entries

  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json(
        { success: false, url: '', error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = cache.get(urlParam);
    if (cached && Date.now() < cached.expires) {
      console.log('[Extract] Cache hit for:', urlParam);
      return NextResponse.json(cached.result);
    }

    // Validate URL
    const validation = validateUrl(urlParam);
    if (!validation.valid) {
      const result: ExtractResult = {
        success: false,
        url: urlParam,
        error: validation.error || 'Invalid URL',
      };
      return NextResponse.json(result, { status: 400 });
    }

    console.log('[Extract] Fetching:', urlParam);

    // Fetch HTML with timeout and size limit
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(urlParam, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SunsReader/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error('Response is not HTML');
      }

      // Read response with size limit (2MB)
      const text = await response.text();
      if (text.length > 2 * 1024 * 1024) {
        throw new Error('Response too large (max 2MB)');
      }

      // Parse with Readability
      const dom = new JSDOM(text, { url: urlParam });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        const result: ExtractResult = {
          success: false,
          url: urlParam,
          error: 'Could not extract article content. This site may not be supported or may require JavaScript.',
        };

        // Cache failure too (shorter TTL)
        cache.set(urlParam, { result, expires: Date.now() + (2 * 60 * 1000) });

        return NextResponse.json(result);
      }

      const result: ExtractResult = {
        success: true,
        url: urlParam,
        title: article.title,
        byline: article.byline || undefined,
        siteName: article.siteName || undefined,
        contentHtml: article.content,
        textContent: article.textContent,
        excerpt: article.excerpt || undefined,
        length: article.length,
      };

      // Cache successful result
      cache.set(urlParam, { result, expires: Date.now() + CACHE_TTL });

      console.log('[Extract] Success:', article.title);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeout);

      let errorMessage = 'Failed to fetch article';
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          errorMessage = 'Request timed out';
        } else {
          errorMessage = fetchError.message;
        }
      }

      const result: ExtractResult = {
        success: false,
        url: urlParam,
        error: errorMessage,
      };

      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('[Extract] Error:', error);

    return NextResponse.json(
      {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
