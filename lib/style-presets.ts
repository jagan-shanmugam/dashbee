/**
 * Style Presets System
 *
 * Provides predefined visual themes for dashboards including:
 * - Color palette
 * - Font settings
 * - Chart styling options
 */

export interface ChartStyleOptions {
  /** Grid line style */
  gridStyle: "solid" | "dashed" | "dotted" | "none";
  /** Grid line opacity (0-1) */
  gridOpacity: number;
  /** Show data point markers on line charts */
  showDataPoints: boolean;
  /** Curve style for line charts */
  curveStyle: "linear" | "smooth" | "step";
  /** Bar corner radius */
  barRadius: number;
  /** Font weight for values */
  valueFontWeight: number;
  /** Font weight for labels */
  labelFontWeight: number;
  /** Animation duration in ms (0 = no animation) */
  animationDuration: number;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  /** Color palette ID to use */
  colorPaletteId: string;
  /** Font family for headings */
  headingFont: string;
  /** Font family for body/labels */
  bodyFont: string;
  /** Base font size in pixels */
  baseFontSize: number;
  /** Chart styling options */
  chartStyle: ChartStyleOptions;
  /** CSS variables to apply */
  cssVariables?: Record<string, string>;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean, modern dashboard style",
    colorPaletteId: "default",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    baseFontSize: 14,
    chartStyle: {
      gridStyle: "dashed",
      gridOpacity: 0.5,
      showDataPoints: false,
      curveStyle: "smooth",
      barRadius: 4,
      valueFontWeight: 600,
      labelFontWeight: 500,
      animationDuration: 300,
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Professional business style with subdued colors",
    colorPaletteId: "corporate",
    headingFont: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    baseFontSize: 13,
    chartStyle: {
      gridStyle: "solid",
      gridOpacity: 0.3,
      showDataPoints: false,
      curveStyle: "linear",
      barRadius: 2,
      valueFontWeight: 600,
      labelFontWeight: 400,
      animationDuration: 200,
    },
  },
  {
    id: "academic",
    name: "Academic",
    description: "Clean, publication-ready charts with serif fonts",
    colorPaletteId: "monochrome",
    headingFont: '"Times New Roman", Georgia, serif',
    bodyFont: '"Times New Roman", Georgia, serif',
    baseFontSize: 12,
    chartStyle: {
      gridStyle: "solid",
      gridOpacity: 0.4,
      showDataPoints: true,
      curveStyle: "linear",
      barRadius: 0,
      valueFontWeight: 400,
      labelFontWeight: 400,
      animationDuration: 0,
    },
  },
  {
    id: "research",
    name: "Research",
    description: "Data-focused style optimized for analysis",
    colorPaletteId: "bold",
    headingFont: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    bodyFont: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    baseFontSize: 13,
    chartStyle: {
      gridStyle: "dashed",
      gridOpacity: 0.6,
      showDataPoints: true,
      curveStyle: "linear",
      barRadius: 0,
      valueFontWeight: 500,
      labelFontWeight: 500,
      animationDuration: 0,
    },
  },
  {
    id: "startup",
    name: "Startup",
    description: "Modern, vibrant style with bold colors",
    colorPaletteId: "rainbow",
    headingFont: '"Poppins", "Inter", sans-serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    baseFontSize: 14,
    chartStyle: {
      gridStyle: "none",
      gridOpacity: 0,
      showDataPoints: false,
      curveStyle: "smooth",
      barRadius: 8,
      valueFontWeight: 700,
      labelFontWeight: 500,
      animationDuration: 400,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean, distraction-free visualization",
    colorPaletteId: "pastel",
    headingFont: '"SF Pro Display", system-ui, sans-serif',
    bodyFont: '"SF Pro Text", system-ui, sans-serif',
    baseFontSize: 14,
    chartStyle: {
      gridStyle: "none",
      gridOpacity: 0,
      showDataPoints: false,
      curveStyle: "smooth",
      barRadius: 6,
      valueFontWeight: 500,
      labelFontWeight: 400,
      animationDuration: 250,
    },
  },
  {
    id: "nature",
    name: "Nature",
    description: "Earth tones with organic styling",
    colorPaletteId: "nature",
    headingFont: '"Merriweather", Georgia, serif',
    bodyFont: '"Open Sans", "Helvetica Neue", sans-serif',
    baseFontSize: 14,
    chartStyle: {
      gridStyle: "dotted",
      gridOpacity: 0.4,
      showDataPoints: true,
      curveStyle: "smooth",
      barRadius: 4,
      valueFontWeight: 600,
      labelFontWeight: 400,
      animationDuration: 300,
    },
  },
  {
    id: "dark-mode",
    name: "Dark Mode",
    description: "High contrast for dark backgrounds",
    colorPaletteId: "bold",
    headingFont: 'system-ui, -apple-system, sans-serif',
    bodyFont: 'system-ui, -apple-system, sans-serif',
    baseFontSize: 14,
    chartStyle: {
      gridStyle: "solid",
      gridOpacity: 0.2,
      showDataPoints: false,
      curveStyle: "smooth",
      barRadius: 4,
      valueFontWeight: 600,
      labelFontWeight: 500,
      animationDuration: 300,
    },
    cssVariables: {
      "--chart-grid-color": "rgba(255, 255, 255, 0.1)",
    },
  },
];

/**
 * Get a style preset by ID
 */
export function getStylePreset(id: string): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) || STYLE_PRESETS[0]!;
}

/**
 * Get CSS styles to apply from a preset
 */
export function getPresetCSSStyles(preset: StylePreset): Record<string, string> {
  return {
    "--heading-font": preset.headingFont,
    "--body-font": preset.bodyFont,
    "--base-font-size": `${preset.baseFontSize}px`,
    "--chart-grid-opacity": String(preset.chartStyle.gridOpacity),
    "--chart-bar-radius": `${preset.chartStyle.barRadius}px`,
    "--chart-value-font-weight": String(preset.chartStyle.valueFontWeight),
    "--chart-label-font-weight": String(preset.chartStyle.labelFontWeight),
    "--chart-animation-duration": `${preset.chartStyle.animationDuration}ms`,
    ...preset.cssVariables,
  };
}
