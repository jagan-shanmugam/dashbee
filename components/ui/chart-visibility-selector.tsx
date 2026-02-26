"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ChevronDown, Check, BarChart2, Table, Activity } from "lucide-react";
import { useChartVisibility } from "@/lib/chart-visibility-context";

/**
 * Get icon for chart type
 */
function getChartIcon(type: string) {
  switch (type) {
    case "Table":
      return <Table size={14} />;
    case "Metric":
      return <Activity size={14} />;
    default:
      return <BarChart2 size={14} />;
  }
}

/**
 * Chart visibility selector dropdown
 *
 * Shows all registered charts with checkboxes to toggle their visibility.
 * Useful for focusing on specific charts in a dashboard.
 */
export function ChartVisibilitySelector() {
  const {
    charts,
    visibleChartIds,
    toggleChart,
    showAll,
    hideAll,
  } = useChartVisibility();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Don't render if no charts registered
  if (charts.length === 0) {
    return null;
  }

  const visibleCount = visibleChartIds.size;
  const totalCount = charts.length;
  const allVisible = visibleCount === totalCount;
  const noneVisible = visibleCount === 0;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: allVisible ? "transparent" : "rgba(245, 158, 11, 0.1)",
          border: allVisible
            ? "1px solid var(--border)"
            : "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "var(--radius)",
          fontSize: 14,
          color: "var(--foreground)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Toggle chart visibility"
      >
        {allVisible ? <Eye size={16} /> : <EyeOff size={16} style={{ color: "#f59e0b" }} />}
        <span>
          {allVisible ? "Charts" : `${visibleCount}/${totalCount}`}
        </span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
            minWidth: 280,
            maxHeight: 400,
            overflowY: "auto",
            zIndex: 101,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Chart Visibility</span>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                Toggle which charts to display
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {visibleCount}/{totalCount}
            </span>
          </div>

          {/* Quick actions */}
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: 8,
            }}
          >
            <button
              onClick={showAll}
              disabled={allVisible}
              style={{
                flex: 1,
                padding: "6px 12px",
                background: allVisible ? "var(--primary)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
                color: "var(--foreground)",
                cursor: allVisible ? "default" : "pointer",
                opacity: allVisible ? 0.5 : 1,
              }}
            >
              Show All
            </button>
            <button
              onClick={hideAll}
              disabled={noneVisible}
              style={{
                flex: 1,
                padding: "6px 12px",
                background: noneVisible ? "var(--primary)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
                color: "var(--foreground)",
                cursor: noneVisible ? "default" : "pointer",
                opacity: noneVisible ? 0.5 : 1,
              }}
            >
              Hide All
            </button>
          </div>

          {/* Chart list */}
          <div style={{ padding: 8 }}>
            {charts.map((chart) => {
              const isChecked = visibleChartIds.has(chart.id);
              return (
                <button
                  key={chart.id}
                  onClick={() => toggleChart(chart.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isChecked
                        ? "none"
                        : "1px solid var(--border)",
                      background: isChecked ? "var(--foreground)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && (
                      <Check size={12} style={{ color: "var(--background)" }} />
                    )}
                  </div>

                  {/* Chart icon */}
                  <div
                    style={{
                      color: "var(--muted)",
                      flexShrink: 0,
                    }}
                  >
                    {getChartIcon(chart.type)}
                  </div>

                  {/* Chart info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 500,
                        color: isChecked ? "var(--foreground)" : "var(--muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chart.title || chart.id}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      {chart.type}
                      {chart.queryKey && ` • ${chart.queryKey}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
