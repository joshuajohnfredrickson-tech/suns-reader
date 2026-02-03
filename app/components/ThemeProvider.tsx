'use client';

import { useEffect } from 'react';
import { getStoredThemePreference, applyTheme } from '../lib/theme';

/**
 * ThemeProvider initializes theme on mount and listens for system preference changes.
 * Place this high in the component tree (e.g., in layout).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply stored theme on mount
    const preference = getStoredThemePreference();
    applyTheme(preference);

    // Listen for system preference changes (only matters when preference is 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const currentPreference = getStoredThemePreference();
      if (currentPreference === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return <>{children}</>;
}
