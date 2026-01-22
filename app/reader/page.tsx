'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ReaderView } from '../components/ReaderView';
import { trustedArticles, discoveryArticles } from '../data/mockArticles';
import { Suspense } from 'react';

function ReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get('id');

  // Find article in both lists
  const allArticles = [...trustedArticles, ...discoveryArticles];
  const article = allArticles.find(a => a.id === articleId);

  const handleBack = () => {
    router.back();
  };

  if (!article) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Article not found</h1>
          <button
            onClick={handleBack}
            className="text-accent hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return <ReaderView article={article} onBack={handleBack} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
