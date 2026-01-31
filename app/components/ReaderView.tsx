'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '../types/article';
import { ContentColumn } from './ContentColumn';
import { resolvePublisherUrl } from '../lib/resolvePublisherUrl';
import { normalizeTitle } from '../lib/utils';

interface ReaderViewProps {
  article: Article;
  onBack: () => void;
  debug?: boolean;
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

/**
 * Check if URL is a Google News wrapper URL
 */
function isGoogleNewsUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('news.google.com');
  } catch {
    return false;
  }
}

export function ReaderView({ article, onBack, debug = false }: ReaderViewProps) {
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading article...');
  const [publisherUrl, setPublisherUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchExtractedContent = async () => {
      if (!article.url) {
        setLoading(false);
        return;
      }

      try {
        const isGoogleNews = isGoogleNewsUrl(article.url);

        // Step 1: If Google News URL, MUST resolve first
        if (isGoogleNews) {
          setLoadingMessage('Resolving article URL...');
          const resolved = await resolvePublisherUrl(article.url);

          if (resolved) {
            setPublisherUrl(resolved);
            console.log('[ReaderView] Resolved publisher URL:', resolved);

            // Step 2: Extract article content using the resolved URL
            setLoadingMessage('Loading article...');
            const response = await fetch(`/api/extract?url=${encodeURIComponent(resolved)}`);
            const data = await response.json();
            setExtracted(data);
          } else {
            // Resolution failed - DO NOT call /api/extract with wrapper URL
            console.error('[ReaderView] Failed to resolve Google News URL');
            setPublisherUrl(article.url);
            setExtracted({
              success: false,
              url: article.url,
              error: 'Could not resolve publisher URL',
            });
          }
        } else {
          // Not a Google News URL - extract directly
          setPublisherUrl(article.url);
          setLoadingMessage('Loading article...');
          const response = await fetch(`/api/extract?url=${encodeURIComponent(article.url)}`);
          const data = await response.json();
          setExtracted(data);
        }
      } catch (error) {
        console.error('Failed to extract article:', error);
        setExtracted({
          success: false,
          url: article.url,
          error: 'Failed to load article content',
        });
        setPublisherUrl(article.url);
      } finally {
        setLoading(false);
      }
    };

    fetchExtractedContent();
  }, [article.url]);

  // Compute content node to avoid complex nested ternaries
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">{loadingMessage}</p>
          </div>
        </div>
      );
    }

    if (extracted?.success && extracted.contentHtml) {
      return (
        <div
          className="reader-content text-base sm:text-lg leading-8 text-foreground"
          dangerouslySetInnerHTML={{ __html: extracted.contentHtml }}
        />
      );
    }

    // Unified failure state - no technical distinctions exposed to users
    if (extracted?.error) {
      const failureUrl = extracted?.url || publisherUrl || article.url;

      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2 text-foreground">
            Reader mode isn't available for this article.
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Some sources don't support simplified views.
          </p>
          {/* Dev-only: show raw error for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-6">
              Debug: {extracted.error}
            </p>
          )}
          {/* Inline CTA - intentional redundancy with header button */}
          {failureUrl && (
            <a
              href={failureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="font-medium">Open original article</span>
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
          )}
        </div>
      );
    }

    if (article.body) {
      // Normalize newlines (Windows -> Unix)
      const normalizedBody = article.body.replace(/\r\n/g, '\n');

      // Check for paragraph breaks (double newlines)
      if (normalizedBody.includes('\n\n')) {
        const paragraphs = normalizedBody
          .split('\n\n')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);

        return (
          <div className="text-base sm:text-lg leading-8 text-foreground">
            {paragraphs.map((paragraph: string, index: number) => (
              <p key={index} className="mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        );
      }

      // Check for single newlines (treat each line as a paragraph for breathing room)
      if (normalizedBody.includes('\n')) {
        const lines = normalizedBody
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

        return (
          <div className="text-base sm:text-lg leading-8 text-foreground">
            {lines.map((line: string, index: number) => (
              <p key={index} className="mb-6">
                {line}
              </p>
            ))}
          </div>
        );
      }

      // No newlines at all - use sentence-splitting heuristic to create paragraphs
      // Split on sentence boundaries (period/exclamation/question followed by space and capital letter)
      const sentences = normalizedBody.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s: string) => s.trim().length > 0);

      if (sentences.length > 3) {
        // Group sentences into paragraphs of 2-4 sentences each
        const paragraphs: string[] = [];
        for (let i = 0; i < sentences.length; i += 3) {
          const group = sentences.slice(i, i + 3).join(' ');
          if (group.trim()) {
            paragraphs.push(group.trim());
          }
        }

        return (
          <div className="text-base sm:text-lg leading-8 text-foreground">
            {paragraphs.map((paragraph: string, index: number) => (
              <p key={index} className="mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        );
      }

      // Very short text or couldn't split - render as single block with improved line-height
      return (
        <div className="text-base sm:text-lg leading-8 text-foreground">
          {normalizedBody}
        </div>
      );
    }

    // Fallback: no extracted content and no article.body
    const fallbackUrl = extracted?.url || publisherUrl || article.url;

    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2 text-foreground">
          Reader mode isn't available for this article.
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Some sources don't support simplified views.
        </p>
        {fallbackUrl && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ touchAction: 'manipulation' }}
          >
            <span className="font-medium">Open original article</span>
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
        )}
      </div>
    );
  };

  const originalUrl = extracted?.url || publisherUrl || article.url;

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground">
      {/* Header wrapper - static, outside scroll container */}
      <div className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 sm:py-5 border-b border-border bg-background">
          <button
            onClick={onBack}
            className="flex items-center gap-2 -ml-2 px-3 py-3 min-h-[48px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
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

          {/* Open Original - text link style */}
          {originalUrl && (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-3 min-h-[48px] min-w-[48px] text-accent hover:underline transition-colors no-underline"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-base font-medium">Open Original</span>
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </header>
      </div>

      {/* Article Content - scroll container for contained scrolling */}
      <article className="flex-1 overflow-y-auto overscroll-y-contain py-6 sm:py-8">
        <ContentColumn className="px-4 sm:px-6">
          {/* Article Meta Header Block */}
          <div className="pt-4 pb-6 mb-8">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-semibold leading-snug mb-5 text-foreground">
              {normalizeTitle(extracted?.title || article.title, extracted?.siteName || article.source)}
            </h1>

            {/* Source + author line */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {extracted?.siteName || article.source}
              </span>
              {(extracted?.byline || article.author) && (
                <>
                  <span>·</span>
                  <span>{extracted?.byline || article.author}</span>
                </>
              )}
            </div>

            {/* Date/time stamp */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{article.date}</span>
              <span>·</span>
              <span>{article.timeAgo}</span>
            </div>
          </div>

          {/* Debug: Show extraction URL (only with ?debug=1) */}
          {debug && article.url && (
            <div className="mb-8 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs break-words overflow-wrap-anywhere max-w-full">
              <strong>Debug - Extracting from:</strong>{" "}
              <span className="break-all">{article.url}</span>
            </div>
          )}

          {/* Content Area */}
          {renderContent()}
        </ContentColumn>
      </article>
    </div>
  );
}
