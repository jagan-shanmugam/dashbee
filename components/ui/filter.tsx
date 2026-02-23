"use client";

/**
 * SQLFilter - Placeholder component for filter definitions
 *
 * Filters are actually rendered via FilterBar, not as individual components.
 * This no-op component exists to prevent json-render warnings when the AI
 * generates SQLFilter elements in the component tree.
 *
 * The actual filter logic is in:
 * - app/page.tsx: Extracts SQLFilter elements from tree
 * - components/ui/filter-bar.tsx: Renders the extracted filters
 */
export function Filter() {
  // SQLFilter elements are extracted and rendered via FilterBar
  // This component returns null to satisfy json-render
  return null;
}
