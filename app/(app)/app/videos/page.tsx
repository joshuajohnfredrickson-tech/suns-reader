'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ContentColumn } from '../../../components/ContentColumn';
import { getRelativeTime } from '../../../lib/utils';
import { markVideoWatched, getWatchedStateForVideos, purgeExpiredVideoWatchedState } from '../../../lib/videoWatchedState';
import { BottomTabBar } from '../../../components/BottomTabBar';
import { emitAppReady } from '../../../lib/appReady';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  isWatched?: boolean;
}

const CLIENT_TIMEOUT_MS = 10_000;
const DONATE_URL = 'https://buymeacoffee.com/sunsreader';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [watchedVersion, setWatchedVersion] = useState(0);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetchWithTimeout('/api/videos', CLIENT_TIMEOUT_MS);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      setVideos(data.videos ?? []);
      setNextPageToken(data.nextPageToken ?? null);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Videos took too long to load. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    purgeExpiredVideoWatchedState();

    async function initialFetch() {
      await fetchVideos();
      setIsFetching(false);
    }
    initialFetch();
  }, [fetchVideos]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchVideos();
    setIsRefreshing(false);
  }, [isRefreshing, fetchVideos]);

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

  // Listen for watched state changes (same-tab + cross-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'suns-reader-video-watched-state') {
        setWatchedVersion(v => v + 1);
      }
    };
    const handleWatchedStateChange = () => {
      setWatchedVersion(v => v + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('videoWatchedStateChanged', handleWatchedStateChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('videoWatchedStateChanged', handleWatchedStateChange);
    };
  }, []);

  // Signal splash overlay that first meaningful paint is ready
  useEffect(() => {
    if (mounted && !isFetching) {
      console.log('[Splash] emitAppReady from /app/videos', { mounted, isFetching, error, videoCount: videos.length });
      emitAppReady();
    }
  }, [mounted, isFetching, error, videos.length]);

  // Derive videos with watched state attached
  const videosWithWatchedState = useMemo(() => {
    if (videos.length === 0) return videos;
    const ids = videos.map(v => v.id);
    const watchedMap = getWatchedStateForVideos(ids);
    return videos.map(v => ({ ...v, isWatched: watchedMap[v.id] || false }));
  }, [videos, watchedVersion]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground">
      {/* Header wrapper - static, outside scroll container */}
      <div className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        {/* Top Bar */}
        <header className="relative flex items-center justify-between px-4 pt-2 pb-1 sm:pt-2.5 sm:pb-1 bg-background">
        {/* Left controls */}
        <div className="-ml-3 flex items-center">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 inline-flex items-center gap-2 h-12 text-sm font-medium text-foreground hover:text-foreground/80 active:text-foreground/60 rounded-lg transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span>Donate</span>
          </a>
        </div>
        {/* Centered title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Suns Reader</h1>
        {/* Right controls */}
        <div className="-mr-3 flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-colors ${
              isRefreshing
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
            }`}
            aria-label="Refresh"
            style={{ touchAction: 'manipulation' }}
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => window.location.href = '/app/settings'}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
            aria-label="Settings"
            style={{ touchAction: 'manipulation' }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
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
              {videosWithWatchedState.map((video, index) => {
                const isLast = index === videosWithWatchedState.length - 1 && !nextPageToken;
                return (
                  <div
                    key={video.id}
                    className={!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}
                  >
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markVideoWatched(video.id)}
                      className="block w-full px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <div className="grid grid-cols-[20px_1fr] gap-2 pointer-events-none">
                        {/* Dot column - centered vertically */}
                        <div className="flex items-center justify-center">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              video.isWatched
                                ? 'bg-transparent border border-zinc-300 dark:border-zinc-600'
                                : 'bg-accent'
                            }`}
                          />
                        </div>
                        {/* Content column: thumbnail + text */}
                        <div className="flex gap-3">
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

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
