/**
 * Google Analytics 4 helpers for Suns Reader.
 *
 * - Loads via next/script in layout.tsx (production only)
 * - All calls are no-ops when gtag is not available (dev, SSR, ad-blockers)
 * - Never throws — analytics must never break the app
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extend Window with gtag global */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type GtagEventParams = Record<string, string | number | boolean | undefined>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safe guard: true only in the browser when gtag is loaded */
function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a custom GA4 event.
 *
 * Safe to call anywhere — silently no-ops if gtag isn't loaded
 * (dev mode, SSR, ad-blockers, etc.).
 *
 * @example
 *   trackEvent('article_open', { publisher: 'azcentral.com' });
 *   trackEvent('video_play', { channel: 'ESPN' });
 */
export function trackEvent(name: string, params?: GtagEventParams): void {
  try {
    if (!isAvailable()) return;
    window.gtag!('event', name, params);
  } catch {
    // Analytics must never break the app
  }
}

/**
 * Manually send a page_view event.
 * Called by the SPA NavigationTracker on route changes.
 */
export function trackPageView(url: string): void {
  try {
    if (!isAvailable()) return;
    window.gtag!('event', 'page_view', {
      page_path: url,
    });
  } catch {
    // Analytics must never break the app
  }
}
