'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleList } from './ArticleList';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { Article, ArticleSummary } from '../types/article';
import { getRelativeTime, formatDate, normalizeTitle } from '../lib/utils';
import { getTrustedDomains, addTrustedDomain } from '../lib/trustedDomains';
import { purgeExpiredReadState, getReadStateForArticles } from '../lib/readState';

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
  return (
    <div className="mx-4 my-2 p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs font-mono text-red-200">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-red-400">Debug Info</span>
        <button
          onClick={onCopy}
          className="px-2 py-1 bg-red-800/50 hover:bg-red-700/50 rounded text-red-200 transition-colors"
        >
          Copy debug
        </button>
      </div>
      <div className="space-y-1 break-all">
        <div><span className="text-red-400">Time:</span> {debug.timestamp}</div>
        <div><span className="text-red-400">URL:</span> {debug.url}</div>
        <div><span className="text-red-400">UA:</span> {debug.userAgent.slice(0, 80)}...</div>
        <div><span className="text-red-400">Health:</span> {debug.healthStatus} {debug.healthResponse ? `- ${debug.healthResponse}` : ''}</div>
        <div><span className="text-red-400">Search URL:</span> {debug.searchUrl}</div>
        <div><span className="text-red-400">Search Status:</span> {debug.searchStatus ?? 'N/A'}</div>
        <div><span className="text-red-400">Content-Type:</span> {debug.searchContentType ?? 'N/A'}</div>
        <div><span className="text-red-400">Items:</span> {debug.itemCount}</div>
        {debug.searchError && <div><span className="text-red-400">Error:</span> {debug.searchError}</div>}
        {debug.searchResponsePreview && <div><span className="text-red-400">Response:</span> {debug.searchResponsePreview}</div>}
      </div>
    </div>
  );
}

// Toast component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 min-w-[320px] px-12 py-8 bg-zinc-900 dark:bg-zinc-800 text-white text-xl leading-relaxed font-medium rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out ${
        visible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-90 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-center gap-4 px-1">
        <svg
          className="w-8 h-8 text-green-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>{message}</span>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readVersion, setReadVersion] = useState(0);
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
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
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
      if (debug) debug.itemCount = items.length;

      // Show debug if no items (only in debug mode)
      if (debug && items.length === 0) {
        debug.searchError = 'Empty response (0 items)';
        debug.searchResponsePreview = JSON.stringify(data).slice(0, 300);
        setDebugInfo(debug);
      }

      setArticleSummaries(items);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      if (debug) {
        debug.searchError = debug.searchError || (err instanceof Error ? err.message : 'Unknown error');
        setDebugInfo(debug);
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    setMounted(true);

    // Load active tab from URL query param
    const tabParam = searchParams.get('tab');
    if (tabParam === 'discovery' || tabParam === 'trusted') {
      setActiveTab(tabParam);
    }

    // Load trusted domains
    setTrustedDomains(getTrustedDomains());

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

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('readStateChanged', handleReadStateChange);

    // Fetch articles on mount
    fetchArticles();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('readStateChanged', handleReadStateChange);
    };
  }, [searchParams, fetchArticles]);

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

  const handleRefresh = () => {
    fetchArticles();
  };

  const handleTabChange = (tab: 'trusted' | 'discovery') => {
    setActiveTab(tab);
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="relative flex items-center justify-between px-4 pt-4 pb-2 sm:pt-5 sm:pb-2 bg-background z-10">
        {/* Empty spacer for centering */}
        <div className="w-28" />
        {/* Centered title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Suns Reader</h1>
        {/* Right-aligned buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-colors ${
              loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
            }`}
            aria-label="Refresh"
            style={{ touchAction: 'manipulation' }}
          >
            <svg
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
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
      <nav className="flex border-b border-border bg-background z-10">
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

      {/* Debug Panel - only shows when ?debug=1 is in URL and there's debug info */}
      {debugMode && debugInfo && <DebugPanel debug={debugInfo} onCopy={copyDebugInfo} />}

      {/* Article List */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchArticles} />
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

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
