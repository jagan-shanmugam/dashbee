import { executeQuery, DBConfig } from "@/lib/db";
import { validateQuery } from "@/lib/query-validator";
import {
  injectFilterParams,
  hasUnresolvedPlaceholders,
  extractPlaceholders,
  removeUnresolvedConditions,
  stripAllUnresolvedPlaceholders,
} from "@/lib/filter-utils";
import {
  FilterMeta,
  buildFilteredQuery,
  buildAutoFilteredQuery,
  validateFilterMeta,
} from "@/lib/filter-metadata";
import { apiCache } from "@/lib/api-cache";
import { getInMemoryDb } from "@/lib/in-memory-db";

export const maxDuration = 30; // 30 seconds

interface SQLQuery {
  key: string;
  sql: string;
  /** Filter metadata for server-side parameterized filtering (new system) */
  filterMeta?: FilterMeta[];
}

interface QueryResult {
  key: string;
  success: boolean;
  rows?: unknown[];
  rowCount?: number;
  error?: string;
}

/**
 * Execute a query against the in-memory database
 */
function executeInMemoryQuery(sql: string): unknown[] {
  const db = getInMemoryDb();
  const result = db.query(sql);
  return result.rows;
}

/**
 * Execute multiple SQL queries with filter parameters.
 * This endpoint is used to re-run queries when filters change,
 * without invoking the full LLM agent.
 *
 * Supports both database and file (in-memory) data sources.
 */
