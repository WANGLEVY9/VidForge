import { useSyncExternalStore, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'vidforge_theme';

type ThemeMode = 'dark' | 'light';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

function resolveTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('dark-mode', 'light-mode');
  root.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
}

// External store for subscribing to theme changes
const listeners = new Set<() => void>();

function subscribeToThemeChanges(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): ThemeMode {
  return resolveTheme();
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

// Initialize theme on first import (before React renders)
if (typeof document !== 'undefined') {
  const initialTheme = resolveTheme();
  document.documentElement.classList.remove('dark-mode', 'light-mode');
  document.documentElement.classList.add(initialTheme === 'dark' ? 'dark-mode' : 'light-mode');
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getSnapshot, getSnapshot);

  const isDark = theme === 'dark';

  // Apply theme classes on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    emitChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, toggleTheme, setTheme, isDark };
}
