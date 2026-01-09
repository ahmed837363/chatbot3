import { useEffect, useRef, useState, useCallback } from 'react';

type Setter<T> = T | ((prev: T) => T);

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: Setter<T>) => void] {
  const initialised = useRef(false);
  const [value, setValue] = useState<T>(() => {
    if (!isBrowser()) {
      return defaultValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!isBrowser() || initialised.current) return;
    initialised.current = true;
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Failed to hydrate localStorage key "${key}":`, error);
    }
  }, [key]);

  const setStoredValue = useCallback((val: Setter<T>) => {
    setValue(prev => {
      const nextValue = val instanceof Function ? val(prev) : val;
      if (isBrowser()) {
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Failed to write localStorage key "${key}":`, error);
        }
      }
      return nextValue;
    });
  }, [key]);

  return [value, setStoredValue];
}
