'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleList } from './ArticleList';
import { ContentColumn } from './ContentColumn';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { Article, ArticleSummary } from '../types/article';
import { getRelativeTime, formatDate, normalizeTitle } from '../lib/utils';
import { getTrustedDomains, addTrustedDomain } from '../lib/trustedDomains';
import { purgeExpiredReadState, getReadStateForArticles } from '../lib/readState';
import { SystemToast } from './SystemToast';

// Feed cache constants
const FEED_CACHE_KEY = 'suns-reader-feed-cache';
const FEED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Debug info type
interface DebugInfo {
  timestamp: string;
  url: string;
  userAgent: string;
  searchUrl: string;
  searchStatus: number | null;
  searchContentType: string | null;
  searchError: string | null;
  searchResponsePreview: string | null;
  itemCount: number;
  healthStatus: string;
  healthResponse: string | null;
}

// Debug panel component
function DebugPanel({ debug, onCopy }: { debug: DebugInfo; onCopy: () => void }) {
  const hasError = !!debug.searchError;

  // Style variants based on error state
  const bgClass = hasError ? 'bg-red-950/50 border-red-800/50' : 'bg-green-950/50 border-green-800/50';
  const labelClass = hasError ? 'text-red-400' : 'text-green-400';
  const textClass = hasError ? 'text-red-200' : 'text-green-200';
  const buttonClass = hasError ? 'bg-red-800/50 hover:bg-red-700/50 text-red-200' : 'bg-green-800/50 hover:bg-green-700/50 text-green-200';

  return (
    <div className={`mx-4 my-2 p-3 border rounded-lg text-xs font-mono ${bgClass} ${textClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${labelClass}`}>
          {hasError ? 'Debug Info (Error)' : 'Debug Info (OK)'}
        </span>
        <button
          onClick={onCopy}
          className={`px-2 py-1 rounded transition-colors ${buttonClass}`}
        >
          Copy debug
        </button>
      </div>
      <div className="space-y-1 break-all">
        <div><span className={labelClass}>Time:</span> {debug.timestamp}</div>
        <div><span className={labelClass}>URL:</span> {debug.url}</div>
        <div><span className={labelClass}>UA:</span> {debug.userAgent.slice(0, 80)}...</div>
        <div><span className={labelClass}>Health:</span> {debug.healthStatus}</div>
        <div><span className={labelClass}>Search:</span> {debug.searchStatus ?? 'N/A'} · {debug.itemCount} items</div>
        {hasError && (
          <>
            <div><span className={labelClass}>Error:</span> {debug.searchError}</div>
            {debug.searchResponsePreview && <div><span className={labelClass}>Response:</span> {debug.searchResponsePreview}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';
  const [activeTab, setActiveTab] = useState<'trusted' | 'discovery'>('trusted');
  const [mounted, setMounted] = useState(false);
  const [articleSummaries, setArticleSummaries] = useState<ArticleSummary[]>([]);
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isExplicitRefresh, setIsExplicitRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readVersion, setReadVersion] = useState(0);
  const hasFetchedRef = useRef(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fetchArticles = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    setDebugInfo(null);

    // Only collect debug info when debug mode is enabled
    const debug: DebugInfo | null = debugMode ? {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      searchUrl: '',
      searchStatus: null,
      searchContentType: null,
      searchError: null,
      searchResponsePreview: null,
      itemCount: 0,
      healthStatus: 'pending',
      healthResponse: null,
    } : null;

    // Check health endpoint only in debug mode
    if (debug) {
      try {
        const healthRes = await fetch('/api/health');
        debug.healthStatus = healthRes.ok ? 'ok' : `error:${healthRes.status}`;
        const healthData = await healthRes.json();
        debug.healthResponse = JSON.stringify(healthData).slice(0, 100);
      } catch (healthErr) {
        debug.healthStatus = `failed:${healthErr instanceof Error ? healthErr.message : 'unknown'}`;
      }
    }

    try {
      // Add cache-buster to force fresh fetch on every refresh
      const cacheBust = Date.now();
      const searchUrl = `/api/search?q=Phoenix+Suns&cb=${cacheBust}`;
      if (debug) debug.searchUrl = searchUrl;

      const response = await fetch(searchUrl, {
        cache: 'no-store',
      });

      if (debug) {
        debug.searchStatus = response.status;
        debug.searchContentType = response.headers.get('content-type');
      }

      if (!response.ok) {
        const text = await response.text();
        if (debug) {
          debug.searchResponsePreview = text.slice(0, 300);
          debug.searchError = `HTTP ${response.status}`;
          setDebugInfo(debug);
        }
        throw new Error('Failed to fetch articles');
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        if (debug) {
          debug.searchError = `JSON parse failed: ${parseErr instanceof Error ? parseErr.message : 'unknown'}`;
          debug.searchResponsePreview = text.slice(0, 300);
          setDebugInfo(debug);
        }
        throw new Error('Failed to parse response');
      }

      const items: ArticleSummary[] = data.items || [];
      if (debug) {
        debug.itemCount = items.length;

        // Mark as error if no items
        if (items.length === 0) {
          debug.searchError = 'Empty response (0 items)';
          debug.searchResponsePreview = JSON.stringify(data).slice(0, 300);
        }

        // Always set debug info in debug mode (shows healthy state too)
        setDebugInfo(debug);
      }

      setArticleSummaries(items);

      // Cache articles to sessionStorage for instant back-navigation
      try {
        sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({
          ts: Date.now(),
          articles: items,
        }));
      } catch (e) {
        // Ignore storage errors (quota, etc.)
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      if (debug) {
        debug.searchError = debug.searchError || (err instanceof Error ? err.message : 'Unknown error');
        setDebugInfo(debug);
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsFetching(false);
      // Note: isExplicitRefresh is reset by handleRefresh after min spin duration
    }
  }, [debugMode]);

  const handleAddToTrusted = useCallback((domain: string) => {
    addTrustedDomain(domain);
    setTrustedDomains(getTrustedDomains());
    showToast('Added to Trusted');
  }, [showToast]);

  const copyDebugInfo = useCallback(() => {
    if (debugInfo) {
      const text = `Debug Info (${debugInfo.timestamp})
URL: ${debugInfo.url}
UserAgent: ${debugInfo.userAgent}
Health: ${debugInfo.healthStatus} ${debugInfo.healthResponse || ''}
Search URL: ${debugInfo.searchUrl}
Search Status: ${debugInfo.searchStatus}
Content-Type: ${debugInfo.searchContentType}
Items: ${debugInfo.itemCount}
Error: ${debugInfo.searchError || 'none'}
Response Preview: ${debugInfo.searchResponsePreview || 'none'}`;
      navigator.clipboard.writeText(text);
      showToast('Debug copied');
    }
  }, [debugInfo, showToast]);

  // Effect 1: Handle tab param from URL (view state only, no fetch)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'discovery' || tabParam === 'trusted') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Effect 2: Always rehydrate trustedDomains from localStorage on mount
  // This ensures fresh data when returning from Settings page
  useEffect(() => {
    setTrustedDomains(getTrustedDomains());
  }, []);

  // Effect 3: One-time initialization and initial data fetch
  useEffect(() => {
    setMounted(true);

    // Purge expired read state (older than 24 hours)
    purgeExpiredReadState();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }

    // Listen for storage events (read state changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'suns-reader-read-state') {
        setReadVersion(v => v + 1);
      }
    };

    // Listen for custom read state change event
    const handleReadStateChange = () => {
      setReadVersion(v => v + 1);
    };

    // Listen for trusted domains change event
    const handleTrustedDomainsChange = () => {
      setTrustedDomains(getTrustedDomains());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('readStateChanged', handleReadStateChange);
    window.addEventListener('trustedDomainsChanged', handleTrustedDomainsChange);

    // Try to rehydrate from sessionStorage cache for instant back-navigation
    let hasCachedData = false;
    try {
      const cached = sessionStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        const { ts, articles } = JSON.parse(cached);
        if (Date.now() - ts < FEED_CACHE_TTL && articles?.length > 0) {
          setArticleSummaries(articles);
          hasCachedData = true;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Fetch articles only on initial cold start (once), skip if we have valid cache
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      if (!hasCachedData) {
        fetchArticles();
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('readStateChanged', handleReadStateChange);
      window.removeEventListener('trustedDomainsChanged', handleTrustedDomainsChange);
    };
  }, [fetchArticles]);

  // Derive articles with read state - recomputes when readVersion changes
  const allArticles = useMemo(() => {
    const articleIds = articleSummaries.map(item => item.id);
    const readStateMap = getReadStateForArticles(articleIds);

    return articleSummaries.map((item) => {
      // Normalize title by removing trailing site name suffix (display-only)
      const cleanTitle = normalizeTitle(item.title, item.sourceName);

      return {
        id: item.id,
        title: cleanTitle,
        source: item.sourceName,
        timeAgo: getRelativeTime(item.publishedAt),
        date: formatDate(item.publishedAt),
        isRead: readStateMap[item.id] || false,
        url: item.url,
        publishedAt: item.publishedAt,
        sourceDomain: item.sourceDomain,
      };
    });
  }, [articleSummaries, readVersion]);

  // Derive trusted articles - recomputes when articles or trustedDomains change
  const trustedArticles = useMemo(() => {
    return allArticles.filter(article =>
      article.sourceDomain && trustedDomains.includes(article.sourceDomain.toLowerCase())
    );
  }, [allArticles, trustedDomains]);

  // Derive discovery articles - exclude trusted sources for disjoint tabs
  const discoveryArticles = useMemo(() => {
    return allArticles.filter(article =>
      // Keep articles with no domain (don't accidentally drop them)
      // OR articles whose domain is NOT in the trusted list
      !article.sourceDomain || !trustedDomains.includes(article.sourceDomain.toLowerCase())
    );
  }, [allArticles, trustedDomains]);

  if (!mounted) {
    return null;
  }

  const handleRefresh = async () => {
    setIsExplicitRefresh(true);
    const minSpinDuration = new Promise(resolve => setTimeout(resolve, 400));
    await Promise.all([fetchArticles(), minSpinDuration]);
    setIsExplicitRefresh(false);
    showToast('Updated Just Now');
  };

  const handleTabChange = (tab: 'trusted' | 'discovery') => {
    setActiveTab(tab);
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground">
      {/* Header wrapper - static, outside scroll container */}
      <div className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        {/* Top Bar */}
        <header className="relative flex items-center justify-between px-4 pt-4 pb-2 sm:pt-5 sm:pb-2 bg-background">
        {/* Empty spacer for centering */}
        <div className="w-28" />
        {/* Centered title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Suns Reader</h1>
        {/* Right-aligned buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className={`p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-colors ${
              isFetching
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
            }`}
            aria-label="Refresh"
            style={{ touchAction: 'manipulation' }}
          >
            <svg
              className={`w-5 h-5 ${isExplicitRefresh ? 'animate-spin' : ''}`}
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
            onClick={() => window.location.href = '/sources'}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
            aria-label="Manage Sources"
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
            className={`flex-1 px-4 py-3.5 min-h-[44px] text-base font-medium transition-colors ${
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
            className={`flex-1 px-4 py-3.5 min-h-[44px] text-base font-medium transition-colors ${
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

      {/* Debug Panel - only shows when ?debug=1 is in URL and there's debug info */}
      {debugMode && debugInfo && <DebugPanel debug={debugInfo} onCopy={copyDebugInfo} />}

      {/* Article List - full-width scroll container with centered content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <ContentColumn>
          {/* Only show full LoadingState on cold start (no data yet) */}
          {isFetching && articleSummaries.length === 0 ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={handleRefresh} />
          ) : activeTab === 'trusted' ? (
            trustedArticles.length > 0 ? (
              <ArticleList articles={trustedArticles} showAddToTrusted={false} onAddToTrusted={handleAddToTrusted} trustedDomains={trustedDomains} />
            ) : trustedDomains.length === 0 ? (
              <EmptyState
                title="No Trusted Sources Yet"
                message="Add sources from the Discovery tab to see articles from trusted sites here."
                actionLabel="Go to Discovery"
                onAction={() => handleTabChange('discovery')}
              />
            ) : (
              <EmptyState
                title="No Articles Found"
                message="No articles from trusted sources in the last 24 hours."
                actionLabel="Go to Discovery"
                onAction={() => handleTabChange('discovery')}
              />
            )
          ) : (
            <ArticleList articles={discoveryArticles} showAddToTrusted={true} onAddToTrusted={handleAddToTrusted} trustedDomains={trustedDomains} />
          )}
        </ContentColumn>
      </div>

      {/* Toast */}
      <SystemToast message={toast.message} visible={toast.visible} />
    </div>
  );
}
