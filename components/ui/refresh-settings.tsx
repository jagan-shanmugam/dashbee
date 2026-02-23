"use client";

import { useState } from "react";
import { RefreshCw, Clock, ChevronDown } from "lucide-react";
import { useRefresh, REFRESH_INTERVALS } from "@/lib/refresh-context";

export function RefreshSettings() {
  const {
    config,
    setInterval,
    setEnabled,
    lastRefresh,
    triggerRefresh,
    countdown,
    isRefreshing,
  } = useRefresh();
  const [isOpen, setIsOpen] = useState(false);

  // Format last refresh time - uses countdown to trigger re-renders
  const formatLastRefresh = () => {
    if (!lastRefresh) return "Never";
    // Use countdown as a proxy for time passing (it updates every second)
    // This avoids calling Date.now() directly during render
    void countdown; // Reference countdown to track time
    const now = new Date();
    const seconds = Math.floor(
      (now.getTime() - lastRefresh.getTime()) / 1000,
    );
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return lastRefresh.toLocaleTimeString();
  };

  // Format countdown
  const formatCountdown = () => {
    if (countdown === null) return null;
    if (countdown < 60) return `${countdown}s`;
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          background: config.enabled ? "var(--success)" : "transparent",
          color: config.enabled ? "white" : "var(--foreground)",
          border: config.enabled ? "none" : "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Auto-refresh settings"
      >
        <RefreshCw
          size={16}
          style={{
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
        {config.enabled && countdown !== null && (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatCountdown()}
          </span>
        )}
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
              minWidth: 220,
              zIndex: 101,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 14 }}>
                Auto-refresh
              </span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    if (e.target.checked && config.interval === null) {
                      setInterval(30); // Default to 30 seconds
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </label>
            </div>

            {/* Interval options */}
            <div style={{ padding: 8 }}>
              {REFRESH_INTERVALS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setInterval(option.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background:
                      config.interval === option.value
                        ? "var(--accent)"
                        : "transparent",
                    color: "var(--foreground)",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{option.label}</span>
                  {config.interval === option.value && (
                    <span style={{ color: "var(--success)" }}>✓</span>
                  )}
                </button>
              ))}

              {/* Disable option */}
              <button
                onClick={() => setInterval(null)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background:
                    config.interval === null ? "var(--accent)" : "transparent",
                  color: "var(--muted)",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Disabled
              </button>
            </div>

            {/* Footer with last refresh info */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} />
                <span>Last: {formatLastRefresh()}</span>
              </div>
              <button
                onClick={() => {
                  triggerRefresh();
                  setIsOpen(false);
                }}
                disabled={isRefreshing}
                style={{
                  padding: "4px 8px",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: isRefreshing ? "not-allowed" : "pointer",
                  opacity: isRefreshing ? 0.5 : 1,
                }}
              >
                Refresh Now
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Compact refresh indicator for showing in the dashboard header
 */
export function RefreshIndicator() {
  const {
    config,
    countdown,
    isRefreshing,
    triggerRefresh,
  } = useRefresh();

  if (!config.enabled) return null;

  const formatCountdown = () => {
    if (countdown === null) return "";
    if (countdown < 60) return `${countdown}s`;
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px",
        background: "var(--accent)",
        borderRadius: "var(--radius)",
        fontSize: 12,
        color: "var(--muted)",
      }}
    >
      <span
        onClick={triggerRefresh}
        role="button"
        title="Click to refresh now"
        style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
      >
        <RefreshCw
          size={12}
          style={{
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {isRefreshing ? "Refreshing..." : `Next: ${formatCountdown()}`}
      </span>
    </div>
  );
}
