'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTrustedDomains, removeTrustedDomain, resetToDefaults } from '../lib/trustedDomains';

export default function SourcesPage() {
  const router = useRouter();
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrustedDomains(getTrustedDomains());
  }, []);

  const handleRemove = (domain: string) => {
    removeTrustedDomain(domain);
    setTrustedDomains(getTrustedDomains());
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    setTrustedDomains(getTrustedDomains());
  };


  const handleBack = () => {
    router.back();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-4 sm:py-5 border-b border-border bg-background z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 -ml-2 px-3 py-3 min-h-[48px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-base font-medium">Back</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="mx-auto w-full max-w-[420px]" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          <div className="flex items-center justify-between mb-3 px-4">
            <h1 className="text-2xl font-bold text-foreground">Trusted Sources</h1>
            <button
              onClick={handleResetToDefaults}
              className="flex items-center justify-center h-[44px] px-3 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors shrink-0"
              style={{ touchAction: 'manipulation' }}
            >
              Reset to Defaults
            </button>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 px-4">
            Manage which news sources appear in your Trusted tab.
          </p>

          {trustedDomains.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-6">📰</div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                No trusted sources yet.
              </p>
              <button
                onClick={handleResetToDefaults}
                className="px-6 py-4 min-h-[48px] bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
                style={{ touchAction: 'manipulation' }}
              >
                Load Default Sources
              </button>
            </div>
          ) : (
            <div className="border border-border/30 rounded-lg bg-background overflow-hidden divide-y divide-border/20">
              {trustedDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between h-[48px] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="pl-4 flex-1 min-w-0">
                    <h3 className="font-medium text-base text-foreground leading-tight truncate">{domain}</h3>
                  </div>
                  <button
                    onClick={() => handleRemove(domain)}
                    className="flex items-center justify-center h-[44px] pr-4 pl-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
