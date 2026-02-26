/**
 * Shared types for SQL tool results
 *
 * Used by both database and in-memory SQL agents to provide
 * consistent result structures.
 */

/**
 * Result from executing a SQL query through the agent tools.
 * Includes success status for LLM self-correction on errors.
 */
export interface SQLToolResult {
  /** Unique key identifying this query result */
  key: string;
  /** Whether the query executed successfully */
  success: boolean;
  /** Query result rows (if successful) */
  rows?: unknown[];
  /** Number of rows returned */
  rowCount?: number;
  /** Error message (if failed) */
  error?: string;
}
