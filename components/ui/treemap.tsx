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

interface TreemapNode {
  label: string;
  value: number;
  color: string;
  children?: TreemapNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Squarified Treemap Algorithm
 *
 * This algorithm produces rectangles with aspect ratios as close to 1 (square) as possible.
 * Reference: "Squarified Treemaps" by Bruls, Huizing, and van Wijk
 *
 * The key insight is that we want to minimize the maximum aspect ratio of rectangles
 * to improve readability.
 */
function squarify(
  nodes: TreemapNode[],
  rect: LayoutRect,
  totalValue: number
): TreemapNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    const node = nodes[0]!;
    return [{ ...node, x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
  }

  // Sort nodes by value descending for better layout
  const sorted = [...nodes].sort((a, b) => b.value - a.value);

  // Calculate the scale factor
  const scale = (rect.width * rect.height) / totalValue;

  // Determine if we're laying out horizontally or vertically
  const isHorizontal = rect.width >= rect.height;
  const shortSide = isHorizontal ? rect.height : rect.width;

  const result: TreemapNode[] = [];
  let row: TreemapNode[] = [];
  let rowValue = 0;

  // Helper to calculate worst aspect ratio for a row
  const worst = (rowVal: number, rowNodes: TreemapNode[]): number => {
    if (rowNodes.length === 0) return Infinity;

    const rowArea = rowVal * scale;
    const rowLength = rowArea / shortSide;

    let maxAspect = 0;
    for (const node of rowNodes) {
      const nodeArea = node.value * scale;
      const nodeLength = nodeArea / rowLength;
      const aspect = Math.max(nodeLength / shortSide, shortSide / nodeLength);
      maxAspect = Math.max(maxAspect, aspect);
    }
    return maxAspect;
  };

  for (const node of sorted) {
    const testRow = [...row, node];
    const testValue = rowValue + node.value;

    // Check if adding this node improves or worsens the aspect ratio
    if (row.length === 0 || worst(testValue, testRow) <= worst(rowValue, row)) {
      row.push(node);
      rowValue += node.value;
    } else {
      // Layout current row and start a new one
      const rowArea = rowValue * scale;
      const rowLength = rowArea / shortSide;

      let offset = 0;
      for (const rowNode of row) {
        const nodeArea = rowNode.value * scale;
        const nodeLength = nodeArea / rowLength;

        if (isHorizontal) {
          result.push({
            ...rowNode,
            x: rect.x,
            y: rect.y + offset,
            width: rowLength,
            height: nodeLength,
          });
        } else {
          result.push({
            ...rowNode,
            x: rect.x + offset,
            y: rect.y,
            width: nodeLength,
            height: rowLength,
          });
        }
        offset += nodeLength;
      }

      // Update remaining rectangle
      if (isHorizontal) {
        rect = {
          x: rect.x + rowLength,
          y: rect.y,
          width: rect.width - rowLength,
          height: rect.height,
        };
      } else {
        rect = {
          x: rect.x,
          y: rect.y + rowLength,
          width: rect.width,
          height: rect.height - rowLength,
        };
      }

      // Reset for new row
      row = [node];
      rowValue = node.value;
      totalValue -= rowValue;
    }
  }

  // Layout remaining row
  if (row.length > 0) {
    const rowArea = rowValue * scale;
    const rowLength = shortSide > 0 ? rowArea / shortSide : 0;

    let offset = 0;
    for (const rowNode of row) {
      const nodeArea = rowNode.value * scale;
      const nodeLength = rowLength > 0 ? nodeArea / rowLength : 0;

      if (isHorizontal) {
        result.push({
          ...rowNode,
          x: rect.x,
          y: rect.y + offset,
          width: rowLength,
          height: nodeLength,
        });
      } else {
        result.push({
          ...rowNode,
          x: rect.x + offset,
          y: rect.y,
          width: nodeLength,
          height: rowLength,
        });
      }
      offset += nodeLength;
    }
  }

  return result;
}

/**
 * Treemap - Hierarchical proportional area visualization
 *
 * Use cases:
 * - Budget/expense breakdown by category
 * - Sales by product category and subcategory
 * - Disk usage by folder
 * - Market share by company/segment
 *
 * Each rectangle's area is proportional to its value
 */
export function Treemap({ element, loading }: ComponentRenderProps) {
  const {
    queryKey,
    categoryColumn,
    subcategoryColumn,
    valueColumn,
    title,
    colorPalette = "default",
  } = element.props as {
    queryKey: string;
    categoryColumn: string;
    subcategoryColumn?: string | null;
    valueColumn: string;
    title?: string | null;
    colorPalette?: string | null;
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
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
  const filenameBase = sanitizeFilename(title || queryKey || "treemap");

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

  // Process data into treemap nodes
  const { nodes, totalValue } = useMemo(() => {
    if (!queryData || queryData.length === 0) {
      return { nodes: [], totalValue: 0 };
    }

    const colors = getPaletteColors(paletteId);

    // If no subcategory, create flat list
    if (!subcategoryColumn) {
      const nodeList: TreemapNode[] = queryData.map((row, i) => ({
        label: String(row[categoryColumn] ?? ""),
        value: Number(row[valueColumn] ?? 0),
        color: colors[i % colors.length]!,
      }));

      const total = nodeList.reduce((sum, n) => sum + n.value, 0);
      return { nodes: nodeList, totalValue: total };
    }

    // Group by category for hierarchical treemap
    const categoryMap = new Map<string, { total: number; items: TreemapNode[] }>();

    for (const row of queryData) {
      const category = String(row[categoryColumn] ?? "");
      const subcategory = String(row[subcategoryColumn] ?? "");
      const value = Number(row[valueColumn] ?? 0);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { total: 0, items: [] });
      }
      const catData = categoryMap.get(category)!;
      catData.total += value;
      catData.items.push({
        label: subcategory,
        value,
        color: "", // Will be set later
      });
    }

    // Convert to node list with category colors
    const nodeList: TreemapNode[] = [];
    let colorIndex = 0;

    for (const [category, catData] of categoryMap) {
      const baseColor = colors[colorIndex % colors.length]!;
      colorIndex++;

      // Add children with lightened versions of the category color
      const children = catData.items.map((item, i) => ({
        ...item,
        color: lightenColor(baseColor, 0.1 + (i * 0.1)),
      }));

      nodeList.push({
        label: category,
        value: catData.total,
        color: baseColor,
        children,
      });
    }

    const total = nodeList.reduce((sum, n) => sum + n.value, 0);
    return { nodes: nodeList, totalValue: total };
  }, [queryData, categoryColumn, subcategoryColumn, valueColumn, paletteId]);

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

