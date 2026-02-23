"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";
import { ChartActions } from "./chart-actions";
import { FullscreenModal } from "./fullscreen-modal";
import {
  exportToPng,
  exportToSvg,
  exportToCsv,
  copyToClipboard,
  sanitizeFilename,
} from "@/lib/export-utils";
import {
  useDrillDownOptional,
  filterRowsByDimension,
} from "@/lib/drill-down-context";

/**
 * Heatmap component - calendar or matrix heatmap from query results
 */
export function Heatmap({ element, loading }: ComponentRenderProps) {
  const props = element.props as {
    variant: "calendar" | "matrix";
    queryKey: string;
    title?: string | null;
    // Calendar variant props
    dateColumn?: string;
    valueColumn?: string;
    // Matrix variant props
    rowColumn?: string;
    colColumn?: string;
    // Shared props
    colorScale?: "green" | "blue" | "red" | "purple" | null;
  };

  const {
    variant,
    queryKey,
    title,
    dateColumn,
    valueColumn,
    rowColumn,
    colColumn,
    colorScale = "green",
  } = props;

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const { data } = useData();
  const drillDown = useDrillDownOptional();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "heatmap");

  // Action handlers
  const handleExportPng = useCallback(async () => {
    if (chartRef.current) {
      await exportToPng(chartRef.current, `${filenameBase}.png`);
    }
  }, [filenameBase]);

  const handleExportSvg = useCallback(() => {
    if (svgRef.current) {
      exportToSvg(svgRef.current, `${filenameBase}.svg`);
    }
  }, [filenameBase]);

  const handleExportCsv = useCallback(() => {
    if (queryData) {
      exportToCsv(queryData, `${filenameBase}.csv`);
    }
  }, [queryData, filenameBase]);

  const handleCopy = useCallback(async () => {
    if (chartRef.current) {
      return await copyToClipboard(chartRef.current);
    }
    return false;
  }, []);

  // Color scales
  const colorScales = {
    green: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
    blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
    red: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
    purple: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
  };

  const colors = colorScales[colorScale || "green"];

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
            height: 200,
            background: "var(--border)",
            borderRadius: 8,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  if (!queryData || !Array.isArray(queryData) || queryData.length === 0) {
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

  // Chart header with actions
  const chartHeader = (
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
        onExportSvg={handleExportSvg}
        onExportCsv={handleExportCsv}
        onCopy={handleCopy}
        onFullscreen={() => setIsFullscreen(true)}
      />
    </div>
  );

  // Render based on variant
  const renderContent = (forFullscreen = false) => {
    if (variant === "calendar") {
      return (
        <CalendarHeatmap
          data={queryData}
          dateColumn={dateColumn || "date"}
          valueColumn={valueColumn || "value"}
          colors={colors}
          svgRef={forFullscreen ? undefined : svgRef}
          onTooltip={setTooltip}
          onDrillDown={
            drillDown
              ? (date) => {
                  const rows = filterRowsByDimension(
                    queryData,
                    dateColumn || "date",
                    date,
                  );
                  drillDown.openDrillDown(
                    {
                      queryKey,
                      dimension: dateColumn || "date",
                      value: date,
                      labelColumn: dateColumn || "date",
                      valueColumn: valueColumn || "value",
                      chartType: "heatmap-calendar",
                      title: title ?? undefined,
                    },
                    rows,
                  );
                }
              : undefined
          }
          forFullscreen={forFullscreen}
        />
      );
    }

    return (
      <MatrixHeatmap
        data={queryData}
        rowColumn={rowColumn || "row"}
        colColumn={colColumn || "col"}
        valueColumn={valueColumn || "value"}
        colors={colors}
        svgRef={forFullscreen ? undefined : svgRef}
        onTooltip={setTooltip}
        onDrillDown={
          drillDown
            ? (row, col) => {
                const rows = queryData.filter(
                  (r) =>
                    r[rowColumn || "row"] === row &&
                    r[colColumn || "col"] === col,
                );
                drillDown.openDrillDown(
                  {
                    queryKey,
                    dimension: `${rowColumn || "row"} × ${colColumn || "col"}`,
                    value: `${row} × ${col}`,
                    labelColumn: rowColumn || "row",
                    valueColumn: valueColumn || "value",
                    chartType: "heatmap-matrix",
                    title: title ?? undefined,
                  },
                  rows,
                );
              }
            : undefined
        }
        forFullscreen={forFullscreen}
      />
    );
  };

  // Compute stats for fullscreen view
  const values = queryData.map((row) =>
    Number(row[valueColumn || "value"] ?? 0),
  );
  const total = values.reduce((sum, v) => sum + v, 0);
  const stats = [
    { label: "Total", value: total },
    { label: "Average", value: values.length > 0 ? total / values.length : 0 },
    { label: "Max", value: Math.max(...values, 0) },
    { label: "Data Points", value: queryData.length },
  ];

  // Column configuration for data table
  const columns =
    variant === "calendar"
      ? [
          {
            key: dateColumn || "date",
            label: (dateColumn || "DATE").replace(/_/g, " ").toUpperCase(),
          },
          {
            key: valueColumn || "value",
            label: (valueColumn || "VALUE").replace(/_/g, " ").toUpperCase(),
          },
        ]
      : [
          {
            key: rowColumn || "row",
            label: (rowColumn || "ROW").replace(/_/g, " ").toUpperCase(),
          },
          {
            key: colColumn || "col",
            label: (colColumn || "COLUMN").replace(/_/g, " ").toUpperCase(),
          },
          {
            key: valueColumn || "value",
            label: (valueColumn || "VALUE").replace(/_/g, " ").toUpperCase(),
          },
        ];

  return (
    <>
      <div>
        {chartHeader}
        <div ref={chartRef} style={{ position: "relative" }}>
          {renderContent()}
          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: tooltip.x,
                top: tooltip.y - 30,
                background: "var(--foreground)",
                color: "var(--background)",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                transform: "translateX(-50%)",
                zIndex: 10,
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Heatmap"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        {renderContent(true)}
      </FullscreenModal>
    </>
  );
}

