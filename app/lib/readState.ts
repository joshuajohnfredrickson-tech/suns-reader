/**
 * Local storage utilities for managing read state
 */

const STORAGE_KEY = 'suns-reader-read-state';
const READ_STATE_EXPIRY_HOURS = 24;

interface ReadStateMap {
  [articleId: string]: number; // Unix timestamp when read
}

/**
 * Get all read state entries from localStorage
 */
function getReadStateMap(): ReadStateMap {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  } catch (error) {
    console.error('Failed to get read state:', error);
    return {};
  }
}

/**
 * Save read state map to localStorage
 */
function saveReadStateMap(readState: ReadStateMap): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readState));
  } catch (error) {
    console.error('Failed to save read state:', error);
  }
}

/**
 * Purge read entries older than 24 hours
 */
export function purgeExpiredReadState(): void {
  if (typeof window === 'undefined') return;

  try {
    const readState = getReadStateMap();
    const now = Date.now();
    const expiryMs = READ_STATE_EXPIRY_HOURS * 60 * 60 * 1000;

    const filtered: ReadStateMap = {};
    let purgedCount = 0;

    for (const [id, timestamp] of Object.entries(readState)) {
      if (now - timestamp < expiryMs) {
        filtered[id] = timestamp;
      } else {
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[ReadState] Purged ${purgedCount} expired read entries`);
      saveReadStateMap(filtered);
    }
  } catch (error) {
    console.error('Failed to purge read state:', error);
  }
}

/**
 * Mark an article as read
 */
export function markAsRead(articleId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const readState = getReadStateMap();
    readState[articleId] = Date.now();
    saveReadStateMap(readState);
  } catch (error) {
    console.error('Failed to mark article as read:', error);
  }
}

/**
 * Check if an article has been read
 */
export function isArticleRead(articleId: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readState = getReadStateMap();
    return articleId in readState;
  } catch (error) {
    console.error('Failed to check read state:', error);
    return false;
  }
}

/**
 * Get read state for multiple articles
 */
export function getReadStateForArticles(articleIds: string[]): { [id: string]: boolean } {
  if (typeof window === 'undefined') return {};

  try {
    const readState = getReadStateMap();
    const result: { [id: string]: boolean } = {};

    for (const id of articleIds) {
      result[id] = id in readState;
    }

    return result;
  } catch (error) {
    console.error('Failed to get read state for articles:', error);
    return {};
  }
}

/**
 * Clear all read state
 */
export function clearAllReadState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[ReadState] Cleared all read history');

    // Emit custom event to notify components of read state change
    window.dispatchEvent(new Event('readStateChanged'));
  } catch (error) {
    console.error('Failed to clear read state:', error);
  }
}

/**
 * Get count of read articles
 */
export function getReadCount(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const readState = getReadStateMap();
    return Object.keys(readState).length;
  } catch (error) {
    console.error('Failed to get read count:', error);
    return 0;
  }
}