export async function POST(req: Request) {
  try {
    const {
      queries,
      filterParams,
      dbConfig,
      dataSourceType,
      fileData,
    } = (await req.json()) as {
      queries: SQLQuery[];
      filterParams?: Record<string, string>;
      dbConfig?: DBConfig;
      dataSourceType?: "database" | "file";
      fileData?: {
        tableName: string;
        data: Record<string, unknown>[];
      };
    };

    if (!queries || !Array.isArray(queries)) {
      return Response.json(
        { error: "queries array is required" },
        { status: 400 },
      );
    }

    const isFileSource = dataSourceType === "file";

    // If file source, ensure data is loaded into in-memory DB
    if (isFileSource && fileData && fileData.tableName && fileData.data) {
      const db = getInMemoryDb();
      db.addTable(fileData.tableName, fileData.data);
    }

    // Generate cache key for the entire batch
    const cacheKey = apiCache.generateKey("execute-queries", {
      queries,
      filterParams,
      dbConfig: isFileSource ? undefined : dbConfig,
      dataSourceType,
      fileTableName: isFileSource && fileData ? fileData.tableName : undefined,
    });

    // Try to get cached result
    const cachedResult = await apiCache.getOrCompute(
      cacheKey,
      async () => {
        const results: Record<string, unknown[]> = {};
        const executedQueries: Record<string, string> = {};
        const errors: QueryResult[] = [];

        // Execute all queries in parallel
        await Promise.all(
          queries.map(async ({ key, sql, filterMeta }) => {
            let processedSql: string;
            let params: unknown[] = [];

            // ================================================================
            // NEW SYSTEM: Use filter metadata for parameterized queries
            // ================================================================
            if (filterMeta && filterMeta.length > 0 && filterParams) {
              // Validate filter metadata
              const metaValidation = validateFilterMeta(filterMeta);
              if (!metaValidation.valid) {
                errors.push({
                  key,
                  success: false,
                  error: `Invalid filter metadata: ${metaValidation.errors.join(", ")}`,
                });
                return;
              }

              // Build parameterized query
              const filtered = buildFilteredQuery(
                sql,
                filterMeta,
                filterParams,
              );
              processedSql = filtered.sql;
              params = filtered.params;

              // Store the processed SQL for display (without actual param values for security)
              executedQueries[key] = processedSql;
            }
            // ================================================================
            // AUTO-INFERENCE SYSTEM: Try to auto-apply filters
            // ================================================================
            else if (filterParams && Object.keys(filterParams).length > 0) {
              // Check if the SQL has any {{placeholders}}
              const hasPlaceholders = /\{\{[^}]+\}\}/.test(sql);

              // Skip auto-filtering for lookup queries (distinct-* keys)
              // These queries fetch filter options and shouldn't be filtered themselves
              const isLookupQuery = key.startsWith("distinct-");

              if (isLookupQuery) {
                // Lookup queries should always execute as-is without filtering
                processedSql = sql;
                executedQueries[key] = processedSql;
              } else if (!hasPlaceholders) {
                // No placeholders and no filterMeta - try auto-inference
                const autoResult = buildAutoFilteredQuery(sql, filterParams);

                if (autoResult && autoResult.params.length > 0) {
                  // Auto-inference found applicable filters
                  processedSql = autoResult.sql;
                  params = autoResult.params;
                  executedQueries[key] = processedSql;
                } else {
                  // No filters could be inferred, execute as-is
                  processedSql = sql;
                  executedQueries[key] = processedSql;
                }
              } else {
                // ================================================================
                // LEGACY SYSTEM: String replacement with fallback stripping
                // ================================================================
                // Inject filter parameters
                processedSql = injectFilterParams(sql, filterParams);

                // Remove unresolved optional filter conditions (e.g., when "All" is selected for dropdowns)
                processedSql = removeUnresolvedConditions(processedSql);

                // Store the processed SQL for display
                executedQueries[key] = processedSql;

                // If there are still unresolved placeholders after removeUnresolvedConditions,
                // use the aggressive fallback to strip them (graceful degradation)
                if (hasUnresolvedPlaceholders(processedSql)) {
                  const unresolved = extractPlaceholders(processedSql);
                  console.warn(
                    `Query ${key} has unresolved placeholders after removeUnresolvedConditions: ${unresolved.join(", ")}. Using fallback stripping.`,
                  );
                  processedSql = stripAllUnresolvedPlaceholders(processedSql);
                  executedQueries[key] = processedSql; // Update with fallback-processed SQL
                }
              }
            }
            // ================================================================
            // NO FILTERS: Execute query as-is
            // ================================================================
            else {
              processedSql = sql;
              executedQueries[key] = processedSql;
            }

            // Validate query
            const validation = validateQuery(processedSql);
            if (!validation.valid) {
              errors.push({
                key,
                success: false,
                error: validation.error,
              });
              return;
            }

            // Execute query based on data source type
            try {
              let rows: unknown[];

              if (isFileSource) {
                // Execute against in-memory database
                // Note: In-memory DB doesn't support parameterized queries,
                // so we need to inline parameters for now
                let inMemorySql = processedSql;
                if (params.length > 0) {
                  // Simple parameter substitution for in-memory queries
                  let paramIndex = 0;
                  inMemorySql = processedSql.replace(/\$\d+/g, () => {
                    const value = params[paramIndex++];
                    if (value === null || value === undefined) return "NULL";
                    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
                    if (typeof value === "number") return String(value);
                    if (value instanceof Date) return `'${value.toISOString()}'`;
                    return String(value);
                  });
                }
                rows = executeInMemoryQuery(inMemorySql);
              } else {
                // Execute against PostgreSQL/MySQL/SQLite database
                rows = await executeQuery(processedSql, params, dbConfig);
              }

              results[key] = rows;
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Query execution failed";

              // Check if this is a "column not found" error from auto-inferred filters
              // If so, retry without filters as graceful degradation
              const isColumnNotFoundError =
                errorMessage.includes("Unknown column") ||
                errorMessage.includes("column") && errorMessage.includes("does not exist") ||
                errorMessage.includes("no such column");

              if (isColumnNotFoundError && !filterMeta && filterParams && Object.keys(filterParams).length > 0) {
                // Retry with original SQL (no filters applied) - graceful degradation
                console.warn(
                  `Query ${key} - filter caused column error, retrying without auto-inferred filters: ${errorMessage}`
                );

                try {
                  let rows: unknown[];
                  const fallbackSql = sql;

                  if (isFileSource) {
                    rows = executeInMemoryQuery(fallbackSql);
                  } else {
                    rows = await executeQuery(fallbackSql, [], dbConfig);
                  }

                  results[key] = rows;
                  executedQueries[key] = fallbackSql + " /* filters skipped: column not found */";
                } catch (fallbackErr) {
                  errors.push({
                    key,
                    success: false,
                    error: fallbackErr instanceof Error ? fallbackErr.message : "Query execution failed",
                  });
                }
              } else {
                errors.push({
                  key,
                  success: false,
                  error: errorMessage,
                });
              }
            }
          }),
        );

        return {
          results,
          executedQueries,
          errors: errors.length > 0 ? errors : undefined,
        };
      },
      60 * 1000, // 1 minute TTL
    );

    return Response.json(cachedResult);
  } catch (error) {
    console.error("Execute queries error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}
