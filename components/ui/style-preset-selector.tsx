"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, ChevronDown, Check } from "lucide-react";
import { useStylePreset } from "@/lib/style-preset-context";
import { getPaletteColors } from "@/lib/color-palette";

/**
 * Style preset selector dropdown
 *
 * Displays available style presets with previews of their color palettes
 * and allows users to switch between them.
 */
export function StylePresetSelector() {
  const { preset, presetId, availablePresets, setPreset } = useStylePreset();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 14,
          color: "var(--foreground)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Change style preset"
      >
        <Palette size={16} />
        <span>{preset.name}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
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
            minWidth: 280,
            maxHeight: 400,
            overflowY: "auto",
            zIndex: 101,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Style Presets</span>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              Choose a visual theme for your dashboard
            </p>
          </div>

          {/* Preset list */}
          <div style={{ padding: 8 }}>
            {availablePresets.map((p) => {
              const isSelected = p.id === presetId;
              const colors = getPaletteColors(p.colorPaletteId);

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPreset(p.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    width: "100%",
                    padding: "10px 12px",
                    background: isSelected ? "rgba(14, 165, 233, 0.15)" : "transparent",
                    border: "none",
                    borderRadius: 6,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--border)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {/* Check mark for selected */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {isSelected && (
                      <Check size={14} style={{ color: "var(--success)" }} />
                    )}
                  </div>

                  {/* Preset info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--foreground)",
                        }}
                      >
                        {p.name}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {p.description}
                    </p>

                    {/* Color palette preview */}
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                      }}
                    >
                      {colors.slice(0, 8).map((color, i) => (
                        <div
                          key={i}
                          style={{
                            width: 20,
                            height: 12,
                            background: color,
                            borderRadius: 2,
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
