'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ReaderView } from '../../../components/ReaderView';
import { trustedArticles } from '../../../data/mockArticles';
import { Suspense, useEffect, useState } from 'react';
import { Article } from '../../../types/article';
import { getRelativeTime, formatDate } from '../../../lib/utils';
import { markAsRead } from '../../../lib/readState';

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');
  const tab = searchParams.get('tab') || 'trusted';
  const debug = searchParams.get('debug') === '1';
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      // First, try to find in mock trusted articles
      const mockArticle = trustedArticles.find(a => a.id === articleId);
      if (mockArticle) {
        setArticle(mockArticle);
        setLoading(false);
        // Mark as read immediately when article is loaded
        if (articleId) {
          markAsRead(articleId);
        }
        return;
      }

      // If not found in mock, try to fetch from discovery articles
      try {
        const response = await fetch('/api/search?q=Phoenix+Suns');
        if (response.ok) {
          const data = await response.json();
          const items = data.items || [];

          // Find the article in the fetched items
          const foundItem = items.find((item: any) => item.id === articleId);
          if (foundItem) {
            setArticle({
              id: foundItem.id,
              title: foundItem.title,
              source: foundItem.sourceName,
              timeAgo: getRelativeTime(foundItem.publishedAt),
              date: formatDate(foundItem.publishedAt),
              isRead: false,
              url: foundItem.url,
              publishedAt: foundItem.publishedAt,
              sourceDomain: foundItem.sourceDomain,
            });
            // Mark as read immediately when article is loaded
            markAsRead(foundItem.id);
          }
        }
      } catch (error) {
        console.error('Failed to load article:', error);
      }

      setLoading(false);
    };

    loadArticle();
  }, [articleId]);

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
          <h1 className="text-xl font-semibold mb-2">Article not found</h1>
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
