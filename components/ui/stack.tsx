"use client";

import { type ComponentRenderProps } from "@json-render/react";

/**
 * Stack Component
 *
 * Flexible layout for horizontal or vertical stacking with comfortable spacing.
 * Uses generous gaps for clear visual separation between items.
 */
export function Stack({ element, children }: ComponentRenderProps) {
  const { direction, gap, align } = element.props as {
    direction?: string | null;
    gap?: string | null;
    align?: string | null;
  };

  // Generous spacing scale for better visual rhythm
  const gaps: Record<string, string> = {
    none: "0",
    xs: "8px",      // New: extra small for tight groupings
    sm: "12px",     // Increased from 8px
    md: "20px",     // Increased from 16px
    lg: "32px",     // Increased from 24px
    xl: "48px",     // New: extra large for sections
  };

  const alignments: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap: gaps[gap || "md"],
        alignItems: alignments[align || "stretch"],
      }}
    >
      {children}
    </div>
  );
}
