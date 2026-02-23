"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  getInMemoryDb,
  resetInMemoryDb,
  type TableSchema,
  type ColumnInfo,
} from "./in-memory-db";

export type DataSourceType = "database" | "file";

export interface FileDataSource {
  tableName: string;
  fileName: string;
  fileType: "csv" | "excel" | "json" | "parquet";
  rowCount: number;
  columns: ColumnInfo[];
}

interface DataSourceContextValue {
  /** Current data source type */
  sourceType: DataSourceType;
  /** Set the data source type */
  setSourceType: (type: DataSourceType) => void;
  /** File data sources (when sourceType is "file") - supports multiple files */
  fileSources: FileDataSource[];
  /** Primary file source for backward compatibility (first file or null) */
  fileSource: FileDataSource | null;
  /** Load file data into the in-memory database */
  loadFileData: (
    tableName: string,
    data: Record<string, unknown>[],
    fileName: string,
    fileType: "csv" | "excel" | "json" | "parquet",
  ) => TableSchema;
  /** Remove a specific file from the in-memory database */
  removeFile: (tableName: string) => void;
  /** Clear all file data and reset to database mode */
  clearFileData: () => void;
  /** Get schema description for LLM prompt */
  getSchemaDescription: () => string;
  /** Execute a query against the in-memory database */
  executeInMemoryQuery: (sql: string) => { rows: Record<string, unknown>[]; columns: string[] };
  /** Get all table schemas from in-memory database */
  getAllSchemas: () => TableSchema[];
  /** Get file data for API (tableName + data array) - returns first file for backward compat */
  getFileDataForApi: (maxRows?: number) => { tableName: string; data: Record<string, unknown>[] } | null;
  /** Get all files data for API (array of tableName + data) */
  getAllFilesDataForApi: (maxRows?: number) => { tableName: string; data: Record<string, unknown>[] }[];
}

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [sourceType, setSourceTypeState] = useState<DataSourceType>("database");
  const [fileSources, setFileSources] = useState<FileDataSource[]>([]);

  // Backward compatibility: first file source or null
  const fileSource = fileSources.length > 0 ? fileSources[0]! : null;

  const setSourceType = useCallback((type: DataSourceType) => {
    setSourceTypeState(type);
    if (type === "database") {
      // Clear file data when switching to database mode
      resetInMemoryDb();
      setFileSources([]);
    }
  }, []);

  const loadFileData = useCallback(
    (
      tableName: string,
      data: Record<string, unknown>[],
      fileName: string,
      fileType: "csv" | "excel" | "json" | "parquet",
    ): TableSchema => {
      const db = getInMemoryDb();
      const schema = db.addTable(tableName, data);

      const newFileSource: FileDataSource = {
        tableName,
        fileName,
        fileType,
        rowCount: schema.rowCount,
        columns: schema.columns,
      };

      // Add to list (replace if same table name already exists)
      setFileSources((prev) => {
        const filtered = prev.filter((f) => f.tableName !== tableName);
        return [...filtered, newFileSource];
      });

      setSourceTypeState("file");

      return schema;
    },
    [],
  );

  const removeFile = useCallback((tableName: string) => {
    const db = getInMemoryDb();
    db.removeTable(tableName);
    setFileSources((prev) => prev.filter((f) => f.tableName !== tableName));

    // If no files left, switch back to database mode
    setFileSources((prev) => {
      if (prev.length === 0) {
        setSourceTypeState("database");
      }
      return prev;
    });
  }, []);

  const clearFileData = useCallback(() => {
    resetInMemoryDb();
    setFileSources([]);
    setSourceTypeState("database");
  }, []);

  const getSchemaDescription = useCallback((): string => {
    if (sourceType === "database" || fileSources.length === 0) {
      return "";
    }

    const db = getInMemoryDb();
    const schemas = db.getAllSchemas();

    if (schemas.length === 0) {
      return "";
    }

    const tableDescriptions = schemas.map((table) => {
      const columnDefs = table.columns
        .map((col) => `  - ${col.name} (${col.type}${col.nullable ? ", nullable" : ""})`)
        .join("\n");
      return `Table: ${table.name} (${table.rowCount} rows)\nColumns:\n${columnDefs}`;
    });

    const fileCount = fileSources.length;
    const header = fileCount === 1
      ? "In-Memory Data (from file upload):"
      : `In-Memory Data (${fileCount} files uploaded):`;

    return `${header}\n\n${tableDescriptions.join("\n\n")}`;
  }, [sourceType, fileSources]);

  const executeInMemoryQuery = useCallback(
    (sql: string): { rows: Record<string, unknown>[]; columns: string[] } => {
      const db = getInMemoryDb();
      return db.query(sql);
    },
    [],
  );

  const getAllSchemas = useCallback((): TableSchema[] => {
    const db = getInMemoryDb();
    return db.getAllSchemas();
  }, []);

  const getFileDataForApi = useCallback((maxRows: number = 100): { tableName: string; data: Record<string, unknown>[] } | null => {
    if (fileSources.length === 0) return null;
    const db = getInMemoryDb();
    // For backward compatibility, return first file
    const firstFile = fileSources[0]!;
    const data = db.getTableData(firstFile.tableName);
    if (!data) return null;
    // Limit rows to avoid token explosion
    const sampledData = maxRows > 0 ? data.slice(0, maxRows) : data;
    return {
      tableName: firstFile.tableName,
      data: sampledData,
    };
  }, [fileSources]);

  const getAllFilesDataForApi = useCallback((maxRows: number = 100): { tableName: string; data: Record<string, unknown>[] }[] => {
    if (fileSources.length === 0) return [];
    const db = getInMemoryDb();
    return fileSources
      .map((file) => {
        const data = db.getTableData(file.tableName);
        if (!data) return null;
        // Limit rows to avoid token explosion
        const sampledData = maxRows > 0 ? data.slice(0, maxRows) : data;
        return { tableName: file.tableName, data: sampledData };
      })
      .filter((item): item is { tableName: string; data: Record<string, unknown>[] } => item !== null);
  }, [fileSources]);

  return (
    <DataSourceContext.Provider
      value={{
        sourceType,
        setSourceType,
        fileSources,
        fileSource,
        loadFileData,
        removeFile,
        clearFileData,
        getSchemaDescription,
        executeInMemoryQuery,
        getAllSchemas,
        getFileDataForApi,
        getAllFilesDataForApi,
      }}
    >
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource(): DataSourceContextValue {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error("useDataSource must be used within a DataSourceProvider");
  }
  return context;
}
