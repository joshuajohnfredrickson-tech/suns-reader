'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentColumn } from '../../../components/ContentColumn';
import { getRelativeTime } from '../../../lib/utils';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

const CLIENT_TIMEOUT_MS = 10_000;

/**
 * Fetch with a client-side AbortController timeout.
 */
function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { cache: 'no-store', signal: controller.signal }).finally(
    () => clearTimeout(timer)
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    async function fetchVideos() {
      try {
        const res = await fetchWithTimeout('/api/videos', CLIENT_TIMEOUT_MS);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Server error (${res.status})`);
        }
        const data = await res.json();
        setVideos(data.videos ?? []);
        setNextPageToken(data.nextPageToken ?? null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Videos took too long to load. Please try again.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load videos');
        }
      } finally {
        setIsFetching(false);
      }
    }
    fetchVideos();
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await fetchWithTimeout(
        `/api/videos?pageToken=${encodeURIComponent(nextPageToken)}`,
        CLIENT_TIMEOUT_MS
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      const newVideos: Video[] = data.videos ?? [];
      setVideos((prev) => {
        const seenIds = new Set(prev.map((v) => v.id));
        const unique = newVideos.filter((v) => !seenIds.has(v.id));
        return [...prev, ...unique];
      });
      setNextPageToken(data.nextPageToken ?? null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setLoadMoreError('Request timed out. Tap to retry.');
      } else {
        setLoadMoreError('Failed to load more. Tap to retry.');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground">
      {/* Header - static, outside scroll container */}
      <div className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        <header className="relative flex items-center justify-center px-4 pt-2 pb-1 sm:pt-2.5 sm:pb-1">
          <h1 className="text-xl font-semibold">Videos</h1>
        </header>
        <div className="border-b border-border" />
      </div>

      {/* Video list - full-width scroll container with centered content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <ContentColumn>
          {isFetching ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400">Loading videos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
              </div>
            </div>
          ) : (
            <div>
              {videos.map((video, index) => {
                const isLast = index === videos.length - 1 && !nextPageToken;
                return (
                  <div
                    key={video.id}
                    className={!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}
                  >
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt=""
                        width={120}
                        height={68}
                        className="shrink-0 w-[120px] h-[68px] rounded object-cover bg-zinc-100 dark:bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-medium leading-snug text-foreground line-clamp-2">
                          {video.title}
                        </h3>
                        <div className="mt-1.5 text-xs leading-tight text-zinc-500 dark:text-zinc-400 truncate">
                          <span>{video.channelTitle}</span>
                          <span className="mx-1.5">&middot;</span>
                          <span>{getRelativeTime(video.publishedAt)}</span>
                        </div>
                      </div>
                    </a>
                  </div>
                );
              })}
              {nextPageToken ? (
                <div className="px-4 py-4 flex flex-col items-center gap-2">
                  {loadMoreError && (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      {loadMoreError}
                    </p>
                  )}
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 text-sm font-medium text-accent hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {loadingMore ? 'Loading\u2026' : 'Load more'}
                  </button>
                </div>
              ) : videos.length > 0 ? (
                <div className="px-4 py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  No more videos
                </div>
              ) : null}
            </div>
          )}
        </ContentColumn>
      </div>
    </div>
  );
}
