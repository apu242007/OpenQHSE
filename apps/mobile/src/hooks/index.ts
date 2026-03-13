/**
 * Custom hooks for the mobile app.
 */

import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to track online/offline status.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  return isOnline;
}

/**
 * Hook to debounce a value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Hook to run a callback once when the component mounts.
 */
export function useOnMount(callback: () => void | Promise<void>) {
  useEffect(() => {
    callback();
  }, []);
}
