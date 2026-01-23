'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '../types/article';

interface ReaderViewProps {
  article: Article;
  onBack: () => void;
}

interface ExtractedContent {
  success: boolean;
  url: string;
  title?: string;
  byline?: string;
  siteName?: string;
  contentHtml?: string;
  textContent?: string;
  excerpt?: string;
  length?: number;
  error?: string;
}

export function ReaderView({ article, onBack }: ReaderViewProps) {
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExtractedContent = async () => {
      if (!article.url) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/extract?url=${encodeURIComponent(article.url)}`);
        const data = await response.json();
        setExtracted(data);
      } catch (error) {
        console.error('Failed to extract article:', error);
        setExtracted({
          success: false,
          url: article.url,
          error: 'Failed to load article content',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExtractedContent();
  }, [article.url]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 -ml-2 px-2 py-2 min-h-[44px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <svg
            className="w-6 h-6"
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
          <span className="text-base font-medium">Back</span>
        </button>
      </header>

      {/* Article Content */}
      <article className="flex-1 overflow-y-auto px-4 py-6">
        {/* Article Meta - Show immediately */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold leading-tight mb-3 text-foreground">
            {extracted?.title || article.title}
          </h1>

          <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {extracted?.siteName || article.source}
              </span>
              {(extracted?.byline || article.author) && (
                <>
                  <span>•</span>
                  <span>{extracted?.byline || article.author}</span>
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

        {/* Open Original Button - Always visible */}
        {article.url && (
          <div className="mb-6">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity no-underline"
              style={{ touchAction: 'manipulation' }}
            >
              <span>Open Original</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
              <p className="text-zinc-600 dark:text-zinc-400">Loading article...</p>
            </div>
          </div>
        ) : extracted?.success && extracted.contentHtml ? (
          // Success - render extracted content
          <div
            className="prose prose-zinc dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-accent prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: extracted.contentHtml }}
          />
        ) : extracted?.error ? (
          // Failed extraction
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium mb-2 text-foreground">
              Couldn't extract this article
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              {extracted.error}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Click "Open Original" above to read the full article.
            </p>
          </div>
        ) : article.body ? (
          // Fallback to mock article body if available
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <div className="text-base leading-relaxed whitespace-pre-line text-foreground">
              {article.body}
            </div>
          </div>
        ) : (
          // No content available
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No content available.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Click "Open Original" above to read the article.
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