  // Render treemap
  const renderTreemap = (forFullscreen = false) => {
    const width = forFullscreen ? 800 : 450;
    const height = forFullscreen ? 450 : 260;
    const padding = 2;

    // Layout nodes using squarify algorithm
    const layoutNodes = squarify(
      nodes,
      { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 },
      totalValue
    );

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
        {layoutNodes.map((node, i) => {
          const isHovered = hoveredNode === node.label;
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const w = node.width ?? 0;
          const h = node.height ?? 0;

          // Determine if label fits
          const minLabelWidth = 50;
          const minLabelHeight = 30;
          const showLabel = w > minLabelWidth && h > minLabelHeight;
          const showValue = w > 40 && h > 45;

          // Calculate percentage
          const percentage = ((node.value / totalValue) * 100).toFixed(1);

          return (
            <g key={i}>
              {/* Rectangle */}
              <rect
                x={x}
                y={y}
                width={Math.max(0, w - 1)}
                height={Math.max(0, h - 1)}
                rx={3}
                fill={node.color}
                style={{
                  cursor: "pointer",
                  opacity: isHovered ? 1 : 0.85,
                  transition: "opacity 0.15s ease, filter 0.15s ease",
                  filter: isHovered ? "brightness(1.1)" : "none",
                }}
                onMouseEnter={() => setHoveredNode(node.label)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <title>{`${node.label}: ${formatNumber(node.value)} (${percentage}%)`}</title>
              </rect>

              {/* Label */}
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 - (showValue ? 8 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={forFullscreen ? 13 : 11}
                  fontWeight={600}
                  style={{
                    pointerEvents: "none",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {truncateLabel(node.label, w)}
                </text>
              )}

              {/* Value */}
              {showValue && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.8)"
                  fontSize={forFullscreen ? 11 : 10}
                  style={{
                    pointerEvents: "none",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {formatNumber(node.value, { compact: true })}
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

  // Stats for fullscreen
  const maxNode = nodes.reduce((max, n) => (n.value > max.value ? n : max), nodes[0]!);
  const stats = [
    { label: "Total", value: totalValue },
    { label: "Categories", value: nodes.length },
    { label: "Largest", value: maxNode?.label || "-" },
    { label: "Max Value", value: maxNode?.value ?? 0 },
  ];

  const columns = [
    { key: categoryColumn, label: categoryColumn.replace(/_/g, " ").toUpperCase() },
    ...(subcategoryColumn
      ? [{ key: subcategoryColumn, label: subcategoryColumn.replace(/_/g, " ").toUpperCase() }]
      : []),
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
          {renderTreemap()}
        </div>
      </div>

      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title || "Treemap"}
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
          {renderTreemap(true)}
        </div>
      </FullscreenModal>
    </>
  );
}

/**
 * Lighten a hex color by a factor (0-1)
 */
function lightenColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * factor));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * factor));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Truncate label to fit within width
 */
function truncateLabel(label: string, maxWidth: number): string {
  // Rough estimate: 7px per character
  const maxChars = Math.floor(maxWidth / 7);
  if (label.length <= maxChars) return label;
  if (maxChars <= 3) return "";
  return label.slice(0, maxChars - 3) + "...";
}
