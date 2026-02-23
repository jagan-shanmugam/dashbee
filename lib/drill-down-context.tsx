"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Information about a drill-down action
 */
export interface DrillDownInfo {
  // The query key that was clicked
  queryKey: string;
  // The dimension (column) that was clicked
  dimension: string;
  // The value that was clicked
  value: string | number;
  // The label column name
  labelColumn: string;
  // The value column name
  valueColumn: string;
  // Original chart type
  chartType: string;
  // The chart/component title
  title?: string;
}

/**
 * Data to show in drill-down modal
 */
export interface DrillDownData {
  info: DrillDownInfo;
  rows: Record<string, unknown>[];
}

/**
 * Drill-down context state
 */
interface DrillDownContextState {
  // Current drill-down data (if modal is open)
  drillDownData: DrillDownData | null;
  // Open the drill-down modal with data
  openDrillDown: (info: DrillDownInfo, rows: Record<string, unknown>[]) => void;
  // Close the drill-down modal
  closeDrillDown: () => void;
  // Check if drill-down is active
  isOpen: boolean;
}

const DrillDownContext = createContext<DrillDownContextState | null>(null);

/**
 * Hook to access drill-down context
 */
export function useDrillDown() {
  const context = useContext(DrillDownContext);
  if (!context) {
    throw new Error("useDrillDown must be used within a DrillDownProvider");
  }
  return context;
}

/**
 * Hook to check if we're inside a DrillDownProvider (optional usage)
 */
export function useDrillDownOptional() {
  return useContext(DrillDownContext);
}

interface DrillDownProviderProps {
  children: ReactNode;
}

/**
 * Drill-down provider component
 */
export function DrillDownProvider({ children }: DrillDownProviderProps) {
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(
    null,
  );

  const openDrillDown = useCallback(
    (info: DrillDownInfo, rows: Record<string, unknown>[]) => {
      setDrillDownData({ info, rows });
    },
    [],
  );

  const closeDrillDown = useCallback(() => {
    setDrillDownData(null);
  }, []);

  const isOpen = drillDownData !== null;

  const contextValue = useMemo(
    () => ({
      drillDownData,
      openDrillDown,
      closeDrillDown,
      isOpen,
    }),
    [drillDownData, openDrillDown, closeDrillDown, isOpen],
  );

  return (
    <DrillDownContext.Provider value={contextValue}>
      {children}
    </DrillDownContext.Provider>
  );
}

/**
 * Filter rows by a dimension value
 */
export function filterRowsByDimension(
  rows: Record<string, unknown>[],
  dimension: string,
  value: string | number,
): Record<string, unknown>[] {
  return rows.filter((row) => {
    const rowValue = row[dimension];
    // Handle various value types
    if (rowValue === value) return true;
    if (String(rowValue) === String(value)) return true;
    return false;
  });
}
