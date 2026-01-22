'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTrustedDomains, removeTrustedDomain } from '../lib/trustedDomains';

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

  const handleBack = () => {
    router.back();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 -ml-2 px-2 py-2 min-h-[44px] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors"
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
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2 text-foreground">Trusted Sources</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Manage which news sources appear in your Trusted tab.
        </p>

        {trustedDomains.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📰</div>
            <p className="text-zinc-600 dark:text-zinc-400">
              No trusted sources yet. Add sources from the Discovery tab.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trustedDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{domain}</h3>
                </div>
                <button
                  onClick={() => handleRemove(domain)}
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
  );
}
