/**
 * Local storage utilities for managing video watched state
 */

const STORAGE_KEY = 'suns-reader-video-watched-state';
const WATCHED_STATE_EXPIRY_HOURS = 24;

interface WatchedStateMap {
  [videoId: string]: number; // Unix timestamp when watched
}

/**
 * Get all watched state entries from localStorage
 */
function getWatchedStateMap(): WatchedStateMap {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Failed to get video watched state:', error);
    return {};
  }
}

/**
 * Save watched state map to localStorage
 */
function saveWatchedStateMap(watchedState: WatchedStateMap): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedState));
  } catch (error) {
    console.error('Failed to save video watched state:', error);
  }
}

/**
 * Purge watched entries older than expiry window
 */
export function purgeExpiredVideoWatchedState(): void {
  if (typeof window === 'undefined') return;

  try {
    const watchedState = getWatchedStateMap();
    const now = Date.now();
    const expiryMs = WATCHED_STATE_EXPIRY_HOURS * 60 * 60 * 1000;

    const filtered: WatchedStateMap = {};
    let purgedCount = 0;

    for (const [id, timestamp] of Object.entries(watchedState)) {
      if (now - timestamp < expiryMs) {
        filtered[id] = timestamp;
      } else {
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[VideoWatchedState] Purged ${purgedCount} expired watched entries`);
      saveWatchedStateMap(filtered);
    }
  } catch (error) {
    console.error('Failed to purge video watched state:', error);
  }
}

/**
 * Mark a video as watched
 */
export function markVideoWatched(videoId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const watchedState = getWatchedStateMap();
    watchedState[videoId] = Date.now();
    saveWatchedStateMap(watchedState);

    // Dispatch event so UI updates immediately
    window.dispatchEvent(new Event('videoWatchedStateChanged'));
  } catch (error) {
    console.error('Failed to mark video as watched:', error);
  }
}

/**
 * Get watched state for multiple videos
 */
export function getWatchedStateForVideos(videoIds: string[]): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const watchedState = getWatchedStateMap();
    const result: Record<string, boolean> = {};

    for (const id of videoIds) {
      result[id] = id in watchedState;
    }

    return result;
  } catch (error) {
    console.error('Failed to get watched state for videos:', error);
    return {};
  }
}
