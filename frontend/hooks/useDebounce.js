/**
 * VeriChain - Debounce and Throttle Hooks
 * Prevents multiple rapid button clicks and optimizes performance
 */

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Debounce a value - useful for search inputs
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Create a debounced callback function
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Prevent double-clicks on async operations
 * Returns [execute, isLoading] - execute wraps your async function
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (asyncFn) => {
    if (isLoading) return; // Prevent double-click
    
    setIsLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  return [execute, isLoading];
}

/**
 * Throttle - limit how often a function can be called
 */
export function useThrottledCallback(callback, delay = 1000) {
  const lastRun = useRef(0);
  const timeoutRef = useRef(null);

  const throttledCallback = useCallback(
    (...args) => {
      const now = Date.now();
      
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else {
        // Schedule for later if not called yet
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

export default useDebounce;
