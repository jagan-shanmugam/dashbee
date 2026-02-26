/**
 * Shared Chart Utilities
 *
 * Common functions used across multiple chart components for consistent
 * rendering of axes, curves, and labels.
 */

/**
 * Generate smooth Catmull-Rom spline path from points.
 * Creates professional-looking curved lines instead of jagged segments.
 *
 * @param points - Array of {x, y} coordinates
 * @returns SVG path string for use in <path d="..."/>
 */
export function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";

  const first = points[0];
  const second = points[1];
  if (!first || !second) return "";

  if (points.length === 2) {
    return `M ${first.x} ${first.y} L ${second.x} ${second.y}`;
  }

  let path = `M ${first.x} ${first.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    // Catmull-Rom to cubic Bezier control points conversion
    // Tension factor of 1/6 gives smooth, natural-looking curves
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/**
 * Calculate nice round tick values for chart axes.
 * Uses "nice numbers" algorithm to produce human-readable scales.
 *
 * @param min - Minimum data value
 * @param max - Maximum data value
 * @param targetCount - Desired number of ticks (actual count may vary)
 * @returns Array of tick values
 */
export function calculateNiceTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  if (max === min) return [0, max || 1];

  const range = max - min;
  const roughStep = range / (targetCount - 1);

  // Find a "nice" step value (1, 2, 5, 10, 20, 50, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const residual = roughStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  // Generate ticks from nice minimum to nice maximum
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  // Use index-based loop to avoid floating-point accumulation errors
  const numTicks = Math.round((niceMax - niceMin) / niceStep) + 1;
  for (let i = 0; i < numTicks; i++) {
    // Calculate tick from base to avoid floating-point drift
    const tick = Math.round((niceMin + i * niceStep) * 1e10) / 1e10;
    ticks.push(tick);
  }

  // Deduplicate ticks (can happen due to floating-point precision)
  const uniqueTicks = [...new Set(ticks)];

  // Ensure we have at least 2 ticks
  if (uniqueTicks.length < 2) {
    return [0, max];
  }

  return uniqueTicks;
}

/**
 * Get evenly spaced indices for x-axis labels to prevent overcrowding.
 * Always includes first and last indices.
 *
 * @param total - Total number of items
 * @param maxLabels - Maximum number of labels to show
 * @returns Array of indices to display
 */
export function getSpacedIndices(total: number, maxLabels: number): number[] {
  if (total <= maxLabels) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const indices: number[] = [0]; // Always show first
  const step = (total - 1) / (maxLabels - 1);

  for (let i = 1; i < maxLabels - 1; i++) {
    indices.push(Math.round(i * step));
  }

  indices.push(total - 1); // Always show last
  return indices;
}

/**
 * Format a number for display in charts.
 * Uses compact notation for large numbers and limits decimal places.
 *
 * @param value - The number to format
 * @returns Formatted string
 */
export function formatChartValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(value);
}
