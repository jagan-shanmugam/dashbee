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
 * RadarChart - Multi-dimensional comparison (spider chart)
 *
 * Use cases:
 * - Product feature comparison across multiple metrics
 * - Skill assessments with multiple competencies
 * - Competitive analysis comparing entities on various dimensions
 * - Performance reviews with multiple criteria
 *
 * Each axis represents a dimension, and values are plotted as
 * a polygon connecting points on each axis.
 */
export function RadarChart({ element, loading }: ComponentRenderProps) {
  const props = element.props as {
    queryKey: string;
    dimensionColumn?: string;
    categoryColumn?: string; // Alias for dimensionColumn (common LLM pattern)
    labelColumn?: string; // Another alias for dimensionColumn
    valueColumn: string;
    seriesColumn?: string | null;
    title?: string | null;
    colorPalette?: string | null;
    maxValue?: number | null;
    showGrid?: boolean | null;
    fillArea?: boolean | null;
  };

  const {
    queryKey,
    valueColumn,
    seriesColumn,
    title,
    colorPalette = "default",
    maxValue: propMaxValue,
    showGrid = true,
    fillArea = true,
  } = props;

  // Support dimensionColumn, categoryColumn, and labelColumn (LLM compatibility)
  const dimensionColumn = props.dimensionColumn || props.categoryColumn || props.labelColumn;

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ seriesIdx: number; dimIdx: number } | null>(null);
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
  const filenameBase = sanitizeFilename(title || queryKey || "radar-chart");

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
            height: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "var(--border)",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>
      </div>
    );
  }

  // Validate required props
  if (!dimensionColumn || !valueColumn) {
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
            Configuration error: Missing required props (dimensionColumn, valueColumn)
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
            Expected: dimensionColumn=&quot;column_name&quot; valueColumn=&quot;column_name&quot;
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

  // Get palette colors
  const colors = getPaletteColors(paletteId);

  // Process data: group by series if seriesColumn is provided
  type SeriesData = { name: string; values: Map<string, number> };
  const seriesMap = new Map<string, Map<string, number>>();
  const dimensionSet = new Set<string>();

  queryData.forEach((row) => {
    const dimension = String(row[dimensionColumn] ?? "");
    const value = Number(row[valueColumn] ?? 0);
    const series = seriesColumn ? String(row[seriesColumn] ?? "Default") : "Default";

    dimensionSet.add(dimension);

    if (!seriesMap.has(series)) {
      seriesMap.set(series, new Map());
    }
    seriesMap.get(series)!.set(dimension, value);
  });

  const dimensions = Array.from(dimensionSet);
  const seriesData: SeriesData[] = Array.from(seriesMap.entries()).map(([name, values]) => ({
    name,
    values,
  }));

  // Calculate max value for scaling
  const allValues = queryData.map((row) => Number(row[valueColumn] ?? 0));
  const dataMaxValue = Math.max(...allValues, 1);
  const maxVal = propMaxValue ?? dataMaxValue;

  // Render radar chart
  const renderChart = (forFullscreen = false) => {
    const size = forFullscreen ? 400 : 280;
    const cx = size / 2;
    const cy = size / 2;
    const radius = forFullscreen ? 150 : 100;
    const labelPadding = forFullscreen ? 25 : 18;

    const numDimensions = dimensions.length;
    if (numDimensions < 3) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          Radar chart requires at least 3 dimensions
        </div>
      );
    }

    // Calculate angle for each dimension (start from top)
    const getAngle = (index: number) => (index / numDimensions) * Math.PI * 2 - Math.PI / 2;

    // Convert polar to cartesian
    const polarToCartesian = (angle: number, r: number) => ({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });

    // Grid levels (25%, 50%, 75%, 100%)
    const gridLevels = showGrid ? [0.25, 0.5, 0.75, 1] : [];

    // Generate polygon path for a series
    const getPolygonPath = (values: Map<string, number>) => {
      const points = dimensions.map((dim, i) => {
        const value = values.get(dim) ?? 0;
        const normalizedValue = value / maxVal;
        const angle = getAngle(i);
        return polarToCartesian(angle, normalizedValue * radius);
      });

      return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
    };

    // Generate grid polygon path
    const getGridPath = (level: number) => {
      const points = dimensions.map((_, i) => {
        const angle = getAngle(i);
        return polarToCartesian(angle, level * radius);
      });

      return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
    };

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
        {/* Grid polygons */}
        {gridLevels.map((level, i) => (
          <path
            key={`grid-${i}`}
            d={getGridPath(level)}
            fill="none"
            stroke="var(--border)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const angle = getAngle(i);
          const endPoint = polarToCartesian(angle, radius);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="var(--border)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          );
        })}

        {/* Dimension labels */}
        {dimensions.map((dim, i) => {
          const angle = getAngle(i);
          const labelPoint = polarToCartesian(angle, radius + labelPadding);

          // Determine text anchor based on position
          let textAnchor: "start" | "middle" | "end" = "middle";
          if (Math.abs(Math.cos(angle)) > 0.3) {
            textAnchor = Math.cos(angle) > 0 ? "start" : "end";
          }

          // Adjust vertical position
          let dy = 0;
          if (Math.abs(Math.sin(angle)) > 0.3) {
            dy = Math.sin(angle) > 0 ? 4 : -4;
          }

          return (
            <text
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y + dy}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fill="var(--muted)"
              fontSize={forFullscreen ? 12 : 10}
            >
              {dim.length > 12 ? dim.slice(0, 10) + "..." : dim}
            </text>
          );
        })}

        {/* Grid level labels */}
        {showGrid && gridLevels.map((level, i) => {
          const labelPoint = polarToCartesian(-Math.PI / 2, level * radius);
          return (
            <text
              key={`grid-label-${i}`}
              x={labelPoint.x + 4}
              y={labelPoint.y}
              textAnchor="start"
              dominantBaseline="middle"
              fill="var(--muted)"
              fontSize={8}
              opacity={0.6}
            >
              {formatNumber(maxVal * level, { compact: true })}
            </text>
          );
        })}

        {/* Data polygons - one per series */}
        {seriesData.map((series, seriesIdx) => {
          const color = colors[seriesIdx % colors.length];
          return (
            <g key={`series-${seriesIdx}`}>
              {/* Filled area */}
              {fillArea && (
                <path
                  d={getPolygonPath(series.values)}
                  fill={color}
                  fillOpacity={0.2}
                  stroke="none"
                />
              )}
              {/* Stroke */}
              <path
                d={getPolygonPath(series.values)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Data points with hover interaction */}
        {seriesData.map((series, seriesIdx) => {
          const color = colors[seriesIdx % colors.length];
          return dimensions.map((dim, dimIdx) => {
            const value = series.values.get(dim) ?? 0;
            const normalizedValue = value / maxVal;
            const angle = getAngle(dimIdx);
            const point = polarToCartesian(angle, normalizedValue * radius);
            const isHovered = hoveredPoint?.seriesIdx === seriesIdx && hoveredPoint?.dimIdx === dimIdx;

            return (
              <g key={`point-${seriesIdx}-${dimIdx}`}>
                {/* Invisible hit area */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={forFullscreen ? 16 : 12}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint({ seriesIdx, dimIdx })}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: "default" }}
                />
                {/* Visible point */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 6 : 4}
                  fill="var(--background)"
                  stroke={color}
                  strokeWidth={2}
                  style={{ transition: "r 0.15s ease", pointerEvents: "none" }}
                />
              </g>
            );
          });
        })}

        {/* Tooltip */}
        {hoveredPoint !== null && (() => {
          const series = seriesData[hoveredPoint.seriesIdx];
          const dim = dimensions[hoveredPoint.dimIdx];
          if (!series || !dim) return null;

          const value = series.values.get(dim) ?? 0;
          const angle = getAngle(hoveredPoint.dimIdx);
          const point = polarToCartesian(angle, (value / maxVal) * radius);

          const tooltipWidth = 120;
          const tooltipHeight = seriesColumn ? 52 : 40;

          // Position tooltip to avoid going off canvas
          let tooltipX = point.x - tooltipWidth / 2;
          let tooltipY = point.y - tooltipHeight - 12;

          if (tooltipX < 5) tooltipX = 5;
          if (tooltipX + tooltipWidth > size - 5) tooltipX = size - tooltipWidth - 5;
          if (tooltipY < 5) tooltipY = point.y + 12;

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
              {seriesColumn && (
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill={colors[hoveredPoint.seriesIdx % colors.length]}
                >
                  {series.name.length > 15 ? series.name.slice(0, 13) + "..." : series.name}
                </text>
              )}
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + (seriesColumn ? 26 : 14)}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {dim}
              </text>
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + (seriesColumn ? 42 : 30)}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {formatNumber(value)}
              </text>
            </g>
          );
        })()}
      </svg>
    );
  };

  // Legend for multiple series
  const renderLegend = (forFullscreen = false) => {
    if (seriesData.length <= 1) return null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: forFullscreen ? 8 : 6,
          marginLeft: forFullscreen ? 32 : 16,
        }}
      >
        {seriesData.map((series, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
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
                fontSize: forFullscreen ? 13 : 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {series.name}
            </span>
          </div>
        ))}
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
        colorPalette={paletteId}
        onColorPaletteChange={setPaletteId}
      />
    </div>
  );

  // Compute stats for fullscreen
  const stats = [
    { label: "Dimensions", value: dimensions.length },
    { label: "Series", value: seriesData.length },
    { label: "Max Value", value: dataMaxValue },
    { label: "Data Points", value: queryData.length },
  ];

  const columns = seriesColumn
    ? [
        { key: seriesColumn, label: seriesColumn.replace(/_/g, " ").toUpperCase() },
        { key: dimensionColumn, label: dimensionColumn.replace(/_/g, " ").toUpperCase() },
        { key: valueColumn, label: valueColumn.replace(/_/g, " ").toUpperCase() },
      ]
    : [
        { key: dimensionColumn, label: dimensionColumn.replace(/_/g, " ").toUpperCase() },
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
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {renderChart()}
          {renderLegend()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Radar Chart"}
        data={queryData}
        stats={stats}
        columns={columns}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderChart(true)}
          {renderLegend(true)}
        </div>
      </FullscreenModal>
    </>
  );
}
