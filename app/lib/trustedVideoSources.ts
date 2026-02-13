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
 * Seed trusted video sources on first run.
 * Starts with all DEFAULT_VIDEO_SOURCES (hardcoded channelIds), then
 * updates display names for any channels that appeared in fetched results
 * (API titles are fresher). This guarantees all 13 defaults are always
 * present regardless of how many pages were fetched.
 * Only call this when the storage key does not exist yet.
 */
export function seedTrustedVideoSources(
  videos: { channelId: string; channelTitle: string }[]
): TrustedVideoSource[] {
  // Build a map of channelId → freshest channelTitle from fetched results
  const fetchedTitles = new Map<string, string>();
  for (const video of videos) {
    if (video.channelId && !fetchedTitles.has(video.channelId)) {
      fetchedTitles.set(video.channelId, video.channelTitle);
    }
  }

  // Start from the full canonical list, updating titles where we have fresher data
  const sources: TrustedVideoSource[] = DEFAULT_VIDEO_SOURCES.map(def => ({
    channelId: def.channelId,
    channelTitle: fetchedTitles.get(def.channelId) ?? def.channelTitle,
  }));

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
