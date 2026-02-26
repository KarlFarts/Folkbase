import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'folkbase-theme';

/**
 * Theme hook — manages light/dark mode.
 * - Reads from localStorage on init
 * - Falls back to prefers-color-scheme media query
 * - Falls back to 'light'
 * - Sets data-theme attribute on <html> element
 * - Listens for system preference changes (only when no explicit user preference)
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  // Apply theme to DOM and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Listen for system preference changes when no explicit user preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return; // user has explicit preference

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setThemeState(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme, setTheme };
}
