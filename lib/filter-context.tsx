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
 * Filter value types
 */
export interface DateRangeValue {
  from: string; // ISO date string
  to: string; // ISO date string
}

export type FilterValue = string | string[] | DateRangeValue | null;

/**
 * Filter definition from LLM
 */
export interface FilterDefinition {
  id: string;
  type: "date-range" | "dropdown";
  label: string;
  column: string;
  // For dropdown filters
  options?: string[];
  multiSelect?: boolean;
  // For date-range filters
  defaultPreset?: "last7days" | "last30days" | "last90days" | "ytd" | "custom";
}

/**
 * Date range presets
 */
export const DATE_PRESETS = {
  last7days: {
    label: "Last 7 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
  last30days: {
    label: "Last 30 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
  last90days: {
    label: "Last 90 days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
  ytd: {
    label: "Year to date",
    getRange: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
  custom: {
    label: "Custom range",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
} as const;

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Filter context state
 */
interface FilterContextState {
  filters: FilterDefinition[];
  values: Record<string, FilterValue>;
  setFilters: (filters: FilterDefinition[]) => void;
  setValue: (filterId: string, value: FilterValue) => void;
  clearFilters: () => void;
  clearValues: () => void;
  getFilterParams: () => Record<string, string>;
}

const FilterContext = createContext<FilterContextState | null>(null);

/**
 * Hook to access filter context
 */
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}

/**
 * Hook to check if we're inside a FilterProvider (optional usage)
 */
export function useFiltersOptional() {
  return useContext(FilterContext);
}

interface FilterProviderProps {
  children: ReactNode;
}

/**
 * Filter provider component
 */
export function FilterProvider({ children }: FilterProviderProps) {
  const [filters, setFiltersState] = useState<FilterDefinition[]>([]);
  const [values, setValues] = useState<Record<string, FilterValue>>({});

  const setFilters = useCallback((newFilters: FilterDefinition[]) => {
    setFiltersState(newFilters);
    // Initialize default values for new filters
    const initialValues: Record<string, FilterValue> = {};
    for (const filter of newFilters) {
      if (filter.type === "date-range") {
        const preset = filter.defaultPreset || "last30days";
        initialValues[filter.id] = DATE_PRESETS[preset].getRange();
      } else if (filter.type === "dropdown") {
        initialValues[filter.id] = filter.multiSelect ? [] : null;
      }
    }
    setValues(initialValues);
  }, []);

  const setValue = useCallback((filterId: string, value: FilterValue) => {
    setValues((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState([]);
    setValues({});
  }, []);

  const clearValues = useCallback(() => {
    // Reset values to defaults without removing filter definitions
    const resetValues: Record<string, FilterValue> = {};
    for (const filter of filters) {
      if (filter.type === "date-range") {
        const preset = filter.defaultPreset || "last30days";
        resetValues[filter.id] = DATE_PRESETS[preset].getRange();
      } else if (filter.type === "dropdown") {
        resetValues[filter.id] = filter.multiSelect ? [] : null;
      }
    }
    setValues(resetValues);
  }, [filters]);

  /**
   * Convert filter values to SQL parameters
   * Returns a flat object like { date_from: "2024-01-01", date_to: "2024-01-31", region: "West" }
   */
  const getFilterParams = useCallback(() => {
    const params: Record<string, string> = {};

    for (const filter of filters) {
      const value = values[filter.id];
      if (value === null || value === undefined) continue;

      if (
        filter.type === "date-range" &&
        typeof value === "object" &&
        "from" in value
      ) {
        params[`${filter.column}_from`] = value.from;
        params[`${filter.column}_to`] = value.to;
      } else if (filter.type === "dropdown") {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params[filter.column] = value.join(",");
          }
        } else if (typeof value === "string") {
          params[filter.column] = value;
        }
      }
    }

    return params;
  }, [filters, values]);

  const contextValue = useMemo(
    () => ({
      filters,
      values,
      setFilters,
      setValue,
      clearFilters,
      clearValues,
      getFilterParams,
    }),
    [filters, values, setFilters, setValue, clearFilters, clearValues, getFilterParams],
  );

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}
