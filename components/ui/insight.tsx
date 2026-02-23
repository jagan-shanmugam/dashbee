"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";

/**
 * Insight Component
 *
 * A beautifully styled component for displaying chart insights and analysis.
 * Features a gradient accent, icon, and refined typography.
 */
export function Insight({ element }: ComponentRenderProps) {
  const { content, type = "default" } = element.props as {
    content: string;
    type?: "default" | "positive" | "negative" | "warning" | "info";
  };

  // Theme configuration based on insight type
  const themes: Record<string, {
    icon: React.ReactNode;
    gradient: string;
    accentColor: string;
    iconBg: string;
  }> = {
    default: {
      icon: <Lightbulb size={14} />,
      gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)",
      accentColor: "rgb(99, 102, 241)",
      iconBg: "rgba(99, 102, 241, 0.12)",
    },
    positive: {
      icon: <TrendingUp size={14} />,
      gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)",
      accentColor: "rgb(34, 197, 94)",
      iconBg: "rgba(34, 197, 94, 0.12)",
    },
    negative: {
      icon: <TrendingDown size={14} />,
      gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.04) 100%)",
      accentColor: "rgb(239, 68, 68)",
      iconBg: "rgba(239, 68, 68, 0.12)",
    },
    warning: {
      icon: <AlertCircle size={14} />,
      gradient: "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(202, 138, 4, 0.04) 100%)",
      accentColor: "rgb(234, 179, 8)",
      iconBg: "rgba(234, 179, 8, 0.12)",
    },
    info: {
      icon: <Info size={14} />,
      gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)",
      accentColor: "rgb(59, 130, 246)",
      iconBg: "rgba(59, 130, 246, 0.12)",
    },
  };

  const theme = themes[type] || themes.default;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "18px 20px",
        marginTop: 20,           // Increased from 12px for better separation
        marginBottom: 8,         // Add bottom margin
        background: theme.gradient,
        borderRadius: 12,        // Slightly larger radius
        borderLeft: `3px solid ${theme.accentColor}`,
        overflow: "hidden",
      }}
    >
      {/* Icon container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          background: theme.iconBg,
          color: theme.accentColor,
          flexShrink: 0,
        }}
      >
        {theme.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: theme.accentColor,
            }}
          >
            Insight
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--foreground)",
            opacity: 0.9,
          }}
        >
          {content}
        </p>
      </div>

      {/* Decorative element */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.accentColor}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
