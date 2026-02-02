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
    <div>
      {articles.map((article, index) => {
        const isTrusted = article.sourceDomain ? trustedDomains.includes(article.sourceDomain.toLowerCase()) : false;
        const isLast = index === articles.length - 1;
        const showAction = showAddToTrusted && !isTrusted && article.sourceDomain;

        return (
          <div
            key={article.id}
            className={!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}
          >
            <Link
              href={`/reader?id=${article.id}&tab=${currentTab}`}
              className="block w-full px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
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
                  <div className={`relative mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 ${showAction ? 'pr-24' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{article.source}</span>
                      <span>·</span>
                      <span>{article.timeAgo}</span>
                    </div>
                    {showAction && (
                      <button
                        onClick={(e) => handleAddToTrusted(e, article.sourceDomain!)}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="absolute right-5 top-0 z-10 pointer-events-auto px-4 py-3 -mx-2 -my-2 text-xs font-medium text-accent hover:underline transition-colors"
                        style={{ touchAction: 'manipulation' }}
                      >
                        Add to Trusted
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
