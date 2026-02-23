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

  // Generous spacing scale for better visual hierarchy
  const gaps: Record<string, string> = {
    none: "0",
    sm: "12px",
    md: "24px",   // Increased from 16px for better breathing room
    lg: "32px",   // Increased from 24px
    xl: "48px",   // New: extra large for major sections
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns || 2}, 1fr)`,
        gap: gaps[gap || "md"],
      }}
    >
      {children}
    </div>
  );
}
