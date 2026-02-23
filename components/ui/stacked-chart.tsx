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
import { useStylePresetSafe } from "@/lib/style-preset-context";

/**
 * Calculate nice round tick values
 */
function calculateNiceTicks(
  min: number,
  max: number,
  targetCount: number,
): number[] {
  if (max === min) return [0, max || 1];

  const range = max - min;
  const roughStep = range / (targetCount - 1);

  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax; tick += niceStep) {
    ticks.push(tick);
  }

  return ticks.length >= 2 ? ticks : [0, max];
}

/**
 * Format a number for display
 */
function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(value);
}

/**
 * Format a label for display (truncate long labels)
 */
function formatLabel(label: string, compact = false): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }
  if (label.length > 12 && compact) {
    return label.slice(0, 10) + "...";
  }
  return label;
}

export function StackedChart({ element, loading }: ComponentRenderProps) {
  const {
    type = "bar",
    queryKey,
    categoryColumn,
    seriesColumn,
    valueColumn,
    title,
    colorPalette = "default",
    normalized = false,
  } = element.props as {
    type?: "bar" | "area";
    queryKey: string;
    categoryColumn: string;
    seriesColumn: string;
    valueColumn: string;
    title?: string | null;
    colorPalette?: string;
    normalized?: boolean;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<{
    category: string;
    series: string;
  } | null>(null);
  const stylePreset = useStylePresetSafe();
  // Use preset's color palette if none specified
  const defaultPalette = (colorPalette === "default" || !colorPalette) && stylePreset?.preset
    ? stylePreset.preset.colorPaletteId
    : colorPalette || "default";
  const [paletteId, setPaletteId] = useState(defaultPalette);

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

  const filenameBase = sanitizeFilename(title || queryKey || "stacked-chart");
  const colors = getPaletteColors(paletteId);

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

  // Process data into stacked format
  const stackedData = useMemo(() => {
    if (!queryData || !Array.isArray(queryData)) return { categories: [], series: [], data: new Map() };

    // Get unique categories and series
    const categoriesSet = new Set<string>();
    const seriesSet = new Set<string>();
    const dataMap = new Map<string, Map<string, number>>();

    queryData.forEach((row) => {
      const category = String(row[categoryColumn] ?? "");
      const series = String(row[seriesColumn] ?? "");
      const value = Number(row[valueColumn] ?? 0);

      categoriesSet.add(category);
      seriesSet.add(series);

      if (!dataMap.has(category)) {
        dataMap.set(category, new Map());
      }
      const categoryData = dataMap.get(category)!;
      categoryData.set(series, (categoryData.get(series) || 0) + value);
    });

    return {
      categories: Array.from(categoriesSet),
      series: Array.from(seriesSet),
      data: dataMap,
    };
  }, [queryData, categoryColumn, seriesColumn, valueColumn]);

  // Calculate stacked values
  const stackedValues = useMemo(() => {
    const result: {
      category: string;
      stacks: { series: string; value: number; y0: number; y1: number }[];
      total: number;
    }[] = [];

    stackedData.categories.forEach((category) => {
      const categoryData = stackedData.data.get(category) || new Map();
      const stacks: { series: string; value: number; y0: number; y1: number }[] = [];
      let cumulative = 0;
      let total = 0;

      stackedData.series.forEach((series) => {
        const value = categoryData.get(series) || 0;
        total += value;
      });

      stackedData.series.forEach((series) => {
        const value = categoryData.get(series) || 0;
        const normalizedValue = normalized && total > 0 ? (value / total) * 100 : value;
        stacks.push({
          series,
          value: normalizedValue,
          y0: cumulative,
          y1: cumulative + normalizedValue,
        });
        cumulative += normalizedValue;
      });

      result.push({ category, stacks, total: normalized ? 100 : total });
    });

    return result;
  }, [stackedData, normalized]);

  // Calculate max value
  const maxValue = useMemo(() => {
    if (normalized) return 100;
    return Math.max(...stackedValues.map((d) => d.total), 1);
  }, [stackedValues, normalized]);

  // Loading state
  if (loading) {
    return (
      <div>
        {title && (
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {title}
          </h4>
        )}
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

  const renderStackedChart = (forFullscreen = false) => {
    const width = forFullscreen ? 800 : 400;
    const height = forFullscreen ? 350 : 220;
    const padding = { top: 20, right: 20, bottom: 60, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const yTicks = calculateNiceTicks(0, maxValue, forFullscreen ? 6 : 5);
    const yMax = yTicks[yTicks.length - 1] || maxValue;

    const scaleY = (v: number) =>
      padding.top + chartHeight - (v / yMax) * chartHeight;

    const barWidth = Math.min(40, (chartWidth / stackedValues.length) - 8);
    const seriesCount = stackedData.series.length;

    // Get color for series
    const getSeriesColor = (index: number) => colors[index % colors.length] || "#3b82f6";

    if (type === "bar") {
      return (
        <div style={{ overflow: "hidden" }}>
          <svg
            ref={forFullscreen ? undefined : svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              width: "100%",
              height: forFullscreen ? 350 : 220,
              display: "block",
            }}
          >
            {/* Y-axis grid and labels */}
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
                    {normalized ? `${formatValue(tick)}%` : formatValue(tick)}
                  </text>
                </g>
              );
            })}

            {/* Stacked bars */}
            {stackedValues.map((categoryData, catIndex) => {
              const centerX =
                padding.left +
                (catIndex + 0.5) * (chartWidth / stackedValues.length);

              return (
                <g key={categoryData.category}>
                  {categoryData.stacks.map((stack, stackIndex) => {
                    const isHovered =
                      hoveredSegment?.category === categoryData.category &&
                      hoveredSegment?.series === stack.series;

                    return (
                      <rect
                        key={stack.series}
                        x={centerX - barWidth / 2}
                        y={scaleY(stack.y1)}
                        width={barWidth}
                        height={Math.abs(scaleY(stack.y0) - scaleY(stack.y1))}
                        fill={getSeriesColor(stackIndex)}
                        fillOpacity={isHovered ? 1 : 0.8}
                        stroke={isHovered ? "var(--foreground)" : "none"}
                        strokeWidth={isHovered ? 2 : 0}
                        rx={stackIndex === seriesCount - 1 ? 2 : 0}
                        onMouseEnter={() =>
                          setHoveredSegment({
                            category: categoryData.category,
                            series: stack.series,
                          })
                        }
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                      />
                    );
                  })}

                  {/* Category label */}
                  <text
                    x={centerX}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={10}
                    transform={
                      stackedValues.length > 6
                        ? `rotate(-45, ${centerX}, ${height - padding.bottom + 16})`
                        : undefined
                    }
                  >
                    {formatLabel(categoryData.category, true)}
                  </text>
                </g>
              );
            })}

            {/* Tooltip */}
            {hoveredSegment && (() => {
              const catIndex = stackedValues.findIndex(
                (d) => d.category === hoveredSegment.category,
              );
              const categoryData = stackedValues[catIndex];
              const stack = categoryData?.stacks.find(
                (s) => s.series === hoveredSegment.series,
              );

              if (!categoryData || !stack) return null;

              const centerX =
                padding.left +
                (catIndex + 0.5) * (chartWidth / stackedValues.length);
              const tooltipWidth = 120;
              const tooltipHeight = 50;
              let tooltipX = centerX + barWidth / 2 + 10;
              let tooltipY = scaleY((stack.y0 + stack.y1) / 2) - tooltipHeight / 2;

              if (tooltipX + tooltipWidth > width) {
                tooltipX = centerX - barWidth / 2 - tooltipWidth - 10;
              }
              if (tooltipY < padding.top) tooltipY = padding.top;

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
                    x={tooltipX + 8}
                    y={tooltipY + 18}
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {hoveredSegment.series}
                  </text>
                  <text x={tooltipX + 8} y={tooltipY + 36} fontSize={10} fill="var(--muted)">
                    {normalized
                      ? `${formatValue(stack.value)}%`
                      : formatValue(stack.value)}
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
              justifyContent: "center",
            }}
          >
            {stackedData.series.map((series, i) => (
              <div
                key={series}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: getSeriesColor(i),
                  }}
                />
                <span style={{ color: "var(--muted)" }}>{series}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Stacked area chart
    if (type === "area") {
      // Build area paths for each series
      const areaData = stackedData.series.map((series, seriesIndex) => {
        const points: { x: number; y0: number; y1: number }[] = [];

        stackedValues.forEach((categoryData, catIndex) => {
          const x =
            padding.left +
            (catIndex / Math.max(stackedValues.length - 1, 1)) * chartWidth;
          const stack = categoryData.stacks.find((s) => s.series === series);
          if (stack) {
            points.push({
              x,
              y0: scaleY(stack.y0),
              y1: scaleY(stack.y1),
            });
          }
        });

        // Build area path
        const topPath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y1}` : `L ${p.x} ${p.y1}`)).join(" ");
        const bottomPath = [...points]
          .reverse()
          .map((p) => `L ${p.x} ${p.y0}`)
          .join(" ");

        return {
          series,
          path: `${topPath} ${bottomPath} Z`,
          color: getSeriesColor(seriesIndex),
        };
      });

      return (
        <div style={{ overflow: "hidden" }}>
          <svg
            ref={forFullscreen ? undefined : svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              width: "100%",
              height: forFullscreen ? 350 : 220,
              display: "block",
            }}
          >
            {/* Y-axis grid and labels */}
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
                    {normalized ? `${formatValue(tick)}%` : formatValue(tick)}
                  </text>
                </g>
              );
            })}

            {/* Stacked areas (render in reverse to show first series on top) */}
            {[...areaData].reverse().map((area) => (
              <path
                key={area.series}
                d={area.path}
                fill={area.color}
                fillOpacity={0.7}
                stroke={area.color}
                strokeWidth={1}
              />
            ))}

            {/* X-axis labels */}
            {stackedValues.map((categoryData, catIndex) => {
              const x =
                padding.left +
                (catIndex / Math.max(stackedValues.length - 1, 1)) * chartWidth;
              // Only show some labels to avoid crowding
              if (stackedValues.length > 10 && catIndex % Math.ceil(stackedValues.length / 6) !== 0) {
                return null;
              }
              return (
                <text
                  key={categoryData.category}
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize={10}
                >
                  {formatLabel(categoryData.category, true)}
                </text>
              );
            })}
          </svg>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
              justifyContent: "center",
            }}
          >
            {stackedData.series.map((series, i) => (
              <div
                key={series}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: getSeriesColor(i),
                  }}
                />
                <span style={{ color: "var(--muted)" }}>{series}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  // Stats for fullscreen
  const fullscreenStats = [
    { label: "Categories", value: stackedData.categories.length },
    { label: "Series", value: stackedData.series.length },
    { label: "Total", value: stackedValues.reduce((sum, d) => sum + d.total, 0) },
  ];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef}>{renderStackedChart()}</div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Stacked Chart"}
        data={queryData}
        stats={fullscreenStats}
        columns={[
          { key: categoryColumn, label: categoryColumn },
          { key: seriesColumn, label: seriesColumn },
          { key: valueColumn, label: valueColumn },
        ]}
      >
        {renderStackedChart(true)}
      </FullscreenModal>
    </>
  );
}
