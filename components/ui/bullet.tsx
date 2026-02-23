"use client";

import { useRef, useState, useCallback } from "react";
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
import { formatNumber, isCurrencyColumn } from "@/lib/format-utils";

/**
 * BulletChart - Compact KPI visualization
 *
 * Use cases:
 * - Performance dashboards comparing actual vs target
 * - KPI cards showing progress within qualitative ranges
 * - Space-efficient alternative to gauge charts
 * - Multiple metrics in a compact layout
 *
 * Based on Stephen Few's bullet graph design:
 * - Background ranges show qualitative zones (poor/satisfactory/good)
 * - Bar shows the actual/current value
 * - Marker line shows the target value
 */
export function BulletChart({ element, loading }: ComponentRenderProps) {
  const props = element.props as {
    queryKey: string;
    actualColumn?: string;
    valueColumn?: string; // Alias for actualColumn (common LLM pattern)
    valuePath?: string; // Another alias for actualColumn
    targetColumn?: string | null;
    target?: number | null; // Static target value (alternative to targetColumn)
    title?: string | null;
    min?: number | null;
    max?: number | null;
    ranges?: {
      poor?: number | null;
      satisfactory?: number | null;
      good?: number | null;
    } | null;
    orientation?: "horizontal" | "vertical" | null;
    format?: "number" | "percent" | "currency" | null;
  };

  const {
    queryKey,
    targetColumn,
    target: staticTarget,
    title,
    min = 0,
    max: propMax,
    ranges,
    orientation = "horizontal",
    format = "number",
  } = props;

  // Support actualColumn, valueColumn, and valuePath (LLM compatibility)
  const actualColumn = props.actualColumn || props.valueColumn || props.valuePath;

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "bullet-chart");

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

  // Format value based on format prop
  const formatValue = (value: number): string => {
    const isCurrency = format === "currency" || (format === "number" && actualColumn ? isCurrencyColumn(actualColumn) : false);

    if (format === "percent") {
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value / 100);
    }

    return formatNumber(value, { currency: isCurrency, compact: Math.abs(value) >= 10000 });
  };

  // Validate required props
  if (!actualColumn) {
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
          <p style={{ margin: 0, fontSize: 14, color: "var(--destructive)" }}>
            Configuration error: Missing required prop (actualColumn)
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
            Expected: actualColumn=&quot;column_name&quot;
          </p>
        </div>
      </div>
    );
  }

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
            height: 60,
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

  // Extract first row for bullet chart (typically a single value)
  const firstRow = queryData[0];
  const actualValue = Number(firstRow?.[actualColumn] ?? 0);
  // Support both targetColumn (from data) and static target prop
  const targetValue = targetColumn
    ? Number(firstRow?.[targetColumn] ?? 0)
    : (staticTarget ?? null);

  // Determine max value for scale
  const dataMax = Math.max(actualValue, targetValue ?? 0);
  const maxVal = propMax ?? (ranges?.good ?? dataMax * 1.2);
  const minVal = min ?? 0;
  const range = maxVal - minVal;

  // Default ranges if not provided (poor: 33%, satisfactory: 67%, good: 100%)
  const defaultRanges = {
    poor: minVal + range * 0.33,
    satisfactory: minVal + range * 0.67,
    good: maxVal,
  };
  const effectiveRanges = {
    poor: ranges?.poor ?? defaultRanges.poor,
    satisfactory: ranges?.satisfactory ?? defaultRanges.satisfactory,
    good: ranges?.good ?? defaultRanges.good,
  };

  // Colors for ranges - use semi-transparent colors that work in both light and dark modes
  // Darker = worse performance, lighter = better performance
  const rangeColors = {
    poor: "rgba(100, 100, 100, 0.4)",        // Dark gray - poor zone
    satisfactory: "rgba(150, 150, 150, 0.3)", // Medium gray - satisfactory zone
    good: "rgba(180, 180, 180, 0.2)",         // Light gray - good zone
  };

  // Bar color based on value compared to target
  const getBarColor = () => {
    if (targetValue === null) return "var(--foreground)";
    if (actualValue >= targetValue) return "#10b981"; // Green - met/exceeded target
    if (actualValue >= targetValue * 0.9) return "#f59e0b"; // Amber - close to target
    return "#ef4444"; // Red - below target
  };

  // Render bullet chart
  const renderChart = (forFullscreen = false) => {
    const isHorizontal = (orientation ?? "horizontal") === "horizontal";

    if (isHorizontal) {
      const width = forFullscreen ? 500 : 280;
      const height = forFullscreen ? 60 : 40;
      const padding = { top: 8, right: 60, bottom: 8, left: 8 };
      const barHeight = forFullscreen ? 28 : 18;
      const chartWidth = width - padding.left - padding.right;

      // Scale function
      const scaleX = (value: number) => {
        return padding.left + ((value - minVal) / range) * chartWidth;
      };

      const barWidth = scaleX(actualValue) - padding.left;
      const targetX = targetValue !== null ? scaleX(targetValue) : null;

      return (
        <svg
          ref={forFullscreen ? undefined : svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: forFullscreen ? 60 : 40,
            display: "block",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Poor range (darkest) */}
          <rect
            x={padding.left}
            y={(height - barHeight) / 2}
            width={scaleX(effectiveRanges.poor) - padding.left}
            height={barHeight}
            fill={rangeColors.poor}
            opacity={1}
            rx={2}
          />

          {/* Satisfactory range */}
          <rect
            x={scaleX(effectiveRanges.poor)}
            y={(height - barHeight) / 2}
            width={scaleX(effectiveRanges.satisfactory) - scaleX(effectiveRanges.poor)}
            height={barHeight}
            fill={rangeColors.satisfactory}
            opacity={1}
          />

          {/* Good range (lightest) */}
          <rect
            x={scaleX(effectiveRanges.satisfactory)}
            y={(height - barHeight) / 2}
            width={scaleX(effectiveRanges.good) - scaleX(effectiveRanges.satisfactory)}
            height={barHeight}
            fill={rangeColors.good}
            opacity={1}
            rx={2}
          />

          {/* Actual value bar */}
          <rect
            x={padding.left}
            y={(height - barHeight * 0.5) / 2}
            width={Math.max(barWidth, 2)}
            height={barHeight * 0.5}
            fill={getBarColor()}
            rx={2}
            style={{
              transition: "all 0.2s ease",
              filter: isHovered ? "brightness(1.1)" : "none",
            }}
          />

          {/* Target marker */}
          {targetX !== null && (
            <line
              x1={targetX}
              y1={(height - barHeight * 0.8) / 2}
              x2={targetX}
              y2={(height + barHeight * 0.8) / 2}
              stroke="var(--foreground)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}

          {/* Value label on the right */}
          <text
            x={width - padding.right + 8}
            y={height / 2}
            textAnchor="start"
            dominantBaseline="middle"
            fill="var(--foreground)"
            fontSize={forFullscreen ? 16 : 12}
            fontWeight={600}
          >
            {formatValue(actualValue)}
          </text>

          {/* Tooltip on hover */}
          {isHovered && (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={Math.min(barWidth + padding.left + 8, width - 120)}
                y={2}
                width={110}
                height={height - 4}
                rx={4}
                fill="var(--card)"
                stroke="var(--border)"
              />
              <text
                x={Math.min(barWidth + padding.left + 63, width - 65)}
                y={targetValue !== null ? height / 2 - 6 : height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--foreground)"
              >
                Actual: {formatValue(actualValue)}
              </text>
              {targetValue !== null && (
                <text
                  x={Math.min(barWidth + padding.left + 63, width - 65)}
                  y={height / 2 + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  Target: {formatValue(targetValue)}
                </text>
              )}
            </g>
          )}
        </svg>
      );
    }

    // Vertical orientation
    const width = forFullscreen ? 80 : 50;
    const height = forFullscreen ? 200 : 140;
    const padding = { top: 8, right: 8, bottom: 30, left: 8 };
    const barWidth = forFullscreen ? 36 : 24;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale function (inverted for vertical)
    const scaleY = (value: number) => {
      return padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
    };

    const barH = chartHeight - (scaleY(actualValue) - padding.top);
    const targetY = targetValue !== null ? scaleY(targetValue) : null;

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: forFullscreen ? 80 : 50,
          height: forFullscreen ? 200 : 140,
          display: "block",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Poor range (darkest) - at the bottom */}
        <rect
          x={(width - barWidth) / 2}
          y={scaleY(effectiveRanges.poor)}
          width={barWidth}
          height={chartHeight - (scaleY(effectiveRanges.poor) - padding.top)}
          fill={rangeColors.poor}
          opacity={1}
          rx={2}
        />

        {/* Satisfactory range */}
        <rect
          x={(width - barWidth) / 2}
          y={scaleY(effectiveRanges.satisfactory)}
          width={barWidth}
          height={scaleY(effectiveRanges.poor) - scaleY(effectiveRanges.satisfactory)}
          fill={rangeColors.satisfactory}
          opacity={1}
        />

        {/* Good range (lightest) - at the top */}
        <rect
          x={(width - barWidth) / 2}
          y={scaleY(effectiveRanges.good)}
          width={barWidth}
          height={scaleY(effectiveRanges.satisfactory) - scaleY(effectiveRanges.good)}
          fill={rangeColors.good}
          opacity={1}
          rx={2}
        />

        {/* Actual value bar */}
        <rect
          x={(width - barWidth * 0.5) / 2}
          y={scaleY(actualValue)}
          width={barWidth * 0.5}
          height={Math.max(barH, 2)}
          fill={getBarColor()}
          rx={2}
          style={{
            transition: "all 0.2s ease",
            filter: isHovered ? "brightness(1.1)" : "none",
          }}
        />

        {/* Target marker */}
        {targetY !== null && (
          <line
            x1={(width - barWidth * 0.8) / 2}
            y1={targetY}
            x2={(width + barWidth * 0.8) / 2}
            y2={targetY}
            stroke="var(--foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Value label at bottom */}
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          fontSize={forFullscreen ? 14 : 11}
          fontWeight={600}
        >
          {formatValue(actualValue)}
        </text>
      </svg>
    );
  };

  // Chart header
  const chartHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
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

  // Compute stats for fullscreen
  const percentOfTarget = targetValue !== null && targetValue > 0
    ? ((actualValue / targetValue) * 100).toFixed(1) + "%"
    : "N/A";

  const stats = [
    { label: "Actual", value: actualValue },
    { label: "Target", value: targetValue ?? "N/A" },
    { label: "% of Target", value: percentOfTarget },
    { label: "Max Scale", value: maxVal },
  ];

  const columns = targetColumn
    ? [
        { key: actualColumn, label: actualColumn.replace(/_/g, " ").toUpperCase() },
        { key: targetColumn, label: targetColumn.replace(/_/g, " ").toUpperCase() },
      ]
    : [{ key: actualColumn, label: actualColumn.replace(/_/g, " ").toUpperCase() }];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div
          ref={chartRef}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: orientation === "vertical" ? "center" : "flex-start",
            overflow: "hidden",
          }}
        >
          {renderChart()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Bullet Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {renderChart(true)}
          {/* Additional context in fullscreen */}
          <div
            style={{
              display: "flex",
              gap: 32,
              fontSize: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 12,
                  background: rangeColors.poor,
                  opacity: 0.3,
                  borderRadius: 2,
                }}
              />
              <span style={{ color: "var(--muted)" }}>Poor (0-{Math.round((effectiveRanges.poor - minVal) / range * 100)}%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 12,
                  background: rangeColors.satisfactory,
                  opacity: 0.3,
                  borderRadius: 2,
                }}
              />
              <span style={{ color: "var(--muted)" }}>Satisfactory</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 12,
                  background: rangeColors.good,
                  opacity: 0.3,
                  borderRadius: 2,
                }}
              />
              <span style={{ color: "var(--muted)" }}>Good</span>
            </div>
            {targetValue !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 3,
                    height: 12,
                    background: "var(--foreground)",
                    borderRadius: 1,
                  }}
                />
                <span style={{ color: "var(--muted)" }}>Target</span>
              </div>
            )}
          </div>
        </div>
      </FullscreenModal>
    </>
  );
}
