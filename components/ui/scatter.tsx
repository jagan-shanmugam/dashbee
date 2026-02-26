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
import { getPaletteColors } from "@/lib/color-palette";
import { useStylePresetSafe } from "@/lib/style-preset-context";
import { calculateNiceTicks, formatChartValue } from "@/lib/chart-utils";

export function Scatter({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    xColumn,
    yColumn,
    sizeColumn,
    colorColumn,
    labelColumn,
    title,
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    xColumn: string;
    yColumn: string;
    sizeColumn?: string | null;
    colorColumn?: string | null;
    labelColumn?: string | null;
    title?: string | null;
    colorPalette?: string;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const { data } = useData();
  const stylePreset = useStylePresetSafe();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  const filenameBase = sanitizeFilename(title || queryKey || "scatter");
  // Use preset's color palette if none specified
  const effectivePalette = colorPalette === "default" && stylePreset?.preset
    ? stylePreset.preset.colorPaletteId
    : colorPalette;
  const colors = useMemo(() => getPaletteColors(effectivePalette), [effectivePalette]);

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
        {title && (
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {title}
          </h4>
        )}
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

  // Process data for scatter plot
  const scatterData = queryData.map((row, i) => ({
    x: Number(row[xColumn] ?? 0),
    y: Number(row[yColumn] ?? 0),
    size: sizeColumn ? Number(row[sizeColumn] ?? 1) : 1,
    color: colorColumn ? String(row[colorColumn] ?? "") : null,
    label: labelColumn ? String(row[labelColumn] ?? "") : null,
    index: i,
  }));

  // Calculate ranges
  const xValues = scatterData.map((d) => d.x);
  const yValues = scatterData.map((d) => d.y);
  const sizeValues = scatterData.map((d) => d.size);

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const sizeMin = Math.min(...sizeValues);
  const sizeMax = Math.max(...sizeValues);

  // Get unique colors for legend
  const uniqueColors = colorColumn
    ? [...new Set(scatterData.map((d) => d.color).filter(Boolean))]
    : [];

  // Color mapping function
  const getPointColor = (colorValue: string | null): string => {
    if (!colorValue || uniqueColors.length === 0) return colors[0] || "#3b82f6";
    const index = uniqueColors.indexOf(colorValue);
    return colors[index % colors.length] || colors[0] || "#3b82f6";
  };

  // Size mapping function (normalize to 5-25px radius for better visibility)
  const getPointRadius = (size: number): number => {
    if (sizeMin === sizeMax) return 10;
    const normalized = (size - sizeMin) / (sizeMax - sizeMin);
    return 5 + normalized * 20;
  };

  // Calculate point opacity based on data density
  const pointCount = scatterData.length;
  const baseOpacity = pointCount > 1000 ? 0.4 : pointCount > 500 ? 0.5 : pointCount > 100 ? 0.6 : 0.7;
  const hoverOpacity = pointCount > 500 ? 0.85 : 1;

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

  const renderScatter = (forFullscreen = false) => {
    const width = forFullscreen ? 900 : 500;
    const height = forFullscreen ? 500 : 320;
    const padding = { top: 24, right: 30, bottom: 55, left: 65 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xTicks = calculateNiceTicks(xMin, xMax, forFullscreen ? 8 : 5);
    const yTicks = calculateNiceTicks(yMin, yMax, forFullscreen ? 6 : 5);

    const xAxisMin = xTicks[0] ?? xMin;
    const xAxisMax = xTicks[xTicks.length - 1] ?? xMax;
    const yAxisMin = yTicks[0] ?? yMin;
    const yAxisMax = yTicks[yTicks.length - 1] ?? yMax;

    const scaleX = (x: number) =>
      padding.left + ((x - xAxisMin) / (xAxisMax - xAxisMin || 1)) * chartWidth;
    const scaleY = (y: number) =>
      padding.top + chartHeight - ((y - yAxisMin) / (yAxisMax - yAxisMin || 1)) * chartHeight;

    return (
      <div style={{ overflow: "hidden" }}>
        <svg
          ref={forFullscreen ? undefined : svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: forFullscreen ? 500 : 320,
            display: "block",
          }}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = scaleY(tick);
            return (
              <g key={`y-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
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

          {xTicks.map((tick, i) => {
            const x = scaleX(tick);
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.3}
                />
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize={10}
                >
                  {formatChartValue(tick)}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize={12}
          >
            {xColumn}
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize={12}
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            {yColumn}
          </text>

          {/* Data points */}
          {scatterData.map((point, i) => {
            const cx = scaleX(point.x);
            const cy = scaleY(point.y);
            const r = getPointRadius(point.size);
            const color = getPointColor(point.color);
            const isHovered = hoveredPoint === i;
            // Scale hit area based on chart size for better touch/mouse targeting
            const hitRadius = Math.max(r + 12, forFullscreen ? 20 : 16);

            return (
              <g key={i}>
                {/* Invisible larger hit area for easier hover/click */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={hitRadius}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                />
                {/* Visible point with density-based rendering */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 3 : r}
                  fill={color}
                  fillOpacity={isHovered ? hoverOpacity : baseOpacity}
                  stroke={isHovered ? "var(--foreground)" : "rgba(255,255,255,0.3)"}
                  strokeWidth={isHovered ? 2.5 : 0.5}
                  style={{
                    transition: "all 0.2s ease-out",
                    filter: isHovered ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" : "none",
                    pointerEvents: "none",
                  }}
                />
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredPoint !== null && scatterData[hoveredPoint] && (() => {
            const point = scatterData[hoveredPoint];
            const r = getPointRadius(point.size);
            const tooltipWidth = 120;
            const tooltipHeight = point.label ? 60 : 48;
            const pointX = scaleX(point.x);
            const pointY = scaleY(point.y);

            // Calculate optimal tooltip position
            let tooltipX = pointX + r + 10;
            let tooltipY = pointY - tooltipHeight / 2;

            // Keep tooltip within bounds
            if (tooltipX + tooltipWidth > width - padding.right) {
              tooltipX = pointX - tooltipWidth - r - 10;
            }
            if (tooltipY < padding.top) {
              tooltipY = padding.top;
            }
            if (tooltipY + tooltipHeight > height - padding.bottom) {
              tooltipY = height - padding.bottom - tooltipHeight;
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
                {point.label && (
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 16}
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {point.label.length > 12 ? point.label.slice(0, 12) + "..." : point.label}
                  </text>
                )}
                <text
                  x={tooltipX + 8}
                  y={tooltipY + (point.label ? 32 : 18)}
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {xColumn}: {formatChartValue(point.x)}
                </text>
                <text
                  x={tooltipX + 8}
                  y={tooltipY + (point.label ? 48 : 34)}
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {yColumn}: {formatChartValue(point.y)}
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Color legend */}
        {uniqueColors.length > 0 && uniqueColors.length <= 8 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 12,
              justifyContent: "center",
            }}
          >
            {uniqueColors.map((colorVal, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: getPointColor(colorVal),
                  }}
                />
                <span style={{ color: "var(--muted)" }}>{colorVal}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Stats for fullscreen
  const stats = [
    { label: "Points", value: scatterData.length },
    { label: `${xColumn} (min)`, value: xMin },
    { label: `${xColumn} (max)`, value: xMax },
    { label: `${yColumn} (min)`, value: yMin },
    { label: `${yColumn} (max)`, value: yMax },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef}>{renderScatter()}</div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Scatter Plot"}
        data={queryData}
        stats={stats}
        columns={[
          { key: xColumn, label: xColumn },
          { key: yColumn, label: yColumn },
          ...(sizeColumn ? [{ key: sizeColumn, label: sizeColumn }] : []),
          ...(colorColumn ? [{ key: colorColumn, label: colorColumn }] : []),
          ...(labelColumn ? [{ key: labelColumn, label: labelColumn }] : []),
        ]}
      >
        {renderScatter(true)}
      </FullscreenModal>
    </>
  );
}
