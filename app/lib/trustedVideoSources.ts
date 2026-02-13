/**
 * Local storage utilities for managing trusted video sources (YouTube channels).
 * Membership is based on channelId (stable), not channelTitle (display-only).
 */

const STORAGE_KEY = 'sr:trustedVideoSources:v1';
const DIRTY_FLAG_KEY = 'trustedVideoSourcesDirty';

export interface TrustedVideoSource {
  channelId: string;
  channelTitle: string;
}

/**
 * Channel titles to seed as defaults on first run.
 * Matched case-insensitively and trimmed against fetched video results.
 */
const DEFAULT_CHANNEL_TITLES = [
  'Arizona Sports',
  'Phoenix Suns',
  'KDUS AM 1060- Arizona\'s Sports Alternative',
  'PHNX Sports',
  'Locked On Suns',
  'NBA',
  'Sports Illustrated',
  'ESPN',
  'Suns Valley Podcast',
  'Suns Digest',
  'Gametime Highlights',
  'The Timeline: A Phoenix Suns Podcast',
  'NBA on NBC',
];

/**
 * Canonical default video sources with pre-resolved YouTube channelIds.
 * Used by resetVideoSourcesToDefaults() so Settings can reset without
 * needing access to the video feed.
 * channelIds are stable and permanent for YouTube channels.
 */
export const DEFAULT_VIDEO_SOURCES: TrustedVideoSource[] = [
  { channelId: 'UCJlZfS5D-i4r_LlR-m7LPUA', channelTitle: 'Arizona Sports' },
  { channelId: 'UCLxlWVVHz2a8SdCfxzVXzQw', channelTitle: 'Phoenix Suns' },
  { channelId: 'UC8hoXLfuV6IEFRcgp94-zJg', channelTitle: "KDUS AM 1060- Arizona's Sports Alternative" },
  { channelId: 'UCKaPEqS_Mc6eGNNBQN1QgQw', channelTitle: 'PHNX Sports' },
  { channelId: 'UCBzL8XS_08NDMTlDwwVWEWA', channelTitle: 'Locked On Suns' },
  { channelId: 'UCWJ2lWNubArHWmf3FIHbfcQ', channelTitle: 'NBA' },
  { channelId: 'UCPAt6z5uX_c5Eo_cSNROzYw', channelTitle: 'Sports Illustrated' },
  { channelId: 'UCiWLfSweyRNmLpgEHekhoAg', channelTitle: 'ESPN' },
  { channelId: 'UCNBkf-jAT-w2_fPYB8w7AFw', channelTitle: 'Suns Valley Podcast' },
  { channelId: 'UCj5cTz2c5ItOD9pWUThM_Cg', channelTitle: 'Suns Digest' },
  { channelId: 'UC0LrZO9wORIqn_aRJtKdgfA', channelTitle: 'GAMETIME HIGHLIGHTS' },
  { channelId: 'UCMEoavphn3GBkUbSWrQ-CNA', channelTitle: 'The Timeline: A Phoenix Suns Channel' },
  { channelId: 'UCFw3-5NBx1XJTaF0TPcK8iQ', channelTitle: 'NBA on NBC' },
];

/**
 * Get trusted video sources from localStorage.
 * Returns empty array if key doesn't exist (caller handles seeding).
 */
export function getTrustedVideoSources(): TrustedVideoSource[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch (error) {
    console.error('Failed to get trusted video sources:', error);
    return [];
  }
}

/**
 * Check whether the trusted video sources key exists in localStorage.
 */
export function trustedVideoSourcesExist(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Build default trusted sources by matching fetched videos against DEFAULT_CHANNEL_TITLES.
 * Only call this when the storage key does not exist yet.
 */
export function seedTrustedVideoSources(
  videos: { channelId: string; channelTitle: string }[]
): TrustedVideoSource[] {
  const normalizedDefaults = DEFAULT_CHANNEL_TITLES.map(t => t.toLowerCase().trim());
  const seen = new Set<string>();
  const sources: TrustedVideoSource[] = [];

  for (const video of videos) {
    if (!video.channelId || seen.has(video.channelId)) continue;
    const normalizedTitle = (video.channelTitle ?? '').toLowerCase().trim();
    if (normalizedDefaults.includes(normalizedTitle)) {
      seen.add(video.channelId);
      sources.push({ channelId: video.channelId, channelTitle: video.channelTitle });
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (error) {
    console.error('Failed to seed trusted video sources:', error);
  }

  return sources;
}

/**
 * Add a channel to trusted video sources.
 */
export function addTrustedVideoSource(channelId: string, channelTitle: string): void {
  if (typeof window === 'undefined') return;

  try {
    const sources = getTrustedVideoSources();
    if (sources.some(s => s.channelId === channelId)) return;

    sources.push({ channelId, channelTitle });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
    window.dispatchEvent(new Event('trustedVideoSourcesChanged'));
  } catch (error) {
    console.error('Failed to add trusted video source:', error);
  }
}

/**
 * Remove a channel from trusted video sources.
 */
export function removeTrustedVideoSource(channelId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const sources = getTrustedVideoSources();
    const filtered = sources.filter(s => s.channelId !== channelId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
    window.dispatchEvent(new Event('trustedVideoSourcesChanged'));
  } catch (error) {
    console.error('Failed to remove trusted video source:', error);
  }
}

/**
 * Get a Set of trusted channelIds for fast membership checks.
 */
export function getTrustedChannelIdSet(): Set<string> {
  return new Set(getTrustedVideoSources().map(s => s.channelId));
}

/**
 * Reset trusted video sources to the canonical defaults.
 */
export function resetVideoSourcesToDefaults(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VIDEO_SOURCES));
    sessionStorage.setItem(DIRTY_FLAG_KEY, '1');
    window.dispatchEvent(new Event('trustedVideoSourcesChanged'));
  } catch (error) {
    console.error('Failed to reset video sources to defaults:', error);
  }
}
