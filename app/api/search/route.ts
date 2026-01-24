import { NextResponse } from 'next/server';
import { simpleHash, getDomain, isWithin24Hours } from '@/app/lib/utils';
import { ArticleSummary } from '@/app/types/article';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  guid?: string;
  source?: string;
  sourceUrl?: string;
}

/**
 * Parse RSS XML safely (basic implementation)
 */
function parseRSS(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];

  try {
    // Extract all <item> elements
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const itemMatches = xmlText.matchAll(itemRegex);

    for (const match of itemMatches) {
      const itemXml = match[1];

      // Extract fields from item
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim();
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
      const guid = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim();

      // Extract source element and its url attribute
      const sourceMatch = itemXml.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
      const sourceUrl = sourceMatch?.[1]?.trim();
      const source = sourceMatch?.[2]?.trim();

      if (title && link) {
        items.push({
          title: decodeHTML(title),
          link,
          pubDate,
          guid,
          source: source ? decodeHTML(source) : undefined,
          sourceUrl,
        });
      }
    }
  } catch (error) {
    console.error('RSS parsing error:', error);
  }

  return items;
}

/**
 * Decode HTML entities
 */
function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Extract publisher from title pattern "Title - Publisher"
 */
function extractPublisherFromTitle(title: string): string | undefined {
  const match = title.match(/\s-\s([^-]+)$/);
  return match?.[1]?.trim();
}

/**
 * Normalize RSS items to ArticleSummary format
 * Returns Google News wrapper URLs for extraction to resolve
 */
function normalizeRSSItems(items: RSSItem[]): ArticleSummary[] {
  return items
    .map((item) => {
      if (!item.link || !item.title) return null;

      // Use Google News wrapper URL - /api/extract will resolve to publisher URL
      const url = item.link;
      const id = simpleHash(item.guid || url);

      // Derive publisher domain from sourceUrl for display/filtering
      // Fall back to extracting from title or using google.com
      const publisherDomain = item.sourceUrl ? getDomain(item.sourceUrl) : 'news.google.com';
      const sourceDomain = publisherDomain;

      // Use source name, or extract from title, or fall back to domain
      const sourceName = item.source || extractPublisherFromTitle(item.title) || sourceDomain;

      // Parse pubDate to ISO string
      let publishedAt = new Date().toISOString(); // Default to now
      if (item.pubDate) {
        try {
          publishedAt = new Date(item.pubDate).toISOString();
        } catch {
          // Keep default
        }
      }

      return {
        id,
        title: item.title,
        url, // Google News wrapper URL
        publishedAt,
        sourceName,
        sourceDomain,
      };
    })
    .filter((item): item is ArticleSummary => item !== null);
}

/**
 * Finalize the request: log metrics and return response
 */
function finalize(
  requestId: string,
  startedAt: number,
  query: string,
  rssUrl: string,
  rssFetchStatus: number | null,
  itemsReturned: number,
  cacheBustUsed: boolean,
  error: string | null,
  payload: { items: ArticleSummary[] } | { error: string; items: [] }
): NextResponse {
  const durationMs = Date.now() - startedAt;

  // Extract host from RSS URL
  const rssUrlHost = (() => {
    try {
      return new URL(rssUrl).hostname;
    } catch {
      return 'unknown';
    }
  })();

  // Log single JSON line
  console.log(JSON.stringify({
    type: 'search',
    requestId,
    ts: new Date().toISOString(),
    durationMs,
    query,
    rssUrlHost,
    rssFetchStatus,
    itemsReturned,
    cacheBustUsed,
    error,
  }));

  return NextResponse.json(payload);
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  let query = 'Phoenix Suns';
  let rssUrl = '';

  try {
    const { searchParams } = new URL(request.url);
    query = searchParams.get('q') || 'Phoenix Suns';

    // Add cache-buster to prevent stale responses
    const cacheBust = Date.now();
    const baseRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    rssUrl = `${baseRssUrl}&cb=${cacheBust}`;

    console.log('[API] Fetching RSS feed:', rssUrl);

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SunsReader/1.0)',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('[API] RSS fetched, parsing...');

    const rssItems = parseRSS(xmlText);
    console.log(`[API] Parsed ${rssItems.length} items from RSS`);

    let normalized = normalizeRSSItems(rssItems);

    // Filter to last 24 hours (or keep if no publishedAt)
    normalized = normalized.filter((item) => {
      if (!item.publishedAt) return true; // Keep items without dates
      return isWithin24Hours(item.publishedAt);
    });

    console.log(`[API] ${normalized.length} items within 24 hours`);

    // Sort by publishedAt (newest first)
    normalized.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    return finalize(
      requestId,
      startedAt,
      query,
      rssUrl,
      response.status,
      normalized.length,
      true,
      null,
      { items: normalized }
    );
  } catch (error) {
    console.error('[API] Search error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch articles';

    return finalize(
      requestId,
      startedAt,
      query,
      rssUrl || '',
      null,
      0,
      true,
      errorMessage,
      { error: errorMessage, items: [] }
    );
  }
}
