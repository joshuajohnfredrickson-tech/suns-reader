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
    <div className="flex-1 overflow-y-auto debug-marker">
      {/* TEMP DEBUG LABEL */}
      <div className="debug-label" style={{ margin: '8px 16px' }}>DEBUG: ArticleList.tsx ACTIVE</div>

      <div className="py-4">
        {articles.map((article, index) => {
          const isTrusted = article.sourceDomain ? trustedDomains.includes(article.sourceDomain.toLowerCase()) : false;
          const isLast = index === articles.length - 1;

          return (
            <div key={article.id} className={`${!isLast ? 'mb-6' : ''}`}>
              <Link
                href={`/reader?id=${article.id}&tab=${currentTab}`}
                className="block w-full px-4 py-8 sm:py-10 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline border-b border-zinc-200/40 dark:border-zinc-800/40"
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start gap-5 pointer-events-none">
                  <div
                    className={`h-3 w-3 rounded-full flex-shrink-0 mt-1.5 ${
                      article.isRead
                        ? 'bg-transparent border-2 border-zinc-300 dark:border-zinc-600'
                        : 'bg-accent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium leading-snug mb-4 text-foreground">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{article.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Add to Trusted button (Discovery tab only) - aligned with title column */}
              {showAddToTrusted && !isTrusted && article.sourceDomain && (
                <div className="pl-4 pt-4 pointer-events-auto">
                  <div className="pl-8">
                    <button
                      onClick={(e) => handleAddToTrusted(e, article.sourceDomain!)}
                      className="text-sm text-accent hover:underline font-medium"
                      style={{ touchAction: 'manipulation' }}
                    >
                      + Add {article.sourceDomain} to Trusted
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
