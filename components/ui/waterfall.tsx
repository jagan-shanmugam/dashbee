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
import { formatNumber, formatLabel as formatLabelUtil } from "@/lib/format-utils";

/**
 * Calculate nice round tick values for Y-axis.
 * Handles both positive and negative values.
 */
function calculateNiceTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  if (max === min) return [0, max || 1];

  const range = max - min;
  const roughStep = range / (targetCount - 1);

  // Find a "nice" step value (1, 2, 5, 10, 20, 50, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  // Generate ticks from nice minimum to nice maximum
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(tick);
  }

  // Ensure we have at least 2 ticks
  if (ticks.length < 2) {
    return [min, max];
  }

  return ticks;
}

/**
 * Get evenly spaced indices for x-axis labels to prevent overcrowding
 */
function getSpacedIndices(total: number, maxLabels: number): number[] {
  if (total <= maxLabels) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const indices: number[] = [0]; // Always show first
  const step = (total - 1) / (maxLabels - 1);

  for (let i = 1; i < maxLabels - 1; i++) {
    indices.push(Math.round(i * step));
  }

  indices.push(total - 1); // Always show last
  return indices;
}

/**
 * WaterfallChart - Shows cumulative effect of sequential positive/negative values
 *
 * Use cases:
 * - Financial analysis: revenue breakdown, cost analysis
 * - Variance reports: budget vs actual with contributing factors
 * - Year-over-year changes showing what drove the difference
 *
 * The chart shows bars that start where the previous one ended,
 * creating a "stair-step" visual effect.
 */
