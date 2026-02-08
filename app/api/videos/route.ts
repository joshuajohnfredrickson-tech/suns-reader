import { NextRequest, NextResponse } from "next/server";

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const PRIMARY_Q = "Phoenix Suns";
const SECONDARY_Q = "Suns";

const PRIMARY_TIMEOUT_MS = 8000;
const SECONDARY_TIMEOUT_MS = 2500;

// Per-(query, pageToken) cache
const cache = new Map<string, { data: any; expires: number }>();

interface NormalizedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

interface PageResult {
  videos: NormalizedVideo[];
  nextPageToken: string | null;
}

/**
 * Fetch with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch one page of YouTube search results for a given query.
 * Uses the per-(query, pageToken) cache to avoid redundant API calls.
 */
async function fetchYouTubePage(
  apiKey: string,
  q: string,
  publishedAfter: string,
  timeoutMs: number,
  pageToken?: string
): Promise<PageResult> {
  const cacheKey = `${q}|${pageToken ?? "__first__"}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    console.log(`[videos] cache hit: "${cacheKey}"`);
    return cached.data;
  }
  console.log(`[videos] cache miss: "${cacheKey}"`);

  const params = new URLSearchParams({
    key: apiKey,
    q,
    type: "video",
    order: "date",
    maxResults: "50",
    part: "snippet",
    publishedAfter,
    safeSearch: "none",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const start = Date.now();
  console.log(`[videos] fetch start q="${q}" pageToken=${pageToken ?? "none"}`);

  const res = await fetchWithTimeout(
    `${YT_SEARCH_URL}?${params.toString()}`,
    timeoutMs
  );

  const duration = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[videos] fetch error q="${q}" status=${res.status} (${duration}ms):`,
      text
    );
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const json = await res.json();
  console.log(
    `[videos] fetch done q="${q}" items=${(json.items ?? []).length} (${duration}ms)`
  );

  const videos: NormalizedVideo[] = (json.items ?? []).map((item: any) => ({
    id: item.id?.videoId,
    title: item.snippet?.title,
    description: item.snippet?.description,
    thumbnail:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url,
    channelTitle: item.snippet?.channelTitle,
    publishedAt: item.snippet?.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
  }));

  const result: PageResult = {
    videos,
    nextPageToken: json.nextPageToken ?? null,
  };

  cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });

  return result;
}

/**
 * Dedupe videos by id and sort by publishedAt descending.
 */
function dedupeAndSort(videos: NormalizedVideo[]): NormalizedVideo[] {
  const seen = new Set<string>();
  const unique: NormalizedVideo[] = [];
  for (const v of videos) {
    if (v.id && !seen.has(v.id)) {
      seen.add(v.id);
      unique.push(v);
    }
  }
  return unique.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "YT_API_KEY not configured" },
      { status: 500 }
    );
  }

  const pageToken =
    request.nextUrl.searchParams.get("pageToken") ?? undefined;

  try {
    const publishedAfter = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    if (pageToken) {
      // Page 2+: primary query only
      const primary = await fetchYouTubePage(
        apiKey,
        PRIMARY_Q,
        publishedAfter,
        PRIMARY_TIMEOUT_MS,
        pageToken
      );
      return NextResponse.json({
        videos: primary.videos,
        nextPageToken: primary.nextPageToken,
      });
    }

    // First page: merge primary + secondary via Promise.allSettled
    const [primaryResult, secondaryResult] = await Promise.allSettled([
      fetchYouTubePage(apiKey, PRIMARY_Q, publishedAfter, PRIMARY_TIMEOUT_MS),
      fetchYouTubePage(
        apiKey,
        SECONDARY_Q,
        publishedAfter,
        SECONDARY_TIMEOUT_MS
      ),
    ]);

    // Primary must succeed
    if (primaryResult.status === "rejected") {
      console.error("[videos] primary query failed:", primaryResult.reason);
      return NextResponse.json(
        { error: "Failed to fetch videos" },
        { status: 500 }
      );
    }

    const primary = primaryResult.value;

    // Secondary is best-effort
    let secondaryVideos: NormalizedVideo[] = [];
    if (secondaryResult.status === "fulfilled") {
      secondaryVideos = secondaryResult.value.videos;
    } else {
      console.warn(
        "[videos] secondary query failed, continuing with primary only:",
        secondaryResult.reason
      );
    }

    const merged = dedupeAndSort([...primary.videos, ...secondaryVideos]);

    return NextResponse.json({
      videos: merged,
      nextPageToken: primary.nextPageToken,
    });
  } catch (err) {
    console.error("[videos] Failed to fetch videos:", err);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
