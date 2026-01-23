'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleList } from './ArticleList';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { Article, ArticleSummary } from '../types/article';
import { getRelativeTime, formatDate } from '../lib/utils';
import { getTrustedDomains, addTrustedDomain } from '../lib/trustedDomains';
import { purgeExpiredReadState, getReadStateForArticles } from '../lib/readState';

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'trusted' | 'discovery'>('trusted');
  const [mounted, setMounted] = useState(false);
  const [articleSummaries, setArticleSummaries] = useState<ArticleSummary[]>([]);
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [readVersion, setReadVersion] = useState(0);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search?q=Phoenix+Suns');
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();
      const items: ArticleSummary[] = data.items || [];

      setArticleSummaries(items);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTrusted = (domain: string) => {
    addTrustedDomain(domain);
    setTrustedDomains(getTrustedDomains());
  };

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
  }, [searchParams]);

  // Derive articles with read state - recomputes when readVersion changes
  const allArticles = useMemo(() => {
    const articleIds = articleSummaries.map(item => item.id);
    const readStateMap = getReadStateForArticles(articleIds);

    return articleSummaries.map((item) => {
      // Remove " - Source" suffix from title if it matches the sourceName
      let cleanTitle = item.title;
      const sourceSuffix = ` - ${item.sourceName}`;
      if (cleanTitle.endsWith(sourceSuffix)) {
        cleanTitle = cleanTitle.slice(0, -sourceSuffix.length);
      }

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

  const discoveryArticles = allArticles;

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
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background z-10">
        <h1 className="text-xl font-semibold">Suns Reader</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
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
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
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
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
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
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'discovery'
              ? 'text-accent border-b-2 border-accent'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          Discovery
        </button>
      </nav>

      {/* Article List */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchArticles} />
      ) : activeTab === 'trusted' ? (
        trustedArticles.length > 0 ? (
          <ArticleList articles={trustedArticles} showAddToTrusted={false} onAddToTrusted={handleAddToTrusted} trustedDomains={trustedDomains} lastRefreshed={lastRefreshed} />
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
        <ArticleList articles={discoveryArticles} showAddToTrusted={true} onAddToTrusted={handleAddToTrusted} trustedDomains={trustedDomains} lastRefreshed={lastRefreshed} />
      )}
    </div>
  );
}
