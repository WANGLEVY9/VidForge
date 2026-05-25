import { useEffect, useRef } from 'react';

const STORAGE_PREFIX = 'vidforge_draft_';

interface AutosaveOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
  interval?: number; // ms, default 3000
  onRestore?: (data: T) => void;
}

export function useAutosave<T>({ key, data, enabled = true, interval = 3000 }: AutosaveOptions<T>) {
  const savedRef = useRef(false);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
        savedRef.current = true;
      } catch (e) {
        console.warn('[Autosave] Failed to save', key, e);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [key, data, enabled, interval]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (!enabled || !savedRef.current) return;
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
      } catch (e) {
        console.warn('[Autosave] Failed to save on unmount', key, e);
      }
    };
  }, [key, data, enabled]);
}

export function getDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

export function hasDraft(key: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + key) !== null;
}
