"use client";

import { useRef, useState, useCallback, useEffect } from "react";
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

/**
 * DonutChart - Pie chart with center cutout and optional center metric
 *
 * Use cases:
 * - Part-to-whole relationships with a summary KPI in the center
 * - Market share, budget allocation, category breakdown
 *
 * The innerRadius prop controls the donut hole size (0 = pie, 1 = full hole)
 * centerValue can show total, average, max, or a custom string
 */
export function DonutChart({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    labelColumn,
    valueColumn,
    title,
    innerRadius = 0.6,
    centerLabel,
    centerValue = "total",
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    labelColumn: string;
    valueColumn: string;
    title?: string | null;
    innerRadius?: number | null;
    centerLabel?: string | null;
    centerValue?: "total" | "average" | "max" | string | null;
    colorPalette?: string | null;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const stylePreset = useStylePresetSafe();
  // Use preset's color palette if none specified
  const defaultPalette = colorPalette === "default" && stylePreset?.preset
    ? stylePreset.preset.colorPaletteId
    : colorPalette || "default";
  const [paletteId, setPaletteId] = useState(defaultPalette);

  // Sync palette when preset changes
  useEffect(() => {
    if (colorPalette === "default" && stylePreset?.preset) {
      setPaletteId(stylePreset.preset.colorPaletteId);
    }
  }, [colorPalette, stylePreset?.preset?.colorPaletteId, stylePreset?.preset]);

  const { data } = useData();
  const queryData = getByPath(data, `/queries/${queryKey}`) as
    | Array<Record<string, unknown>>
    | undefined;

  // Generate filename base
  const filenameBase = sanitizeFilename(title || queryKey || "donut-chart");

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
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
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

  // Extract chart data
  const chartData = queryData.map((row) => ({
    label: String(row[labelColumn] ?? ""),
    value: Number(row[valueColumn] ?? 0),
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const colors = getPaletteColors(paletteId);

  // Calculate center value
  const getCenterValue = (): string => {
    if (centerValue === "total") {
      return formatNumber(total, { compact: true });
    }
    if (centerValue === "average") {
      return formatNumber(total / chartData.length, { compact: true });
    }
    if (centerValue === "max") {
      return formatNumber(Math.max(...chartData.map((d) => d.value)), { compact: true });
    }
    // Custom string value
    return centerValue || formatNumber(total, { compact: true });
  };

  // Effective inner radius (normalize to 0-1 range)
  const effectiveInnerRadius = Math.max(0, Math.min(1, innerRadius ?? 0.6));

  // Render donut chart
  const renderDonut = (forFullscreen = false) => {
    const size = forFullscreen ? 280 : 180;
    const outerRadius = size / 2;
    const innerRadiusPixels = outerRadius * effectiveInnerRadius;

    let currentAngle = -Math.PI / 2; // Start from top

    return (
      <svg
        ref={forFullscreen ? undefined : svgRef}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          width: size,
          height: size,
          display: "block",
        }}
      >
        {/* Donut slices */}
        {chartData.map((d, i) => {
          const angle = (d.value / total) * Math.PI * 2;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          // Calculate arc path points
          const outerStartX = outerRadius + Math.cos(startAngle) * outerRadius;
          const outerStartY = outerRadius + Math.sin(startAngle) * outerRadius;
          const outerEndX = outerRadius + Math.cos(endAngle) * outerRadius;
          const outerEndY = outerRadius + Math.sin(endAngle) * outerRadius;
          const innerStartX = outerRadius + Math.cos(endAngle) * innerRadiusPixels;
          const innerStartY = outerRadius + Math.sin(endAngle) * innerRadiusPixels;
          const innerEndX = outerRadius + Math.cos(startAngle) * innerRadiusPixels;
          const innerEndY = outerRadius + Math.sin(startAngle) * innerRadiusPixels;

          const largeArc = angle > Math.PI ? 1 : 0;

          // Arc path: outer arc, line to inner, inner arc (reverse), close
          const pathD = `
            M ${outerStartX} ${outerStartY}
            A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}
            L ${innerStartX} ${innerStartY}
            A ${innerRadiusPixels} ${innerRadiusPixels} 0 ${largeArc} 0 ${innerEndX} ${innerEndY}
            Z
          `;

          const percentage = ((d.value / total) * 100).toFixed(1);
          const isHovered = hoveredSlice === i;

          return (
            <path
              key={i}
              d={pathD}
              fill={colors[i % colors.length]}
              style={{
                cursor: "pointer",
                transition: "transform 0.15s ease, filter 0.15s ease",
                transformOrigin: `${outerRadius}px ${outerRadius}px`,
                transform: isHovered ? "scale(1.03)" : "scale(1)",
                filter: isHovered ? "brightness(1.1)" : "none",
              }}
              onMouseEnter={() => setHoveredSlice(i)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <title>{`${d.label}: ${formatNumber(d.value)} (${percentage}%)`}</title>
            </path>
          );
        })}

        {/* Center text */}
        {effectiveInnerRadius > 0.3 && (
          <g>
            {centerLabel && (
              <text
                x={outerRadius}
                y={outerRadius - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted)"
                fontSize={forFullscreen ? 12 : 10}
                style={{ fontWeight: 500 }}
              >
                {centerLabel}
              </text>
            )}
            <text
              x={outerRadius}
              y={centerLabel ? outerRadius + 10 : outerRadius}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--foreground)"
              fontSize={forFullscreen ? 28 : 22}
              style={{ fontWeight: 700 }}
            >
              {getCenterValue()}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Legend
  const renderLegend = (forFullscreen = false) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: forFullscreen ? 8 : 4,
        maxHeight: forFullscreen ? 280 : 180,
        overflowY: "auto",
      }}
    >
      {chartData.map((d, i) => {
        const percentage = ((d.value / total) * 100).toFixed(1);
        const isHovered = hoveredSlice === i;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "2px 4px",
              marginLeft: -4,
              borderRadius: 4,
              background: isHovered ? "var(--accent)" : "transparent",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={() => setHoveredSlice(i)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: colors[i % colors.length],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: forFullscreen ? 14 : 13,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: forFullscreen ? 13 : 12,
                color: "var(--muted)",
                flexShrink: 0,
              }}
            >
              {percentage}%
            </span>
          </div>
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

  // Compute stats for fullscreen
  const stats = [
    { label: "Total", value: total },
    { label: "Categories", value: chartData.length },
    { label: "Largest", value: Math.max(...chartData.map((d) => d.value)) },
    { label: "Smallest", value: Math.min(...chartData.map((d) => d.value)) },
  ];

  const columns = [
    { key: labelColumn, label: labelColumn.replace(/_/g, " ").toUpperCase() },
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
            alignItems: "center",
            gap: 24,
            overflow: "hidden",
          }}
        >
          {renderDonut()}
          {renderLegend()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Donut Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
          }}
        >
          {renderDonut(true)}
          {renderLegend(true)}
        </div>
      </FullscreenModal>
    </>
  );
}
