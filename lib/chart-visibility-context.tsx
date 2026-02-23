"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface ChartInfo {
  /** Unique identifier (element ID) */
  id: string;
  /** Display title */
  title: string;
  /** Chart type (e.g., "Chart", "Table", "Metric") */
  type: string;
  /** Query key associated with this chart */
  queryKey?: string;
}

interface ChartVisibilityContextValue {
  /** List of registered charts */
  charts: ChartInfo[];
  /** Set of visible chart IDs */
  visibleChartIds: Set<string>;
  /** Register a chart (called by components on mount) */
  registerChart: (chart: ChartInfo) => void;
  /** Unregister a chart (called by components on unmount) */
  unregisterChart: (id: string) => void;
  /** Toggle chart visibility */
  toggleChart: (id: string) => void;
  /** Set visibility for a specific chart */
  setChartVisibility: (id: string, visible: boolean) => void;
  /** Show all charts */
  showAll: () => void;
  /** Hide all charts */
  hideAll: () => void;
  /** Check if a chart is visible */
  isVisible: (id: string) => boolean;
  /** Clear all registered charts */
  clearCharts: () => void;
}

const ChartVisibilityContext = createContext<ChartVisibilityContextValue | null>(null);

interface ChartVisibilityProviderProps {
  children: ReactNode;
}

export function ChartVisibilityProvider({ children }: ChartVisibilityProviderProps) {
  const [charts, setCharts] = useState<ChartInfo[]>([]);
  const [visibleChartIds, setVisibleChartIds] = useState<Set<string>>(new Set());

  const registerChart = useCallback((chart: ChartInfo) => {
    setCharts((prev) => {
      // Check if already registered
      if (prev.some((c) => c.id === chart.id)) {
        return prev;
      }
      return [...prev, chart];
    });
    // Default to visible
    setVisibleChartIds((prev) => new Set([...prev, chart.id]));
  }, []);

  const unregisterChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
    setVisibleChartIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleChart = useCallback((id: string) => {
    setVisibleChartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setChartVisibility = useCallback((id: string, visible: boolean) => {
    setVisibleChartIds((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setVisibleChartIds(new Set(charts.map((c) => c.id)));
  }, [charts]);

  const hideAll = useCallback(() => {
    setVisibleChartIds(new Set());
  }, []);

  const isVisible = useCallback(
    (id: string) => visibleChartIds.has(id),
    [visibleChartIds],
  );

  const clearCharts = useCallback(() => {
    setCharts([]);
    setVisibleChartIds(new Set());
  }, []);

  return (
    <ChartVisibilityContext.Provider
      value={{
        charts,
        visibleChartIds,
        registerChart,
        unregisterChart,
        toggleChart,
        setChartVisibility,
        showAll,
        hideAll,
        isVisible,
        clearCharts,
      }}
    >
      {children}
    </ChartVisibilityContext.Provider>
  );
}

export function useChartVisibility(): ChartVisibilityContextValue {
  const context = useContext(ChartVisibilityContext);
  if (!context) {
    throw new Error("useChartVisibility must be used within a ChartVisibilityProvider");
  }
  return context;
}

/**
 * Safe version that returns null if provider is not available
 */
export function useChartVisibilitySafe(): ChartVisibilityContextValue | null {
  return useContext(ChartVisibilityContext);
}
