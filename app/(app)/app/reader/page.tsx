'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ReaderView } from '../../../components/ReaderView';
import { Suspense, useEffect, useState } from 'react';
import { Article } from '../../../types/article';
import { markAsRead } from '../../../lib/readState';
import { emitAppReady } from '../../../lib/appReady';

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');
  const articleUrl = searchParams.get('url');
  const tab = searchParams.get('tab') || 'trusted';
  const debug = searchParams.get('debug') === '1';
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Log reader load for debugging
    try {
      const urlHost = articleUrl ? new URL(articleUrl).hostname : 'none';
      console.log('[READER] load', { hasId: !!articleId, hasUrl: !!articleUrl, urlHost });
    } catch {
      console.log('[READER] load', { hasId: !!articleId, hasUrl: !!articleUrl, urlHost: 'invalid' });
    }

    // Mark as read immediately (preserves feed dot behavior)
    if (articleId) {
      markAsRead(articleId);
    }

    if (articleUrl) {
      // Primary path: construct article from URL param and render directly.
      // No /api/search re-fetch needed — ReaderView handles extraction.

      // Restore click metadata from sessionStorage for instant header rendering
      let title = '';
      let source = '';
      let date = '';
      let timeAgo = '';
      if (articleId) {
        try {
          const raw = sessionStorage.getItem(`sr:clicked:${articleId}`);
          if (raw) {
            const meta = JSON.parse(raw);
            const CLICK_META_TTL = 30 * 60 * 1000; // 30 minutes
            if (meta.ts && Date.now() - meta.ts < CLICK_META_TTL) {
              title = meta.title || '';
              source = meta.source || '';
              date = meta.date || '';
              timeAgo = meta.timeAgo || '';
            }
            // Clean up after use
            sessionStorage.removeItem(`sr:clicked:${articleId}`);
          }
        } catch {
          // Silently ignore storage errors
        }
      }

      setArticle({
        id: articleId || '',
        title,
        source,
        timeAgo,
        date,
        isRead: true,
        url: articleUrl,
      });
    } else {
      // No URL provided — likely a stale/bookmarked link
      console.log('[READER] missing url', { id: articleId });
    }

    setLoading(false);
  }, [articleId, articleUrl]);

  // Signal splash overlay that first meaningful paint is ready
  useEffect(() => {
    if (!loading) {
      emitAppReady();
    }
  }, [loading]);

  const handleBack = () => {
    router.push(`/app?tab=${tab}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">This link has expired</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4 text-sm">
            Go back and tap the article again.
          </p>
          <button
            onClick={handleBack}
            className="text-accent hover:underline"
            style={{ touchAction: 'manipulation' }}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return <ReaderView article={article} onBack={handleBack} debug={debug} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
