'use client';

import { useState, useEffect } from 'react';
import { ArticleList } from './components/ArticleList';

const trustedArticles = [
  { id: '1', title: 'Breaking: Major Climate Agreement Reached at Summit', source: 'Reuters', timeAgo: '2h ago', isRead: false },
  { id: '2', title: 'Tech Giants Announce New AI Safety Initiative', source: 'The Verge', timeAgo: '3h ago', isRead: false },
  { id: '3', title: 'Global Markets Rally on Economic Growth Data', source: 'Financial Times', timeAgo: '4h ago', isRead: true },
  { id: '4', title: 'Scientists Discover New Treatment for Rare Disease', source: 'Nature', timeAgo: '5h ago', isRead: true },
  { id: '5', title: 'International Space Station Mission Extended', source: 'NASA', timeAgo: '6h ago', isRead: false },
  { id: '6', title: 'Renewable Energy Surpasses Coal in Power Generation', source: 'Bloomberg', timeAgo: '7h ago', isRead: true },
];

const discoveryArticles = [
  { id: '7', title: 'How Modern Architecture Is Reshaping Cities', source: 'Architectural Digest', timeAgo: '1h ago', isRead: false },
  { id: '8', title: 'The Rise of Plant-Based Cuisine Around the World', source: 'Food & Wine', timeAgo: '2h ago', isRead: false },
  { id: '9', title: 'Exploring Ancient Ruins: New Archaeological Findings', source: 'National Geographic', timeAgo: '3h ago', isRead: false },
  { id: '10', title: 'The Future of Electric Vehicles in Urban Planning', source: 'Wired', timeAgo: '4h ago', isRead: true },
  { id: '11', title: 'Mental Health Awareness: A Growing Priority', source: 'Psychology Today', timeAgo: '5h ago', isRead: false },
  { id: '12', title: 'Art and Technology: The Digital Renaissance', source: 'The Atlantic', timeAgo: '6h ago', isRead: true },
];

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
