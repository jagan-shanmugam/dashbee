"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Check, X } from "lucide-react";
import {
  useChartCatalog,
  CHART_COMPONENT_TYPES,
  CHART_DESCRIPTIONS,
  type ChartComponentType,
} from "@/lib/chart-catalog-context";

/**
 * Generation Settings Modal
 *
 * Allows users to configure which chart types are available for the AI
 * to use when generating dashboards. This helps focus the AI on specific
 * visualization types relevant to the user's needs.
 */
export function GenerationSettings() {
  const { enabledCharts, toggleChart, enableAll, disableAll, isEnabled } =
    useChartCatalog();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const enabledCount = enabledCharts.size;
  const totalCount = CHART_COMPONENT_TYPES.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Generation Settings"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--muted)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "90%",
              maxWidth: 600,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  Generation Settings
                </h2>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  Choose which chart types the AI can use
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--accent)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {enabledCount} of {totalCount} chart types enabled
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={enableAll}
                  style={{
                    padding: "6px 12px",
                    background: "var(--foreground)",
                    color: "var(--background)",
                    border: "none",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Enable All
                </button>
                <button
                  onClick={disableAll}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  Disable All
                </button>
              </div>
            </div>

            {/* Chart list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 20px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {CHART_COMPONENT_TYPES.map((chartType) => (
                  <ChartTypeRow
                    key={chartType}
                    chartType={chartType}
                    isEnabled={isEnabled(chartType)}
                    onToggle={() => toggleChart(chartType)}
                    description={CHART_DESCRIPTIONS[chartType]}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "8px 16px",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ChartTypeRowProps {
  chartType: ChartComponentType;
  isEnabled: boolean;
  onToggle: () => void;
  description: string;
}

function ChartTypeRow({
  chartType,
  isEnabled,
  onToggle,
  description,
}: ChartTypeRowProps) {
  // Format chart type name for display (e.g., "MultiLineChart" -> "Multi Line Chart")
  const displayName = chartType
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace("Chart", "")
    .trim();

  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: isEnabled ? "var(--accent)" : "transparent",
        border: "none",
        borderRadius: "var(--radius)",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s ease",
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: isEnabled ? "none" : "2px solid var(--border)",
          background: isEnabled ? "var(--foreground)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isEnabled && <Check size={14} color="var(--background)" />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--foreground)",
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}
