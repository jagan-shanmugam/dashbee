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
  if (max === min) return [min, min + 1];

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

  return ticks.length >= 2 ? ticks : [min, max];
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
 * Calculate quartiles and IQR for boxplot
 */
interface BoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
}

function calculateBoxplotStats(values: number[]): BoxplotStats | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const medianIndex = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index]!;
  const median =
    n % 2 === 0
      ? (sorted[medianIndex - 1]! + sorted[medianIndex]!) / 2
      : sorted[medianIndex]!;
  const q3 = sorted[q3Index]!;
  const iqr = q3 - q1;

  // Whiskers extend to 1.5 * IQR
  const whiskerLow = Math.max(sorted[0]!, q1 - 1.5 * iqr);
  const whiskerHigh = Math.min(sorted[n - 1]!, q3 + 1.5 * iqr);

  // Find outliers (outside 1.5 * IQR)
  const outliers = sorted.filter(
    (v) => v < whiskerLow || v > whiskerHigh,
  );

  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  return {
    min: sorted[0]!,
    q1,
    median,
    q3,
    max: sorted[n - 1]!,
    mean,
    outliers,
    iqr,
    whiskerLow,
    whiskerHigh,
  };
}

export function Boxplot({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    valueColumn,
    categoryColumn,
    title,
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    valueColumn: string;
    categoryColumn?: string | null;
    title?: string | null;
    colorPalette?: string;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
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

  const filenameBase = sanitizeFilename(title || queryKey || "boxplot");
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

  // Calculate boxplot data by category
  const boxplotData = useMemo(() => {
    if (!queryData || !Array.isArray(queryData)) return [];

    if (categoryColumn) {
      // Group by category
      const groups = new Map<string, number[]>();

      queryData.forEach((row) => {
        const category = String(row[categoryColumn] ?? "");
        const value = Number(row[valueColumn] ?? 0);
        if (!isNaN(value)) {
          if (!groups.has(category)) {
            groups.set(category, []);
          }
          groups.get(category)!.push(value);
        }
      });

      return Array.from(groups.entries()).map(([category, values], i) => ({
        category,
        stats: calculateBoxplotStats(values),
        color: colors[i % colors.length] || "#3b82f6",
      }));
    } else {
      // Single boxplot
      const values = queryData
        .map((row) => Number(row[valueColumn] ?? 0))
        .filter((v) => !isNaN(v));
      return [
        {
          category: valueColumn,
          stats: calculateBoxplotStats(values),
          color: colors[0] || "#3b82f6",
        },
      ];
    }
  }, [queryData, valueColumn, categoryColumn, colors]);

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

  const renderBoxplot = (forFullscreen = false) => {
    const width = forFullscreen ? 800 : 400;
    const height = forFullscreen ? 350 : 220;
    const padding = { top: 20, right: 20, bottom: 60, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate value range across all boxes
    let globalMin = Infinity;
    let globalMax = -Infinity;
    boxplotData.forEach((d) => {
      if (d.stats) {
        globalMin = Math.min(globalMin, d.stats.min);
        globalMax = Math.max(globalMax, d.stats.max);
      }
    });

    const yTicks = calculateNiceTicks(globalMin, globalMax, forFullscreen ? 6 : 5);
    const yMin = yTicks[0] ?? globalMin;
    const yMax = yTicks[yTicks.length - 1] ?? globalMax;

    const scaleY = (v: number) =>
      padding.top + chartHeight - ((v - yMin) / (yMax - yMin || 1)) * chartHeight;

    const boxWidth = Math.min(60, chartWidth / boxplotData.length - 20);

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
                  {formatValue(tick)}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize={12}
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            {valueColumn}
          </text>

          {/* Box plots */}
          {boxplotData.map((box, i) => {
            if (!box.stats) return null;

            const centerX =
              padding.left +
              (i + 0.5) * (chartWidth / boxplotData.length);
            const isHovered = hoveredBox === i;

            const { stats, color } = box;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredBox(i)}
                onMouseLeave={() => setHoveredBox(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Whisker line */}
                <line
                  x1={centerX}
                  y1={scaleY(stats.whiskerHigh)}
                  x2={centerX}
                  y2={scaleY(stats.whiskerLow)}
                  stroke={color}
                  strokeWidth={1}
                />

                {/* Top whisker cap */}
                <line
                  x1={centerX - boxWidth / 4}
                  y1={scaleY(stats.whiskerHigh)}
                  x2={centerX + boxWidth / 4}
                  y2={scaleY(stats.whiskerHigh)}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Bottom whisker cap */}
                <line
                  x1={centerX - boxWidth / 4}
                  y1={scaleY(stats.whiskerLow)}
                  x2={centerX + boxWidth / 4}
                  y2={scaleY(stats.whiskerLow)}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Box (Q1 to Q3) */}
                <rect
                  x={centerX - boxWidth / 2}
                  y={scaleY(stats.q3)}
                  width={boxWidth}
                  height={Math.abs(scaleY(stats.q1) - scaleY(stats.q3))}
                  fill={color}
                  fillOpacity={isHovered ? 0.5 : 0.3}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1}
                  rx={2}
                />

                {/* Median line */}
                <line
                  x1={centerX - boxWidth / 2}
                  y1={scaleY(stats.median)}
                  x2={centerX + boxWidth / 2}
                  y2={scaleY(stats.median)}
                  stroke={color}
                  strokeWidth={3}
                />

                {/* Mean dot */}
                <circle
                  cx={centerX}
                  cy={scaleY(stats.mean)}
                  r={4}
                  fill="var(--background)"
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Outliers */}
                {stats.outliers.map((outlier, j) => (
                  <circle
                    key={j}
                    cx={centerX}
                    cy={scaleY(outlier)}
                    r={3}
                    fill={color}
                    fillOpacity={0.5}
                  />
                ))}

                {/* Category label */}
                <text
                  x={centerX}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize={11}
                  transform={boxplotData.length > 4 ? `rotate(-45, ${centerX}, ${height - padding.bottom + 20})` : undefined}
                >
                  {box.category.length > 12
                    ? box.category.slice(0, 10) + "..."
                    : box.category}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredBox !== null && boxplotData[hoveredBox]?.stats && (() => {
            const box = boxplotData[hoveredBox];
            const stats = box.stats!;
            const centerX =
              padding.left +
              (hoveredBox + 0.5) * (chartWidth / boxplotData.length);
            const tooltipWidth = 110;
            const tooltipHeight = 85;
            let tooltipX = centerX + boxWidth / 2 + 10;
            const tooltipY = padding.top;

            if (tooltipX + tooltipWidth > width) {
              tooltipX = centerX - boxWidth / 2 - tooltipWidth - 10;
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
                <text x={tooltipX + 8} y={tooltipY + 16} fontSize={10} fill="var(--muted)">
                  Q3: {formatValue(stats.q3)}
                </text>
                <text x={tooltipX + 8} y={tooltipY + 32} fontSize={10} fill="var(--muted)">
                  Median: {formatValue(stats.median)}
                </text>
                <text x={tooltipX + 8} y={tooltipY + 48} fontSize={10} fill="var(--muted)">
                  Q1: {formatValue(stats.q1)}
                </text>
                <text x={tooltipX + 8} y={tooltipY + 64} fontSize={10} fill="var(--muted)">
                  IQR: {formatValue(stats.iqr)}
                </text>
                <text x={tooltipX + 8} y={tooltipY + 80} fontSize={10} fill="var(--muted)">
                  Mean: {formatValue(stats.mean)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    );
  };

  // Stats for fullscreen
  const fullscreenStats = boxplotData[0]?.stats
    ? [
        { label: "Min", value: boxplotData[0].stats.min },
        { label: "Q1", value: boxplotData[0].stats.q1 },
        { label: "Median", value: boxplotData[0].stats.median },
        { label: "Q3", value: boxplotData[0].stats.q3 },
        { label: "Max", value: boxplotData[0].stats.max },
        { label: "Mean", value: boxplotData[0].stats.mean },
      ]
    : [];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef}>{renderBoxplot()}</div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Box Plot"}
        data={queryData}
        stats={fullscreenStats}
        columns={[
          { key: valueColumn, label: valueColumn },
          ...(categoryColumn ? [{ key: categoryColumn, label: categoryColumn }] : []),
        ]}
      >
        {renderBoxplot(true)}
      </FullscreenModal>
    </>
  );
}
