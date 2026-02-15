'use client';

import { trackEvent } from '../lib/analytics';

const SUPPORT_URL = 'https://buymeacoffee.com/sunsreader';

export function SupportCta({ location }: { location: string }) {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('donate_click', { location })}
      className="inline-flex items-center gap-2 text-accent font-medium hover:underline transition-colors"
    >
      <span>Support Suns Reader</span>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
