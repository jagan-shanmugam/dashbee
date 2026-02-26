"use client";

import { useState, useCallback } from "react";
import { Palette } from "lucide-react";
import { COLOR_PALETTES, getPaletteColors } from "@/lib/color-palette";

export interface ColorPickerProps {
  currentPalette: string;
  onPaletteChange: (palette: string) => void;
  disabled?: boolean;
}

export function ColorPicker({
  currentPalette,
  onPaletteChange,
  disabled = false,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (palette: string) => {
      onPaletteChange(palette);
      setIsOpen(false);
    },
    [onPaletteChange],
  );

  const palettes = COLOR_PALETTES;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Change color palette"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          padding: 0,
          background: "transparent",
          border: "none",
          borderRadius: 4,
          cursor: disabled ? "not-allowed" : "pointer",
          color: "var(--muted)",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = "var(--border)";
            e.currentTarget.style.color = "var(--foreground)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--muted)";
        }}
      >
        <Palette size={14} />
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
              marginTop: 4,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
              minWidth: 180,
              maxHeight: 300,
              overflowY: "auto",
              zIndex: 101,
              padding: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 8,
                padding: "0 4px",
              }}
            >
              Color Palette
            </div>
            {palettes.map((palette) => {
              const colors = getPaletteColors(palette.id);
              const isSelected = palette.id === currentPalette;
              return (
                <button
                  key={palette.id}
                  onClick={() => handleSelect(palette.id)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: isSelected ? "var(--primary)" : "transparent",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--foreground)",
                        textTransform: "capitalize",
                      }}
                    >
                      {palette.name}
                    </span>
                    {isSelected && (
                      <span style={{ color: "var(--success)", fontSize: 12 }}>
                        ✓
                      </span>
                    )}
                  </div>
                  {/* Color preview */}
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    {colors.slice(0, 6).map((color, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 8,
                          background: color,
                          borderRadius: 2,
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
