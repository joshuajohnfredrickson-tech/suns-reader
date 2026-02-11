'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface VideoPlayerModalProps {
  videoId: string;
  title?: string;
  youtubeUrl?: string;
  onClose: () => void;
}

export function VideoPlayerModal({ videoId, title, youtubeUrl, onClose }: VideoPlayerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const openInYouTube = () => {
    const url = youtubeUrl || `https://youtu.be/${videoId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Safe area top padding */}
      <div className="shrink-0 pt-[env(safe-area-inset-top)]" />

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1">
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          aria-label="Close video"
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title (optional, truncated) */}
        {title && (
          <h2 className="flex-1 mx-2 text-sm font-medium truncate text-center">
            {title}
          </h2>
        )}

        {/* Open in YouTube */}
        <button
          onClick={openInYouTube}
          className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          aria-label="Open in YouTube"
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>

      {/* Player area — constrained so it fits in landscape too */}
      <div className="shrink-0 px-4 pt-2">
        <div
          className="relative w-full max-h-[calc(100dvh-100px)]"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title={title || 'Video player'}
          />
        </div>
      </div>

      {/* Safe area bottom padding */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />
    </div>
  );

  // Portal to document.body so the overlay escapes parent overflow/transform contexts
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
