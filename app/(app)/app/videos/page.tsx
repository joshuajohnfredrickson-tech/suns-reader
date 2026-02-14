'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentColumn } from '../../../components/ContentColumn';
import { VideoList } from '../../../components/VideoList';
import { EmptyState } from '../../../components/EmptyState';
import { markVideoWatched, getWatchedStateForVideos, purgeExpiredVideoWatchedState } from '../../../lib/videoWatchedState';
import {
  getTrustedChannelIdSet,
  trustedVideoSourcesExist,
  seedTrustedVideoSources,
  addTrustedVideoSource,
} from '../../../lib/trustedVideoSources';
import { BottomTabBar } from '../../../components/BottomTabBar';
import { emitAppReady } from '../../../lib/appReady';
import { VideoPlayerModal } from '../../../components/VideoPlayerModal';
import { SystemToast } from '../../../components/SystemToast';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  isWatched?: boolean;
}

const CLIENT_TIMEOUT_MS = 10_000;
const DONATE_URL = 'https://buymeacoffee.com/sunsreader';

// Auto-fetch: accumulate pages until we have enough trusted matches
const MIN_TRUSTED_MATCHES = 20;
const MAX_PAGES = 3;

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
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    }>
      <VideosPageInner />
    </Suspense>
  );
}

function VideosPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'trusted' | 'discovery'>('trusted');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [watchedVersion, setWatchedVersion] = useState(0);
  const [trustedChannelIds, setTrustedChannelIds] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string; url: string } | null>(null);
  const [toast, setToast] = useState({ message: '', visible: false });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSeededRef = useRef(false);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 1500);
  }, []);

  // Rehydrate trusted channel IDs from localStorage
  const rehydrateTrustedChannelIds = useCallback(() => {
    setTrustedChannelIds(getTrustedChannelIdSet());
  }, []);

  /**
   * Single-page fetch used by refresh and manual "Load more".
   * Sets state immediately (replaces full list on refresh).
   */
  const fetchVideos = useCallback(async (options?: { forceRefresh?: boolean }) => {
    try {
      const url = options?.forceRefresh ? '/api/videos?refresh=1' : '/api/videos';
      const res = await fetchWithTimeout(url, CLIENT_TIMEOUT_MS);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      const fetched: Video[] = data.videos ?? [];
      setVideos(fetched);
      setNextPageToken(data.nextPageToken ?? null);
      setError(null);
      return fetched;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Videos took too long to load. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      }
      return [];
    }
  }, []);

  /**
   * Initial load: accumulate up to MAX_PAGES pages before setting state.
   * Stops early when we have >= MIN_TRUSTED_MATCHES trusted videos
   * or when there is no nextPageToken.
   * Returns the accumulated video array.
   */
  const fetchInitialVideos = useCallback(async () => {
    let accumulated: Video[] = [];
    let token: string | undefined;
    let lastToken: string | null = null;

    // Resolve trusted set for counting (may be empty on very first run,
    // but seedTrustedVideoSources runs after so the first page always loads).
    const trustedSet = getTrustedChannelIdSet();

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = token
          ? `/api/videos?pageToken=${encodeURIComponent(token)}`
          : '/api/videos';
        const res = await fetchWithTimeout(url, CLIENT_TIMEOUT_MS);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Server error (${res.status})`);
        }
        const data = await res.json();
        const pageVideos: Video[] = data.videos ?? [];

        // Dedupe against accumulated set
        const seenIds = new Set(accumulated.map(v => v.id));
        const unique = pageVideos.filter(v => v.id && !seenIds.has(v.id));
        accumulated = [...accumulated, ...unique];

        lastToken = data.nextPageToken ?? null;
        token = lastToken ?? undefined;

        // Count trusted matches so far
        const trustedCount = accumulated.filter(v => trustedSet.has(v.channelId)).length;
        if (trustedCount >= MIN_TRUSTED_MATCHES || !token) break;
      } catch (err) {
        // If any page fails, stop accumulating but keep what we have
        if (page === 0) {
          // First page failure is a hard error
          if (err instanceof DOMException && err.name === 'AbortError') {
            setError('Videos took too long to load. Please try again.');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load videos');
          }
          return [];
        }
        // Subsequent page failures: just stop, use what we have
        break;
      }
    }

    // Set state once with all accumulated results
    setVideos(accumulated);
    setNextPageToken(lastToken);
    setError(null);
    return accumulated;
  }, []);

  useEffect(() => {
    setMounted(true);
    purgeExpiredVideoWatchedState();

    // Hydrate trusted sources
    rehydrateTrustedChannelIds();

    async function initialFetch() {
      const fetched = await fetchInitialVideos();
      // Seed defaults on first run only (key does not exist yet)
      if (!hasSeededRef.current && !trustedVideoSourcesExist() && fetched.length > 0) {
        hasSeededRef.current = true;
        seedTrustedVideoSources(fetched);
        rehydrateTrustedChannelIds();
      }
      setIsFetching(false);
    }
    initialFetch();
  }, [fetchInitialVideos, rehydrateTrustedChannelIds]);

  // Handle tab param from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'discovery' || tabParam === 'trusted') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'trusted' | 'discovery') => {
    setActiveTab(tab);
    router.push(`/app/videos?tab=${tab}`, { scroll: false });
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const minSpinDuration = new Promise(resolve => setTimeout(resolve, 400));
    await Promise.all([fetchVideos({ forceRefresh: true }), minSpinDuration]);
    setIsRefreshing(false);
    showToast('Updated Just Now');
  }, [isRefreshing, fetchVideos, showToast]);

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

  const handleAddToTrusted = useCallback((channelId: string, channelTitle: string) => {
    addTrustedVideoSource(channelId, channelTitle);
    rehydrateTrustedChannelIds();
    showToast('Added to Trusted');
  }, [showToast, rehydrateTrustedChannelIds]);

  // Listen for watched state changes (same-tab + cross-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'suns-reader-video-watched-state') {
        setWatchedVersion(v => v + 1);
      }
      if (e.key === 'sr:trustedVideoSources:v1') {
        rehydrateTrustedChannelIds();
      }
    };
    const handleWatchedStateChange = () => {
      setWatchedVersion(v => v + 1);
    };
    const handleTrustedVideoSourcesChange = () => {
      rehydrateTrustedChannelIds();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('videoWatchedStateChanged', handleWatchedStateChange);
    window.addEventListener('trustedVideoSourcesChanged', handleTrustedVideoSourcesChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('videoWatchedStateChanged', handleWatchedStateChange);
      window.removeEventListener('trustedVideoSourcesChanged', handleTrustedVideoSourcesChange);
    };
  }, [rehydrateTrustedChannelIds]);

  // Signal splash overlay that first meaningful paint is ready
  useEffect(() => {
    if (mounted && !isFetching) {
      emitAppReady();
    }
  }, [mounted, isFetching]);

  // Derive videos with watched state attached
  const videosWithWatchedState = useMemo(() => {
    if (videos.length === 0) return videos;
    const ids = videos.map(v => v.id);
    const watchedMap = getWatchedStateForVideos(ids);
    return videos.map(v => ({ ...v, isWatched: watchedMap[v.id] || false }));
  }, [videos, watchedVersion]);

  // Split into trusted / discovery
  const trustedVideos = useMemo(() => {
    return videosWithWatchedState.filter(v => trustedChannelIds.has(v.channelId));
  }, [videosWithWatchedState, trustedChannelIds]);

  const discoveryVideos = useMemo(() => {
    return videosWithWatchedState.filter(v => !v.channelId || !trustedChannelIds.has(v.channelId));
  }, [videosWithWatchedState, trustedChannelIds]);

  const handleVideoClick = useCallback((video: Video) => {
    markVideoWatched(video.id);
    setSelectedVideo({ id: video.id, title: video.title, url: video.url });
  }, []);

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
            onClick={() => router.push(`/app/settings?from=videos&tab=${activeTab}`)}
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

        {/* Tabs */}
        <nav className="flex border-b border-border bg-background">
          <button
            onClick={() => handleTabChange('trusted')}
            className={`flex-1 px-4 py-2.5 min-h-[44px] text-base font-medium transition-colors ${
              activeTab === 'trusted'
                ? 'text-accent border-b-2 border-accent'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            Trusted
          </button>
          <button
            onClick={() => handleTabChange('discovery')}
            className={`flex-1 px-4 py-2.5 min-h-[44px] text-base font-medium transition-colors ${
              activeTab === 'discovery'
                ? 'text-accent border-b-2 border-accent'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            Discovery
          </button>
        </nav>
      </div>

      {/* Video list - full-width scroll container with centered content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
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
          ) : activeTab === 'trusted' ? (
            trustedVideos.length > 0 ? (
              <div>
                <VideoList
                  videos={trustedVideos}
                  showAddToTrusted={false}
                  trustedChannelIds={trustedChannelIds}
                  onVideoClick={handleVideoClick}
                />
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
                ) : trustedVideos.length > 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    No more videos
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon="🎬"
                title="No trusted videos right now"
                message="Switch to Discovery to browse and add sources you like."
                actionLabel="Browse Discovery"
                onAction={() => handleTabChange('discovery')}
              />
            )
          ) : (
            <div>
              <VideoList
                videos={discoveryVideos}
                showAddToTrusted={true}
                onAddToTrusted={handleAddToTrusted}
                trustedChannelIds={trustedChannelIds}
                onVideoClick={handleVideoClick}
              />
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
              ) : discoveryVideos.length > 0 ? (
                <div className="px-4 py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  No more videos
                </div>
              ) : null}
            </div>
          )}
        </ContentColumn>
      </div>

      {/* Video player modal */}
      {selectedVideo && (
        <VideoPlayerModal
          videoId={selectedVideo.id}
          title={selectedVideo.title}
          youtubeUrl={selectedVideo.url}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Toast */}
      <SystemToast message={toast.message} visible={toast.visible} />

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
