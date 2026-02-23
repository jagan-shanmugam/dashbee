"use client";

import { useEffect, useCallback, useState, type ReactNode } from "react";
import { X, Table, BarChart3 } from "lucide-react";

export interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Raw data for showing in table view */
  data?: Array<Record<string, unknown>>;
  /** Summary statistics to display */
  stats?: Array<{ label: string; value: string | number }>;
  /** Columns configuration for data table */
  columns?: Array<{ key: string; label: string }>;
  /** Optional toolbar content (e.g., chart type selector) */
  toolbar?: ReactNode;
}

export function FullscreenModal({
  isOpen,
  onClose,
  title,
  children,
  data,
  stats,
  columns,
  toolbar,
}: FullscreenModalProps) {
  const [showDataTable, setShowDataTable] = useState(false);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, handleKeyDown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDataTable(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-generate columns from data if not provided
  const firstRow = data?.[0];
  const tableColumns =
    columns ||
    (firstRow ? Object.keys(firstRow).map((key) => ({ key, label: key })) : []);

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        notation: Math.abs(value) >= 1000000 ? "compact" : "standard",
      }).format(value);
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    return String(value);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: "white",
            }}
          >
            {title || "Fullscreen View"}
          </h2>

          {/* View toggle buttons */}
          {data && data.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowDataTable(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: !showDataTable
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "white",
                  fontSize: 13,
                }}
              >
                <BarChart3 size={14} />
                Chart
              </button>
              <button
                onClick={() => setShowDataTable(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: showDataTable
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "white",
                  fontSize: 13,
                }}
              >
                <Table size={14} />
                Data ({data.length} rows)
              </button>
            </div>
          )}

          {/* Custom toolbar (e.g., chart type selector) */}
          {toolbar && !showDataTable && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: 16,
                paddingLeft: 16,
                borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {toolbar}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Stats badges */}
          {stats && stats.length > 0 && !showDataTable && (
            <div style={{ display: "flex", gap: 16 }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: "white" }}
                  >
                    {typeof stat.value === "number"
                      ? new Intl.NumberFormat("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(stat.value)
                      : stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              padding: 0,
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              color: "white",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          padding: 32,
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: 12,
            width: "100%",
            maxWidth: 1200,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {showDataTable && data ? (
            /* Data Table View */
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {tableColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          borderBottom: "2px solid var(--border)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          position: "sticky",
                          top: 0,
                          background: "var(--card)",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i}>
                      {tableColumns.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 14,
                          }}
                        >
                          {formatCellValue(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Chart View */
            <div
              style={{
                flex: 1,
                padding: 32,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