/**
 * Calendar heatmap component (GitHub contribution style)
 */
function CalendarHeatmap({
  data,
  dateColumn,
  valueColumn,
  colors,
  svgRef,
  onTooltip,
  onDrillDown,
  forFullscreen,
}: {
  data: Array<Record<string, unknown>>;
  dateColumn: string;
  valueColumn: string;
  colors: string[];
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onTooltip: (tooltip: { x: number; y: number; text: string } | null) => void;
  onDrillDown?: (date: string) => void;
  forFullscreen: boolean;
}) {
  // Parse dates and values
  const dateValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const dateVal = row[dateColumn];
      const valueVal = row[valueColumn];
      if (dateVal != null && valueVal != null) {
        const dateStr =
          dateVal instanceof Date
            ? dateVal.toISOString().split("T")[0]
            : String(dateVal).split("T")[0];
        if (dateStr) {
          map.set(dateStr, Number(valueVal));
        }
      }
    }
    return map;
  }, [data, dateColumn, valueColumn]);

  // Get date range (last 52 weeks)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 364);

  // Generate weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  const current = new Date(startDate);

  // Fill in leading empty days
  const startDay = current.getDay();
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(new Date(0)); // Invalid date placeholder
  }

  while (current <= endDate) {
    currentWeek.push(new Date(current));
    if (current.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...Array.from(dateValues.values()), 1);

  const cellSize = forFullscreen ? 14 : 10;
  const cellGap = 2;
  const width = weeks.length * (cellSize + cellGap);
  const height = 7 * (cellSize + cellGap);

  const getColor = (value: number) => {
    if (value === 0) return "var(--border)";
    const index = Math.min(
      Math.floor((value / maxValue) * (colors.length - 1)),
      colors.length - 1,
    );
    return colors[index];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width + 30} ${height + 20}`}
        style={{
          width: forFullscreen ? width + 30 : "100%",
          height: forFullscreen ? height + 20 : "auto",
          maxWidth: "100%",
        }}
      >
        {/* Day labels */}
        <text x={0} y={cellSize + 2} fontSize={9} fill="var(--muted)">
          Mon
        </text>
        <text
          x={0}
          y={cellSize * 3 + cellGap * 2 + 2}
          fontSize={9}
          fill="var(--muted)"
        >
          Wed
        </text>
        <text
          x={0}
          y={cellSize * 5 + cellGap * 4 + 2}
          fontSize={9}
          fill="var(--muted)"
        >
          Fri
        </text>

        {/* Cells */}
        <g transform="translate(25, 0)">
          {weeks.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              if (date.getTime() === 0) return null; // Skip placeholder
              const dateStr = date.toISOString().split("T")[0] ?? "";
              const value = dateValues.get(dateStr) || 0;
              const x = weekIndex * (cellSize + cellGap);
              const y = dayIndex * (cellSize + cellGap);

              return (
                <rect
                  key={`${weekIndex}-${dayIndex}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={getColor(value)}
                  style={{ cursor: onDrillDown ? "pointer" : "default" }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parent = e.currentTarget.closest("div");
                    if (parent) {
                      const parentRect = parent.getBoundingClientRect();
                      onTooltip({
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top,
                        text: `${formatDate(date)}: ${value}`,
                      });
                    }
                  }}
                  onMouseLeave={() => onTooltip(null)}
                  onClick={() => onDrillDown?.(dateStr)}
                />
              );
            }),
          )}
        </g>
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <span>Less</span>
        {["var(--border)", ...colors].map((color, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              background: color,
              borderRadius: 2,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/**
 * Matrix heatmap component
 */
function MatrixHeatmap({
  data,
  rowColumn,
  colColumn,
  valueColumn,
  colors,
  svgRef,
  onTooltip,
  onDrillDown,
  forFullscreen,
}: {
  data: Array<Record<string, unknown>>;
  rowColumn: string;
  colColumn: string;
  valueColumn: string;
  colors: string[];
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onTooltip: (tooltip: { x: number; y: number; text: string } | null) => void;
  onDrillDown?: (row: string, col: string) => void;
  forFullscreen: boolean;
}) {
  // Extract unique rows and columns
  const { rows, cols, valueMap, maxValue } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const map = new Map<string, number>();
    let max = 0;

    for (const row of data) {
      const rowVal = String(row[rowColumn] ?? "");
      const colVal = String(row[colColumn] ?? "");
      const value = Number(row[valueColumn] ?? 0);

      rowSet.add(rowVal);
      colSet.add(colVal);
      map.set(`${rowVal}|${colVal}`, value);
      max = Math.max(max, value);
    }

    return {
      rows: Array.from(rowSet),
      cols: Array.from(colSet),
      valueMap: map,
      maxValue: max || 1,
    };
  }, [data, rowColumn, colColumn, valueColumn]);

  // Smaller cells in normal view to prevent oversized heatmaps
  const cellSize = forFullscreen ? 40 : 24;
  const cellGap = 2;
  const labelWidth = forFullscreen ? 150 : 70;
  const labelHeight = forFullscreen ? 30 : 24;
  const width = cols.length * (cellSize + cellGap) + labelWidth;
  const height = rows.length * (cellSize + cellGap) + labelHeight;
  // Limit max dimensions in normal view to prevent oversized heatmaps
  const maxNormalWidth = 400;
  const maxNormalHeight = 300;

  const getColor = (value: number) => {
    if (value === 0) return "var(--border)";
    const index = Math.min(
      Math.floor((value / maxValue) * (colors.length - 1)),
      colors.length - 1,
    );
    return colors[index];
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: forFullscreen ? width : Math.min(width, maxNormalWidth),
          height: forFullscreen ? height : Math.min(height, maxNormalHeight),
          maxWidth: "100%",
          display: "block",
        }}
      >
        {/* Column labels - truncated in normal view to prevent overlap */}
        {cols.map((col, i) => (
          <text
            key={col}
            x={labelWidth + i * (cellSize + cellGap) + cellSize / 2}
            y={forFullscreen ? 20 : 16}
            fontSize={forFullscreen ? 12 : 9}
            fill="var(--muted)"
            textAnchor="middle"
          >
            {forFullscreen ? col : col.length > 5 ? `${col.slice(0, 5)}…` : col}
          </text>
        ))}

        {/* Rows */}
        <g transform={`translate(0, ${labelHeight})`}>
          {rows.map((row, rowIndex) => (
            <g key={row}>
              {/* Row label */}
              <text
                x={labelWidth - 5}
                y={rowIndex * (cellSize + cellGap) + cellSize / 2 + 4}
                fontSize={forFullscreen ? 12 : 10}
                fill="var(--muted)"
                textAnchor="end"
              >
                {forFullscreen
                  ? row
                  : row.length > 10
                    ? `${row.slice(0, 10)}…`
                    : row}
              </text>

              {/* Cells */}
              {cols.map((col, colIndex) => {
                const value = valueMap.get(`${row}|${col}`) || 0;
                const x = labelWidth + colIndex * (cellSize + cellGap);
                const y = rowIndex * (cellSize + cellGap);

                return (
                  <rect
                    key={col}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={4}
                    fill={getColor(value)}
                    style={{ cursor: onDrillDown ? "pointer" : "default" }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget.closest("div");
                      if (parent) {
                        const parentRect = parent.getBoundingClientRect();
                        onTooltip({
                          x: rect.left - parentRect.left + rect.width / 2,
                          y: rect.top - parentRect.top,
                          text: `${row} × ${col}: ${value}`,
                        });
                      }
                    }}
                    onMouseLeave={() => onTooltip(null)}
                    onClick={() => onDrillDown?.(row, col)}
                  />
                );
              })}
            </g>
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <span>0</span>
        {colors.map((color, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 10,
              background: color,
              borderRadius: 2,
            }}
          />
        ))}
        <span>{maxValue.toLocaleString()}</span>
      </div>
    </div>
  );
}
