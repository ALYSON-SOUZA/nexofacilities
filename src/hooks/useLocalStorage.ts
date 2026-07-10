import { useState, useEffect } from "react";

/**
 * Generic hook for state persisted to localStorage.
 * Automatically syncs reads/writes and handles JSON parsing safely.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved) as T;
      }
    } catch (e) {
      console.warn(`[useLocalStorage] Failed to parse key "${key}":`, e);
    }
    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`[useLocalStorage] Failed to save key "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState];
}
