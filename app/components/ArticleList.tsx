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

        return (
          <div key={article.id}>
            <Link
              href={`/reader?id=${article.id}&tab=${currentTab}`}
              className={`block w-full px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline ${!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-start gap-3 pointer-events-none">
                <div
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                    article.isRead
                      ? 'bg-transparent border border-zinc-300 dark:border-zinc-600'
                      : 'bg-accent'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium leading-normal text-foreground">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{article.source}</span>
                    <span>·</span>
                    <span>{article.timeAgo}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Add to Trusted button (Discovery tab only) - aligned with title column */}
            {showAddToTrusted && !isTrusted && article.sourceDomain && (
              <div className="pl-4 pb-3 pointer-events-auto border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="ml-5.5" style={{ marginLeft: '22px' }}>
                  <button
                    onClick={(e) => handleAddToTrusted(e, article.sourceDomain!)}
                    className="text-xs text-accent hover:underline font-medium py-1"
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
  );
}
