'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTrustedDomains, removeTrustedDomain, resetToDefaults } from '../../../lib/trustedDomains';
import {
  getTrustedVideoSources,
  removeTrustedVideoSource,
  resetVideoSourcesToDefaults,
  TrustedVideoSource,
} from '../../../lib/trustedVideoSources';
import { SettingsSection } from '../../../components/settings/SettingsSection';
import { EmptyState } from '../../../components/EmptyState';
import {
  ThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  applyTheme,
} from '../../../lib/theme';
import { markAllAsRead, clearAllReadState } from '../../../lib/readState';
import { SystemToast } from '../../../components/SystemToast';
import { emitAppReady } from '../../../lib/appReady';
import { trackEvent } from '../../../lib/analytics';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [trustedVideoSources, setTrustedVideoSources] = useState<TrustedVideoSource[]>([]);
  const [sourcesTab, setSourcesTab] = useState<'articles' | 'videos'>('articles');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  // UI-only alphabetical sorting (does not mutate storage order)
  const sortedDomains = useMemo(
    () => [...trustedDomains].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [trustedDomains]
  );
  const sortedVideoSources = useMemo(
    () => [...trustedVideoSources].sort((a, b) => a.channelTitle.localeCompare(b.channelTitle, undefined, { sensitivity: 'base' })),
    [trustedVideoSources]
  );
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // Read origin and tab from URL for back navigation
  const fromParam = searchParams.get('from');
  const tabParam = searchParams.get('tab');
  const returnTab = tabParam === 'discovery' ? 'discovery' : 'trusted';

  useEffect(() => {
    setMounted(true);
    setTrustedDomains(getTrustedDomains());
    setTrustedVideoSources(getTrustedVideoSources());
    setThemePreference(getStoredThemePreference());
  }, []);

  // Signal splash overlay after first render (mounted triggers re-render, this effect fires after paint)
  useEffect(() => {
    if (mounted) {
      emitAppReady();
      trackEvent('settings_open', { source: 'nav' });
    }
  }, [mounted]);

  const handleRemove = (domain: string) => {
    removeTrustedDomain(domain);
    setTrustedDomains(getTrustedDomains());
    trackEvent('trusted_remove', { domain });
  };

  const handleResetToDefaults = () => {
    if (sourcesTab === 'articles') {
      resetToDefaults();
      setTrustedDomains(getTrustedDomains());
    } else {
      resetVideoSourcesToDefaults();
      setTrustedVideoSources(getTrustedVideoSources());
    }
  };

  const handleRemoveVideoSource = (channelId: string, channelTitle?: string) => {
    removeTrustedVideoSource(channelId);
    setTrustedVideoSources(getTrustedVideoSources());
    trackEvent('trusted_remove', { channelId, channelTitle });
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
    const basePath = fromParam === 'videos' ? '/app/videos' : '/app';
    router.push(`${basePath}?tab=${returnTab}`);
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2000);
  };

  const handleMarkAllAsRead = () => {
    try {
      const stored = localStorage.getItem('suns-reader-latest-article-ids');
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids) && ids.length > 0) {
          markAllAsRead(ids);
          showToast('Articles Marked as Read');
        }
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkAllAsUnread = () => {
    clearAllReadState();
    showToast('Articles Marked as Unread');
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
      <div className="flex-1 overflow-y-auto overscroll-y-contain pt-4 md:flex md:justify-center">
        <div className="w-full max-w-[420px] md:flex-none" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          {/* Trusted Sources Section */}
          <SettingsSection
            title="Trusted Sources"
            description="Manage which sources appear in your Trusted tab."
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
            {/* Articles / Videos sub-tabs */}
            <div className="flex gap-1 mb-3 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60" style={{ marginLeft: '12px', marginRight: '12px' }}>
              <button
                onClick={() => setSourcesTab('articles')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  sourcesTab === 'articles'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                Articles
              </button>
              <button
                onClick={() => setSourcesTab('videos')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  sourcesTab === 'videos'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                Videos
              </button>
            </div>

            {sourcesTab === 'articles' ? (
              /* Articles trusted sources list */
              trustedDomains.length === 0 ? (
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
                  {sortedDomains.map((domain) => (
                    <div
                      key={domain}
                      className="flex items-center gap-3 h-[44px] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      style={{ paddingLeft: '12px', paddingRight: '12px' }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base text-foreground leading-tight truncate">{domain}</h3>
                      </div>
                      <button
                        onClick={() => handleRemove(domain)}
                        className="shrink-0 text-sm text-red-600 dark:text-red-400 transition-colors"
                        style={{ touchAction: 'manipulation' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Videos trusted sources list */
              trustedVideoSources.length === 0 ? (
                <EmptyState
                  icon="🎬"
                  title="No trusted video sources yet"
                  message={'Add channels from the Videos Discovery tab using "Add to Trusted".'}
                  actionLabel="Go to Discovery"
                  onAction={() => router.push('/app/videos?tab=discovery')}
                />
              ) : (
                <div className="border border-border/30 rounded-lg bg-background overflow-hidden divide-y divide-border/20">
                  {sortedVideoSources.map((source) => (
                    <div
                      key={source.channelId}
                      className="flex items-center gap-3 h-[44px] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      style={{ paddingLeft: '12px', paddingRight: '12px' }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base text-foreground leading-tight truncate">{source.channelTitle}</h3>
                      </div>
                      <button
                        onClick={() => handleRemoveVideoSource(source.channelId, source.channelTitle)}
                        className="shrink-0 text-sm text-red-600 dark:text-red-400 transition-colors"
                        style={{ touchAction: 'manipulation' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection
            title="Appearance"
            description="Choose how Suns Reader looks."
          >
            <div className="border border-border/30 rounded-lg bg-background overflow-hidden divide-y divide-border/20">
              {/* System option */}
              <label
                className="flex items-center gap-3 h-[44px] px-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
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
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="text-base font-medium text-foreground">System</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">(match your device settings)</span>
                </span>
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

          {/* Read Status Section */}
          <SettingsSection
            title="Read Status"
            description="Control the blue dot read indicators. This only affects this device."
            dividerAfter={false}
          >
            <div className="border border-border/30 rounded-lg bg-background overflow-hidden divide-y divide-border/20">
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center w-full h-[44px] px-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-base font-medium text-accent">Mark all as read</span>
              </button>
              <button
                onClick={handleMarkAllAsUnread}
                className="flex items-center w-full h-[44px] px-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-base font-medium text-accent">Mark all as unread</span>
              </button>
            </div>
          </SettingsSection>

          {/* Bottom spacer for scroll breathing room */}
          <div aria-hidden="true" className="h-6 sm:h-8" />
        </div>
      </div>

      {/* Toast */}
      <SystemToast message={toast.message} visible={toast.visible} />
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
