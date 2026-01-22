import React from 'react';
import { Article } from '../types/article';

interface ReaderViewProps {
  article: Article;
  onBack: () => void;
}

export function ReaderView({ article, onBack }: ReaderViewProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          aria-label="Back"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-xl font-semibold truncate">Reader</h1>
      </header>

      {/* Article Content */}
      <article className="flex-1 overflow-y-auto px-4 py-6">
        {/* Article Meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold leading-tight mb-3 text-foreground">
            {article.title}
          </h1>

          <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{article.source}</span>
              {article.author && (
                <>
                  <span>•</span>
                  <span>{article.author}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>{article.date}</span>
              <span>•</span>
              <span>{article.timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-6" />

        {/* Article Body */}
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <div className="text-base leading-relaxed whitespace-pre-line text-foreground">
            {article.body}
          </div>
        </div>
      </article>
    </div>
  );
}
