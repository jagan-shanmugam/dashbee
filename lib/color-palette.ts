/**
 * Predefined color palettes for charts
 */

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  description: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "default",
    name: "Default",
    colors: [
      "#3b82f6", // Blue
      "#10b981", // Green
      "#f59e0b", // Amber
      "#ef4444", // Red
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#06b6d4", // Cyan
      "#84cc16", // Lime
    ],
    description: "Vibrant, balanced color palette",
  },
  {
    id: "corporate",
    name: "Corporate",
    colors: [
      "#0f172a", // Slate 900
      "#334155", // Slate 700
      "#64748b", // Slate 500
      "#94a3b8", // Slate 400
      "#1e40af", // Blue 800
      "#1d4ed8", // Blue 700
      "#3b82f6", // Blue 500
      "#60a5fa", // Blue 400
    ],
    description: "Professional blues and grays",
  },
  {
    id: "nature",
    name: "Nature",
    colors: [
      "#166534", // Green 800
      "#15803d", // Green 700
      "#22c55e", // Green 500
      "#4ade80", // Green 400
      "#854d0e", // Yellow 800
      "#ca8a04", // Yellow 600
      "#365314", // Lime 900
      "#84cc16", // Lime 500
    ],
    description: "Earth tones and greens",
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: [
      "#0c4a6e", // Sky 900
      "#0369a1", // Sky 700
      "#0ea5e9", // Sky 500
      "#38bdf8", // Sky 400
      "#164e63", // Cyan 900
      "#0891b2", // Cyan 600
      "#06b6d4", // Cyan 500
      "#22d3ee", // Cyan 400
    ],
    description: "Cool blues and teals",
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: [
      "#9a3412", // Orange 800
      "#ea580c", // Orange 600
      "#fb923c", // Orange 400
      "#fed7aa", // Orange 200
      "#b91c1c", // Red 700
      "#ef4444", // Red 500
      "#fca5a5", // Red 300
      "#fecaca", // Red 200
    ],
    description: "Warm oranges and reds",
  },
  {
    id: "berry",
    name: "Berry",
    colors: [
      "#701a75", // Fuchsia 900
      "#a21caf", // Fuchsia 700
      "#d946ef", // Fuchsia 500
      "#f0abfc", // Fuchsia 300
      "#581c87", // Purple 900
      "#7c3aed", // Violet 600
      "#a855f7", // Purple 500
      "#c084fc", // Purple 400
    ],
    description: "Purples and magentas",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: [
      "#030712", // Gray 950
      "#1f2937", // Gray 800
      "#374151", // Gray 700
      "#6b7280", // Gray 500
      "#9ca3af", // Gray 400
      "#d1d5db", // Gray 300
      "#e5e7eb", // Gray 200
      "#f9fafb", // Gray 50
    ],
    description: "Grayscale",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    colors: [
      "#ef4444", // Red
      "#f97316", // Orange
      "#eab308", // Yellow
      "#22c55e", // Green
      "#06b6d4", // Cyan
      "#3b82f6", // Blue
      "#8b5cf6", // Violet
      "#ec4899", // Pink
    ],
    description: "Full spectrum",
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: [
      "#fca5a5", // Red 300
      "#fdba74", // Orange 300
      "#fde047", // Yellow 300
      "#86efac", // Green 300
      "#67e8f9", // Cyan 300
      "#93c5fd", // Blue 300
      "#c4b5fd", // Violet 300
      "#f9a8d4", // Pink 300
    ],
    description: "Soft, muted colors",
  },
  {
    id: "bold",
    name: "Bold",
    colors: [
      "#dc2626", // Red 600
      "#d97706", // Amber 600
      "#ca8a04", // Yellow 600
      "#16a34a", // Green 600
      "#0891b2", // Cyan 600
      "#2563eb", // Blue 600
      "#7c3aed", // Violet 600
      "#db2777", // Pink 600
    ],
    description: "High contrast, vivid",
  },
];

/**
 * Get a color palette by ID
 */
export function getPalette(id: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === id) || COLOR_PALETTES[0]!;
}

/**
 * Get colors from a palette
 */
export function getPaletteColors(id: string): string[] {
  return getPalette(id).colors;
}

/**
 * Get a single color from a palette at a given index (cycles if out of range)
 */
export function getColorFromPalette(paletteId: string, index: number): string {
  const colors = getPaletteColors(paletteId);
  return colors[index % colors.length] || colors[0]!;
}

/**
 * Generate a color scale from a base color
 * Useful for heatmaps and gradients
 */
export function generateColorScale(
  baseColor: string,
  steps: number = 5,
): string[] {
  // This is a simplified version - for production, consider using a color library
  // like chroma.js or d3-scale-chromatic
  const result: string[] = [];

  // Parse hex color
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    // Interpolate from white to the base color
    const newR = Math.round(255 + (r - 255) * ratio);
    const newG = Math.round(255 + (g - 255) * ratio);
    const newB = Math.round(255 + (b - 255) * ratio);

    result.push(
      `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`,
    );
  }

  return result;
}
