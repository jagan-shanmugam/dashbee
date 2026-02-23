"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function Metric({ element, loading }: ComponentRenderProps) {
  const { label, queryKey, valuePath, format } = element.props as {
    label: string;
    queryKey: string;
    valuePath?: string | null;
    format?: string | null;
  };

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`);

  let rawValue: unknown;

  if (queryData) {
    // queryData is always an array of rows from SQL results
    const rows = queryData as unknown[];
    const firstRow = rows[0] as Record<string, unknown> | undefined;

    if (valuePath && firstRow) {
      // valuePath is a column name - get it from the first row
      rawValue = firstRow[valuePath];
    } else if (firstRow && typeof firstRow === "object") {
      // No valuePath - get first value from first row
      rawValue = Object.values(firstRow)[0];
    }
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
        <div
          style={{
            height: 42,
            width: 120,
            background: "var(--border)",
            borderRadius: 6,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  // Convert string numbers to actual numbers
  let numValue: number | null = null;
  if (typeof rawValue === "number") {
    numValue = rawValue;
  } else if (typeof rawValue === "string" && !isNaN(Number(rawValue))) {
    numValue = Number(rawValue);
  }

  let displayValue = String(rawValue ?? "-");
  if (numValue !== null) {
    if (format === "currency") {
      displayValue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(numValue);
    } else if (format === "percent") {
      displayValue = new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(numValue);
    } else {
      // Default number formatting with smart precision
      // Use compact notation for large numbers, limit decimals for small numbers
      if (Math.abs(numValue) >= 10000) {
        displayValue = new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(numValue);
      } else if (Number.isInteger(numValue)) {
        displayValue = new Intl.NumberFormat("en-US").format(numValue);
      } else {
        // Limit to 2 decimal places for decimal numbers
        displayValue = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 2,
        }).format(numValue);
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
      <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>{displayValue}</span>
    </div>
  );
}
