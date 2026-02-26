"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  Download,
  Image,
  FileText,
  RotateCcw,
} from "lucide-react";
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
import {
  formatAxisValue,
  formatTooltipValue,
  isCurrencyColumn,
  formatLabel as formatLabelUtil,
} from "@/lib/format-utils";
import { useStylePresetSafe } from "@/lib/style-preset-context";
import { getPaletteColors } from "@/lib/color-palette";
import {
  catmullRomPath,
  calculateNiceTicks,
  getSpacedIndices,
  formatChartValue,
} from "@/lib/chart-utils";

/**
 * Hook to observe container width using ResizeObserver.
 * Returns the current width of the container element.
 * Falls back to a default width if the ref is not attached.
 */
function useContainerWidth(
  ref: React.RefObject<HTMLElement | null>,
  defaultWidth = 400
): number {
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Initial measurement
    setWidth(element.clientWidth || defaultWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width || defaultWidth);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, defaultWidth]);

  return width;
}

/**
 * Format a label for display in charts.
 * Detects ISO date strings and formats them nicely.
 */
function formatLabel(label: string, compact = false): string {
  // Check if it looks like an ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      if (compact) {
        // Very short format for crowded x-axis
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      // Format based on granularity - if time component is midnight, show just date
      const hasTime = label.includes("T") && !label.includes("T00:00:00");
      if (hasTime) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
      // For dates, show month and year for monthly data, or month/day for daily
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  // Truncate long labels
  if (label.length > 15 && compact) {
    return label.slice(0, 12) + "...";
  }
  return label;
}

/**
 * Individual bar item with hover state for smooth interactions
 */
function BarItem({
  label,
  value,
  maxValue,
  onClick,
  isClickable,
}: {
  label: string;
  value: number;
  maxValue: number;
  onClick?: () => void;
  isClickable: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: isClickable ? "pointer" : "default",
        padding: "4px 8px",
        marginLeft: -8,
        marginRight: -8,
        borderRadius: 6,
        background: isHovered ? "rgba(14, 165, 233, 0.15)" : "transparent",
        transition: "background 0.15s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${label}: ${formatChartValue(value)}`}
    >
      <span
        style={{
          width: 100,
          fontSize: 12,
          color: isHovered ? "var(--foreground)" : "var(--muted)",
          textAlign: "right",
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "color 0.15s ease",
        }}
      >
        {formatLabel(label, true)}
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 100,
          height: isHovered ? 28 : 24,
          background: "var(--border)",
          borderRadius: 4,
          overflow: "hidden",
          transition: "height 0.15s ease",
        }}
      >
        <div
          style={{
            width: `${(value / maxValue) * 100}%`,
            height: "100%",
            background: isHovered
              ? "var(--primary, var(--foreground))"
              : "var(--foreground)",
            borderRadius: 4,
            transition: "all 0.2s ease",
          }}
        />
      </div>
      <span
        style={{
          width: 60,
          fontSize: 12,
          fontWeight: isHovered ? 600 : 500,
          textAlign: "right",
          flexShrink: 0,
          transition: "font-weight 0.15s ease",
        }}
      >
        {formatChartValue(value)}
      </span>
    </div>
  );
}

/**
 * Individual vertical bar item for SVG-based bar chart
 */
