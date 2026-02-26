"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
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
import { formatNumber, formatLabel as formatLabelUtil } from "@/lib/format-utils";
import { useStylePresetSafe } from "@/lib/style-preset-context";
import { catmullRomPath, calculateNiceTicks, getSpacedIndices } from "@/lib/chart-utils";

interface SeriesData {
  name: string;
  points: Array<{ x: string; y: number }>;
  color: string;
}

/**
 * MultiLineChart - Compare multiple time series on the same axis
 *
 * Use cases:
 * - Compare trends across categories (sales by region over time)
 * - Track multiple metrics (pageviews vs unique visitors)
 * - A/B test result visualization
 */
export function MultiLineChart({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    xColumn,
    yColumn,
    seriesColumn,
    title,
    colorPalette = "default",
    showPoints = true,
    smooth = true,
  } = element.props as {
    queryKey: string;
    xColumn: string;
    yColumn: string;
    seriesColumn: string;
    title?: string | null;
    colorPalette?: string | null;
    showPoints?: boolean | null;
    smooth?: boolean | null;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ series: string; index: number } | null>(null);
  const stylePreset = useStylePresetSafe();
  // Use preset's color palette if none specified
  const defaultPalette = (colorPalette === "default" || !colorPalette) && stylePreset?.preset
    ? stylePreset.preset.colorPaletteId
    : colorPalette || "default";
  const [paletteId, setPaletteId] = useState(defaultPalette);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Sync palette when preset changes
  useEffect(() => {
    if ((colorPalette === "default" || !colorPalette) && stylePreset?.preset) {
      setPaletteId(stylePreset.preset.colorPaletteId);
    }
  }, [colorPalette, stylePreset?.preset?.colorPaletteId, stylePreset?.preset]);

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "multi-line-chart");

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

  // Process data into series
  const { seriesData, xLabels, yMax } = useMemo(() => {
    if (!queryData || queryData.length === 0) {
      return { seriesData: [], xLabels: [], yMax: 0 };
    }

    const colors = getPaletteColors(paletteId);

    // Group by series
    const seriesMap = new Map<string, Map<string, number>>();
    const allXValues = new Set<string>();

    for (const row of queryData) {
      const seriesName = String(row[seriesColumn] ?? "Unknown");
      const xValue = String(row[xColumn] ?? "");
      const yValue = Number(row[yColumn] ?? 0);

      allXValues.add(xValue);

      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, new Map());
      }
      seriesMap.get(seriesName)!.set(xValue, yValue);
    }

    // Sort x values
    const sortedXLabels = Array.from(allXValues).sort((a, b) => {
      // Try date parsing
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      return a.localeCompare(b);
    });

    // Build series data with consistent x values
    const series: SeriesData[] = [];
    let maxY = 0;
    let colorIndex = 0;

    for (const [name, values] of seriesMap) {
      const points = sortedXLabels.map((x) => ({
        x,
        y: values.get(x) ?? 0,
      }));

      // Track max Y for visible series
      if (!hiddenSeries.has(name)) {
        for (const p of points) {
          if (p.y > maxY) maxY = p.y;
        }
      }

      series.push({
        name,
        points,
        color: colors[colorIndex % colors.length]!,
      });
      colorIndex++;
    }

    return { seriesData: series, xLabels: sortedXLabels, yMax: maxY || 1 };
  }, [queryData, seriesColumn, xColumn, yColumn, paletteId, hiddenSeries]);

  // Toggle series visibility
  const toggleSeries = useCallback((seriesName: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesName)) {
        next.delete(seriesName);
      } else {
        next.add(seriesName);
      }
      return next;
    });
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

  // Render chart
  const renderChart = (forFullscreen = false) => {
    const width = forFullscreen ? 900 : 500;
    const height = forFullscreen ? 400 : 220;
    const padding = { top: 20, right: 20, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate nice Y-axis ticks
    const yTicks = calculateNiceTicks(0, yMax, forFullscreen ? 6 : 5);
    const yAxisMax = yTicks[yTicks.length - 1] || yMax || 1;

    // X positions for each point
    const xStep = xLabels.length > 1 ? chartWidth / (xLabels.length - 1) : chartWidth;

    // Label indices
    const maxLabels = forFullscreen ? 12 : 7;
    const labelIndices = getSpacedIndices(xLabels.length, maxLabels);

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
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + chartHeight - (tick / yAxisMax) * chartHeight;
          return (
            <g key={i}>
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
                {formatNumber(tick, { compact: true })}
              </text>
            </g>
          );
        })}

        {/* Series lines */}
        {seriesData.map((series) => {
          if (hiddenSeries.has(series.name)) return null;

          const points = series.points.map((p, i) => ({
            x: padding.left + i * xStep,
            y: padding.top + chartHeight - (p.y / yAxisMax) * chartHeight,
            data: p,
          }));

          const pathD = smooth ? catmullRomPath(points) : points.map((p, i) =>
            `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
          ).join(" ");

          const isHighlighted = !hoveredSeries || hoveredSeries === series.name;
          const opacity = isHighlighted ? 1 : 0.2;

          return (
            <g key={series.name}>
              {/* Line path */}
              <path
                d={pathD}
                fill="none"
                stroke={series.color}
                strokeWidth={hoveredSeries === series.name ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  opacity,
                  transition: "opacity 0.15s ease, stroke-width 0.15s ease",
                }}
              />

              {/* Data points */}
              {(showPoints ?? true) && points.map((p, i) => {
                const isThisPointHovered = hoveredPoint?.series === series.name && hoveredPoint?.index === i;

                return (
                  <g key={i}>
                    {/* Larger hit area */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={16}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => {
                        setHoveredSeries(series.name);
                        setHoveredPoint({ series: series.name, index: i });
                      }}
                      onMouseLeave={() => {
                        setHoveredSeries(null);
                        setHoveredPoint(null);
                      }}
                    />
                    {/* Visible point */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isThisPointHovered ? 6 : 4}
                      fill="var(--background)"
                      stroke={series.color}
                      strokeWidth={2}
                      style={{
                        opacity,
                        transition: "all 0.15s ease",
                        pointerEvents: "none",
                      }}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredPoint && (() => {
          const series = seriesData.find((s) => s.name === hoveredPoint.series);
          if (!series) return null;

          const point = series.points[hoveredPoint.index];
          if (!point) return null;

          const x = padding.left + hoveredPoint.index * xStep;
          const y = padding.top + chartHeight - (point.y / yAxisMax) * chartHeight;

          const tooltipWidth = 120;
          const tooltipHeight = 44;
          let tooltipX = x - tooltipWidth / 2;
          if (tooltipX < padding.left) tooltipX = padding.left;
          if (tooltipX + tooltipWidth > width - padding.right) {
            tooltipX = width - padding.right - tooltipWidth;
          }
          const tooltipY = y > tooltipHeight + 20 ? y - tooltipHeight - 12 : y + 12;

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
                {formatLabelUtil(point.x, { compact: true })} • {series.name}
              </text>
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 32}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {formatNumber(point.y)}
              </text>
            </g>
          );
        })()}

        {/* X-axis labels */}
        {labelIndices.map((idx) => {
          const label = xLabels[idx];
          if (!label) return null;
          return (
            <text
              key={idx}
              x={padding.left + idx * xStep}
              y={height - 12}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted)"
            >
              {formatLabelUtil(label, { compact: true, maxLength: 10 })}
            </text>
          );
        })}
      </svg>
    );
  };

  // Legend
  const renderLegend = () => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
      }}
    >
      {seriesData.map((series) => {
        const isHidden = hiddenSeries.has(series.name);
        const isHighlighted = !hoveredSeries || hoveredSeries === series.name;
        return (
          <button
            key={series.name}
            onClick={() => toggleSeries(series.name)}
            onMouseEnter={() => setHoveredSeries(series.name)}
            onMouseLeave={() => setHoveredSeries(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              background: "transparent",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              opacity: isHidden ? 0.4 : isHighlighted ? 1 : 0.6,
              transition: "opacity 0.15s ease",
            }}
          >
            <div
              style={{
                width: 12,
                height: 3,
                borderRadius: 2,
                background: series.color,
              }}
            />
            <span
              style={{
                fontSize: 12,
                textDecoration: isHidden ? "line-through" : "none",
                color: "var(--foreground)",
              }}
            >
              {series.name}
            </span>
          </button>
        );
      })}
    </div>
  );

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
        colorPalette={paletteId}
        onColorPaletteChange={setPaletteId}
      />
    </div>
  );

  // Stats for fullscreen
  const totalDataPoints = seriesData.reduce((sum, s) => sum + s.points.length, 0);
  const stats = [
    { label: "Series", value: seriesData.length },
    { label: "Data Points", value: totalDataPoints },
    { label: "Time Range", value: xLabels.length },
    { label: "Max Value", value: yMax },
  ];

  const columns = [
    { key: xColumn, label: xColumn.replace(/_/g, " ").toUpperCase() },
    { key: seriesColumn, label: seriesColumn.replace(/_/g, " ").toUpperCase() },
    { key: yColumn, label: yColumn.replace(/_/g, " ").toUpperCase() },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef} style={{ overflow: "hidden" }}>
          {renderChart()}
          {renderLegend()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Multi-Line Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {renderChart(true)}
          {renderLegend()}
        </div>
      </FullscreenModal>
    </>
  );
}
