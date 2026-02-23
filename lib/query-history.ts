/**
 * Query History Management
 *
 * Persists past prompts with timestamps to localStorage.
 * Each entry stores: prompt, timestamp, success status, database name,
 * and optionally full dashboard state for restoration.
 */

import type { UITree } from "@json-render/core";

// Re-export UITree type for callers
export type { UITree };

const STORAGE_KEY = "dashb-query-history";
const MAX_HISTORY_ITEMS = 50;

// SQL Query structure
export interface SQLQuery {
  key: string;
  sql: string;
  executedSql?: string;
}

// Filter definition structure
export interface FilterDefinition {
  id: string;
  type: "date-range" | "dropdown";
  label: string;
  column: string;
  options?: string[];
  multiSelect?: boolean;
  defaultPreset?: "last7days" | "last30days" | "last90days" | "ytd" | "custom";
}

// Filter value types
export interface DateRangeValue {
  from: string;
  to: string;
}

export type FilterValue = string | string[] | DateRangeValue | null;

// Main history entry interface
export interface HistoryEntry {
  id: string;
  prompt: string;
  timestamp: string; // ISO date string
  success: boolean;
  dbName: string;
  // New fields for full dashboard restoration
  tree?: UITree | null;
  queries?: SQLQuery[];
  filters?: FilterDefinition[];
  filterValues?: Record<string, FilterValue>;
}

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load history from localStorage
 */
export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Save history to localStorage
 */
function saveHistory(history: HistoryEntry[]): void {
  if (typeof window === "undefined") return;

  try {
    // Keep only the most recent items
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

/**
 * Dashboard state to save with history entry
 */
export interface DashboardState {
  tree: UITree | null;
  queries: SQLQuery[];
  filters: FilterDefinition[];
  filterValues: Record<string, FilterValue>;
}

/**
 * Add a new entry to history
 * Optionally includes full dashboard state for restoration
 */
export function addToHistory(
  prompt: string,
  success: boolean,
  dbName: string,
  dashboardState?: DashboardState,
): HistoryEntry {
  const entry: HistoryEntry = {
    id: generateId(),
    prompt,
    timestamp: new Date().toISOString(),
    success,
    dbName,
    // Include dashboard state if provided
    ...(dashboardState && {
      tree: dashboardState.tree,
      queries: dashboardState.queries,
      filters: dashboardState.filters,
      filterValues: dashboardState.filterValues,
    }),
  };

  const history = loadHistory();

  // Remove any existing entry with the same prompt (avoid duplicates)
  const filtered = history.filter(
    (h) => h.prompt.toLowerCase() !== prompt.toLowerCase(),
  );

  // Add new entry at the beginning
  const updated = [entry, ...filtered];
  saveHistory(updated);

  return entry;
}

/**
 * Remove an entry from history
 */
export function removeFromHistory(id: string): void {
  const history = loadHistory();
  const filtered = history.filter((h) => h.id !== id);
  saveHistory(filtered);
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Format timestamp for display
 */
/**
 * Get recent prompts formatted for agent context.
 * Helps the agent understand what the user has been exploring.
 * @param maxItems Maximum number of recent prompts to return
 * @returns Formatted string of recent prompts or empty string if none
 */
export function getRecentPromptsForAgent(maxItems: number = 5): string {
  const history = loadHistory();
  if (history.length === 0) return "";

  const recentSuccessful = history
    .filter((h) => h.success)
    .slice(0, maxItems);

  if (recentSuccessful.length === 0) return "";

  const promptLines = recentSuccessful.map(
    (h, i) => `${i + 1}. "${h.prompt}"`
  );

  return `
RECENT USER QUERIES (for context):
The user has recently explored these topics - consider continuity and related insights:
${promptLines.join("\n")}
`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return "Just now";
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  }

  // Otherwise, show date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
