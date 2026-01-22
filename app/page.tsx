'use client';

import { useState, useEffect } from 'react';
import { ArticleList } from './components/ArticleList';
import { trustedArticles, discoveryArticles } from './data/mockArticles';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'trusted' | 'discovery'>('trusted');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, []);

  if (!mounted) {
    return null;
  }

  const handleRefresh = () => {
    // No-op for now
    console.log('Refresh clicked');
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Suns Reader</h1>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          aria-label="Refresh"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border bg-background sticky top-[57px] z-10">
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
      <ArticleList
        articles={activeTab === 'trusted' ? trustedArticles : discoveryArticles}
      />
    </div>
  );
}
