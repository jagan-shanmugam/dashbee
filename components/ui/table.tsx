"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";
import { ChartActions } from "./chart-actions";
import { FullscreenModal } from "./fullscreen-modal";
import {
  exportToPng,
  exportToCsv,
  copyToClipboard,
  sanitizeFilename,
} from "@/lib/export-utils";

export function Table({ element, loading }: ComponentRenderProps) {
  const { queryKey, columns, title } = element.props as {
    queryKey: string;
    columns: Array<{ key: string; label: string; format?: string | null }>;
    title?: string | null;
  };

  const tableRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data } = useData();
  const tableData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "table");

  // Action handlers
  const handleExportPng = useCallback(async () => {
    if (tableRef.current) {
      await exportToPng(tableRef.current, `${filenameBase}.png`);
    }
  }, [filenameBase]);

  const handleExportCsv = useCallback(() => {
    if (tableData) {
      exportToCsv(tableData, `${filenameBase}.csv`);
    }
  }, [tableData, filenameBase]);

  const handleCopy = useCallback(async () => {
    if (tableRef.current) {
      return await copyToClipboard(tableRef.current);
    }
    return false;
  }, []);

  const formatCell = (value: unknown, format?: string | null): ReactNode => {
    if (value === null || value === undefined) return "-";
    if (format === "currency" && typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    if (
      format === "date" &&
      (typeof value === "string" || value instanceof Date)
    ) {
      return new Date(value).toLocaleDateString();
    }
    if (format === "badge") {
      const statusColors: Record<string, { bg: string; color: string }> = {
        completed: { bg: "#dcfce7", color: "#166534" },
        pending: { bg: "#fef3c7", color: "#92400e" },
        failed: { bg: "#fee2e2", color: "#991b1b" },
        cancelled: { bg: "#f3f4f6", color: "#374151" },
      };
      const statusKey = String(value).toLowerCase();
      const colors = statusColors[statusKey] || {
        bg: "var(--border)",
        color: "var(--foreground)",
      };
      return (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: colors.bg,
            color: colors.color,
          }}
        >
          {String(value)}
        </span>
      );
    }

    // Helper to format numbers with smart decimal handling
    const formatNumber = (num: number): string => {
      // Determine appropriate decimal places based on value
      const absNum = Math.abs(num);
      let maximumFractionDigits = 2;

      // For very small numbers, show more decimals
      if (absNum > 0 && absNum < 0.01) {
        maximumFractionDigits = 4;
      }
      // For whole numbers or near-whole numbers, show fewer decimals
      else if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.001) {
        maximumFractionDigits = 0;
      }

      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits,
        minimumFractionDigits: maximumFractionDigits > 0 ? Math.min(2, maximumFractionDigits) : 0,
        notation: absNum >= 1000000 ? "compact" : "standard",
      }).format(num);
    };

    // Handle explicit "number" format
    if (format === "number") {
      if (typeof value === "number") {
        return formatNumber(value);
      }
      if (typeof value === "string") {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return formatNumber(num);
        }
      }
      return String(value);
    }

    // Auto-format numbers without explicit format
    if (typeof value === "number" && !format) {
      return formatNumber(value);
    }

    // Auto-detect and format strings
    if (typeof value === "string" && !format) {
      // Check if it looks like an ISO date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }
      }

      // Check if it's a numeric string (PostgreSQL returns NUMERIC as string)
      const numericPattern = /^-?\d*\.?\d+$/;
      if (numericPattern.test(value.trim())) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return formatNumber(num);
        }
      }
    }

    // Final fallback: if it still looks like a long decimal number, format it
    if (typeof value === "string" || typeof value === "number") {
      const strValue = String(value);
      // Match numbers with excessive decimal places (more than 4 digits after decimal)
      if (/^-?\d+\.\d{5,}$/.test(strValue)) {
        const num = parseFloat(strValue);
        if (!isNaN(num)) {
          return formatNumber(num);
        }
      }
    }

    return String(value);
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 16 : 0,
          }}
        >
          {title && (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          )}
        </div>
        <div
          style={{
            background: "var(--border)",
            borderRadius: 8,
            height: 200,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 16 : 0,
          }}
        >
          {title && (
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {title}
            </h4>
          )}
        </div>
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--muted)",
            background: "var(--card)",
            borderRadius: "var(--radius)",
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14 }}>
            No data available for the selected filters
          </p>
        </div>
      </div>
    );
  }

  // Table header with actions
  const tableHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      {title ? (
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h4>
      ) : (
        <div />
      )}
      <ChartActions
        onExportPng={handleExportPng}
        onExportCsv={handleExportCsv}
        onCopy={handleCopy}
        onFullscreen={() => setIsFullscreen(true)}
      />
    </div>
  );

  // Render table content
  const renderTableContent = (forFullscreen = false) => {
    const containerStyle = forFullscreen
      ? { minWidth: 500, maxHeight: "70vh", overflow: "auto" }
      : {};

    return (
      <div style={containerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    position: forFullscreen ? "sticky" : undefined,
                    top: forFullscreen ? 0 : undefined,
                    background: forFullscreen ? "var(--card)" : undefined,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => {
              // Generate a stable key from row data or fall back to index
              const rowKey = columns
                .slice(0, 3)
                .map((col) => String(row[col.key] ?? ""))
                .join("-") || `row-${i}`;
              return (
              <tr key={rowKey}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px 8px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 14,
                    }}
                  >
                    {formatCell(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div>
        {tableHeader}
        <div ref={tableRef}>{renderTableContent()}</div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Table"}
      >
        {renderTableContent(true)}
      </FullscreenModal>
    </>
  );
}
