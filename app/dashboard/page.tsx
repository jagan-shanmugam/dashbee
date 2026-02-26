"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DataProvider,
  ActionProvider,
  VisibilityProvider,
  Renderer,
  useData,
} from "@json-render/react";
import { AlertCircle, Loader2, X, Download, Upload, Database, ArrowLeftRight, Cloud } from "lucide-react";
import type { UITree, UIElement, JsonPatch } from "@json-render/core";
import { setByPath } from "@json-render/core";
import { componentRegistry } from "@/components/ui";
import { FilterBar } from "@/components/ui/filter-bar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FilterProvider,
  useFilters,
  type FilterDefinition,
} from "@/lib/filter-context";
import { DrillDownProvider } from "@/lib/drill-down-context";
import { DrillDownModal } from "@/components/ui/drill-down-modal";
import { addToHistory, type HistoryEntry } from "@/lib/query-history";
import { HistoryPanel } from "@/components/ui/history-panel";
import { RefreshProvider, useRefresh } from "@/lib/refresh-context";
import { RefreshSettings } from "@/components/ui/refresh-settings";
import { exportDashboardToPng, exportDashboardToPdf } from "@/lib/export-utils";
import { DataSourceProvider, useDataSource } from "@/lib/data-source-context";
import { StylePresetProvider, useStylePreset } from "@/lib/style-preset-context";
import { ModelSettingsProvider, useModelSettings } from "@/lib/model-settings-context";
import { ChartVisibilityProvider, useChartVisibility } from "@/lib/chart-visibility-context";
import { ChartCatalogProvider, useChartCatalog } from "@/lib/chart-catalog-context";
import { CloudStorageProvider } from "@/lib/cloud-storage-context";
import { SavedQueriesProvider } from "@/lib/saved-queries-context";
import { SQLLearningsProvider } from "@/lib/sql-learnings-context";
import { ColumnAnnotationsProvider } from "@/lib/column-annotations-context";
import { MultiFileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { CloudStorageBrowser } from "@/components/ui/cloud-storage-browser";
import { StylePresetSelector } from "@/components/ui/style-preset-selector";
import { ModelSettings } from "@/components/ui/model-settings";
import { ChartVisibilitySelector } from "@/components/ui/chart-visibility-selector";
import { GenerationSettings } from "@/components/ui/generation-settings";
import {
  EncodingShelf,
  encodingToPromptHint,
  type EncodingConfig,
} from "@/components/ui/encoding-shelf";

interface SQLQuery {
  key: string;
  sql: string;
  executedSql?: string; // SQL with filter params filled in
}

interface QueryOperation {
  op: "query";
  key: string;
  sql: string;
}

type DatabaseType = "postgresql" | "mysql" | "sqlite" | "demo";

interface DBConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  filename?: string; // For SQLite
}

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  postgresql: 5432,
  mysql: 3306,
  sqlite: 0,
  demo: 5432,
};

const DEFAULT_DB_CONFIG: DBConfig = {
  type: "demo",
  host: "supabase",
  port: 5432,
  database: "demo",
  user: "demo",
  password: "",
  ssl: true,
};

// Logo SVG Component - Hexagon with data grid pattern (matches landing page)
function LogoIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
      <path
        d="M16 2L28.5 9.5V24.5L16 32L3.5 24.5V9.5L16 2Z"
        fill="url(#logo-gradient-dashboard)"
      />
      <path d="M10 12H14V16H10V12Z" fill="white" fillOpacity="0.9" />
      <path d="M18 12H22V16H18V12Z" fill="white" fillOpacity="0.7" />
      <path d="M10 18H14V22H10V18Z" fill="white" fillOpacity="0.7" />
      <path d="M18 18H22V22H18V18Z" fill="white" fillOpacity="0.9" />
      <defs>
        <linearGradient id="logo-gradient-dashboard" x1="3.5" y1="2" x2="28.5" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary, #0ea5e9)" />
          <stop offset="1" stopColor="var(--primary-light, #06b6d4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Parse a single JSON line from the stream
 */
function parseStreamLine(line: string): QueryOperation | JsonPatch | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Apply a JSON patch to the current tree
 */
function applyPatch(tree: UITree, patch: JsonPatch): UITree {
  const newTree = { ...tree, elements: { ...tree.elements } };

  switch (patch.op) {
    case "set":
    case "add":
    case "replace": {
      if (patch.path === "/root") {
        newTree.root = patch.value as string;
        return newTree;
      }

      if (patch.path.startsWith("/elements/")) {
        const pathParts = patch.path.slice("/elements/".length).split("/");
        const elementKey = pathParts[0];

        if (!elementKey) return newTree;

        if (pathParts.length === 1) {
          newTree.elements[elementKey] = patch.value as UIElement;
        } else {
          const element = newTree.elements[elementKey];
          if (element && typeof element === "object") {
            const propPath = "/" + pathParts.slice(1).join("/");
            const newElement = { ...element };
            try {
              setByPath(
                newElement as Record<string, unknown>,
                propPath,
                patch.value,
              );
              newTree.elements[elementKey] = newElement;
            } catch (err) {
              console.warn("Failed to apply patch:", propPath, err);
            }
          }
        }
      }
      break;
    }
    case "remove": {
      if (patch.path.startsWith("/elements/")) {
        const elementKey = patch.path.slice("/elements/".length).split("/")[0];
        if (elementKey && elementKey in newTree.elements) {
           
          const { [elementKey]: _, ...rest } = newTree.elements;
          newTree.elements = rest;
        }
      }
      break;
    }
  }

  return newTree;
}

interface Progress {
  queriesFound: number;
  uiPatchesApplied: number;
  queryExecuting: number;
  queryTotal: number;
}

const INITIAL_PROGRESS: Progress = {
  queriesFound: 0,
  uiPatchesApplied: 0,
  queryExecuting: 0,
  queryTotal: 0,
};

interface AgentStatus {
  message: string;
  type: "idle" | "working" | "success" | "error" | "retry";
  queryKey?: string;
}

const INITIAL_AGENT_STATUS: AgentStatus = {
  message: "",
  type: "idle",
};

/**
 * Parse fullStream event format from AI SDK v6
 * Events are JSON objects with a "type" field like "text-delta", "tool-call", "tool-result"
 */
interface StreamEvent {
  type: string;
  // text-delta events
  text?: string;
  // tool-call events
  toolCallId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  // tool-result events
  output?: unknown;
}

function parseStreamEvent(line: string): StreamEvent | null {
  if (!line || !line.trim()) return null;

  try {
    return JSON.parse(line) as StreamEvent;
  } catch {
    return null;
  }
}

interface FileDataSource {
  tableName: string;
  data: Record<string, unknown>[];
}

/**
 * Custom hook for dashboard streaming with agentic SQL execution
 */
