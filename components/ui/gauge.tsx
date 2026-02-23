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
import { formatNumber } from "@/lib/format-utils";

/**
 * Create an SVG arc path
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  // Convert angles from degrees to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

/**
 * GaugeChart - Radial progress meter for KPI visualization
 *
 * Use cases:
 * - Progress towards target (sales target, quota completion)
 * - Performance metrics (CPU usage, satisfaction score)
 * - Status indicators (capacity, health scores)
 *
 * Color zones: green/yellow/red indicate good/warning/critical states
 */
export function GaugeChart({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    valueColumn,
    title,
    min = 0,
    max = 100,
    target,
    thresholds,
    format = "number",
  } = element.props as {
    queryKey: string;
    valueColumn: string;
    title?: string | null;
    min?: number | null;
    max?: number | null;
    target?: number | null;
    thresholds?: { warning?: number | null; danger?: number | null } | null;
    format?: "number" | "percent" | "currency" | null;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "gauge-chart");

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
            height: 150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 160,
              height: 80,
              borderRadius: "80px 80px 0 0",
              background: "var(--border)",
              animation: "pulse 1.5s infinite",
            }}
          />
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

  // Extract value (first row, specified column)
  const firstRow = queryData[0];
  const value = Number(firstRow?.[valueColumn] ?? 0);

  // Effective min/max
  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 100;
  const range = effectiveMax - effectiveMin;

  // Clamp value to range
  const clampedValue = Math.max(effectiveMin, Math.min(effectiveMax, value));
  const percentage = range > 0 ? ((clampedValue - effectiveMin) / range) * 100 : 0;

  // Determine color based on thresholds
  const getValueColor = (): string => {
    if (!thresholds) return "#3b82f6"; // Default blue

    const { warning, danger } = thresholds;

    // If danger threshold exists and value exceeds it
    if (danger !== undefined && danger !== null && value >= danger) {
      return "#ef4444"; // Red
    }
    // If warning threshold exists and value exceeds it
    if (warning !== undefined && warning !== null && value >= warning) {
      return "#f59e0b"; // Amber
    }

    return "#10b981"; // Green - good state
  };

  // Format the display value
  const formatDisplayValue = (val: number): string => {
    switch (format) {
      case "percent":
        return `${formatNumber(val, { decimals: 1 })}%`;
      case "currency":
        return formatNumber(val, { currency: true, compact: true });
      default:
        return formatNumber(val, { compact: true });
    }
  };

  // Render gauge
  const renderGauge = (forFullscreen = false) => {
    const size = forFullscreen ? 280 : 180;
    const cx = size / 2;
    const cy = size * 0.55; // Center slightly below middle for arc
    const radius = size * 0.4;
    const strokeWidth = forFullscreen ? 20 : 14;

    // Arc goes from -180° to 0° (bottom semicircle flipped to top)
    const startAngle = 180;
    const endAngle = 0;
    const totalAngle = 180;

    // Value arc end angle
    const valueAngle = startAngle - (percentage / 100) * totalAngle;

    // Target line position
    const targetAngle = target !== undefined && target !== null
      ? startAngle - (((target - effectiveMin) / range) * totalAngle)
      : null;

    const valueColor = getValueColor();

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        style={{
          width: size,
          height: size * 0.65,
          display: "block",
        }}
      >
        {/* Background track */}
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored zones (optional - only if thresholds defined) */}
        {thresholds && (
          <>
            {/* Green zone (good) */}
            <path
              d={describeArc(
                cx,
                cy,
                radius,
                startAngle,
                thresholds.warning
                  ? startAngle - (((thresholds.warning - effectiveMin) / range) * totalAngle)
                  : startAngle - totalAngle * 0.6
              )}
              fill="none"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.15}
            />
            {/* Yellow zone (warning) */}
            {thresholds.warning !== undefined && thresholds.warning !== null && (
              <path
                d={describeArc(
                  cx,
                  cy,
                  radius,
                  startAngle - (((thresholds.warning - effectiveMin) / range) * totalAngle),
                  thresholds.danger
                    ? startAngle - (((thresholds.danger - effectiveMin) / range) * totalAngle)
                    : startAngle - totalAngle * 0.85
                )}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.15}
              />
            )}
            {/* Red zone (danger) */}
            {thresholds.danger !== undefined && thresholds.danger !== null && (
              <path
                d={describeArc(
                  cx,
                  cy,
                  radius,
                  startAngle - (((thresholds.danger - effectiveMin) / range) * totalAngle),
                  endAngle
                )}
                fill="none"
                stroke="#ef4444"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.15}
              />
            )}
          </>
        )}

        {/* Value arc */}
        {percentage > 0 && (
          <path
            d={describeArc(cx, cy, radius, startAngle, valueAngle)}
            fill="none"
            stroke={valueColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease",
            }}
          />
        )}

        {/* Target marker */}
        {targetAngle !== null && (
          <g>
            <line
              x1={cx + (radius - strokeWidth) * Math.cos((targetAngle * Math.PI) / 180)}
              y1={cy + (radius - strokeWidth) * Math.sin((targetAngle * Math.PI) / 180)}
              x2={cx + (radius + strokeWidth) * Math.cos((targetAngle * Math.PI) / 180)}
              y2={cy + (radius + strokeWidth) * Math.sin((targetAngle * Math.PI) / 180)}
              stroke="var(--foreground)"
              strokeWidth={2}
              opacity={0.6}
            />
          </g>
        )}

        {/* Center value display */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          fontSize={forFullscreen ? 36 : 26}
          fontWeight={700}
        >
          {formatDisplayValue(value)}
        </text>

        {/* Min/Max labels */}
        <text
          x={cx - radius}
          y={cy + strokeWidth + 16}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={forFullscreen ? 11 : 10}
        >
          {formatDisplayValue(effectiveMin)}
        </text>
        <text
          x={cx + radius}
          y={cy + strokeWidth + 16}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={forFullscreen ? 11 : 10}
        >
          {formatDisplayValue(effectiveMax)}
        </text>

        {/* Target label */}
        {target !== undefined && target !== null && (
          <text
            x={cx}
            y={cy + strokeWidth + 16}
            textAnchor="middle"
            fill="var(--muted)"
            fontSize={forFullscreen ? 10 : 9}
          >
            Target: {formatDisplayValue(target)}
          </text>
        )}
      </svg>
    );
  };

  // Status badge
  const renderStatus = () => {
    const valueColor = getValueColor();
    const statusText =
      valueColor === "#ef4444"
        ? "Critical"
        : valueColor === "#f59e0b"
          ? "Warning"
          : "Good";

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: valueColor,
          }}
        />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {statusText} • {percentage.toFixed(1)}% of max
        </span>
      </div>
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

  // Stats for fullscreen
  const stats = [
    { label: "Current", value: value },
    { label: "Min", value: effectiveMin },
    { label: "Max", value: effectiveMax },
    ...(target !== undefined && target !== null ? [{ label: "Target", value: target }] : []),
  ];

  const columns = [
    { key: valueColumn, label: valueColumn.replace(/_/g, " ").toUpperCase() },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div
          ref={chartRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {renderGauge()}
          {thresholds && renderStatus()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Gauge Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderGauge(true)}
          {thresholds && renderStatus()}
        </div>
      </FullscreenModal>
    </>
  );
}