function VerticalBarItem({
  x,
  width,
  value,
  maxValue,
  chartHeight,
  label,
  isHovered,
  onHover,
  onClick,
  isClickable,
  isCurrency,
  barRadius = 4,
  color,
}: {
  x: number;
  width: number;
  value: number;
  maxValue: number;
  chartHeight: number;
  label: string;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick?: () => void;
  isClickable: boolean;
  isCurrency: boolean;
  barRadius?: number;
  color?: string;
}) {
  const barHeight = Math.max((value / maxValue) * chartHeight, 1); // Ensure minimum height for visibility
  const y = chartHeight - barHeight;

  return (
    <g>
      {/* Invisible larger hit area for easier hover */}
      <rect
        x={x - 4}
        y={0}
        width={width + 8}
        height={chartHeight}
        fill="transparent"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onClick}
        style={{ cursor: isClickable ? "pointer" : "default" }}
      />
      {/* Visible bar */}
      <rect
        x={x}
        y={y}
        width={width}
        height={barHeight}
        rx={barRadius}
        fill={color || "var(--foreground)"}
        style={{
          transition: "all 0.15s ease",
          opacity: isHovered ? 1 : 0.85,
          filter: isHovered ? "brightness(1.2)" : undefined,
        }}
      />
      {/* Tooltip on hover */}
      {isHovered && (() => {
        // Calculate tooltip position, ensuring it stays within bounds
        const tooltipWidth = 120;
        const tooltipHeight = 44;
        const tooltipX = Math.max(0, x + width / 2 - tooltipWidth / 2);
        // Always position below bar to avoid clipping at top of SVG
        // Since bars are in a translated group, positioning above can cause clipping
        const tooltipY = y + barHeight + 8;

        return (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={6}
              fill="var(--foreground)"
              opacity={0.95}
            />
            <text
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 16}
              textAnchor="middle"
              fontSize={11}
              fill="var(--background)"
            >
              {formatLabelUtil(label, { compact: true })}
            </text>
            <text
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 32}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="var(--background)"
            >
              {isCurrency ? formatTooltipValue(value, { currency: true }) : formatTooltipValue(value)}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

/**
 * Chart Component - Renders bar, line, pie, or area charts from query data.
 *
 * Features:
 * - Supports bar, line, area, and pie chart types
 * - Interactive tooltips with formatted values
 * - Fullscreen mode with export options (PNG, SVG, CSV)
 * - Drill-down support for filtering dashboards
 * - Responsive sizing with automatic axis scaling
 * - Style presets for consistent theming
 *
 * @example
 * ```json
 * {
 *   "type": "Chart",
 *   "props": {
 *     "type": "bar",
 *     "queryKey": "revenue-by-region",
 *     "labelColumn": "region",
 *     "valueColumn": "total",
 *     "title": "Revenue by Region"
 *   }
 * }
 * ```
 */
export function Chart({ element, loading }: ComponentRenderProps) {
  const { type, queryKey, labelColumn, valueColumn, title, orientation = "vertical" } = element.props as {
    type: "bar" | "line" | "pie" | "area";
    queryKey: string;
    labelColumn: string;
    valueColumn: string;
    title?: string | null;
    orientation?: "vertical" | "horizontal";
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Container-aware sizing: observe container width for responsive charts
  const containerWidth = useContainerWidth(chartRef, 400);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overrideType, setOverrideType] = useState<
    "bar" | "line" | "area" | null
  >(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Column override state for chart refinement
  const [overrideLabelColumn, setOverrideLabelColumn] = useState<string | null>(null);
  const [overrideValueColumn, setOverrideValueColumn] = useState<string | null>(null);

  // Natural language refinement state (prepared for future feature)
  const [_refinementPrompt, _setRefinementPrompt] = useState("");
  const [_isRefining, _setIsRefining] = useState(false);
  const [_refinementError, _setRefinementError] = useState<string | null>(null);

  // Effective chart type (user override or original)
  const effectiveType = overrideType || type;

  // Effective columns (user override or original)
  const effectiveLabelColumn = overrideLabelColumn || labelColumn;
  const effectiveValueColumn = overrideValueColumn || valueColumn;

  const { data } = useData();
  const drillDown = useDrillDownOptional();
  const stylePreset = useStylePresetSafe();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Get style values from preset or use defaults
  const chartStyle = useMemo(() => {
    const preset = stylePreset?.preset;
    return {
      barRadius: preset?.chartStyle.barRadius ?? 4,
      gridOpacity: preset?.chartStyle.gridOpacity ?? 0.5,
      gridStyle: preset?.chartStyle.gridStyle ?? "dashed",
      colors: preset ? getPaletteColors(preset.colorPaletteId) : getPaletteColors("default"),
    };
  }, [stylePreset?.preset]);

  // Handle drill-down click
  const handleDrillDown = useCallback(
    (label: string) => {
      if (!drillDown || !queryData) return;

      // Filter rows where effective labelColumn matches the clicked label
      const filteredRows = filterRowsByDimension(queryData, effectiveLabelColumn, label);

      drillDown.openDrillDown(
        {
          queryKey,
          dimension: effectiveLabelColumn,
          value: label,
          labelColumn: effectiveLabelColumn,
          valueColumn: effectiveValueColumn,
          chartType: effectiveType,
          title: title ?? undefined,
        },
        filteredRows,
      );
    },
    [drillDown, queryData, queryKey, effectiveLabelColumn, effectiveValueColumn, effectiveType, title],
  );

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "chart");

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

  // Chart type options (exclude pie for now as it needs different data structure)
  // Must be defined before early returns to satisfy Rules of Hooks
  const chartTypes = useMemo(
    () => [
      { value: "bar" as const, label: "Bar" },
      { value: "line" as const, label: "Line" },
      { value: "area" as const, label: "Area" },
    ],
    [],
  );

  // State for vertical bar hover (must be before early returns)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Extract available columns from query data for refinement panel
  // Must be before early returns to maintain hook order
  const availableColumns = useMemo(() => {
    if (!queryData || queryData.length === 0) return [];
    const firstRow = queryData[0];
    return Object.keys(firstRow).map((key) => {
      // Determine if column is numeric by checking values
      const values = queryData.slice(0, 10).map((row) => row[key]);
      const isNumeric = values.every(
        (v) => v === null || v === undefined || typeof v === "number" || !isNaN(Number(v))
      );
      return { name: key, isNumeric };
    });
  }, [queryData]);

  // Check if any overrides are active (must be before early returns)
  const hasOverrides = overrideType !== null || overrideLabelColumn !== null || overrideValueColumn !== null;

  // Reset all overrides (must be before early returns to maintain hook order)
  const resetOverrides = useCallback(() => {
    setOverrideType(null);
    setOverrideLabelColumn(null);
    setOverrideValueColumn(null);
    _setRefinementPrompt("");
    _setRefinementError(null);
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

  // Extract data for chart using effective columns (with overrides applied)
  const chartData = queryData.map((row) => ({
    label: String(row[effectiveLabelColumn] ?? ""),
    value: Number(row[effectiveValueColumn] ?? 0),
  }));

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  // Determine if this chart type uses SVG (now includes vertical bar charts)
  const hasSvg = effectiveType !== "bar" || orientation === "vertical";

  // Chart header with actions (chart type selector only in fullscreen)
  const chartHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      {title ? (
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h4>
      ) : (
        <div />
      )}
      <ChartActions
        onExportPng={handleExportPng}
        onExportSvg={hasSvg ? handleExportSvg : undefined}
        onExportCsv={handleExportCsv}
        onCopy={handleCopy}
        onFullscreen={() => setIsFullscreen(true)}
      />
    </div>
  );

  // Fullscreen toolbar with chart type selector (dark theme styling)
  // Download button style for fullscreen
  const fsButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    padding: 0,
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };

  // Dropdown style for fullscreen toolbar
  const fsSelectStyle: React.CSSProperties = {
    padding: "6px 28px 6px 12px",
    fontSize: 13,
    background: "rgba(255,255,255,0.1)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 6,
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  const fullscreenToolbar = (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      {/* Chart type selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          Type:
        </span>
        <select
          value={effectiveType}
          onChange={(e) => {
            const value = e.target.value as "bar" | "line" | "area";
            setOverrideType(value === type ? null : value);
          }}
          style={fsSelectStyle}
          data-testid="chart-type-dropdown"
        >
          {chartTypes.map(({ value, label }) => (
            <option key={value} value={value} style={{ background: "#1a1a1a", color: "white" }}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* X-Axis (Label) column selector */}
      {availableColumns.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            X-Axis:
          </span>
          <select
            value={effectiveLabelColumn}
            onChange={(e) => {
              const value = e.target.value;
              setOverrideLabelColumn(value === labelColumn ? null : value);
            }}
            style={fsSelectStyle}
            data-testid="x-axis-dropdown"
          >
            {availableColumns.map(({ name }) => (
              <option key={name} value={name} style={{ background: "#1a1a1a", color: "white" }}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Y-Axis (Value) column selector */}
      {availableColumns.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            Y-Axis:
          </span>
          <select
            value={effectiveValueColumn}
            onChange={(e) => {
              const value = e.target.value;
              setOverrideValueColumn(value === valueColumn ? null : value);
            }}
            style={fsSelectStyle}
            data-testid="y-axis-dropdown"
          >
            {availableColumns
              .filter(({ isNumeric }) => isNumeric)
              .map(({ name }) => (
                <option key={name} value={name} style={{ background: "#1a1a1a", color: "white" }}>
                  {name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Reset button - only show if there are overrides */}
      {hasOverrides && (
        <button
          onClick={resetOverrides}
          title="Reset to original configuration"
          style={{
            ...fsButtonStyle,
            background: "rgba(239, 68, 68, 0.2)",
            borderColor: "rgba(239, 68, 68, 0.4)",
          }}
        >
          <RotateCcw size={16} />
        </button>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)" }} />

      {/* Export options */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          Export:
        </span>
        <button
          onClick={handleExportPng}
          title="Download PNG"
          style={fsButtonStyle}
        >
          <Image size={16} />
        </button>
        {hasSvg && (
          <button
            onClick={handleExportSvg}
            title="Download SVG"
            style={fsButtonStyle}
          >
            <Download size={16} />
          </button>
        )}
        <button
          onClick={handleExportCsv}
          title="Download CSV"
          style={fsButtonStyle}
        >
          <FileText size={16} />
        </button>
      </div>
    </div>
  );

  // Detect if value column suggests currency
  const isCurrency = isCurrencyColumn(effectiveValueColumn);

  // Render chart content based on type
  const renderChartContent = (forFullscreen = false) => {
    const containerStyle: React.CSSProperties = forFullscreen
      ? { minWidth: 400, minHeight: 300 }
      : { overflow: "hidden" };

    // Bar chart
    if (effectiveType === "bar") {
      // Limit to max 10 bars for readability, show top N by value
      const sortedData = [...chartData].sort((a, b) => b.value - a.value);
      const displayData = forFullscreen ? sortedData : sortedData.slice(0, 10);
      const localMax = Math.max(...displayData.map((d) => d.value), 1);

      // Vertical bar chart (default)
      if (orientation === "vertical") {
        // Use container-aware width with reasonable max bounds
        const width = forFullscreen ? 800 : Math.max(300, Math.min(containerWidth, 600));
        const height = Math.round(width * (forFullscreen ? 0.44 : 0.55));
        const padding = { top: 20, right: 20, bottom: 60, left: 55 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate nice Y-axis ticks
        const yTicks = calculateNiceTicks(0, localMax, forFullscreen ? 6 : 5);
        const yMax = yTicks[yTicks.length - 1] || localMax || 1;

        // Bar dimensions
        const barCount = displayData.length;
        const barPadding = 0.2; // 20% of bar width as gap
        const totalBarWidth = chartWidth / barCount;
        const barWidth = totalBarWidth * (1 - barPadding);
        const barGap = totalBarWidth * barPadding;

        // Determine if labels should be angled (when > 6 items or long labels)
        const avgLabelLength =
          displayData.reduce((sum, d) => sum + d.label.length, 0) / displayData.length;
        const shouldAngleLabels = barCount > 6 || avgLabelLength > 8;

        return (
          <div style={containerStyle}>
            <svg
              ref={forFullscreen ? undefined : svgRef}
              viewBox={`0 0 ${width} ${height}`}
              style={{
                width: "100%",
                height: height,
                display: "block",
              }}
            >
              {/* Y-axis grid lines and labels */}
              {yTicks.map((tick, i) => {
                const y = padding.top + chartHeight - (tick / yMax) * chartHeight;
                const gridDasharray = chartStyle.gridStyle === "dashed" ? "4 4" : chartStyle.gridStyle === "dotted" ? "2 2" : undefined;
                return (
                  <g key={i}>
                    {chartStyle.gridStyle !== "none" && (
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray={gridDasharray}
                      strokeOpacity={chartStyle.gridOpacity}
                    />
                    )}
                    <text
                      x={padding.left - 8}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="var(--muted)"
                      fontSize={10}
                    >
                      {formatAxisValue(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              <g transform={`translate(${padding.left}, ${padding.top})`}>
                {displayData.map((item, i) => {
                  const x = i * totalBarWidth + barGap / 2;
                  return (
                    <VerticalBarItem
                      key={i}
                      x={x}
                      width={barWidth}
                      value={item.value}
                      maxValue={yMax}
                      chartHeight={chartHeight}
                      label={item.label}
                      isHovered={hoveredBar === i}
                      onHover={(hovered) => setHoveredBar(hovered ? i : null)}
                      onClick={drillDown ? () => handleDrillDown(item.label) : undefined}
                      isClickable={!!drillDown}
                      isCurrency={isCurrency}
                      barRadius={chartStyle.barRadius}
                      color={chartStyle.colors[i % chartStyle.colors.length]}
                    />
                  );
                })}
              </g>

              {/* X-axis labels - only show subset when many bars */}
              {(() => {
                // Limit labels to prevent overlap
                const maxLabels = forFullscreen ? 15 : 8;
                const labelIndices = getSpacedIndices(displayData.length, maxLabels);

                return labelIndices.map((idx) => {
                  const item = displayData[idx];
                  if (!item) return null;

                  const x = padding.left + idx * totalBarWidth + totalBarWidth / 2;
                  const y = height - padding.bottom + 16;

                  if (shouldAngleLabels) {
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
                        {formatLabelUtil(item.label, { compact: true, maxLength: 12 })}
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
                      {formatLabelUtil(item.label, { compact: true, maxLength: 10 })}
                    </text>
                  );
                });
              })()}
            </svg>
            {!forFullscreen && chartData.length > 10 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Showing top 10 of {chartData.length} items
              </div>
            )}
          </div>
        );
      }

      // Horizontal bar chart (original behavior)
      return (
        <div style={containerStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {displayData.map((item, i) => (
              <BarItem
                key={i}
                label={item.label}
                value={item.value}
                maxValue={localMax}
                isClickable={!!drillDown}
                onClick={
                  drillDown ? () => handleDrillDown(item.label) : undefined
                }
              />
            ))}
            {!forFullscreen && chartData.length > 10 && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Showing top 10 of {chartData.length} items
              </div>
            )}
          </div>
        </div>
      );
    }

    // Line/Area chart - improved with smooth curves, grid, and tooltips
    if (effectiveType === "line" || effectiveType === "area") {
      // Use container-aware width with reasonable max bounds
      const width = forFullscreen ? 800 : Math.max(300, Math.min(containerWidth, 600));
      const height = Math.round(width * (forFullscreen ? 0.5 : 0.5));
      const padding = { top: 20, right: 20, bottom: 40, left: 55 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Calculate nice Y-axis ticks
      const yTicks = calculateNiceTicks(0, maxValue, forFullscreen ? 6 : 5);
      const yMax = yTicks[yTicks.length - 1] || maxValue || 1;

      // Map data to pixel coordinates
      const points = chartData.map((d, i) => ({
        x: padding.left + (i / (chartData.length - 1 || 1)) * chartWidth,
        y: padding.top + chartHeight - (d.value / yMax) * chartHeight,
        data: d,
      }));

      // Use smooth Catmull-Rom path
      const pathD = catmullRomPath(points);

      // Area path fills to bottom
      const lastPoint = points[points.length - 1];
      const firstPoint = points[0];
      const areaPathD =
        effectiveType === "area" && lastPoint && firstPoint
          ? `${pathD} L ${lastPoint.x} ${padding.top + chartHeight} L ${firstPoint.x} ${padding.top + chartHeight} Z`
          : "";

      // X-axis labels - show limited number to prevent crowding
      const maxLabels = forFullscreen ? 10 : 6;
      const labelIndices = getSpacedIndices(chartData.length, maxLabels);

      // Show points for smaller datasets
      const showPoints = chartData.length <= 50;

      return (
        <div style={containerStyle}>
          <svg
            ref={forFullscreen ? undefined : svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              width: "100%",
              height: height,
              display: "block",
            }}
          >
            {/* Grid lines */}
            {yTicks.map((tick, i) => {
              const y = padding.top + chartHeight - (tick / yMax) * chartHeight;
              const gridDasharray = chartStyle.gridStyle === "dashed" ? "4 4" : chartStyle.gridStyle === "dotted" ? "2 2" : undefined;
              return (
                <g key={i}>
                  {chartStyle.gridStyle !== "none" && (
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray={gridDasharray}
                    strokeOpacity={chartStyle.gridOpacity}
                  />
                  )}
                  <text
                    x={padding.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--muted)"
                    fontSize={10}
                  >
                    {formatChartValue(tick)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {effectiveType === "area" && areaPathD && (
              <path d={areaPathD} fill={chartStyle.colors[0]} opacity={0.15} />
            )}

            {/* Smooth line path */}
            <path
              d={pathD}
              fill="none"
              stroke={chartStyle.colors[0]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points with hover interaction */}
            {showPoints &&
              points.map((p, i) => (
                <g key={i}>
                  {/* Invisible larger hit area for easier hover */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={forFullscreen ? 20 : 16}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => drillDown && handleDrillDown(p.data.label)}
                    style={{ cursor: drillDown ? "pointer" : "default", pointerEvents: "all" }}
                  />
                  {/* Visible point - grows on hover */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint === i ? 6 : 4}
                    fill="var(--background)"
                    stroke={chartStyle.colors[0]}
                    strokeWidth={2}
                    style={{ transition: "r 0.15s ease", pointerEvents: "none" }}
                  />
                </g>
              ))}

            {/* Tooltip - shown when hovering a point */}
            {hoveredPoint !== null &&
              points[hoveredPoint] &&
              (() => {
                const p = points[hoveredPoint];
                const tooltipWidth = 100;
                const tooltipHeight = 36;
                // Adjust tooltip position to stay within bounds
                let tooltipX = p.x - tooltipWidth / 2;
                if (tooltipX < padding.left) tooltipX = padding.left;
                if (tooltipX + tooltipWidth > width - padding.right)
                  tooltipX = width - padding.right - tooltipWidth;
                // Position above point if space, below if not
                let tooltipY = p.y - tooltipHeight - 12;
                if (tooltipY < padding.top) {
                  tooltipY = p.y + 12;
                }

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
                      {formatLabel(p.data.label, true)}
                    </text>
                    <text
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + 28}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--foreground)"
                    >
                      {formatChartValue(p.data.value)}
                    </text>
                  </g>
                );
              })()}

            {/* X-axis labels */}
            {labelIndices.map((idx) => {
              const d = chartData[idx];
              if (!d || !points[idx]) return null;
              return (
                <text
                  key={idx}
                  x={points[idx].x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {formatLabel(d.label, true)}
                </text>
              );
            })}
          </svg>
        </div>
      );
    }

    // Pie chart
    if (effectiveType === "pie") {
      const total = chartData.reduce((sum, d) => sum + d.value, 0);
      let currentAngle = 0;
      const colors = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#ec4899",
      ];

      return (
        <div
          style={{
            ...containerStyle,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <svg
            ref={forFullscreen ? undefined : svgRef}
            viewBox="-1 -1 2 2"
            style={{
              width: forFullscreen ? 200 : 150,
              height: forFullscreen ? 200 : 150,
            }}
          >
            {chartData.map((d, i) => {
              const angle = (d.value / total) * Math.PI * 2;
              const x1 = Math.cos(currentAngle);
              const y1 = Math.sin(currentAngle);
              const x2 = Math.cos(currentAngle + angle);
              const y2 = Math.sin(currentAngle + angle);
              const largeArc = angle > Math.PI ? 1 : 0;
              const pathD = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
              currentAngle += angle;
              const percentage = ((d.value / total) * 100).toFixed(1);
              return (
                <path
                  key={i}
                  d={pathD}
                  fill={colors[i % colors.length]}
                  style={{
                    cursor: drillDown ? "pointer" : "default",
                    transition: "opacity 0.15s ease",
                  }}
                  onClick={() => drillDown && handleDrillDown(d.label)}
                >
                  <title>{`${d.label}: ${formatChartValue(d.value)} (${percentage}%)${drillDown ? "\nClick to drill down" : ""}`}</title>
                </path>
              );
            })}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {chartData.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: drillDown ? "pointer" : "default",
                }}
                onClick={() => drillDown && handleDrillDown(d.label)}
                title={
                  drillDown ? `Click to see ${d.label} details` : undefined
                }
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: colors[i % colors.length],
                  }}
                />
                <span style={{ fontSize: 13 }}>{formatLabel(d.label)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  // Compute stats for fullscreen view
  const stats = queryData
    ? [
        {
          label: "Total",
          value: chartData.reduce((sum, d) => sum + d.value, 0),
        },
        {
          label: "Average",
          value:
            chartData.length > 0
              ? chartData.reduce((sum, d) => sum + d.value, 0) /
                chartData.length
              : 0,
        },
        { label: "Max", value: Math.max(...chartData.map((d) => d.value), 0) },
        { label: "Data Points", value: chartData.length },
      ]
    : undefined;

  // Column configuration for data table (uses effective columns with overrides)
  const columns = [
    { key: effectiveLabelColumn, label: effectiveLabelColumn.replace(/_/g, " ").toUpperCase() },
    { key: effectiveValueColumn, label: effectiveValueColumn.replace(/_/g, " ").toUpperCase() },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef} style={{ overflow: "hidden" }}>
          {renderChartContent()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
        toolbar={fullscreenToolbar}
      >
        {renderChartContent(true)}
      </FullscreenModal>
    </>
  );
}
