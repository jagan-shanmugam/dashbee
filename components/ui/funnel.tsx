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
import { formatNumber } from "@/lib/format-utils";
import { useStylePresetSafe } from "@/lib/style-preset-context";

interface FunnelStage {
  label: string;
  value: number;
  percentage: number;
  conversionRate: number | null;
  color: string;
}

/**
 * FunnelChart - Conversion pipeline visualization
 *
 * Use cases:
 * - Sales funnel (leads → opportunities → deals → won)
 * - User journey (visits → signups → activations → purchases)
 * - Process completion (started → step1 → step2 → completed)
 *
 * Shows absolute values and conversion rates between stages
 */
export function FunnelChart({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    stageColumn,
    valueColumn,
    title,
    orientation = "vertical",
    showPercentage = true,
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    stageColumn: string;
    valueColumn: string;
    title?: string | null;
    orientation?: "vertical" | "horizontal" | null;
    showPercentage?: boolean | null;
    colorPalette?: string | null;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
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

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "funnel-chart");

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

  // Process data into funnel stages
  const stages = useMemo((): FunnelStage[] => {
    if (!queryData || queryData.length === 0) return [];

    const colors = getPaletteColors(paletteId);

    // Extract stages
    const rawStages = queryData.map((row, i) => ({
      label: String(row[stageColumn] ?? ""),
      value: Number(row[valueColumn] ?? 0),
      color: colors[i % colors.length]!,
    }));

    // Sort by value descending (largest at top of funnel)
    rawStages.sort((a, b) => b.value - a.value);

    const maxValue = rawStages[0]?.value || 1;

    return rawStages.map((stage, i) => ({
      ...stage,
      percentage: (stage.value / maxValue) * 100,
      conversionRate: i > 0 && rawStages[i - 1]
        ? (stage.value / rawStages[i - 1].value) * 100
        : null,
    }));
  }, [queryData, stageColumn, valueColumn, paletteId]);

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

  const effectiveOrientation = orientation || "vertical";

  // Render vertical funnel
  const renderVerticalFunnel = (forFullscreen = false) => {
    const width = forFullscreen ? 500 : 320;
    const height = forFullscreen ? 400 : 260;
    const padding = { top: 20, right: 120, bottom: 20, left: 120 };
    const funnelWidth = width - padding.left - padding.right;
    const funnelHeight = height - padding.top - padding.bottom;
    const stageHeight = funnelHeight / stages.length;

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxWidth: width,
          height: forFullscreen ? height : "auto",
          display: "block",
        }}
      >
        {stages.map((stage, i) => {
          const topWidth = (stage.percentage / 100) * funnelWidth;
          const nextStage = stages[i + 1];
          const bottomWidth = nextStage
            ? (nextStage.percentage / 100) * funnelWidth
            : topWidth * 0.6;

          const y = padding.top + i * stageHeight;
          const topLeft = (width - topWidth) / 2;
          const topRight = (width + topWidth) / 2;
          const bottomLeft = (width - bottomWidth) / 2;
          const bottomRight = (width + bottomWidth) / 2;

          // Trapezoid path
          const pathD = `
            M ${topLeft} ${y}
            L ${topRight} ${y}
            L ${bottomRight} ${y + stageHeight}
            L ${bottomLeft} ${y + stageHeight}
            Z
          `;

          const isHovered = hoveredStage === i;
          const centerX = width / 2;
          const centerY = y + stageHeight / 2;

          return (
            <g key={i}>
              {/* Trapezoid segment */}
              <path
                d={pathD}
                fill={stage.color}
                style={{
                  cursor: "pointer",
                  opacity: isHovered ? 1 : 0.85,
                  transition: "opacity 0.15s ease, filter 0.15s ease",
                  filter: isHovered ? "brightness(1.1)" : "none",
                }}
                onMouseEnter={() => setHoveredStage(i)}
                onMouseLeave={() => setHoveredStage(null)}
              />

              {/* Stage label on left */}
              <text
                x={topLeft - 8}
                y={centerY}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize={forFullscreen ? 13 : 11}
                fontWeight={500}
              >
                {stage.label}
              </text>

              {/* Value on right */}
              <text
                x={topRight + 8}
                y={centerY - (showPercentage ? 6 : 0)}
                textAnchor="start"
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize={forFullscreen ? 14 : 12}
                fontWeight={600}
              >
                {formatNumber(stage.value, { compact: true })}
              </text>

              {/* Percentage/conversion rate */}
              {showPercentage && (
                <text
                  x={topRight + 8}
                  y={centerY + 10}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fill="var(--muted)"
                  fontSize={forFullscreen ? 11 : 10}
                >
                  {stage.conversionRate !== null
                    ? `↓ ${stage.conversionRate.toFixed(1)}%`
                    : `${stage.percentage.toFixed(0)}%`}
                </text>
              )}

              {/* Center value (on hover) */}
              {isHovered && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={forFullscreen ? 16 : 14}
                  fontWeight={700}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                >
                  {formatNumber(stage.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Render horizontal funnel
  const renderHorizontalFunnel = (forFullscreen = false) => {
    const width = forFullscreen ? 700 : 450;
    const height = forFullscreen ? 240 : 160;
    const padding = { top: 40, right: 20, bottom: 50, left: 20 };
    const funnelWidth = width - padding.left - padding.right;
    const funnelHeight = height - padding.top - padding.bottom;
    const stageWidth = funnelWidth / stages.length;

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxWidth: width,
          height: forFullscreen ? height : "auto",
          display: "block",
        }}
      >
        {stages.map((stage, i) => {
          const leftHeight = (stage.percentage / 100) * funnelHeight;
          const nextStage = stages[i + 1];
          const rightHeight = nextStage
            ? (nextStage.percentage / 100) * funnelHeight
            : leftHeight * 0.6;

          const x = padding.left + i * stageWidth;
          const centerY = padding.top + funnelHeight / 2;

          // Horizontal trapezoid path
          const pathD = `
            M ${x} ${centerY - leftHeight / 2}
            L ${x + stageWidth} ${centerY - rightHeight / 2}
            L ${x + stageWidth} ${centerY + rightHeight / 2}
            L ${x} ${centerY + leftHeight / 2}
            Z
          `;

          const isHovered = hoveredStage === i;
          const centerX = x + stageWidth / 2;

          return (
            <g key={i}>
              {/* Trapezoid segment */}
              <path
                d={pathD}
                fill={stage.color}
                style={{
                  cursor: "pointer",
                  opacity: isHovered ? 1 : 0.85,
                  transition: "opacity 0.15s ease, filter 0.15s ease",
                  filter: isHovered ? "brightness(1.1)" : "none",
                }}
                onMouseEnter={() => setHoveredStage(i)}
                onMouseLeave={() => setHoveredStage(null)}
              />

              {/* Stage label below */}
              <text
                x={centerX}
                y={height - 12}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize={forFullscreen ? 12 : 10}
                fontWeight={500}
              >
                {stage.label}
              </text>

              {/* Value above */}
              <text
                x={centerX}
                y={padding.top - 8}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize={forFullscreen ? 14 : 12}
                fontWeight={600}
              >
                {formatNumber(stage.value, { compact: true })}
              </text>

              {/* Conversion arrow between stages */}
              {showPercentage && stage.conversionRate !== null && (
                <text
                  x={x - 4}
                  y={centerY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--muted)"
                  fontSize={forFullscreen ? 10 : 9}
                  transform={`rotate(-90, ${x - 4}, ${centerY})`}
                >
                  ← {stage.conversionRate.toFixed(0)}%
                </text>
              )}

              {/* Center value (on hover) */}
              {isHovered && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={forFullscreen ? 14 : 12}
                  fontWeight={700}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                >
                  {formatNumber(stage.value)}
                </text>
              )}
            </g>
          );
        })}
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
        colorPalette={paletteId}
        onColorPaletteChange={setPaletteId}
      />
    </div>
  );

  // Overall conversion rate
  const firstStage = stages[0];
  const lastStage = stages[stages.length - 1];
  const overallConversion = firstStage && lastStage && firstStage.value > 0
    ? (lastStage.value / firstStage.value) * 100
    : 0;

  // Stats for fullscreen
  const stats = [
    { label: "Stages", value: stages.length },
    { label: "Top of Funnel", value: firstStage?.value ?? 0 },
    { label: "Bottom", value: lastStage?.value ?? 0 },
    { label: "Overall Rate", value: `${overallConversion.toFixed(1)}%` },
  ];

  const columns = [
    { key: stageColumn, label: stageColumn.replace(/_/g, " ").toUpperCase() },
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
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {effectiveOrientation === "horizontal"
            ? renderHorizontalFunnel()
            : renderVerticalFunnel()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Funnel Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {effectiveOrientation === "horizontal"
            ? renderHorizontalFunnel(true)
            : renderVerticalFunnel(true)}
        </div>
      </FullscreenModal>
    </>
  );
}
