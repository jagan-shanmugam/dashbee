"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { componentList } from "./catalog";

/**
 * List of data visualization chart types that can be enabled/disabled.
 * Layout components (Card, Grid, Stack) are always available.
 */
export const CHART_COMPONENT_TYPES = [
  "Chart",
  "Table",
  "Metric",
  "Heatmap",
  "MapChart",
  "Scatter",
  "Histogram",
  "Boxplot",
  "StackedChart",
  "DonutChart",
  "MultiLineChart",
  "GaugeChart",
  "FunnelChart",
  "Treemap",
  "WaterfallChart",
  "RadarChart",
  "BulletChart",
] as const;

export type ChartComponentType = (typeof CHART_COMPONENT_TYPES)[number];

/**
 * Descriptions for each chart type to help users understand what they do
 */
export const CHART_DESCRIPTIONS: Record<ChartComponentType, string> = {
  Chart: "Bar, line, area, and pie charts for basic data visualization",
  Table: "Tabular data display with sortable columns",
  Metric: "Single value KPI display with formatting options",
  Heatmap: "Calendar or matrix heatmaps for density visualization",
  MapChart: "Geographic map visualization with markers",
  Scatter: "Scatter plot for correlation analysis",
  Histogram: "Distribution analysis with configurable bins",
  Boxplot: "Statistical distribution with quartiles and outliers",
  StackedChart: "Stacked bar or area charts for part-to-whole comparison",
  DonutChart: "Pie chart with center cutout for part-to-whole relationships",
  MultiLineChart: "Multiple time series on the same axis",
  GaugeChart: "Progress indicator with min/max ranges",
  FunnelChart: "Conversion pipeline visualization",
  Treemap: "Hierarchical data as nested rectangles",
  WaterfallChart: "Cumulative effect of sequential values",
  RadarChart: "Multi-dimensional comparison (spider chart)",
  BulletChart: "Compact KPI with actual vs target",
};

interface ChartCatalogContextValue {
  /** Set of enabled chart types */
  enabledCharts: Set<ChartComponentType>;
  /** Toggle a chart type on/off */
  toggleChart: (chart: ChartComponentType) => void;
  /** Enable all charts */
  enableAll: () => void;
  /** Disable all charts */
  disableAll: () => void;
  /** Check if a chart type is enabled */
  isEnabled: (chart: ChartComponentType) => boolean;
  /** Get filtered component list for API */
  getFilteredComponentList: () => string[];
}

const ChartCatalogContext = createContext<ChartCatalogContextValue | null>(null);

interface ChartCatalogProviderProps {
  children: ReactNode;
}

export function ChartCatalogProvider({ children }: ChartCatalogProviderProps) {
  // All chart types enabled by default
  const [enabledCharts, setEnabledCharts] = useState<Set<ChartComponentType>>(
    () => new Set(CHART_COMPONENT_TYPES)
  );

  const toggleChart = useCallback((chart: ChartComponentType) => {
    setEnabledCharts((prev) => {
      const next = new Set(prev);
      if (next.has(chart)) {
        next.delete(chart);
      } else {
        next.add(chart);
      }
      return next;
    });
  }, []);

  const enableAll = useCallback(() => {
    setEnabledCharts(new Set(CHART_COMPONENT_TYPES));
  }, []);

  const disableAll = useCallback(() => {
    setEnabledCharts(new Set());
  }, []);

  const isEnabled = useCallback(
    (chart: ChartComponentType) => enabledCharts.has(chart),
    [enabledCharts]
  );

  const getFilteredComponentList = useCallback(() => {
    // Always include layout components
    const layoutComponents = ["Card", "Grid", "Stack", "Heading", "Text", "Filter"];

    // Filter chart components based on enabled state
    const enabledChartComponents = componentList.filter((comp) => {
      // Layout components are always included
      if (layoutComponents.includes(comp)) return true;
      // Check if this chart type is enabled
      return enabledCharts.has(comp as ChartComponentType);
    });

    return enabledChartComponents;
  }, [enabledCharts]);

  return (
    <ChartCatalogContext.Provider
      value={{
        enabledCharts,
        toggleChart,
        enableAll,
        disableAll,
        isEnabled,
        getFilteredComponentList,
      }}
    >
      {children}
    </ChartCatalogContext.Provider>
  );
}

export function useChartCatalog(): ChartCatalogContextValue {
  const context = useContext(ChartCatalogContext);
  if (!context) {
    throw new Error("useChartCatalog must be used within a ChartCatalogProvider");
  }
  return context;
}

