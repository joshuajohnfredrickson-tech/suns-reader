import React from 'react';
import Link from 'next/link';
import { Article } from '../types/article';

interface ArticleListProps {
  articles: Article[];
}

export function ArticleList({ articles }: ArticleListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={`/reader?id=${article.id}`}
          className="block w-full border-b border-border px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors no-underline"
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
      ))}
    </div>
  );
}
