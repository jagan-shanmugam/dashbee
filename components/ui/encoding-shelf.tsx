"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Columns,
  X,
  Loader2,
  BarChart3,
  AlertCircle,
} from "lucide-react";

/**
 * Column information from schema
 */
export interface SchemaColumn {
  name: string;
  type: string;
  tableName?: string;
}

/**
 * Selected encoding configuration
 */
export interface EncodingConfig {
  xAxis?: string;
  yAxis?: string;
  color?: string;
  size?: string;
  chartType?: "bar" | "line" | "pie" | "area" | "scatter";
}

interface EncodingShelfProps {
  /** Database configuration for fetching schema */
  dbConfig?: {
    type: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  /** Columns from file source (alternative to fetching schema) */
  fileColumns?: Array<{ name: string; type: string }>;
  /** Callback when encoding configuration changes */
  onEncodingChange: (config: EncodingConfig | null) => void;
  /** Current encoding configuration */
  encoding?: EncodingConfig | null;
  /** Whether the data source is configured */
  isConfigured: boolean;
  /** Whether we're using file source */
  isFileSource: boolean;
}

/**
 * Visual Encoding Shelves Component
 *
 * Allows users to pre-specify column mappings for chart generation.
 * Implements the Data Formulator 2 concept of blending GUI + NL.
 */
export function EncodingShelf({
  dbConfig,
  fileColumns,
  onEncodingChange,
  encoding,
  isConfigured,
  isFileSource,
}: EncodingShelfProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [columns, setColumns] = useState<SchemaColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local encoding state
  const [localEncoding, setLocalEncoding] = useState<EncodingConfig>({
    chartType: "bar",
  });

  // Fetch schema columns for database source
  const fetchSchema = useCallback(async () => {
    if (!dbConfig || isFileSource) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch schema");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract columns from tables
      const allColumns: SchemaColumn[] = [];
      for (const table of data.tables || []) {
        for (const col of table.columns || []) {
          allColumns.push({
            name: col.name,
            type: col.type,
            tableName: table.name,
          });
        }
      }

      setColumns(allColumns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, [dbConfig, isFileSource]);

  // Use file columns if available
  useEffect(() => {
    if (isFileSource && fileColumns) {
      setColumns(
        fileColumns.map((col) => ({
          name: col.name,
          type: col.type,
        }))
      );
    }
  }, [isFileSource, fileColumns]);

  // Fetch schema when expanded and using database source
  useEffect(() => {
    if (isExpanded && isConfigured && !isFileSource && columns.length === 0) {
      fetchSchema();
    }
  }, [isExpanded, isConfigured, isFileSource, columns.length, fetchSchema]);

  // Determine numeric columns for Y-axis and Size
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      const type = col.type.toLowerCase();
      return (
        type.includes("int") ||
        type.includes("decimal") ||
        type.includes("numeric") ||
        type.includes("float") ||
        type.includes("double") ||
        type.includes("number") ||
        type === "bigint" ||
        type === "smallint" ||
        type === "real"
      );
    });
  }, [columns]);

  // Handle encoding change
  const handleEncodingChange = useCallback(
    (field: keyof EncodingConfig, value: string | undefined) => {
      const newEncoding = { ...localEncoding, [field]: value };
      setLocalEncoding(newEncoding);

      // Only emit if at least one axis is set
      if (newEncoding.xAxis || newEncoding.yAxis) {
        onEncodingChange(newEncoding);
      } else {
        onEncodingChange(null);
      }
    },
    [localEncoding, onEncodingChange]
  );

  // Clear all encodings
  const clearEncodings = useCallback(() => {
    setLocalEncoding({ chartType: "bar" });
    onEncodingChange(null);
  }, [onEncodingChange]);

  // Check if any encodings are set
  const hasEncodings = encoding?.xAxis || encoding?.yAxis;

  // Don't render if not configured
  if (!isConfigured) return null;

  // Dropdown style
  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: "8px 12px",
    fontSize: 13,
    background: "var(--card)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    minWidth: 120,
  };

  // Label style
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 500,
    marginBottom: 4,
  };

  return (
    <div
      style={{
        marginBottom: 16,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--foreground)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Columns size={16} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Visual Encoding
          </span>
          {hasEncodings && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "var(--accent)",
                borderRadius: 10,
                color: "var(--foreground)",
              }}
            >
              {[encoding?.xAxis, encoding?.yAxis, encoding?.color, encoding?.size]
                .filter(Boolean)
                .length}{" "}
              columns mapped
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={16} style={{ color: "var(--muted)" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--muted)" }} />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Description */}
          <p
            style={{
              fontSize: 13,
              color: "var(--muted)",
              margin: "12px 0",
              lineHeight: 1.5,
            }}
          >
            Optionally specify column mappings to guide chart generation. The AI
            will use these as hints when creating visualizations.
          </p>

          {/* Loading state */}
          {isLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--muted)",
                padding: "16px 0",
              }}
            >
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span style={{ fontSize: 13 }}>Loading schema...</span>
            </div>
          )}

          {/* Error state - elegant design */}
          {error && (
            <div
              style={{
                padding: "16px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--destructive)",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                <AlertCircle size={14} />
                Connection Issue
              </div>
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                {error}. Check your database configuration or try the demo database.
              </p>
            </div>
          )}

          {/* Encoding controls */}
          {!isLoading && columns.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {/* Chart Type */}
              <div>
                <div style={labelStyle}>
                  <BarChart3
                    size={12}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Chart Type
                </div>
                <select
                  value={localEncoding.chartType || "bar"}
                  onChange={(e) =>
                    handleEncodingChange(
                      "chartType",
                      e.target.value as EncodingConfig["chartType"]
                    )
                  }
                  style={selectStyle}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="scatter">Scatter Plot</option>
                </select>
              </div>

              {/* X-Axis */}
              <div>
                <div style={labelStyle}>X-Axis (Category)</div>
                <select
                  value={localEncoding.xAxis || ""}
                  onChange={(e) =>
                    handleEncodingChange(
                      "xAxis",
                      e.target.value || undefined
                    )
                  }
                  style={selectStyle}
                >
                  <option value="">— Select column —</option>
                  {columns.map((col) => (
                    <option key={`${col.tableName || ""}-${col.name}`} value={col.name}>
                      {col.name}
                      {col.tableName ? ` (${col.tableName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Y-Axis */}
              <div>
                <div style={labelStyle}>Y-Axis (Value)</div>
                <select
                  value={localEncoding.yAxis || ""}
                  onChange={(e) =>
                    handleEncodingChange(
                      "yAxis",
                      e.target.value || undefined
                    )
                  }
                  style={selectStyle}
                >
                  <option value="">— Select column —</option>
                  {numericColumns.length > 0
                    ? numericColumns.map((col) => (
                        <option key={`${col.tableName || ""}-${col.name}`} value={col.name}>
                          {col.name}
                          {col.tableName ? ` (${col.tableName})` : ""}
                        </option>
                      ))
                    : columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                          {col.tableName ? ` (${col.tableName})` : ""}
                        </option>
                      ))}
                </select>
              </div>

              {/* Color (optional) */}
              <div>
                <div style={labelStyle}>Color (Optional)</div>
                <select
                  value={localEncoding.color || ""}
                  onChange={(e) =>
                    handleEncodingChange(
                      "color",
                      e.target.value || undefined
                    )
                  }
                  style={selectStyle}
                >
                  <option value="">— None —</option>
                  {columns.map((col) => (
                    <option key={`${col.tableName || ""}-${col.name}`} value={col.name}>
                      {col.name}
                      {col.tableName ? ` (${col.tableName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* No columns message */}
          {!isLoading && columns.length === 0 && !error && (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              {isFileSource
                ? "No columns detected in file"
                : "Connect to a database to see available columns"}
            </div>
          )}

          {/* Clear button */}
          {hasEncodings && (
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={clearEncodings}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  fontSize: 13,
                  background: "transparent",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                <X size={14} />
                Clear mappings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Generate prompt hint from encoding configuration
 */
export function encodingToPromptHint(encoding: EncodingConfig | null): string {
  if (!encoding) return "";

  const hints: string[] = [];

  if (encoding.chartType) {
    hints.push(`Use a ${encoding.chartType} chart`);
  }

  if (encoding.xAxis) {
    hints.push(`with "${encoding.xAxis}" on the X-axis`);
  }

  if (encoding.yAxis) {
    hints.push(`and "${encoding.yAxis}" on the Y-axis`);
  }

  if (encoding.color) {
    hints.push(`colored by "${encoding.color}"`);
  }

  if (encoding.size) {
    hints.push(`sized by "${encoding.size}"`);
  }

  return hints.length > 0 ? hints.join(" ") + "." : "";
}
