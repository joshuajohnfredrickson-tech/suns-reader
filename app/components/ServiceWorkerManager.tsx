'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker globally, checks for updates periodically,
 * and auto-reloads once when a new version takes control.
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

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SWM] Service worker registered');

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
