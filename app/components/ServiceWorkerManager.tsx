'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker globally, checks for updates periodically,
 * detects waiting workers and prompts them to activate, and auto-reloads
 * once when a new version takes control.
 *
 * Mounted in app/layout.tsx so it runs on all routes.
 */
export function ServiceWorkerManager() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // Clear the reload guard so it's single-use per SW transition.
    // On a fresh page load (after the reload), this resets the guard
    // so the next deploy can trigger another reload.
    sessionStorage.removeItem('sw-reloaded');

    let updateInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * If a SW is in the waiting state, tell it to skipWaiting so it
     * activates immediately instead of waiting for all tabs to close.
     */
    function promptSkipWaiting(waiting: ServiceWorker) {
      console.log('[SWM] Waiting worker found, posting SKIP_WAITING');
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    /**
     * Watch a registration for a newly installed (waiting) worker.
     * Covers both the case where a worker is already waiting at
     * registration time, and when one arrives later via update.
     */
    function watchForWaiting(registration: ServiceWorkerRegistration) {
      // Already waiting — activate it now
      if (registration.waiting) {
        promptSkipWaiting(registration.waiting);
      }

      // Listen for future updates
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        console.log('[SWM] New service worker installing');

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            if (registration.waiting) {
              console.log('[SWM] New service worker installed and waiting');
              promptSkipWaiting(registration.waiting);
            }
          }
          if (installing.state === 'activated') {
            console.log('[SWM] New service worker activated');
          }
        });
      });
    }

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SWM] Service worker registered');

        // Watch for waiting workers
        watchForWaiting(registration);

        // Check for updates immediately
        registration.update().catch(() => {});

        // Poll for updates every 30 minutes
        updateInterval = setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[SWM] Service worker registration failed:', error);
      });

    // When a new SW takes control, reload once to pick up new assets
    const handleControllerChange = () => {
      if (!sessionStorage.getItem('sw-reloaded')) {
        sessionStorage.setItem('sw-reloaded', '1');
        sessionStorage.setItem('sr:splashReason', 'update');
        console.log('[SWM] Controller changed, reloading page');
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      if (updateInterval) clearInterval(updateInterval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
