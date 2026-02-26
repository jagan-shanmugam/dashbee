"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export interface RefreshConfig {
  /** Interval in seconds (null means disabled) */
  interval: number | null;
  /** Whether auto-refresh is enabled */
  enabled: boolean;
}

interface RefreshContextValue {
  /** Current refresh configuration */
  config: RefreshConfig;
  /** Set the refresh interval in seconds */
  setInterval: (seconds: number | null) => void;
  /** Enable or disable auto-refresh */
  setEnabled: (enabled: boolean) => void;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Trigger a manual refresh */
  triggerRefresh: () => void;
  /** Register a refresh callback */
  onRefresh: (callback: () => void | Promise<void>) => () => void;
  /** Seconds until next refresh (null if disabled) */
  countdown: number | null;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

const DEFAULT_CONFIG: RefreshConfig = {
  interval: null,
  enabled: false,
};

// Predefined interval options in seconds
export const REFRESH_INTERVALS = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
];

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RefreshConfig>(DEFAULT_CONFIG);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store callbacks using a ref to avoid re-renders
  const callbacksRef = useRef<Set<() => void | Promise<void>>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Register a refresh callback
  const onRefresh = useCallback(
    (callback: () => void | Promise<void>) => {
      callbacksRef.current.add(callback);
      return () => {
        callbacksRef.current.delete(callback);
      };
    },
    [],
  );

  // Trigger refresh
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setLastRefresh(new Date());

    try {
      const callbacks = Array.from(callbacksRef.current);
      await Promise.all(callbacks.map((cb) => cb()));
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Set interval
  const setIntervalValue = useCallback((seconds: number | null) => {
    setConfig((prev) => ({
      ...prev,
      interval: seconds,
      enabled: seconds !== null,
    }));
  }, []);

  // Set enabled
  const setEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, enabled }));
  }, []);

  // Setup auto-refresh timer
  useEffect(() => {
    // Clear existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (config.enabled && config.interval !== null && config.interval > 0) {
      // Set initial countdown
      setCountdown(config.interval);

      // Countdown timer (every second)
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return config.interval;
          }
          return prev - 1;
        });
      }, 1000);

      // Refresh timer
      timerRef.current = setInterval(() => {
        triggerRefresh();
      }, config.interval * 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [config.enabled, config.interval, triggerRefresh]);

  return (
    <RefreshContext.Provider
      value={{
        config,
        setInterval: setIntervalValue,
        setEnabled,
        lastRefresh,
        triggerRefresh,
        onRefresh,
        countdown,
        isRefreshing,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh(): RefreshContextValue {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
}

/**
 * Hook to use refresh context optionally (returns null if not in provider)
 */
export function useRefreshOptional(): RefreshContextValue | null {
  return useContext(RefreshContext);
}
