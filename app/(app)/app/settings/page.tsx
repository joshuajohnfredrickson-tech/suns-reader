'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTrustedDomains, removeTrustedDomain, resetToDefaults } from '../../../lib/trustedDomains';
import { SettingsSection } from '../../../components/settings/SettingsSection';
import {
  ThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  applyTheme,
} from '../../../lib/theme';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  // Read tab from URL, default to 'trusted' if missing or invalid
  const tabParam = searchParams.get('tab');
  const returnTab = tabParam === 'discovery' ? 'discovery' : 'trusted';

  useEffect(() => {
    setMounted(true);
    setTrustedDomains(getTrustedDomains());
    setThemePreference(getStoredThemePreference());
  }, []);

  const handleRemove = (domain: string) => {
    removeTrustedDomain(domain);
    setTrustedDomains(getTrustedDomains());
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    setTrustedDomains(getTrustedDomains());
  };

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference);
    setStoredThemePreference(preference);
    applyTheme(preference);

    // Debug logging (temporary)
    console.log('[Theme Debug]', {
      preference,
      htmlClassName: document.documentElement.className,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
    });
  };

  const handleBack = () => {
    router.push(`/app?tab=${returnTab}`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background text-foreground">
      {/* Header wrapper - static, outside scroll container */}
      <div className="shrink-0 bg-background pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-2.5 sm:py-3 border-b border-border bg-background">
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
      </div>

      {/* Content - scroll container for contained scrolling */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain py-4 md:flex md:justify-center">
        <div className="w-full max-w-[420px] md:flex-none" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          {/* Trusted Sources Section */}
          <SettingsSection
            title="Trusted Sources"
            description="Manage which news sources appear in your Trusted tab."
            headerAction={
              <button
                onClick={handleResetToDefaults}
                className="flex items-center justify-center h-[44px] pl-3 pr-0 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                Reset to Defaults
              </button>
            }
          >
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
                    className="flex items-center justify-between h-[44px] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    style={{ paddingLeft: '12px', paddingRight: '12px' }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base text-foreground leading-tight truncate">{domain}</h3>
                    </div>
                    <button
                      onClick={() => handleRemove(domain)}
                      className="text-sm text-red-600 dark:text-red-400 transition-colors"
                      style={{ touchAction: 'manipulation' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection
            title="Appearance"
            description="Choose how Suns Reader looks."
            dividerAfter={false}
          >
            <div className="border border-border/30 rounded-lg bg-background overflow-hidden divide-y divide-border/20">
              {/* System option */}
              <label
                className="flex items-center gap-3 min-h-[44px] py-2.5 px-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <input
                  type="radio"
                  name="theme"
                  value="system"
                  checked={themePreference === 'system'}
                  onChange={() => handleThemeChange('system')}
                  className="w-4 h-4 text-accent accent-accent"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-foreground">System</span>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Match your device settings</p>
                </div>
              </label>

              {/* Light option */}
              <label
                className="flex items-center gap-3 h-[44px] px-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={themePreference === 'light'}
                  onChange={() => handleThemeChange('light')}
                  className="w-4 h-4 text-accent accent-accent"
                />
                <span className="text-base font-medium text-foreground">Light</span>
              </label>

              {/* Dark option */}
              <label
                className="flex items-center gap-3 h-[44px] px-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={themePreference === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                  className="w-4 h-4 text-accent accent-accent"
                />
                <span className="text-base font-medium text-foreground">Dark</span>
              </label>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
