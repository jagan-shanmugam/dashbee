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
import { calculateNiceTicks, formatChartValue } from "@/lib/chart-utils";

/**
 * Calculate histogram bins
 */
function calculateBins(
  values: number[],
  binCount: number,
): { start: number; end: number; count: number }[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / binCount || 1;

  const bins: { start: number; end: number; count: number }[] = [];

  for (let i = 0; i < binCount; i++) {
    bins.push({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
    });
  }

  values.forEach((value) => {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      binCount - 1,
    );
    if (bins[binIndex]) {
      bins[binIndex].count++;
    }
  });

  return bins;
}

export function Histogram({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    valueColumn,
    bins: binCount = 10,
    title,
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    valueColumn: string;
    bins?: number;
    title?: string | null;
    colorPalette?: string;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
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

  const filenameBase = sanitizeFilename(title || queryKey || "histogram");
  const colors = getPaletteColors(paletteId);
  const barColor = colors[0] || "#3b82f6";

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

  // Calculate bins from data
  const bins = useMemo(() => {
    if (!queryData || !Array.isArray(queryData)) return [];
    const values = queryData
      .map((row) => Number(row[valueColumn] ?? 0))
      .filter((v) => !isNaN(v));
    return calculateBins(values, binCount);
  }, [queryData, valueColumn, binCount]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!queryData || !Array.isArray(queryData)) return null;
    const values = queryData
      .map((row) => Number(row[valueColumn] ?? 0))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median =
      values.length % 2 === 0
        ? (values[values.length / 2 - 1]! + values[values.length / 2]!) / 2
        : values[Math.floor(values.length / 2)]!;
    const min = values[0]!;
    const max = values[values.length - 1]!;
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { count: values.length, mean, median, min, max, stdDev };
  }, [queryData, valueColumn]);

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

  const renderHistogram = (forFullscreen = false) => {
    const width = forFullscreen ? 800 : 400;
    const height = forFullscreen ? 350 : 200;
    const padding = { top: 20, right: 20, bottom: 50, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const yTicks = calculateNiceTicks(0, maxCount, forFullscreen ? 6 : 5);
    const yMax = yTicks[yTicks.length - 1] || maxCount;

    const barWidth = chartWidth / bins.length - 2;
    const xMin = bins[0]?.start ?? 0;
    const xMax = bins[bins.length - 1]?.end ?? 1;

    return (
      <div style={{ overflow: "hidden" }}>
        <svg
          ref={forFullscreen ? undefined : svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: forFullscreen ? 350 : 200,
            display: "block",
          }}
        >
          {/* Y-axis grid and labels */}
          {yTicks.map((tick, i) => {
            const y = padding.top + chartHeight - (tick / yMax) * chartHeight;
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

          {/* Bars */}
          {bins.map((bin, i) => {
            const x = padding.left + (i / bins.length) * chartWidth + 1;
            const barHeight = (bin.count / yMax) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            const isHovered = hoveredBin === i;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barWidth, 1)}
                  height={barHeight}
                  fill={barColor}
                  fillOpacity={isHovered ? 1 : 0.8}
                  stroke={isHovered ? "var(--foreground)" : "none"}
                  strokeWidth={isHovered ? 2 : 0}
                  rx={2}
                  onMouseEnter={() => setHoveredBin(i)}
                  onMouseLeave={() => setHoveredBin(null)}
                  style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          <text
            x={padding.left}
            y={height - 10}
            textAnchor="start"
            fill="var(--muted)"
            fontSize={10}
          >
            {formatChartValue(xMin)}
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            textAnchor="end"
            fill="var(--muted)"
            fontSize={10}
          >
            {formatChartValue(xMax)}
          </text>
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize={12}
          >
            {valueColumn}
          </text>

          {/* Y-axis label */}
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize={12}
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Frequency
          </text>

          {/* Tooltip */}
          {hoveredBin !== null && bins[hoveredBin] && (() => {
            const bin = bins[hoveredBin];
            const x = padding.left + ((hoveredBin + 0.5) / bins.length) * chartWidth;
            const tooltipWidth = 100;
            const tooltipHeight = 50;
            let tooltipX = x - tooltipWidth / 2;
            const tooltipY = padding.top - 10;

            if (tooltipX < 0) tooltipX = 0;
            if (tooltipX + tooltipWidth > width) tooltipX = width - tooltipWidth;

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
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {formatChartValue(bin.start)} - {formatChartValue(bin.end)}
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 36}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  Count: {bin.count}
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Statistics summary */}
        {stats && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 12,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            <span>n={stats.count}</span>
            <span>μ={formatChartValue(stats.mean)}</span>
            <span>med={formatChartValue(stats.median)}</span>
            <span>σ={formatChartValue(stats.stdDev)}</span>
          </div>
        )}
      </div>
    );
  };

  // Stats for fullscreen
  const fullscreenStats = stats
    ? [
        { label: "Count", value: stats.count },
        { label: "Mean", value: stats.mean },
        { label: "Median", value: stats.median },
        { label: "Min", value: stats.min },
        { label: "Max", value: stats.max },
        { label: "Std Dev", value: stats.stdDev },
      ]
    : [];

  return (
    <>
      <div style={{ overflow: "hidden", width: "100%" }}>
        {chartHeader}
        <div ref={chartRef}>{renderHistogram()}</div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Histogram"}
        data={queryData}
        stats={fullscreenStats}
        columns={[{ key: valueColumn, label: valueColumn }]}
      >
        {renderHistogram(true)}
      </FullscreenModal>
    </>
  );
}
