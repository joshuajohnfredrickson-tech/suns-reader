'use client';

import { useEffect, useRef } from 'react';
import { resetAppReady, emitAppReady } from '../lib/appReady';

type SplashReason = 'launch' | 'update' | 'resume';

const MIN_DURATION: Record<SplashReason, number> = {
  launch: 400,
  update: 800,
  resume: 400,
};
const MAX_TIMEOUT = 4000;
const FADE_MS = 200;
const RESUME_THRESHOLD_MS = 60_000; // 60 seconds

/**
 * Takes control of the static #sr-splash element injected in layout.tsx,
 * handles dismiss logic (sr:app-ready + min/max durations), and manages
 * the resume overlay for long backgrounding.
 */
export function SplashOverlay() {
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const splash = document.getElementById('sr-splash');
    if (!splash) {
      console.log('[Splash] SplashOverlay mounted — no #sr-splash found, skipping');
      return;
    }

    console.log('[Splash] SplashOverlay taking over #sr-splash');

    // Determine reason: sessionStorage set by SW manager, else 'launch'
    let reason: SplashReason = 'launch';
    try {
      const stored = sessionStorage.getItem('sr:splashReason');
      if (stored === 'update' || stored === 'resume') {
        reason = stored;
      }
      sessionStorage.removeItem('sr:splashReason');
    } catch {}

    const showStartedAt = Date.now();
    let dismissed = false;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      console.log('[Splash] dismissing splash (reason:', reason, 'elapsed:', Date.now() - showStartedAt, 'ms)');
      splash!.style.opacity = '0';
      setTimeout(() => {
        splash!.remove();
      }, FADE_MS);
    }

    function tryDismiss() {
      const elapsed = Date.now() - showStartedAt;
      const remaining = MIN_DURATION[reason] - elapsed;
      if (remaining > 0) {
        setTimeout(dismiss, remaining);
      } else {
        dismiss();
      }
    }

    // Listen for app-ready event
    const handleReady = () => tryDismiss();
    window.addEventListener('sr:app-ready', handleReady);

    // Max timeout failsafe
    const maxTimer = setTimeout(dismiss, MAX_TIMEOUT);

    // --- Resume logic via visibility API ---
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current) {
        const hiddenDuration = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;

        if (hiddenDuration >= RESUME_THRESHOLD_MS && dismissed) {
          // Re-show splash for resume
          showResumeSplash();
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // If already hidden on mount, seed the timestamp
    if (document.visibilityState === 'hidden') {
      hiddenAtRef.current = Date.now();
    }

    return () => {
      window.removeEventListener('sr:app-ready', handleReady);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(maxTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showResumeSplash() {
    // Don't re-create if one already exists
    if (document.getElementById('sr-splash')) return;

    // Reset the guard and immediately signal ready since content is already rendered
    resetAppReady();

    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#000000' : '#ffffff';
    const fg = isDark ? '#ededed' : '#171717';

    const d = document.createElement('div');
    d.id = 'sr-splash';
    d.setAttribute('role', 'status');
    d.setAttribute('aria-label', 'Loading Suns Reader');
    d.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};pointer-events:auto;transition:opacity ${FADE_MS}ms ease-out;`;
    d.innerHTML =
      `<img src="/icons/icon-192.png" alt="" width="72" height="72" style="border-radius:16px;margin-bottom:16px;">` +
      `<div style="font-size:20px;font-weight:600;color:${fg};margin-bottom:24px;font-family:var(--font-inter),-apple-system,BlinkMacSystemFont,sans-serif;">Suns Reader</div>` +
      `<div style="width:24px;height:24px;border:2px solid ${fg};border-top-color:transparent;border-radius:50%;animation:sr-spin 0.8s linear infinite;"></div>`;
    document.body.appendChild(d);

    const resumeStart = Date.now();
    let resumeDismissed = false;

    const handleReady = () => tryDismissResume();

    function dismissResume() {
      if (resumeDismissed) return;
      resumeDismissed = true;
      d.style.opacity = '0';
      setTimeout(() => d.remove(), FADE_MS);
      window.removeEventListener('sr:app-ready', handleReady);
      clearTimeout(maxTimer);
    }

    function tryDismissResume() {
      const elapsed = Date.now() - resumeStart;
      const remaining = MIN_DURATION.resume - elapsed;
      if (remaining > 0) {
        setTimeout(dismissResume, remaining);
      } else {
        dismissResume();
      }
    }

    window.addEventListener('sr:app-ready', handleReady, { once: true });

    // Max timeout failsafe
    const maxTimer = setTimeout(dismissResume, MAX_TIMEOUT);

    // Content is already rendered behind the splash, so signal ready immediately.
    // This ensures the splash respects minDuration then dismisses.
    emitAppReady();
  }

  return null;
}
