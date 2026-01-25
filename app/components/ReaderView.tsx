'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '../types/article';
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

// Known domains that block reader mode
const KNOWN_BLOCKED_DOMAINS = ['espn.com', 'espn.go.com'];

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

/**
 * Check if the error indicates a known domain blocking
 */
function isKnownBlockedDomain(url: string, error?: string): { isBlocked: boolean; domain: string | null } {
  if (!url) return { isBlocked: false, domain: null };

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const blockedDomain = KNOWN_BLOCKED_DOMAINS.find(domain => hostname.includes(domain));

    if (blockedDomain) {
      // Check if error message confirms blocking
      const errorLower = (error || '').toLowerCase();
      const hasBlockingKeywords = errorLower.includes('blocking') ||
                                   errorLower.includes('blocked') ||
                                   errorLower.includes('may be blocking');

      return { isBlocked: hasBlockingKeywords, domain: blockedDomain };
    }

    return { isBlocked: false, domain: null };
  } catch {
    return { isBlocked: false, domain: null };
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
          className="prose prose-zinc dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-accent prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: extracted.contentHtml }}
        />
      );
    }

    if (extracted?.error) {
      const blockingInfo = isKnownBlockedDomain(
        extracted?.url || publisherUrl || article.url || '',
        extracted.error
      );

      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2 text-foreground">
            {blockingInfo.isBlocked
              ? `${blockingInfo.domain === 'espn.com' ? 'ESPN' : blockingInfo.domain} blocks reader mode`
              : "Reader view isn't available for this link"}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            {blockingInfo.isBlocked
              ? 'This site prevents automated article extraction.'
              : "This article couldn't be formatted for reading."}
          </p>
          {process.env.NODE_ENV === 'development' && !blockingInfo.isBlocked && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
              Error: {extracted.error}
            </p>
          )}
          <p className="text-sm font-medium text-foreground">
            {blockingInfo.isBlocked
              ? 'Tap "Open Original" above to read the full article.'
              : 'Click "Open Original" above to read the full article.'}
          </p>
        </div>
      );
    }

    if (article.body) {
      return (
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <div className="text-base leading-relaxed whitespace-pre-line text-foreground">
            {article.body}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          No content available.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Click "Open Original" above to read the article.
        </p>
      </div>
    );
  };

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
            {normalizeTitle(extracted?.title || article.title, extracted?.siteName || article.source)}
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

        {/* Debug: Show extraction URL (only with ?debug=1) */}
        {debug && article.url && (
          <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs break-words overflow-wrap-anywhere max-w-full">
            <strong>Debug - Extracting from:</strong>{" "}
            <span className="break-all">{article.url}</span>
          </div>
        )}

        {/* Open Original Button - Always visible */}
        {(extracted?.url || publisherUrl || article.url) && (
          <div className="mb-6">
            <a
              href={extracted?.url || publisherUrl || article.url}
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
        {renderContent()}
      </article>
    </div>
  );
}
