"use client";

import React from "react";
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

  const isHorizontal = direction === "horizontal";

  // Generous spacing scale for better visual rhythm in dashboards
  const gaps: Record<string, string> = {
    none: "0",
    xs: "8px",      // Extra small for tight groupings
    sm: "16px",     // Comfortable small spacing
    md: "24px",     // Default: generous breathing room
    lg: "36px",     // Large sections
    xl: "48px",     // Extra large for major sections
  };

  const alignments: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };

  // Wrap children to enable proper flex shrinking
  // minWidth: 0 allows flex children to shrink below their content size
  const wrappedChildren = React.Children.map(children, (child) => (
    <div
      style={{
        minWidth: 0,
        // For horizontal stacks, allow equal distribution; for vertical, stretch
        flex: isHorizontal ? "1 1 0" : undefined,
      }}
    >
      {child}
    </div>
  ));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap: gaps[gap || "md"],
        alignItems: alignments[align || "stretch"],
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
      }}
    >
      {wrappedChildren}
    </div>
  );
}