interface ModelSettingsForApi {
  provider?: "openai" | "ollama" | "anthropic" | "azure" | "openrouter" | "gemini";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

function useSQLDashboardStream(
  dbConfig: DBConfig,
  filterParams?: Record<string, string>,
  dataSourceType: "database" | "file" = "database",
  fileData?: FileDataSource,
  filesData?: FileDataSource[],
  modelSettings?: ModelSettingsForApi | null,
  getEnabledComponents?: () => string[],
) {
  const [tree, setTree] = useState<UITree | null>(null);
  const [queries, setQueries] = useState<SQLQuery[]>([]);
  const [queryResults, setQueryResults] = useState<Record<string, unknown[]>>(
    {},
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecutingQueries, setIsExecutingQueries] = useState(false);
  const [isInitialRun, setIsInitialRun] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
  const [agentStatus, setAgentStatus] =
    useState<AgentStatus>(INITIAL_AGENT_STATUS);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setTree(null);
    setQueries([]);
    setQueryResults({});
    setError(null);
    setProgress(INITIAL_PROGRESS);
    setAgentStatus(INITIAL_AGENT_STATUS);
  }, []);

  // Restore state from a saved history entry
  const restoreState = useCallback(
    (savedTree: UITree | null, savedQueries: SQLQuery[]) => {
      setTree(savedTree);
      setQueries(savedQueries);
      setQueryResults({});
      setError(null);
      setProgress(INITIAL_PROGRESS);
      setAgentStatus({ message: "Restoring dashboard...", type: "working" });
    },
    [],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsExecutingQueries(false);
    setAgentStatus({ message: "Cancelled", type: "idle" });
  }, []);

  const send = useCallback(
    async (prompt: string, options?: { fileDataOverride?: FileDataSource; filesDataOverride?: FileDataSource[] }) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setIsInitialRun(true);
      setError(null);
      setQueries([]);
      setQueryResults({});
      setProgress(INITIAL_PROGRESS);
      setAgentStatus({ message: "Starting agent...", type: "working" });

      let currentTree: UITree = { root: "", elements: {} };
      setTree(currentTree);

      const collectedQueries: SQLQuery[] = [];
      const collectedResults: Record<string, unknown[]> = {};
      let patchCount = 0;
      let textBuffer = "";

      // Use override file data if provided (bypasses race condition), otherwise use hook params
      const effectiveFileData = options?.fileDataOverride ?? fileData;
      const effectiveFilesData = options?.filesDataOverride ?? filesData;

      try {
        const response = await fetch("/api/generate-agentic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            dbConfig,
            filterParams,
            dataSourceType,
            fileData: effectiveFileData,
            filesData: effectiveFilesData,
            modelSettings: modelSettings || undefined,
            enabledComponents: getEnabledComponents?.(),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const event = parseStreamEvent(line);
            if (!event) continue;

            // Handle different stream event types from fullStream
            switch (event.type) {
              case "tool-call": {
                // Tool call event
                if (event.toolName === "execute_sql" && event.input) {
                  const key = event.input.key as string;
                  const sql = event.input.sql as string;
                  setAgentStatus({
                    message: `Testing query: ${key}...`,
                    type: "working",
                    queryKey: key,
                  });
                  // Store the SQL query immediately so we can display it
                  // We'll update it when we get the result (success/failure)
                  const existingIdx = collectedQueries.findIndex(
                    (q) => q.key === key,
                  );
                  if (existingIdx === -1) {
                    collectedQueries.push({ key, sql });
                    setQueries([...collectedQueries]);
                  } else if (collectedQueries[existingIdx]) {
                    // Update existing query with latest SQL (in case of retry)
                    collectedQueries[existingIdx].sql = sql;
                    setQueries([...collectedQueries]);
                  }
                } else if (event.toolName === "get_schema") {
                  setAgentStatus({
                    message: "Fetching database schema...",
                    type: "working",
                  });
                }
                break;
              }

              case "tool-result": {
                // Tool result event - output contains the tool's return value
                const output = event.output as
                  | {
                      key?: string;
                      success?: boolean;
                      rows?: unknown[];
                      rowCount?: number;
                      error?: string;
                      schema?: string;
                    }
                  | undefined;

                if (
                  output &&
                  typeof output === "object" &&
                  "success" in output
                ) {
                  const key = output.key || "unknown";

                  if (output.success) {
                    setAgentStatus({
                      message: `Query "${key}" succeeded (${output.rowCount || 0} rows)`,
                      type: "success",
                      queryKey: key,
                    });

                    // Store query results
                    if (output.rows) {
                      collectedResults[key] = output.rows;
                      setQueryResults({ ...collectedResults });
                    }

                    // Update progress count
                    setProgress((prev) => ({
                      ...prev,
                      queriesFound: collectedQueries.length,
                    }));
                  } else {
                    setAgentStatus({
                      message: `Query "${key}" failed: ${output.error}. Retrying...`,
                      type: "retry",
                      queryKey: key,
                    });
                  }
                } else if (
                  output &&
                  typeof output === "object" &&
                  "schema" in output
                ) {
                  setAgentStatus({
                    message: "Schema loaded, generating queries...",
                    type: "working",
                  });
                }
                break;
              }

              case "text-delta": {
                // Text content - accumulate and process
                const text = event.text || "";
                textBuffer += text;

                // Try to parse JSONL patches from the text buffer
                const jsonlLines = textBuffer.split("\n");
                textBuffer = jsonlLines.pop() ?? "";

                for (const jsonlLine of jsonlLines) {
                  const patchParsed = parseStreamLine(jsonlLine);
                  if (
                    patchParsed &&
                    "op" in patchParsed &&
                    "path" in patchParsed
                  ) {
                    currentTree = applyPatch(
                      currentTree,
                      patchParsed as JsonPatch,
                    );
                    setTree({ ...currentTree });
                    patchCount++;
                    setProgress((prev) => ({
                      ...prev,
                      uiPatchesApplied: patchCount,
                    }));
                    setAgentStatus({
                      message: "Building dashboard UI...",
                      type: "working",
                    });
                  }
                }
                break;
              }

              case "finish": {
                // Done event
                setAgentStatus({
                  message: "Dashboard ready!",
                  type: "success",
                });
                break;
              }

              case "error": {
                // Error event
                const errorData = event as { message?: string };
                setAgentStatus({
                  message: `Error: ${errorData.message || "Unknown error"}`,
                  type: "error",
                });
                break;
              }
            }
          }
        }

        // Process remaining text buffer for JSONL
        if (textBuffer.trim()) {
          const jsonlLines = textBuffer.split("\n");
          for (const jsonlLine of jsonlLines) {
            const patchParsed = parseStreamLine(jsonlLine);
            if (patchParsed && "op" in patchParsed && "path" in patchParsed) {
              currentTree = applyPatch(currentTree, patchParsed as JsonPatch);
              setTree({ ...currentTree });
              patchCount++;
              setProgress((prev) => ({
                ...prev,
                uiPatchesApplied: patchCount,
              }));
            }
          }
        }

        setIsStreaming(false);

        // Queries are already executed by the agent, no need for separate execution
        setIsExecutingQueries(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsStreaming(false);
        setAgentStatus({
          message: `Error: ${error.message}`,
          type: "error",
        });
      }
    },
    [dbConfig, filterParams, dataSourceType, fileData, filesData, modelSettings, getEnabledComponents],
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Re-run existing queries with new filter parameters.
   * This is much faster than re-running the full agent.
   * @param newFilterParams - Filter parameters to apply
   * @param queriesToRun - Optional queries to run (for restore, since state updates are async)
   */
  const rerunQueries = useCallback(
    async (
      newFilterParams: Record<string, string>,
      queriesToRun?: SQLQuery[],
    ) => {
      const useQueries = queriesToRun || queries;
      if (useQueries.length === 0) return;

      setIsExecutingQueries(true);
      setIsInitialRun(false);
      setError(null);
      setAgentStatus({ message: "Applying filters...", type: "working" });

      try {
        const response = await fetch("/api/execute-queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queries: useQueries,
            filterParams: newFilterParams,
            dbConfig,
            dataSourceType,
            fileData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.results) {
          setQueryResults(data.results);
        }

        // Update queries with executed SQL for display
        if (data.executedQueries) {
          setQueries((prevQueries) =>
            prevQueries.map((q) => ({
              ...q,
              executedSql: data.executedQueries[q.key] || q.executedSql,
            })),
          );
        }

        if (data.errors && data.errors.length > 0) {
          console.error("Query errors:", data.errors);
          // Show first error message in UI
          const firstError = data.errors[0];
          const errorMessage =
            firstError?.error || `${data.errors.length} query error(s)`;
          setError(new Error(errorMessage));
          setAgentStatus({
            message: errorMessage,
            type: "error",
          });
        } else {
          setError(null); // Clear any previous errors
          setAgentStatus({ message: "Filters applied!", type: "success" });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setAgentStatus({ message: `Error: ${error.message}`, type: "error" });
      } finally {
        setIsExecutingQueries(false);
      }
    },
    [queries, dbConfig, dataSourceType, fileData],
  );

  return {
    tree,
    queries,
    queryResults,
    isStreaming,
    isExecutingQueries,
    isInitialRun,
    error,
    progress,
    agentStatus,
    send,
    clear,
    cancel,
    rerunQueries,
    restoreState,
  };
}

