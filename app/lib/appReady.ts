let fired = false;

/**
 * Dispatch the 'sr:app-ready' event exactly once per page load.
 * Called by each /app page component when its first meaningful
 * paint is complete (data loaded, error shown, or empty state rendered).
 */
export function emitAppReady() {
  if (fired) return;
  fired = true;
  console.log('[Splash] sr:app-ready dispatched');
  window.dispatchEvent(new Event('sr:app-ready'));
}

/**
 * Reset the once-per-load guard so emitAppReady() can fire again.
 * Called by SplashOverlay when re-showing the splash on resume.
 */
export function resetAppReady() {
  fired = false;
}
