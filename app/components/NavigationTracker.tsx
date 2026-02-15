'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/app/lib/analytics';

/**
 * Tracks SPA page navigations as GA4 page_view events.
 *
 * Must be rendered inside a <Suspense> boundary because
 * useSearchParams() requires it in Next.js App Router.
 */
export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}
