import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Article } from '../types/article';

interface ArticleListProps {
  articles: Article[];
  showAddToTrusted?: boolean;
  onAddToTrusted?: (domain: string) => void;
  trustedDomains?: string[];
}

export function ArticleList({ articles, showAddToTrusted = false, onAddToTrusted, trustedDomains = [] }: ArticleListProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'trusted';

  const handleAddToTrusted = (e: React.MouseEvent, domain: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToTrusted) {
      onAddToTrusted(domain);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {articles.map((article, index) => {
        const isTrusted = article.sourceDomain ? trustedDomains.includes(article.sourceDomain.toLowerCase()) : false;
        const isLast = index === articles.length - 1;
        const showPill = showAddToTrusted && !isTrusted && article.sourceDomain;

        return (
          <div
            key={article.id}
            className={`relative ${!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}`}
          >
            <Link
              href={`/reader?id=${article.id}&tab=${currentTab}`}
              className="block w-full px-4 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
              style={{ touchAction: 'manipulation' }}
            >
              {/* 2-column grid: dot column + content column */}
              <div className="grid grid-cols-[20px_1fr] gap-2 pointer-events-none">
                {/* Dot column - centered vertically */}
                <div className="flex items-center justify-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      article.isRead
                        ? 'bg-transparent border border-zinc-300 dark:border-zinc-600'
                        : 'bg-accent'
                    }`}
                  />
                </div>
                {/* Content column: title + metadata */}
                <div className="min-w-0">
                  <h3 className="text-base font-medium leading-snug text-foreground">
                    {article.title}
                  </h3>
                  <div className={`flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 ${showPill ? 'pr-20' : ''}`}>
                    <span>{article.source}</span>
                    <span>·</span>
                    <span>{article.timeAgo}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Compact "+ Trusted" pill button - positioned at bottom-right of row */}
            {showPill && (
              <button
                onClick={(e) => handleAddToTrusted(e, article.sourceDomain!)}
                className="absolute right-4 bottom-5 inline-flex items-center justify-center h-7 px-2.5 text-xs font-medium leading-none rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                + Trusted
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
