"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

/**
 * Column annotation for business rules and metadata.
 * Inspired by agno-agi/dash's "Human Annotations" layer.
 */
export interface ColumnAnnotation {
  id: string;
  tableName: string;
  columnName: string;
  displayName?: string; // Friendly name (e.g., "Total Revenue" for "total_amt")
  description?: string; // What this column represents
  businessRule?: string; // Business logic (e.g., "Excludes returns and refunds")
  dataType?: string; // Human-friendly type (e.g., "Currency (USD)", "Percentage")
  format?: "currency" | "percent" | "number" | "date" | "text";
  aggregation?: "sum" | "avg" | "count" | "min" | "max"; // Preferred aggregation
  examples?: string[]; // Example values
  createdAt: string;
  updatedAt: string;
}

/**
 * Table-level annotation for business context.
 */
export interface TableAnnotation {
  id: string;
  tableName: string;
  displayName?: string; // Friendly name
  description?: string; // What this table represents
  businessContext?: string; // Business rules/context
  primaryKeyColumn?: string;
  importantColumns?: string[]; // Key columns to focus on
  createdAt: string;
  updatedAt: string;
}

interface ColumnAnnotationsContextValue {
  columnAnnotations: ColumnAnnotation[];
  tableAnnotations: TableAnnotation[];
  addColumnAnnotation: (annotation: Omit<ColumnAnnotation, "id" | "createdAt" | "updatedAt">) => void;
  updateColumnAnnotation: (id: string, updates: Partial<ColumnAnnotation>) => void;
  deleteColumnAnnotation: (id: string) => void;
  getColumnAnnotation: (tableName: string, columnName: string) => ColumnAnnotation | undefined;
  addTableAnnotation: (annotation: Omit<TableAnnotation, "id" | "createdAt" | "updatedAt">) => void;
  updateTableAnnotation: (id: string, updates: Partial<TableAnnotation>) => void;
  deleteTableAnnotation: (id: string) => void;
  getTableAnnotation: (tableName: string) => TableAnnotation | undefined;
  getAnnotationsForPrompt: () => string;
}

const ColumnAnnotationsContext = createContext<ColumnAnnotationsContextValue | null>(null);

const COLUMN_STORAGE_KEY = "dashb-column-annotations";
const TABLE_STORAGE_KEY = "dashb-table-annotations";

interface ColumnAnnotationsProviderProps {
  children: ReactNode;
}

export function ColumnAnnotationsProvider({ children }: ColumnAnnotationsProviderProps) {
  const [columnAnnotations, setColumnAnnotations] = useState<ColumnAnnotation[]>([]);
  const [tableAnnotations, setTableAnnotations] = useState<TableAnnotation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedColumns = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (storedColumns) {
        setColumnAnnotations(JSON.parse(storedColumns));
      }
      const storedTables = localStorage.getItem(TABLE_STORAGE_KEY);
      if (storedTables) {
        setTableAnnotations(JSON.parse(storedTables));
      }
    } catch (e) {
      console.error("Failed to load annotations:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when annotations change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnAnnotations));
        localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(tableAnnotations));
      } catch (e) {
        console.error("Failed to save annotations:", e);
      }
    }
  }, [columnAnnotations, tableAnnotations, isLoaded]);

  const addColumnAnnotation = useCallback(
    (annotation: Omit<ColumnAnnotation, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newAnnotation: ColumnAnnotation = {
        ...annotation,
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      setColumnAnnotations((prev) => [...prev, newAnnotation]);
    },
    []
  );

  const updateColumnAnnotation = useCallback(
    (id: string, updates: Partial<ColumnAnnotation>) => {
      setColumnAnnotations((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        )
      );
    },
    []
  );

  const deleteColumnAnnotation = useCallback((id: string) => {
    setColumnAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getColumnAnnotation = useCallback(
    (tableName: string, columnName: string): ColumnAnnotation | undefined => {
      return columnAnnotations.find(
        (a) => a.tableName === tableName && a.columnName === columnName
      );
    },
    [columnAnnotations]
  );

  const addTableAnnotation = useCallback(
    (annotation: Omit<TableAnnotation, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newAnnotation: TableAnnotation = {
        ...annotation,
        id: `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      setTableAnnotations((prev) => [...prev, newAnnotation]);
    },
    []
  );

  const updateTableAnnotation = useCallback(
    (id: string, updates: Partial<TableAnnotation>) => {
      setTableAnnotations((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        )
      );
    },
    []
  );

  const deleteTableAnnotation = useCallback((id: string) => {
    setTableAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getTableAnnotation = useCallback(
    (tableName: string): TableAnnotation | undefined => {
      return tableAnnotations.find((a) => a.tableName === tableName);
    },
    [tableAnnotations]
  );

  /**
   * Get annotations formatted for inclusion in the agent's system prompt.
   */
  const getAnnotationsForPrompt = useCallback((): string => {
    if (columnAnnotations.length === 0 && tableAnnotations.length === 0) {
      return "";
    }

    const sections: string[] = [];

    // Table annotations
    if (tableAnnotations.length > 0) {
      const tableLines = tableAnnotations.map((t) => {
        const parts = [`- **${t.tableName}**`];
        if (t.displayName) parts.push(`(${t.displayName})`);
        if (t.description) parts.push(`: ${t.description}`);
        if (t.businessContext) parts.push(`\n  Business rule: ${t.businessContext}`);
        return parts.join("");
      });
      sections.push(`TABLE CONTEXT:\n${tableLines.join("\n")}`);
    }

    // Column annotations grouped by table
    if (columnAnnotations.length > 0) {
      const byTable = columnAnnotations.reduce(
        (acc, col) => {
          if (!acc[col.tableName]) acc[col.tableName] = [];
          acc[col.tableName].push(col);
          return acc;
        },
        {} as Record<string, ColumnAnnotation[]>
      );

      const columnLines = Object.entries(byTable).map(([table, cols]) => {
        const colLines = cols.map((c) => {
          const parts = [`  - ${c.columnName}`];
          if (c.displayName) parts.push(` ("${c.displayName}")`);
          if (c.description) parts.push(`: ${c.description}`);
          if (c.businessRule) parts.push(` [Rule: ${c.businessRule}]`);
          if (c.format) parts.push(` [Format: ${c.format}]`);
          return parts.join("");
        });
        return `${table}:\n${colLines.join("\n")}`;
      });
      sections.push(`COLUMN DEFINITIONS:\n${columnLines.join("\n\n")}`);
    }

    return `
BUSINESS CONTEXT (user-defined annotations):
${sections.join("\n\n")}
`;
  }, [columnAnnotations, tableAnnotations]);

  return (
    <ColumnAnnotationsContext.Provider
      value={{
        columnAnnotations,
        tableAnnotations,
        addColumnAnnotation,
        updateColumnAnnotation,
        deleteColumnAnnotation,
        getColumnAnnotation,
        addTableAnnotation,
        updateTableAnnotation,
        deleteTableAnnotation,
        getTableAnnotation,
        getAnnotationsForPrompt,
      }}
    >
      {children}
    </ColumnAnnotationsContext.Provider>
  );
}

export function useColumnAnnotations(): ColumnAnnotationsContextValue {
  const context = useContext(ColumnAnnotationsContext);
  if (!context) {
    throw new Error("useColumnAnnotations must be used within a ColumnAnnotationsProvider");
  }
  return context;
}