export function WaterfallChart({ element, loading }: ComponentRenderProps) {
  const props = element.props as {
    queryKey: string;
    categoryColumn?: string;
    labelColumn?: string; // Alias for categoryColumn (common LLM pattern)
    valueColumn: string;
    title?: string | null;
    colorPalette?: string | null;
    showTotal?: boolean | null;
    showConnectors?: boolean | null;
  };

  const {
    queryKey,
    valueColumn,
    title,
    colorPalette: _colorPalette = "default",
    showTotal = true,
    showConnectors = true,
  } = props;

  // Support both categoryColumn and labelColumn (LLM compatibility)
  const categoryColumn = props.categoryColumn || props.labelColumn;

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "waterfall-chart");

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
            height: 220,
            background: "var(--border)",
            borderRadius: 8,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  // Validate required props
  if (!categoryColumn || !valueColumn) {
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
            Configuration error: Missing required props (categoryColumn, valueColumn)
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
            Expected: categoryColumn=&quot;column_name&quot; valueColumn=&quot;column_name&quot;
          </p>
        </div>
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

  // Extract chart data
  const chartData = queryData.map((row) => ({
    category: String(row[categoryColumn] ?? ""),
    value: Number(row[valueColumn] ?? 0),
  }));

  // Calculate running totals
  let runningTotal = 0;
  const waterfallData = chartData.map((d) => {
    const startValue = runningTotal;
    runningTotal += d.value;
    return {
      category: d.category,
      value: d.value,
      startValue,
      endValue: runningTotal,
    };
  });

  // Add total bar if requested
  const finalTotal = runningTotal;
  const displayData = showTotal
    ? [...waterfallData, { category: "Total", value: finalTotal, startValue: 0, endValue: finalTotal, isTotal: true }]
    : waterfallData;

  // Calculate Y-axis range (need to handle negative values)
  const allValues = displayData.flatMap((d) => [d.startValue, d.endValue, 0]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);

  // Colors for positive/negative/total
  const positiveColor = "#10b981"; // Green
  const negativeColor = "#ef4444"; // Red
  const totalColor = "#3b82f6"; // Blue

  // Render waterfall chart
  const renderChart = (forFullscreen = false) => {
    const width = forFullscreen ? 900 : 500;
    const height = forFullscreen ? 400 : 220;
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate nice Y-axis ticks
    const yTicks = calculateNiceTicks(yMin, yMax, forFullscreen ? 6 : 5);
    const yAxisMin = yTicks[0] ?? yMin;
    const yAxisMax = yTicks[yTicks.length - 1] ?? yMax;
    const yRange = yAxisMax - yAxisMin;

    // Scale function for Y values
    const scaleY = (value: number) => {
      return padding.top + chartHeight - ((value - yAxisMin) / yRange) * chartHeight;
    };

    // Bar dimensions
    const barCount = displayData.length;
    const barPadding = 0.25;
    const totalBarWidth = chartWidth / barCount;
    const barWidth = totalBarWidth * (1 - barPadding);
    const barGap = totalBarWidth * barPadding;

    // X-axis label spacing
    const maxLabels = forFullscreen ? 12 : 7;
    const labelIndices = getSpacedIndices(displayData.length, maxLabels);

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: forFullscreen ? 400 : 220,
          display: "block",
        }}
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = scaleY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeDasharray={tick === 0 ? "0" : "4 4"}
                strokeOpacity={tick === 0 ? 1 : 0.5}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={padding.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--muted)"
                fontSize={10}
              >
                {formatNumber(tick, { compact: true })}
              </text>
            </g>
          );
        })}

        {/* Connector lines (showing the running total line) */}
        {showConnectors && displayData.map((d, i) => {
          if (i === 0 || (d as typeof d & { isTotal?: boolean }).isTotal) return null;
          const prevData = displayData[i - 1];
          if (!prevData) return null;

          const prevX = padding.left + (i - 1) * totalBarWidth + barGap / 2 + barWidth;
          const currX = padding.left + i * totalBarWidth + barGap / 2;
          const y = scaleY(d.startValue);

          return (
            <line
              key={`connector-${i}`}
              x1={prevX}
              y1={y}
              x2={currX}
              y2={y}
              stroke="var(--muted)"
              strokeWidth={1}
              strokeDasharray="4 2"
              strokeOpacity={0.6}
            />
          );
        })}

        {/* Bars */}
        {displayData.map((d, i) => {
          const x = padding.left + i * totalBarWidth + barGap / 2;
          const isTotal = (d as typeof d & { isTotal?: boolean }).isTotal;
          const isPositive = d.value >= 0;

          // For regular bars: y is the higher value (min of start/end for positive drawing direction)
          // For total bar: always from 0 to the final value
          let barY: number;
          let barHeight: number;

          if (isTotal) {
            barY = scaleY(Math.max(0, d.endValue));
            barHeight = Math.abs(scaleY(0) - scaleY(d.endValue));
          } else {
            barY = scaleY(Math.max(d.startValue, d.endValue));
            barHeight = Math.abs(scaleY(d.startValue) - scaleY(d.endValue));
          }

          // Ensure minimum bar height for visibility
          barHeight = Math.max(barHeight, 2);

          const barColor = isTotal ? totalColor : (isPositive ? positiveColor : negativeColor);
          const isHovered = hoveredBar === i;

          return (
            <g key={i}>
              {/* Invisible hit area for hover */}
              <rect
                x={x - 4}
                y={padding.top}
                width={barWidth + 8}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: "default" }}
              />
              {/* Visible bar */}
              <rect
                x={x}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={barColor}
                style={{
                  transition: "all 0.15s ease",
                  opacity: isHovered ? 1 : 0.85,
                  filter: isHovered ? "brightness(1.1)" : "none",
                }}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {labelIndices.map((idx) => {
          const item = displayData[idx];
          if (!item) return null;

          const x = padding.left + idx * totalBarWidth + totalBarWidth / 2;
          const y = height - padding.bottom + 16;

          // Angle labels if many bars
          const shouldAngle = displayData.length > 6;

          if (shouldAngle) {
            return (
              <text
                key={idx}
                x={x}
                y={y}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted)"
                transform={`rotate(-45, ${x}, ${y})`}
              >
                {formatLabelUtil(item.category, { compact: true, maxLength: 12 })}
              </text>
            );
          }

          return (
            <text
              key={idx}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted)"
            >
              {formatLabelUtil(item.category, { compact: true, maxLength: 10 })}
            </text>
          );
        })}

        {/* Hover tooltip */}
        {hoveredBar !== null && displayData[hoveredBar] && (() => {
          const d = displayData[hoveredBar];
          const isTotal = (d as typeof d & { isTotal?: boolean }).isTotal;
          const x = padding.left + hoveredBar * totalBarWidth + totalBarWidth / 2;

          const tooltipWidth = 140;
          const tooltipHeight = isTotal ? 44 : 56;
          let tooltipX = x - tooltipWidth / 2;
          if (tooltipX < padding.left) tooltipX = padding.left;
          if (tooltipX + tooltipWidth > width - padding.right) {
            tooltipX = width - padding.right - tooltipWidth;
          }

          const barTop = scaleY(Math.max(d.startValue, d.endValue));
          const tooltipY = barTop >= tooltipHeight + 12 ? barTop - tooltipHeight - 8 : barTop + 8;

          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={4}
                fill="var(--card)"
                stroke="var(--border)"
              />
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 14}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {d.category}
              </text>
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 30}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={isTotal ? totalColor : (d.value >= 0 ? positiveColor : negativeColor)}
              >
                {d.value >= 0 ? "+" : ""}{formatNumber(d.value)}
              </text>
              {!isTotal && (
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 46}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  Running: {formatNumber(d.endValue)}
                </text>
              )}
            </g>
          );
        })()}
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

  // Compute stats for fullscreen
  const stats = [
    { label: "Starting", value: 0 },
    { label: "Final", value: finalTotal },
    { label: "Changes", value: chartData.length },
    { label: "Net Change", value: finalTotal },
  ];

  const columns = [
    { key: categoryColumn, label: categoryColumn.replace(/_/g, " ").toUpperCase() },
    { key: valueColumn, label: valueColumn.replace(/_/g, " ").toUpperCase() },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef} style={{ overflow: "hidden" }}>
          {renderChart()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Waterfall Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        {renderChart(true)}
      </FullscreenModal>
    </>
  );
}
