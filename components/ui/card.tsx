"use client";

import { type ComponentRenderProps } from "@json-render/react";

/**
 * Card Component
 *
 * Container with comfortable padding and clear visual boundaries.
 * Optimized for dashboard layouts with generous internal spacing.
 */
export function Card({ element, children }: ComponentRenderProps) {
  const { title, description, padding } = element.props as {
    title?: string | null;
    description?: string | null;
    padding?: string | null;
  };

  // Comfortable padding scale - increased for better UX
  const paddings: Record<string, string> = {
    none: "0",
    sm: "16px",      // Increased from 12px
    md: "24px",      // New default
    lg: "32px",      // Increased from 24px
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {(title || description) && (
        <div
          style={{
            padding: "20px 24px",  // Increased from 16px 20px
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title && (
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {title}
            </h3>
          )}
          {description && (
            <p
              style={{
                margin: "6px 0 0",  // Increased from 4px
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div style={{ padding: paddings[padding || ""] || "24px" }}>
        {children}
      </div>
    </div>
  );
}
