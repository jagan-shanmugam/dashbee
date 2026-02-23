"use client";

import { X, Download } from "lucide-react";
import { useDrillDown } from "@/lib/drill-down-context";
import { exportToCsv } from "@/lib/export-utils";

/**
 * Drill-down modal - shows underlying data for a clicked chart element
 */
export function DrillDownModal() {
  const { drillDownData, closeDrillDown, isOpen } = useDrillDown();

  if (!isOpen || !drillDownData) {
    return null;
  }

  const { info, rows } = drillDownData;

  // Get all column keys from the first row
  const firstRow = rows[0];
  const columns = firstRow ? Object.keys(firstRow) : [];

  const handleExport = () => {
    const filename = `${info.title || info.queryKey}-${info.value}.csv`;
    exportToCsv(rows, filename);
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
      onClick={closeDrillDown}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          maxWidth: "90vw",
          maxHeight: "90vh",
          width: 900,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              {info.title || "Drill-down Data"}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                color: "var(--muted)",
              }}
            >
              Showing data for {info.dimension}:{" "}
              <strong>{String(info.value)}</strong> ({rows.length}{" "}
              {rows.length === 1 ? "row" : "rows"})
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleExport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
                fontSize: 13,
                cursor: "pointer",
              }}
              title="Export to CSV"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={closeDrillDown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius)",
                color: "var(--muted)",
                cursor: "pointer",
              }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "0 20px 20px",
          }}
        >
          {rows.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              No data available
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                marginTop: 16,
              }}
            >
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: "2px solid var(--border)",
                        fontWeight: 600,
                        color: "var(--foreground)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format a cell value for display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return JSON.stringify(value);
  }
  return String(value);
}
