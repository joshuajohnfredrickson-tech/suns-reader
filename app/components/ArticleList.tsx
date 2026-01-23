import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Article } from '../types/article';

interface ArticleListProps {
  articles: Article[];
  showAddToTrusted?: boolean;
  onAddToTrusted?: (domain: string) => void;
  trustedDomains?: string[];
  lastRefreshed?: Date | null;
}

export function ArticleList({ articles, showAddToTrusted = false, onAddToTrusted, trustedDomains = [], lastRefreshed }: ArticleListProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'trusted';

  const handleAddToTrusted = (e: React.MouseEvent, domain: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToTrusted) {
      onAddToTrusted(domain);
    }
  };

  const formatRefreshTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {lastRefreshed && (
        <div className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400 border-b border-border">
          Last refreshed: {formatRefreshTime(lastRefreshed)}
        </div>
      )}
      {articles.map((article) => {
        const isTrusted = article.sourceDomain ? trustedDomains.includes(article.sourceDomain.toLowerCase()) : false;

        return (
          <div key={article.id} className="border-b border-border">
            <Link
              href={`/reader?id=${article.id}&tab=${currentTab}`}
              className="block w-full px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-start gap-3 pointer-events-none">
                <div
                  className={`mt-2 h-2 w-2 rounded-full flex-shrink-0 ${
                    article.isRead
                      ? 'bg-transparent border border-zinc-300 dark:border-zinc-600'
                      : 'bg-accent'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium leading-snug mb-1 text-foreground">
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

            {/* Add to Trusted button (Discovery tab only) */}
            {showAddToTrusted && !isTrusted && article.sourceDomain && (
              <div className="px-4 pb-3 pointer-events-auto">
                <button
                  onClick={(e) => handleAddToTrusted(e, article.sourceDomain!)}
                  className="text-xs text-accent hover:underline font-medium"
                  style={{ touchAction: 'manipulation' }}
                >
                  + Add {article.sourceDomain} to Trusted
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
