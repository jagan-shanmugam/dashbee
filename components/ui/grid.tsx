"use client";

import { type ComponentRenderProps } from "@json-render/react";

/**
 * Grid Component
 *
 * Responsive grid layout with generous spacing for dashboard layouts.
 * Uses comfortable gaps that give charts and content room to breathe.
 */
export function Grid({ element, children }: ComponentRenderProps) {
  const { columns, gap } = element.props as {
    columns?: number | null;
    gap?: string | null;
  };

  // Generous spacing scale for better visual hierarchy in dashboards
  const gaps: Record<string, string> = {
    none: "0",
    xs: "8px",    // Extra small for tight groupings
    sm: "16px",   // Comfortable small spacing
    md: "24px",   // Default: generous breathing room
    lg: "36px",   // Large sections
    xl: "48px",   // Extra large for major sections
  };

  return (
    <div
      style={{
        display: "grid",
        // minmax(0, 1fr) allows grid children to shrink below their content size,
        // preventing overflow when children have intrinsic width (like charts/tables)
        gridTemplateColumns: `repeat(${columns || 2}, minmax(0, 1fr))`,
        gap: gaps[gap || "md"],
        overflow: "hidden",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
