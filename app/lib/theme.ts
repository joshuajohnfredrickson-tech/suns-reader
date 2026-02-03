export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'themePreference';

/**
 * Get the stored theme preference from localStorage
 */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/**
 * Save theme preference to localStorage
 */
export function setStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, preference);
}

/**
 * Check if system prefers dark mode
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Apply theme to document
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;

  const isDark =
    preference === 'dark' ||
    (preference === 'system' && getSystemPrefersDark());

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
}

/**
 * Initialize theme on app load - call this early to prevent flicker
 */
export function initializeTheme(): void {
  const preference = getStoredThemePreference();
  applyTheme(preference);
}
