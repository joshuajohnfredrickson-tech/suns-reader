export type TextSizePreference = 'default' | 'large' | 'larger';

const TEXT_SIZE_KEY = 'suns-reader-reader-text-size';

/**
 * Get the stored text size preference from localStorage
 */
export function getStoredTextSize(): TextSizePreference {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem(TEXT_SIZE_KEY);
  if (stored === 'large' || stored === 'larger') {
    return stored;
  }
  return 'default';
}

/**
 * Save text size preference to localStorage
 */
export function setStoredTextSize(size: TextSizePreference): void {
  if (typeof window === 'undefined') return;
  if (size === 'default') {
    localStorage.removeItem(TEXT_SIZE_KEY);
  } else {
    localStorage.setItem(TEXT_SIZE_KEY, size);
  }
}

/**
 * Get the CSS class name for the current text size (empty string for default)
 */
export function getTextSizeClass(size: TextSizePreference): string {
  switch (size) {
    case 'large': return 'text-size-large';
    case 'larger': return 'text-size-larger';
    default: return '';
  }
}
