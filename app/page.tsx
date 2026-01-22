'use client';

import { useState, useEffect } from 'react';
import { ArticleList } from './components/ArticleList';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { trustedArticles } from './data/mockArticles';
import { Article, ArticleSummary } from './types/article';
import { getRelativeTime, formatDate } from './lib/utils';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'trusted' | 'discovery'>('trusted');
  const [mounted, setMounted] = useState(false);
  const [discoveryArticles, setDiscoveryArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscoveryArticles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search?q=Phoenix+Suns');
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();
      const items: ArticleSummary[] = data.items || [];

      // Convert ArticleSummary to Article format
      const articles: Article[] = items.map((item) => ({
        id: item.id,
        title: item.title,
        source: item.sourceName,
        timeAgo: getRelativeTime(item.publishedAt),
        date: formatDate(item.publishedAt),
        isRead: false,
        url: item.url,
        publishedAt: item.publishedAt,
        sourceDomain: item.sourceDomain,
      }));

      setDiscoveryArticles(articles);
    } catch (err) {
      console.error('Failed to fetch discovery articles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }

    // Fetch discovery articles on mount
    fetchDiscoveryArticles();
  }, []);

  if (!mounted) {
    return null;
  }

  const handleRefresh = () => {
    if (activeTab === 'discovery') {
      fetchDiscoveryArticles();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background z-10">
        <h1 className="text-xl font-semibold">Suns Reader</h1>
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
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border bg-background z-10">
        <button
          onClick={() => setActiveTab('trusted')}
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
          onClick={() => setActiveTab('discovery')}
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
      {activeTab === 'trusted' ? (
        <ArticleList articles={trustedArticles} />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDiscoveryArticles} />
      ) : (
        <ArticleList articles={discoveryArticles} />
      )}
    </div>
  );
}