const ACTION_HANDLERS = {
  refresh_data: () => alert("Refreshing data..."),
  export_csv: () => alert("Exporting CSV..."),
};

/**
 * Database Configuration Modal
 */
function DBConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: DBConfig;
  onSave: (config: DBConfig) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleChange = (
    field: keyof DBConfig,
    value: string | number | boolean,
  ) => {
    // When changing database type, update the default port
    if (field === "type") {
      const dbType = value as DatabaseType;
      setFormData({
        ...formData,
        type: dbType,
        port: DEFAULT_PORTS[dbType],
        // Clear SQLite-specific fields when switching away from SQLite
        filename: dbType === "sqlite" ? formData.filename : undefined,
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
    setTestResult(null);
  };

  const isSQLite = formData.type === "sqlite";
  const isDemo = formData.type === "demo";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig: formData }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: "Connection successful!" });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          padding: 24,
          borderRadius: "var(--radius)",
          maxWidth: 500,
          width: "100%",
          margin: 16,
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--foreground)",
          }}
        >
          Database Configuration
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Database Type Selector */}
          <div>
            <label
              htmlFor="db-type"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Database Type
            </label>
            <select
              id="db-type"
              value={formData.type || "postgresql"}
              onChange={(e) => handleChange("type", e.target.value as DatabaseType)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            >
              <option value="demo">Demo Database (Recommended)</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>

          {/* Demo database info */}
          {isDemo && (
            <div
              style={{
                padding: "16px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Sample E-commerce Database</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                Explore DashBee with a pre-configured sample database containing orders, customers, products, and more.
                No credentials required - just connect and start building dashboards!
              </p>
            </div>
          )}

          {/* SQLite-specific: File Path */}
          {isSQLite && (
            <div>
              <label
                htmlFor="db-filename"
                style={{
                  display: "block",
                  fontSize: 14,
                  marginBottom: 4,
                  color: "var(--foreground)",
                }}
              >
                Database File Path
              </label>
              <input
                id="db-filename"
                type="text"
                value={formData.filename || ""}
                onChange={(e) => handleChange("filename", e.target.value)}
                placeholder="/path/to/database.db"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  color: "var(--foreground)",
                }}
              />
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Enter the absolute path to your SQLite database file
              </p>
            </div>
          )}

          {/* Host (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div>
            <label
              htmlFor="db-host"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Host
            </label>
            <input
              id="db-host"
              type="text"
              value={formData.host}
              onChange={(e) => handleChange("host", e.target.value)}
              placeholder="localhost"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            />
          </div>
          )}

          {/* Port (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div>
            <label
              htmlFor="db-port"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Port
            </label>
            <input
              id="db-port"
              type="number"
              value={formData.port}
              onChange={(e) =>
                handleChange("port", parseInt(e.target.value) || DEFAULT_PORTS[formData.type || "postgresql"])
              }
              placeholder={String(DEFAULT_PORTS[formData.type || "postgresql"])}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            />
          </div>
          )}

          {/* Database name (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div>
            <label
              htmlFor="db-database"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Database
            </label>
            <input
              id="db-database"
              type="text"
              value={formData.database}
              onChange={(e) => handleChange("database", e.target.value)}
              placeholder="demo"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            />
          </div>
          )}

          {/* User (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div>
            <label
              htmlFor="db-user"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              User
            </label>
            <input
              id="db-user"
              type="text"
              value={formData.user}
              onChange={(e) => handleChange("user", e.target.value)}
              placeholder={formData.type === "mysql" ? "root" : "postgres"}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            />
          </div>
          )}

          {/* Password (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div>
            <label
              htmlFor="db-password"
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Password
            </label>
            <input
              id="db-password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
              }}
            />
          </div>
          )}

          {/* SSL (not shown for SQLite or Demo) */}
          {!isSQLite && !isDemo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="ssl-checkbox"
              checked={formData.ssl}
              onChange={(e) => handleChange("ssl", e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label
              htmlFor="ssl-checkbox"
              style={{
                fontSize: 14,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              Enable SSL
            </label>
          </div>
          )}

          {testResult && (
            <div
              style={{
                padding: 12,
                borderRadius: "var(--radius)",
                background: testResult.success
                  ? "rgba(22, 163, 74, 0.1)"
                  : "rgba(220, 38, 38, 0.1)",
                border: `1px solid ${testResult.success ? "rgba(22, 163, 74, 0.3)" : "rgba(220, 38, 38, 0.3)"}`,
                fontSize: 14,
                color: "var(--foreground)",
              }}
            >
              {testResult.message}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                cursor: testing ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 16px",
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Auto-generation prompt for showcasing capabilities
const AUTO_GENERATION_PROMPT = "Explore this dataset and create a dashboard with 4-5 interesting visualizations using different charts. Show key insights and trends from the data.";

function DashboardContent() {  
  const [prompt, setPrompt] = useState("");
  const [encodingConfig, setEncodingConfig] = useState<EncodingConfig | null>(null);
  const [showDBConfig, setShowDBConfig] = useState(false);
  const [dbConfig, setDBConfig] = useState<DBConfig>(DEFAULT_DB_CONFIG);
  const [showSwitchSourceModal, setShowSwitchSourceModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCloudStorage, setShowCloudStorage] = useState(false);
  const [cloudStorageError, setCloudStorageError] = useState<string | null>(null);
  const [_uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  // Track actual connection verification status: unknown (not tested), verified (test passed), failed (test failed)
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "verified" | "failed"
  >("unknown");
  // Track the active prompt being generated (for display in dashboard area)
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const { update } = useData();
  const { onRefresh, setEnabled: setRefreshEnabled } = useRefresh();
  const { sourceType, setSourceType, loadFileData, removeFile, clearFileData, fileSource, fileSources, getFileDataForApi, getAllFilesDataForApi } = useDataSource();
  const {
    setFilters,
    filters,
    values,
    setValue,
    getFilterParams,
    clearFilters,
  } = useFilters();
  const { getCSSStyles } = useStylePreset();
  const stylePresetCSS = useMemo(() => getCSSStyles(), [getCSSStyles]);
  const { getApiSettings } = useModelSettings();
  const modelSettingsForApi = useMemo(() => getApiSettings(), [getApiSettings]);
  const { registerChart, clearCharts, isVisible } = useChartVisibility();
  const { getFilteredComponentList } = useChartCatalog();
  const currentFilterParams = useMemo(
    () => getFilterParams(),
    [getFilterParams],
  );

  // Construct file data for API when in file mode (supports multiple files)
  const fileDataForApi = useMemo(() => {
    if (sourceType === "file") {
      // For backward compatibility, return first file if only one
      return getFileDataForApi() || undefined;
    }
    return undefined;
  }, [sourceType, getFileDataForApi]);

  // Get all files data for multi-file support
  const filesDataForApi = useMemo(() => {
    if (sourceType === "file") {
      return getAllFilesDataForApi();
    }
    return undefined;
  }, [sourceType, getAllFilesDataForApi]);

  const {
    tree,
    queries,
    queryResults,
    isStreaming,
    isExecutingQueries,
    isInitialRun,
    error,
    progress,
    agentStatus,
    send,
    clear,
    cancel,
    rerunQueries,
    restoreState,
  } = useSQLDashboardStream(dbConfig, currentFilterParams, sourceType, fileDataForApi, filesDataForApi, modelSettingsForApi, getFilteredComponentList);

  // Filter tree based on chart visibility
  const filteredTree = useMemo(() => {
    if (!tree) return null;

    // Chart component types that can be toggled
    const chartTypes = new Set([
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
    ]);

    // First pass: collect hidden chart IDs
    const hiddenChartIds = new Set<string>();
    for (const [id, element] of Object.entries(tree.elements)) {
      if (chartTypes.has(element.type) && !isVisible(id)) {
        hiddenChartIds.add(id);
      }
    }

    // Helper to check if a Card contains any visible charts
    const cardHasVisibleChart = (element: typeof tree.elements[string]): boolean => {
      const children = element.children || [];
      for (const childId of children) {
        const child = tree.elements[childId];
        if (!child) continue;
        // If child is a visible chart, Card should stay visible
        if (chartTypes.has(child.type) && isVisible(childId)) {
          return true;
        }
        // Recursively check nested containers (Stack, Grid, etc.)
        if (child.children && child.children.length > 0) {
          if (cardHasVisibleChart(child)) {
            return true;
          }
        }
      }
      return false;
    };

    // Helper to check if a Card contains any charts at all
    const cardContainsCharts = (element: typeof tree.elements[string]): boolean => {
      const children = element.children || [];
      for (const childId of children) {
        const child = tree.elements[childId];
        if (!child) continue;
        if (chartTypes.has(child.type)) {
          return true;
        }
        if (child.children && child.children.length > 0) {
          if (cardContainsCharts(child)) {
            return true;
          }
        }
      }
      return false;
    };

    // Create a filtered elements object
    const filteredElements: Record<string, typeof tree.elements[string]> = {};
    for (const [id, element] of Object.entries(tree.elements)) {
      // Hide charts that are not visible
      if (chartTypes.has(element.type) && !isVisible(id)) {
        continue;
      }
      // Hide Cards that contain charts but none are visible
      if (element.type === "Card" && cardContainsCharts(element) && !cardHasVisibleChart(element)) {
        continue;
      }
      filteredElements[id] = element;
    }

    return {
      ...tree,
      elements: filteredElements,
    };
  }, [tree, isVisible]);

  // Extract filter definitions from the UI tree when it changes
  useEffect(() => {
    if (!tree) return;

    const extractedFilters: FilterDefinition[] = [];
    for (const element of Object.values(tree.elements)) {
      // Support both "Filter" (from catalog) and "SQLFilter" (legacy) component types
      if ((element.type === "Filter" || element.type === "SQLFilter") && element.props) {
        const filterProps = element.props as {
          filterId?: string;
          filterType?: "date-range" | "dropdown";
          label?: string;
          column?: string;
          options?: string[];
          multiSelect?: boolean;
          defaultPreset?: string;
        };
        if (
          filterProps.filterId &&
          filterProps.filterType &&
          filterProps.label &&
          filterProps.column
        ) {
          extractedFilters.push({
            id: filterProps.filterId,
            type: filterProps.filterType,
            label: filterProps.label,
            column: filterProps.column,
            options: filterProps.options,
            multiSelect: filterProps.multiSelect,
            defaultPreset:
              filterProps.defaultPreset as FilterDefinition["defaultPreset"],
          });
        }
      }
    }
    if (extractedFilters.length > 0) {
      setFilters(extractedFilters);
    }
  }, [tree, setFilters]);

  // Extract chart components from the UI tree and register them for visibility control
  useEffect(() => {
    if (!tree) {
      clearCharts();
      return;
    }

    // Chart component types that can be toggled
    const chartTypes = new Set([
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
    ]);

    clearCharts();

    for (const [id, element] of Object.entries(tree.elements)) {
      if (chartTypes.has(element.type)) {
        const props = element.props as {
          title?: string;
          label?: string;
          queryKey?: string;
        };
        registerChart({
          id,
          title: props.title || props.label || element.type,
          type: element.type,
          queryKey: props.queryKey,
        });
      }
    }
  }, [tree, registerChart, clearCharts]);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dashb-db-config");
    let configToUse = DEFAULT_DB_CONFIG;

    if (saved) {
      try {
        configToUse = JSON.parse(saved);
        setDBConfig(configToUse);
      } catch {
        // ignore parse errors, use default
      }
    }

    // Auto-connect based on database type
    const shouldAutoConnect =
      configToUse.type === "demo" || // Demo type always auto-connects
      (configToUse.host && configToUse.database && configToUse.password); // Other types need credentials

    if (shouldAutoConnect) {
      (async () => {
        try {
          const res = await fetch("/api/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbConfig: configToUse }),
          });
          setConnectionStatus(res.ok ? "verified" : "failed");
        } catch {
          setConnectionStatus("failed");
        }
      })();
    }

    // Load cached questions
    const savedQuestions = localStorage.getItem("dashb-questions");
    if (savedQuestions) {
      try {
        setSuggestedQuestions(JSON.parse(savedQuestions));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Sync query results to DataProvider
  useEffect(() => {
    update({ queries: queryResults });
  }, [queryResults, update]);

  // Register auto-refresh callback
  useEffect(() => {
    const handleRefresh = () => {
      const params = getFilterParams();
      rerunQueries(params);
    };
    const unsubscribe = onRefresh(handleRefresh);
    return unsubscribe;
  }, [onRefresh, getFilterParams, rerunQueries]);

  // Disable auto-refresh when switching to file mode (files don't change like databases do)
  useEffect(() => {
    if (sourceType === "file") {
      setRefreshEnabled(false);
    }
  }, [sourceType, setRefreshEnabled]);

  // Dashboard export handlers
  const handleExportDashboardPng = useCallback(async () => {
    if (dashboardRef.current) {
      await exportDashboardToPng(dashboardRef.current, { title: prompt || "dashboard" });
    }
    setShowExportMenu(false);
  }, [prompt]);

  const handleExportDashboardPdf = useCallback(async () => {
    if (dashboardRef.current) {
      await exportDashboardToPdf(dashboardRef.current, { title: prompt || "dashboard" });
    }
    setShowExportMenu(false);
  }, [prompt]);

  const handleSaveDBConfig = async (config: DBConfig) => {
    setDBConfig(config);
    if (typeof window !== "undefined") {
      localStorage.setItem("dashb-db-config", JSON.stringify(config));
    }
    setShowDBConfig(false);

    // Test connection automatically when saving config
    setConnectionStatus("unknown");
    try {
      const testResponse = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig: config }),
      });
      if (testResponse.ok) {
        setConnectionStatus("verified");
      } else {
        setConnectionStatus("failed");
        console.warn("Database connection test failed on config save");
      }
    } catch (err) {
      setConnectionStatus("failed");
      console.error("Failed to test database connection:", err);
    }

    // Generate questions for the new database
    setLoadingQuestions(true);
    let questionsGenerated = false;
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig: config }),
      });
      if (response.ok) {
        const { questions } = await response.json();
        if (questions && questions.length > 0) {
          setSuggestedQuestions(questions);
          localStorage.setItem(
            "dashb-questions",
            JSON.stringify(questions),
          );
          questionsGenerated = true;
        }
      }
    } catch (err) {
      console.error("Failed to generate questions:", err);
    } finally {
      setLoadingQuestions(false);
    }

    // Auto-generate initial dashboard to showcase capabilities
    if (questionsGenerated) {
      triggerAutoGeneration(AUTO_GENERATION_PROMPT);
    }
  };

  // Handle restoring a dashboard from history
  const handleRestoreDashboard = useCallback(
    async (entry: HistoryEntry) => {
      if (!entry.tree || !entry.queries) {
        // Fallback: just set the prompt
        setPrompt(entry.prompt);
        return;
      }

      // Restore filters if present
      if (entry.filters && entry.filterValues) {
        setFilters(entry.filters);
        // Manually set filter values
        for (const [id, value] of Object.entries(entry.filterValues)) {
          setValue(id, value);
        }
      }

      // Restore state
      restoreState(entry.tree, entry.queries);
      setPrompt(entry.prompt);

      // Re-execute queries with filter params
      if (entry.queries.length > 0) {
        const filterParams = entry.filterValues
          ? Object.entries(entry.filterValues).reduce(
              (acc, [key, val]) => {
                if (val !== null && val !== undefined) {
                  if (typeof val === "object" && "from" in val) {
                    // Date range
                    const filter = entry.filters?.find((f) => f.id === key);
                    if (filter) {
                      acc[`${filter.column}_from`] = val.from;
                      acc[`${filter.column}_to`] = val.to;
                    }
                  } else if (Array.isArray(val) && val.length > 0) {
                    const filter = entry.filters?.find((f) => f.id === key);
                    if (filter) {
                      acc[filter.column] = val.join(",");
                    }
                  } else if (typeof val === "string") {
                    const filter = entry.filters?.find((f) => f.id === key);
                    if (filter) {
                      acc[filter.column] = val;
                    }
                  }
                }
                return acc;
              },
              {} as Record<string, string>,
            )
          : {};
        await rerunQueries(filterParams, entry.queries);
      }
    },
    [restoreState, setFilters, setValue, rerunQueries],
  );

  // Track submitted prompt for history
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [wasStreaming, setWasStreaming] = useState(false);

  // Derived state - moved up for use in effect
  const hasElements = tree && Object.keys(tree.elements).length > 0;

  // Use refs to capture current values for history saving (avoids stale closure)
  const dashboardStateRef = useRef({ tree, queries, filters, filterValues: values });
  useEffect(() => {
    dashboardStateRef.current = { tree, queries, filters, filterValues: values };
  }, [tree, queries, filters, values]);

  // Save to history when streaming completes
  useEffect(() => {
    if (wasStreaming && !isStreaming && submittedPrompt) {
      const success = !error && !!hasElements;
      // Use ref to get current values (not stale closure)
      const { tree: currentTree, queries: currentQueries, filters: currentFilters, filterValues: currentValues } = dashboardStateRef.current;
      // Save complete dashboard state for future restoration
      addToHistory(submittedPrompt, success, dbConfig.database, {
        tree: currentTree,
        queries: currentQueries,
        filters: currentFilters,
        filterValues: currentValues,
      });
      setSubmittedPrompt(null);
    }
    setWasStreaming(isStreaming);
  }, [
    isStreaming,
    wasStreaming,
    submittedPrompt,
    error,
    hasElements,
    dbConfig.database,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;

      // Combine prompt with encoding hints if available
      const encodingHint = encodingToPromptHint(encodingConfig);
      const fullPrompt = encodingHint
        ? `${prompt.trim()} ${encodingHint}`
        : prompt;

      setSubmittedPrompt(prompt); // Store original prompt for display
      setActivePrompt(prompt);
      await send(fullPrompt);
    },
    [prompt, send, encodingConfig],
  );

  // Function to trigger auto-generation with a specific prompt
  // Accepts optional file data to bypass race condition when called immediately after file upload
  const triggerAutoGeneration = useCallback(
    async (autoPrompt: string, fileDataForGeneration?: { fileData?: FileDataSource; filesData?: FileDataSource[] }) => {
      setPrompt(autoPrompt);
      setSubmittedPrompt(autoPrompt);
      setActivePrompt(autoPrompt);
      await send(autoPrompt, fileDataForGeneration ? { fileDataOverride: fileDataForGeneration.fileData, filesDataOverride: fileDataForGeneration.filesData } : undefined);
    },
    [send],
  );

  // Handle cancel - clear active prompt
  const handleCancel = useCallback(() => {
    cancel();
    setActivePrompt(null);
  }, [cancel]);

  // Helper function to infer column types from data
  const inferColumnTypes = useCallback((data: Record<string, unknown>[], columns: string[]): { name: string; type: string }[] => {
    return columns.map(col => {
      // Sample first 10 non-null values to infer type
      const samples = data.slice(0, 10).map(row => row[col]).filter(v => v !== null && v !== undefined);
      if (samples.length === 0) return { name: col, type: "unknown" };

      const sample = samples[0];
      let type = "text";

      if (typeof sample === "number") {
        type = Number.isInteger(sample) ? "integer" : "numeric";
      } else if (typeof sample === "boolean") {
        type = "boolean";
      } else if (sample instanceof Date) {
        type = "date";
      } else if (typeof sample === "string") {
        // Try to detect date strings
        if (!isNaN(Date.parse(sample)) && sample.match(/^\d{4}-\d{2}-\d{2}/)) {
          type = "date";
        } else if (!isNaN(Number(sample))) {
          type = "numeric";
        }
      }

      return { name: col, type };
    });
  }, []);

  // File upload handlers
  const handleFileUploaded = useCallback(async (file: UploadedFile) => {
    setUploadedFile(file);
    // Use the file name (without extension) as the table name
    const tableName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    loadFileData(tableName, file.data, file.name, file.type);
    setSourceType("file");

    // Set temporary questions while loading (will be replaced by LLM-generated ones)
    setSuggestedQuestions([]);
    setLoadingQuestions(true);

    let questionsGenerated = false;
    try {
      // Infer column types and generate questions via LLM
      const columnTypes = inferColumnTypes(file.data, file.columns);
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileSchema: {
            tableName,
            columns: columnTypes,
            sampleData: file.data.slice(0, 10),
            fileName: file.name,
            fileType: file.type,
          },
        }),
      });

      if (response.ok) {
        const { questions } = await response.json();
        if (questions && questions.length > 0) {
          setSuggestedQuestions(questions);
          questionsGenerated = true;
        } else {
          // Fallback to generic questions if LLM fails
          setSuggestedQuestions([
            `Show summary statistics for ${tableName}`,
            `Display all columns from ${tableName} as a table`,
            `Create a chart showing distribution of data`,
            `Show top 10 rows from ${tableName}`,
          ]);
          questionsGenerated = true;
        }
      } else {
        // Fallback on error
        setSuggestedQuestions([
          `Show summary statistics for ${tableName}`,
          `Display all columns from ${tableName} as a table`,
          `Create a chart showing distribution of data`,
          `Show top 10 rows from ${tableName}`,
        ]);
        questionsGenerated = true;
      }
    } catch (err) {
      console.error("Failed to generate questions for file:", err);
      // Fallback on error
      setSuggestedQuestions([
        `Show summary statistics for ${tableName}`,
        `Display all columns from ${tableName} as a table`,
        `Create a chart showing distribution of data`,
        `Show top 10 rows from ${tableName}`,
      ]);
      questionsGenerated = true;
    } finally {
      setLoadingQuestions(false);
    }

    // Auto-generate initial dashboard to showcase capabilities
    // Pass file data directly to bypass race condition (state hasn't updated yet)
    // Limit to 100 sample rows to avoid token explosion in LLM context
    if (questionsGenerated) {
      const MAX_SAMPLE_ROWS = 100;
      const sampledData = file.data.slice(0, MAX_SAMPLE_ROWS);
      const fileDataForGeneration = {
        fileData: { tableName, data: sampledData },
        filesData: [{ tableName, data: sampledData }],
      };
      triggerAutoGeneration(AUTO_GENERATION_PROMPT, fileDataForGeneration);
    }
  }, [loadFileData, setSourceType, inferColumnTypes, triggerAutoGeneration]);

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    clearFileData();
    setSourceType("database");
    // Restore default questions
    const savedQuestions = localStorage.getItem("dashb-questions");
    if (savedQuestions) {
      try {
        setSuggestedQuestions(JSON.parse(savedQuestions));
      } catch {
        setSuggestedQuestions([]);
      }
    }
  }, [clearFileData, setSourceType]);

  // Disconnect from all data sources and return to initial state
  const handleDisconnect = useCallback(() => {
    // Clear database config from state and localStorage
    setDBConfig({
      type: "postgresql",
      host: "",
      port: 5432,
      database: "",
      user: "",
      password: "",
      ssl: false,
    });
    setConnectionStatus("unknown");
    localStorage.removeItem("dashb-db-config");
    // Clear file data
    setUploadedFile(null);
    clearFileData();
    // Reset to database mode (default)
    setSourceType("database");
    // Clear dashboard state (tree, queries, results, errors)
    clear();
    setFilters([]);
    setPrompt("");
    setSuggestedQuestions([]);
    // Clear saved questions from localStorage
    localStorage.removeItem("dashb-questions");
  }, [clearFileData, setSourceType, setFilters, clear]);

  // Fallback to generic examples if no suggestions yet
  const defaultExamples = sourceType === "file"
    ? fileSource
      ? [
          `Show summary of ${fileSource.tableName} with key insights`,
          `Display data as a table with key insights`,
          `Create a chart from the data with key insights`,
          `Show top 10 rows with key insights`,
        ]
      : [
          "Upload a file to get started",
          "Supports CSV, Excel, JSON, Parquet",
        ]
    : [
        "Show total revenue and order count with key insights",
        "Top 5 customers by order amount with key insights",
        "Products with low stock (below 50) with key insights",
        "Orders by region as a bar chart with key insights",
      ];
  const displayQuestions =
    suggestedQuestions.length > 0 ? suggestedQuestions : defaultExamples;
  const isLoading = isStreaming || isExecutingQueries;
  // Only show as configured after mount to avoid hydration mismatch
  // For file mode, require fileSource to be set (file actually uploaded)
  const isConfigured =
    mounted && ((dbConfig.password && dbConfig.host && dbConfig.database) || (sourceType === "file" && fileSource !== null));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 32px" }}>
      {/* Database Configuration Modal */}
      {showDBConfig && (
        <DBConfigModal
          config={dbConfig}
          onSave={handleSaveDBConfig}
          onClose={() => setShowDBConfig(false)}
        />
      )}

      {/* Switch Data Source Modal */}
      {showSwitchSourceModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowSwitchSourceModal(false)}
        >
          <div
            style={{
              background: "var(--card)",
              padding: 24,
              borderRadius: "var(--radius)",
              maxWidth: 500,
              width: "100%",
              margin: 16,
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              Switch Data Source
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted)" }}>
              Choose a new data source. This will clear your current dashboard.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Database Option */}
              <button
                onClick={() => {
                  handleDisconnect();
                  setSourceType("database");
                  setShowSwitchSourceModal(false);
                  setShowDBConfig(true);
                }}
                style={{
                  padding: 20,
                  background: "var(--background)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Database size={24} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Database</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Connect to PostgreSQL, MySQL, or SQLite
                </p>
              </button>

              {/* File Option */}
              <button
                onClick={() => {
                  handleDisconnect();
                  setSourceType("file");
                  setShowSwitchSourceModal(false);
                }}
                style={{
                  padding: 20,
                  background: "var(--background)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Upload size={24} style={{ color: "var(--success)" }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Upload File</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  CSV, Excel, JSON, or Parquet files
                </p>
              </button>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowSwitchSourceModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <LogoIcon />
              <h1
                style={{
                  margin: 0,
                  fontSize: 32,
                  fontWeight: 600,
                  fontFamily: "var(--font-serif)",
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, var(--primary, #0ea5e9) 0%, var(--primary-light, #06b6d4) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                DashBee
              </h1>
            </Link>
            <p
              style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 16 }}
            >
              Generate dashboards from natural language. 
              <br />
              AI writes SQL + UI.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HistoryPanel
              onSelectPrompt={setPrompt}
              onRestoreDashboard={handleRestoreDashboard}
              currentDbName={dbConfig.database}
            />
            <ModelSettings />
            <ThemeToggle />
            {/* Data Source Status Button */}
            {sourceType === "file" && fileSource ? (
              <button
                onClick={handleDisconnect}
                style={{
                  padding: "8px 16px",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "var(--foreground)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                title={`File: ${fileSource.fileName} (${fileSource.rowCount} rows)`}
              >
                <Upload size={16} style={{ color: "var(--success)" }} />
                <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileSource.fileName}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--success)",
                  }}
                  title="File loaded"
                />
              </button>
            ) : (
              <button
                onClick={() => setShowDBConfig(true)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                title="Configure Data Source"
              >
                <Database size={16} />
                <span>Sources</span>
                {isConfigured && sourceType === "database" && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        connectionStatus === "verified"
                          ? "var(--success)"
                          : connectionStatus === "failed"
                            ? "var(--destructive)"
                            : "var(--warning)",
                    }}
                    title={
                      connectionStatus === "verified"
                        ? "Connected"
                        : connectionStatus === "failed"
                          ? "Connection failed"
                          : "Connection not verified"
                    }
                  />
                )}
              </button>
            )}
            {isConfigured && (
              <button
                onClick={() => setShowSwitchSourceModal(true)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
                title="Switch to a different data source"
              >
                <ArrowLeftRight size={16} />
                <span>Switch</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Data Source Selector */}
      {!isConfigured && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "var(--foreground)" }}>
            Choose Data Source
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Database Option */}
            <div
              style={{
                padding: 20,
                background: sourceType === "database" ? "rgba(59, 130, 246, 0.1)" : "var(--card)",
                borderRadius: "var(--radius)",
                border: `2px solid ${sourceType === "database" ? "rgba(59, 130, 246, 0.5)" : "var(--border)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => setSourceType("database")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Database size={24} style={{ color: sourceType === "database" ? "var(--primary)" : "var(--muted)" }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {dbConfig.type === "demo" ? "Demo Database" : "Database"}
                </h4>
                {dbConfig.type === "demo" && (
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "var(--primary)",
                    borderRadius: 10,
                    fontWeight: 500,
                  }}>
                    Recommended
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--muted)" }}>
                {dbConfig.type === "demo"
                  ? "Sample e-commerce database - ready to explore!"
                  : "Connect to PostgreSQL, MySQL, or SQLite"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    background: "var(--accent)",
                    borderRadius: 4,
                  }}>
                    {connectionStatus === "verified" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />}
                    {connectionStatus === "failed" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--destructive)" }} />}
                    {connectionStatus === "unknown" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} />}
                    {dbConfig.type === "demo" ? "Demo Database" : `${dbConfig.database}@${dbConfig.host}`}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDBConfig(true); }}
                  style={{
                    padding: "8px 16px",
                    background: connectionStatus === "verified" ? "transparent" : "var(--foreground)",
                    color: connectionStatus === "verified" ? "var(--foreground)" : "var(--background)",
                    border: connectionStatus === "verified" ? "1px solid var(--border)" : "none",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {connectionStatus === "verified" ? "Change Database" : connectionStatus === "failed" ? "Fix Connection" : "Connect"}
                </button>
              </div>
            </div>

            {/* File Upload Option */}
            <div
              style={{
                padding: 20,
                background: sourceType === "file" ? "rgba(34, 197, 94, 0.1)" : "var(--card)",
                borderRadius: "var(--radius)",
                border: `2px solid ${sourceType === "file" ? "rgba(34, 197, 94, 0.5)" : "var(--border)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => {
                setSourceType("file");
                setSuggestedQuestions([]); // Clear old database questions
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Upload size={24} style={{ color: sourceType === "file" ? "var(--success)" : "var(--muted)" }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Upload Files</h4>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--muted)" }}>
                CSV, Excel, JSON, or Parquet files (multiple files supported)
              </p>
              <MultiFileUpload
                onFileUploaded={handleFileUploaded}
                onRemoveFile={removeFile}
                onClearAll={handleClearFile}
                uploadedFiles={fileSources}
                disabled={isLoading}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCloudStorage(true);
                }}
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <Cloud size={16} />
                Load from Cloud Storage (S3/GCS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Storage Browser Modal */}
      {showCloudStorage && (
        <CloudStorageBrowser
          onClose={() => {
            setShowCloudStorage(false);
            setCloudStorageError(null);
          }}
          onFileSelect={async (fileName, fileData) => {
            setCloudStorageError(null);
            try {
              // Parse the Parquet file from ArrayBuffer
              const { parseParquetBuffer } = await import("@/lib/parquet-parser");
              const result = await parseParquetBuffer(fileData);
              // Generate table name from file name (without extension)
              const tableName = fileName.replace(/\.parquet$/i, "").replace(/[^a-zA-Z0-9_]/g, "_");
              // Load the parsed data into the in-memory database
              loadFileData(tableName, result.rows, fileName, "parquet");
              setShowCloudStorage(false);
              setSourceType("file");
            } catch (err) {
              console.error("Failed to parse cloud storage file:", err);
              setCloudStorageError(err instanceof Error ? err.message : "Failed to parse cloud storage file");
            }
          }}
        />
      )}

      {/* Cloud Storage Error Alert */}
      {cloudStorageError && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10001,
            padding: "12px 24px",
            background: "var(--destructive)",
            color: "white",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <span>⚠️ {cloudStorageError}</span>
          <button
            onClick={() => setCloudStorageError(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* File Source Active Indicator */}
      {sourceType === "file" && fileSources.length > 0 && isConfigured && (
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Upload size={20} style={{ color: "var(--success)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {fileSources.length === 1 ? (
                  <>Using file: <span style={{ color: "var(--success)" }}>{fileSources[0]!.fileName}</span></>
                ) : (
                  <>Using <span style={{ color: "var(--success)" }}>{fileSources.length} files</span></>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {fileSources.length === 1 ? (
                  <>Table: {fileSources[0]!.tableName} • {fileSources[0]!.rowCount.toLocaleString()} rows • {fileSources[0]!.columns.length} columns</>
                ) : (
                  <>Tables: {fileSources.map(f => f.tableName).join(", ")} • {fileSources.reduce((sum, f) => sum + f.rowCount, 0).toLocaleString()} total rows</>
                )}
              </div>
            </div>
            <button
              onClick={handleClearFile}
              style={{
                padding: "6px 12px",
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Switch to Database
            </button>
          </div>
          {/* Show table list for multi-file */}
          {fileSources.length > 1 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(34, 197, 94, 0.2)" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Loaded tables:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {fileSources.map((file) => (
                  <div
                    key={file.tableName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 8px",
                      background: "var(--card)",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    <code style={{ fontWeight: 500 }}>{file.tableName}</code>
                    <span style={{ color: "var(--muted)" }}>({file.rowCount.toLocaleString()} rows)</span>
                    <button
                      onClick={() => removeFile(file.tableName)}
                      style={{
                        padding: 2,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        lineHeight: 0,
                      }}
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the dashboard you want..."
            disabled={isLoading || !isConfigured}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--foreground)",
              fontSize: 16,
              outline: "none",
            }}
          />
          <GenerationSettings />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim() || !isConfigured}
            style={{
              padding: "12px 24px",
              background:
                isLoading || !isConfigured
                  ? "var(--border)"
                  : "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: 16,
              fontWeight: 500,
              opacity: isLoading || !prompt.trim() || !isConfigured ? 0.5 : 1,
            }}
          >
            {isLoading ? "Generating..." : "Generate"}
          </button>
          {hasElements && (
            <button
              type="button"
              onClick={() => {
                setPrompt("");
                clear();
                clearFilters();
              }}
              disabled={isLoading}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 16,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Visual Encoding Shelves - optional column mapping before generation */}
        <EncodingShelf
          dbConfig={sourceType === "database" ? dbConfig : undefined}
          fileColumns={
            sourceType === "file" && fileSources.length > 0
              ? fileSources[0]!.columns
              : undefined
          }
          onEncodingChange={setEncodingConfig}
          encoding={encodingConfig}
          isConfigured={!!isConfigured}
          isFileSource={sourceType === "file"}
        />

        {/* Always show questions when configured */}
        {isConfigured && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {loadingQuestions ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--muted)",
                  fontSize: 14,
                }}
              >
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <span>Generating questions...</span>
              </div>
            ) : (
              displayQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setPrompt(q);
                    setActivePrompt(q);
                    setSubmittedPrompt(q);
                    send(q);
                  }}
                  disabled={isLoading}
                  style={{
                    padding: "8px 16px",
                    background: "var(--card)",
                    color: isLoading ? "var(--muted)" : "var(--foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {q}
                </button>
              ))
            )}
          </div>
        )}
      </form>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            background: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertCircle
            size={20}
            style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 4,
                color: "var(--foreground)",
              }}
            >
              Error
            </div>
            <div style={{ color: "var(--muted)" }}>
              {error.message === "Failed to fetch"
                ? "Network error. Please check your connection and try again."
                : error.message.startsWith("HTTP error:")
                  ? `Server error (${error.message}). Please try again.`
                  : error.message}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {filters.length > 0 && (
        <FilterBar
          onRefresh={() => {
            // Re-run queries with updated filter params (faster than re-running agent)
            const params = getFilterParams();
            rerunQueries(params);
          }}
          isRefreshing={isStreaming || isExecutingQueries}
        />
      )}

      {/* SQL Queries Panel */}
      {queries.length > 0 && (
        <details
          style={{ marginBottom: 24 }}
          open={isInitialRun && isExecutingQueries}
        >
          <summary
            style={{ cursor: "pointer", fontSize: 14, color: "var(--muted)" }}
          >
            SQL Queries ({queries.length})
            {isExecutingQueries && " - Executing..."}
          </summary>
          <div
            style={{
              marginTop: 8,
              padding: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            {queries.map((q, i) => (
              <div
                key={i}
                style={{ marginBottom: i < queries.length - 1 ? 16 : 0 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginBottom: 4,
                  }}
                >
                  {q.key}
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "var(--background)",
                    borderRadius: 4,
                    fontSize: 12,
                    overflow: "auto",
                  }}
                >
                  {q.executedSql || q.sql}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Dashboard Actions Toolbar */}
      {hasElements && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            marginBottom: 16,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
            Dashboard Actions
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Chart visibility and style controls */}
            <ChartVisibilitySelector />
            <StylePresetSelector />
            {/* Auto-refresh only available for database connections, not files */}
            {sourceType === "database" && <RefreshSettings />}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
                title="Export Dashboard"
              >
                <Download size={14} />
                Export
              </button>
              {showExportMenu && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 100,
                    }}
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      minWidth: 140,
                      zIndex: 101,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={handleExportDashboardPng}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "transparent",
                        color: "var(--foreground)",
                        border: "none",
                        textAlign: "left",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Export as PNG
                    </button>
                    <button
                      onClick={handleExportDashboardPdf}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "transparent",
                        color: "var(--foreground)",
                        border: "none",
                        textAlign: "left",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Export as PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        ref={dashboardRef}
        style={{
          minHeight: 300,
          padding: 24,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          ...stylePresetCSS,
        }}
      >
        {isLoading && !hasElements ? (
          // Loading state - show spinner with prompt and cancel button
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
            }}
          >
            <Loader2
              size={48}
              style={{
                margin: "0 auto 20px",
                color: "var(--primary)",
                animation: "spin 1s linear infinite",
              }}
            />
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--foreground)" }}>
              Generating Dashboard
            </h3>
            {activePrompt && (
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--muted)", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                &ldquo;{activePrompt}&rdquo;
              </p>
            )}
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--muted)" }}>
              {agentStatus.message || "Starting agent..."}
            </p>
            {progress.queriesFound > 0 && (
              <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--muted)" }}>
                {progress.queriesFound} {progress.queriesFound === 1 ? "query" : "queries"} validated
                {progress.uiPatchesApplied > 0 && ` • ${progress.uiPatchesApplied} UI patches`}
              </p>
            )}
            {progress.queriesFound === 0 && <div style={{ marginBottom: 12 }} />}
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 20px",
                background: "transparent",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        ) : !hasElements ? (
          // Empty state
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--muted)",
            }}
          >
            <p style={{ margin: 0 }}>
              Enter a prompt to generate a SQL-powered dashboard
            </p>
          </div>
        ) : tree ? (
          <ErrorBoundary
            onReset={() => {
              // Attempt to recover by clearing the tree
              clear();
            }}
          >
            <Renderer
              tree={filteredTree}
              registry={componentRegistry}
              loading={isLoading}
            />
          </ErrorBoundary>
        ) : null}
      </div>

      {hasElements && (
        <details style={{ marginTop: 24 }}>
          <summary
            style={{ cursor: "pointer", fontSize: 14, color: "var(--muted)" }}
          >
            View JSON
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "auto",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {JSON.stringify({ tree, queryResults }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DataProvider>
      <VisibilityProvider>
        <ActionProvider handlers={ACTION_HANDLERS}>
          <FilterProvider>
            <RefreshProvider>
              <DataSourceProvider>
                <StylePresetProvider>
                  <ModelSettingsProvider>
                    <ChartVisibilityProvider>
                      <ChartCatalogProvider>
                        <CloudStorageProvider>
                          <SavedQueriesProvider>
                            <SQLLearningsProvider>
                              <ColumnAnnotationsProvider>
                                <DrillDownProvider>
                                  <DashboardContent />
                                  <DrillDownModal />
                                </DrillDownProvider>
                              </ColumnAnnotationsProvider>
                            </SQLLearningsProvider>
                          </SavedQueriesProvider>
                        </CloudStorageProvider>
                      </ChartCatalogProvider>
                    </ChartVisibilityProvider>
                  </ModelSettingsProvider>
                </StylePresetProvider>
              </DataSourceProvider>
            </RefreshProvider>
          </FilterProvider>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}
