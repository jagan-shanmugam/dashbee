import { z } from "zod";
import { executeQuery, DBConfig } from "./db";
import { validateQuery } from "./query-validator";
import { injectFilterParams } from "./filter-utils";
import {
  FilterMeta,
  buildFilteredQuery,
  validateFilterMeta,
} from "./filter-metadata";
import { SQLToolResult } from "./types/sql-tools";

// Re-export for backward compatibility
export type { SQLToolResult };

/**
 * Create SQL tools for the agentic dashboard generator.
 * These tools allow the LLM agent to execute SQL queries and get feedback
 * to self-correct if queries fail.
 *
 * @param dbConfig - Database connection configuration
 * @param schema - Database schema description for LLM
 * @param filterParams - Filter parameter values to inject into queries with {{placeholder}} syntax
 */
export function createSQLTools(
  dbConfig?: DBConfig,
  schema?: string,
  filterParams?: Record<string, string>,
) {
  return {
    execute_sql: {
      description: `Execute a SQL SELECT query against the database and return the results.
If the query fails, the error message will be returned so you can fix and retry.
Only SELECT queries are allowed.

**NEW: Filter Metadata** (recommended)
Instead of embedding filter placeholders in SQL, provide filterMeta to describe how 
user filters should be applied. The server will build a parameterized WHERE clause.

Example:
{
  "key": "revenue-by-region",
  "sql": "SELECT region, SUM(revenue) FROM daily_metrics GROUP BY region",
  "filterMeta": [
    { "id": "date_from", "column": "date", "operator": "gte", "type": "date" },
    { "id": "date_to", "column": "date", "operator": "lte", "type": "date" },
    { "id": "region", "column": "region", "operator": "eq", "type": "text" }
  ]
}`,
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "Unique identifier for this query (e.g., 'total-revenue', 'orders-by-region')",
          ),
        sql: z
          .string()
          .describe(
            "The SQL SELECT query to execute. Prefer writing base queries WITHOUT filter conditions when using filterMeta.",
          ),
        filterMeta: z
          .array(
            z.object({
              id: z
                .string()
                .describe(
                  "Filter ID matching user filter definition (e.g., 'date_from', 'date_to', 'region')",
                ),
              column: z.string().describe("Column name to filter on"),
              operator: z
                .enum([
                  "eq",
                  "neq",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "in",
                  "not_in",
                  "like",
                  "ilike",
                  "between",
                ])
                .describe("Comparison operator"),
              type: z
                .enum(["date", "text", "number", "boolean"])
                .describe("Data type for proper casting"),
              table: z
                .string()
                .optional()
                .describe(
                  "Table alias if query uses joins (e.g., 'dm' for daily_metrics dm)",
                ),
            }),
          )
          .optional()
          .describe(
            "Filter metadata describing how to apply user filters. When provided, filters are applied server-side with parameterized queries.",
          ),
      }),
      execute: async ({
        key,
        sql,
        filterMeta,
      }: {
        key: string;
        sql: string;
        filterMeta?: FilterMeta[];
      }): Promise<SQLToolResult> => {
        let finalSql: string;
        let params: unknown[] = [];

        // Use new filter metadata system if provided
        if (filterMeta && filterMeta.length > 0 && filterParams) {
          // Validate filter metadata
          const validation = validateFilterMeta(filterMeta);
          if (!validation.valid) {
            return {
              key,
              success: false,
              error: `Invalid filter metadata: ${validation.errors.join(", ")}`,
            };
          }

          // Build parameterized query
          const filtered = buildFilteredQuery(sql, filterMeta, filterParams);
          finalSql = filtered.sql;
          params = filtered.params;
        } else {
          // Legacy: Inject filter parameters via string replacement
          finalSql = filterParams ? injectFilterParams(sql, filterParams) : sql;
        }

        // Validate the query structure
        const queryValidation = validateQuery(finalSql);
        if (!queryValidation.valid) {
          return {
            key,
            success: false,
            error: queryValidation.error,
          };
        }

        // Try to execute the query
        try {
          const rows = await executeQuery(finalSql, params, dbConfig);
          return {
            key,
            success: true,
            rows,
            rowCount: rows.length,
          };
        } catch (err) {
          return {
            key,
            success: false,
            error:
              err instanceof Error ? err.message : "Query execution failed",
          };
        }
      },
    },

    get_schema: {
      description:
        "Get the database schema to understand available tables and columns",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          schema: schema || "Schema not available",
        };
      },
    },
  };
}
