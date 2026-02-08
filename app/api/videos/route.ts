import { NextResponse } from "next/server";

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache: { data: any; expires: number } | null = null;

export async function GET() {
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "YT_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (cache && Date.now() < cache.expires) {
    return NextResponse.json(cache.data);
  }

  try {
    const publishedAfter = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const params = new URLSearchParams({
      key: apiKey,
      q: "Phoenix Suns",
      type: "video",
      order: "date",
      maxResults: "25",
      part: "snippet",
      publishedAfter,
      safeSearch: "none",
    });

    const res = await fetch(`${YT_SEARCH_URL}?${params.toString()}`);

    if (!res.ok) {
      const text = await res.text();
      console.error("YouTube API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch videos" },
        { status: 500 }
      );
    }

    const json = await res.json();

    const videos = (json.items ?? []).map((item: any) => ({
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

    const data = { videos };

    cache = { data, expires: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch videos:", err);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
