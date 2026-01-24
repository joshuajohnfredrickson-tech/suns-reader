export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

/**
 * Google News RSS often uses URLs like:
 * https://news.google.com/rss/articles/<BASE64ISH_BLOB>?...
 *
 * That blob frequently embeds the real publisher URL.
 * We'll decode it without any browser automation.
 */

function extractArticleId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);

    const idx = parts.findIndex((p) => p === "articles");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];

    return null;
  } catch {
    return null;
  }
}

function safeBase64UrlDecode(input: string): string | null {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";

    const buf = Buffer.from(s, "base64");
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function sanitizeUrl(raw: string): string | null {
  let s = raw.trim();
  s = s.replace(/[^\w\-.:/?#\[\]@!$&'()*+,;=%]+.*$/u, "");

  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

function findFirstHttpUrl(text: string): string | null {
  const i = text.indexOf("http://");
  const j = text.indexOf("https://");
  let start = Math.max(i, j);
  if (i >= 0 && j >= 0) start = Math.min(i, j);
  if (start < 0) return null;

  const endChars = new Set([" ", "\n", "\r", "\t", '"', "'", "<", ">", ")", "]"]);
  let end = start;
  while (end < text.length && !endChars.has(text[end])) end++;

  const rawUrl = text.slice(start, end);

  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes("google.com")) return null;
  } catch {
    return null;
  }

  return sanitizeUrl(rawUrl);
}

function decodePublisherUrlFromId(id: string) {
  const decoded = safeBase64UrlDecode(id);
  if (!decoded) return { publisherUrl: null };

  return {
    publisherUrl: findFirstHttpUrl(decoded),
    decodedTextSample: decoded.slice(0, 300),
  };
}

/**
 * Try following redirects to resolve the publisher URL
 */
async function tryRedirectFollow(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsReader/1.0)",
      },
    });

    const finalUrl = response.url;

    // Check if we got redirected away from Google
    try {
      const finalUrlObj = new URL(finalUrl);
      if (!finalUrlObj.hostname.includes("google.com") && finalUrl !== url) {
        return finalUrl;
      }
    } catch {
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try fetching HTML and parsing meta tags (canonical, og:url)
 */
async function tryMetaTags(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsReader/1.0)",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Try canonical link
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    if (canonicalMatch && canonicalMatch[1]) {
      const canonicalUrl = canonicalMatch[1];
      try {
        const canonicalUrlObj = new URL(canonicalUrl, url);
        if (!canonicalUrlObj.hostname.includes("google.com")) {
          return canonicalUrlObj.toString();
        }
      } catch {
        // Invalid canonical URL
      }
    }

    // Try og:url meta tag
    const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
    if (ogUrlMatch && ogUrlMatch[1]) {
      const ogUrl = ogUrlMatch[1];
      try {
        const ogUrlObj = new URL(ogUrl, url);
        if (!ogUrlObj.hostname.includes("google.com")) {
          return ogUrlObj.toString();
        }
      } catch {
        // Invalid og:url
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputUrl = body?.url;
    const debug = Boolean(body?.debug);

    if (!inputUrl) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const methodsTried: string[] = [];
    let publisherUrl: string | null = null;
    let successMethod: string | null = null;

    // Method 1: Base64 token decoding
    const id = extractArticleId(inputUrl);
    if (id) {
      methodsTried.push("base64_decode");
      const { publisherUrl: decodedUrl } = decodePublisherUrlFromId(id);
      if (decodedUrl) {
        publisherUrl = decodedUrl;
        successMethod = "base64_decode";
        console.log("[Resolve] Success via base64 decode:", publisherUrl);
      }
    }

    // Method 2: Follow redirects (if decode failed)
    if (!publisherUrl) {
      methodsTried.push("redirect_follow");
      const redirectUrl = await tryRedirectFollow(inputUrl);
      if (redirectUrl) {
        publisherUrl = redirectUrl;
        successMethod = "redirect_follow";
        console.log("[Resolve] Success via redirect follow:", publisherUrl);
      }
    }

    // Method 3: Parse meta tags (if redirect failed)
    if (!publisherUrl) {
      methodsTried.push("meta_tags");
      const metaUrl = await tryMetaTags(inputUrl);
      if (metaUrl) {
        publisherUrl = metaUrl;
        successMethod = "meta_tags";
        console.log("[Resolve] Success via meta tags:", publisherUrl);
      }
    }

    if (publisherUrl) {
      return NextResponse.json(
        debug
          ? { success: true, publisherUrl, debug: { methodsTried, successMethod } }
          : { success: true, publisherUrl }
      );
    }

    console.error("[Resolve] All methods failed for:", inputUrl);
    return NextResponse.json(
      debug
        ? { success: false, debug: { methodsTried, reason: "all_methods_failed" } }
        : { success: false }
    );
  } catch (err) {
    console.error("[Resolve] Error:", err);
    return NextResponse.json({ success: false });
  }
}
