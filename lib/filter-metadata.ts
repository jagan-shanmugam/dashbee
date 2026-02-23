/**
 * Filter Metadata System
 *
 * This module provides a robust, parameterized approach to applying filters to SQL queries.
 * Instead of string replacement with {{placeholders}}, filters are applied server-side
 * using PostgreSQL parameterized queries ($1, $2, etc.) which:
 * - Prevents SQL injection by design
 * - Handles type casting automatically
 * - Works with any valid SQL from the AI
 *
 * ## Three Filter Systems (in priority order)
 *
 * 1. **FilterMeta System** (Recommended)
 *    - AI provides explicit `filterMeta` array with queries
 *    - Uses `buildFilteredQuery()` to inject parameterized WHERE clauses
 *    - Most reliable, fully type-safe
 *
 * 2. **Auto-Inference System** (Fallback)
 *    - When no filterMeta is provided, system infers filters from param names
 *    - Uses `buildAutoFilteredQuery()` with `inferFilterMeta()`
 *    - Matches common patterns: date_from/date_to, category, region, etc.
 *
 * 3. **Legacy Placeholder System** (Deprecated)
 *    - String replacement of {{placeholder}} syntax in SQL
 *    - Handled by `filter-utils.ts` module
 *    - Kept for backward compatibility
 */

/**
 * Supported filter operators
 */
export type FilterOperator =
  | "eq" // Equal: col = $1
  | "neq" // Not equal: col != $1
  | "gt" // Greater than: col > $1
  | "gte" // Greater than or equal: col >= $1
  | "lt" // Less than: col < $1
  | "lte" // Less than or equal: col <= $1
  | "in" // In list: col IN ($1, $2, ...)
  | "not_in" // Not in list: col NOT IN ($1, $2, ...)
  | "like" // Pattern match: col LIKE $1
  | "ilike" // Case-insensitive pattern: col ILIKE $1
  | "between"; // Range: col BETWEEN $1 AND $2

/**
 * Supported filter value types
 */
export type FilterType = "date" | "text" | "number" | "boolean";

/**
 * Filter metadata describing how to apply a filter to a query
 */
export interface FilterMeta {
  /** Filter ID matching the filter definition (e.g., 'date_from', 'region') */
  id: string;
  /** Column name to filter on */
  column: string;
  /** Comparison operator */
  operator: FilterOperator;
  /** Data type for proper casting */
  type: FilterType;
  /** Table alias if query uses joins (e.g., 'dm' for daily_metrics dm) */
  table?: string;
  /** Whether this filter is optional (default: true) */
  optional?: boolean;
}

/**
 * A query with its associated filter metadata
 */
export interface QueryWithFilters {
  /** Unique identifier for this query */
  key: string;
  /** Base SQL SELECT query without filter conditions */
  sql: string;
  /** How to apply user filters to this query */
  filterMeta: FilterMeta[];
}

/**
 * Result of building a filtered query
 */
export interface FilteredQueryResult {
  /** The complete SQL with WHERE clause */
  sql: string;
  /** Parameter values in order ($1, $2, ...) */
  params: unknown[];
  /** The WHERE clause that was applied (for debugging) */
  whereClause: string;
}

/**
 * Cast a string value to the appropriate type for PostgreSQL
 */
function castValue(
  value: string | number | boolean,
  type: FilterType,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  const strValue = String(value);

  switch (type) {
    case "number": {
      const num = parseFloat(strValue);
      return isNaN(num) ? null : num;
    }
    case "boolean":
      return strValue === "true" || strValue === "1";
    case "date":
      // PostgreSQL handles ISO date string casting
      return strValue;
    case "text":
    default:
      return strValue;
  }
}

/**
 * Find the position to inject a WHERE clause in a SQL query.
 * Returns the index where WHERE should be inserted, accounting for existing WHERE, GROUP BY, etc.
 */
function findWhereInjectionPoint(sql: string): {
  position: number;
  hasExistingWhere: boolean;
  insertText: string;
} {
  const upperSql = sql.toUpperCase();

  // Check if there's already a WHERE clause
  // We need to find WHERE that's not inside parentheses (not a subquery)
  let depth = 0;
  let wherePos = -1;
  for (let i = 0; i < sql.length - 5; i++) {
    const char = sql[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (depth === 0 && upperSql.substring(i, i + 5) === 'WHERE' &&
             (i === 0 || /\s/.test(sql[i - 1]))) {
      wherePos = i;
      break;
    }
  }

  if (wherePos !== -1) {
    // Has existing WHERE - find the end of existing conditions
    // Look for GROUP BY, ORDER BY, LIMIT, HAVING, or end of query
    const afterWhere = upperSql.substring(wherePos + 5);
    const terminators = ['GROUP BY', 'ORDER BY', 'LIMIT', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT'];

    let endPos = sql.length;
    for (const term of terminators) {
      const termPos = afterWhere.indexOf(term);
      if (termPos !== -1) {
        const absolutePos = wherePos + 5 + termPos;
        if (absolutePos < endPos) {
          endPos = absolutePos;
        }
      }
    }

    return {
      position: endPos,
      hasExistingWhere: true,
      insertText: ' AND ',
    };
  }

  // No existing WHERE - find where to insert it
  // Should be after FROM clause but before GROUP BY, ORDER BY, LIMIT, etc.
  const insertBeforeKeywords = ['GROUP BY', 'ORDER BY', 'LIMIT', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT'];

  let insertPos = sql.length;
  for (const keyword of insertBeforeKeywords) {
    // Find keyword at depth 0 (not in subquery)
    let depth = 0;
    for (let i = 0; i < sql.length - keyword.length; i++) {
      const char = sql[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (depth === 0 && upperSql.substring(i, i + keyword.length) === keyword &&
               (i === 0 || /\s/.test(sql[i - 1]))) {
        if (i < insertPos) {
          insertPos = i;
        }
        break;
      }
    }
  }

  return {
    position: insertPos,
    hasExistingWhere: false,
    insertText: ' WHERE ',
  };
}

/**
 * Build a filtered query with parameterized WHERE clause
 *
 * This function injects filter conditions directly into the query rather than
 * wrapping it in a subquery. This allows filtering on columns that may not
 * be in the SELECT output (e.g., filtering by date on an aggregate query).
 *
 * @param baseQuery - The base SQL query without filter conditions
 * @param filterMeta - Array of filter metadata describing how to apply filters
 * @param filterValues - Map of filter IDs to their values
 * @returns The complete SQL with WHERE clause and parameter values
 *
 * @example
 * const result = buildFilteredQuery(
 *   "SELECT region, SUM(revenue) FROM daily_metrics GROUP BY region",
 *   [
 *     { id: 'date_from', column: 'date', operator: 'gte', type: 'date' },
 *     { id: 'region', column: 'region', operator: 'eq', type: 'text' },
 *   ],
 *   { date_from: '2024-01-01', region: 'West' }
 * );
 * // result.sql: "SELECT region, SUM(revenue) FROM daily_metrics WHERE date >= $1 AND region = $2 GROUP BY region"
 * // result.params: ['2024-01-01', 'West']
 */
export function buildFilteredQuery(
  baseQuery: string,
  filterMeta: FilterMeta[],
  filterValues: Record<string, string | string[] | number | boolean>,
): FilteredQueryResult {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const meta of filterMeta) {
    const value = filterValues[meta.id];

    // Skip unset or empty filters
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    // Build column reference with optional table qualifier
    const col = meta.table ? `${meta.table}.${meta.column}` : meta.column;

    switch (meta.operator) {
      case "eq":
        conditions.push(`${col} = $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "neq":
        conditions.push(`${col} != $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "gt":
        conditions.push(`${col} > $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "gte":
        conditions.push(`${col} >= $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "lt":
        conditions.push(`${col} < $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "lte":
        conditions.push(`${col} <= $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "in": {
        const values = Array.isArray(value) ? value : [value];
        if (values.length > 0) {
          const placeholders = values.map(() => `$${paramIndex++}`).join(", ");
          conditions.push(`${col} IN (${placeholders})`);
          params.push(...values.map((v) => castValue(v, meta.type)));
        }
        break;
      }

      case "not_in": {
        const values = Array.isArray(value) ? value : [value];
        if (values.length > 0) {
          const placeholders = values.map(() => `$${paramIndex++}`).join(", ");
          conditions.push(`${col} NOT IN (${placeholders})`);
          params.push(...values.map((v) => castValue(v, meta.type)));
        }
        break;
      }

      case "like":
        conditions.push(`${col} LIKE $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "ilike":
        conditions.push(`${col} ILIKE $${paramIndex++}`);
        params.push(castValue(value as string, meta.type));
        break;

      case "between": {
        // Expects value as [from, to] tuple
        if (Array.isArray(value) && value.length === 2) {
          const fromVal = value[0];
          const toVal = value[1];
          if (fromVal !== undefined && toVal !== undefined) {
            conditions.push(
              `${col} BETWEEN $${paramIndex++} AND $${paramIndex++}`,
            );
            params.push(
              castValue(fromVal, meta.type),
              castValue(toVal, meta.type),
            );
          }
        }
        break;
      }
    }
  }

  // If no conditions, return query as-is
  if (conditions.length === 0) {
    return {
      sql: baseQuery,
      params: [],
      whereClause: "",
    };
  }

  // Build WHERE clause conditions
  const conditionsText = conditions.join(" AND ");
  const whereClause = `WHERE ${conditionsText}`;

  // Clean the base query (strip trailing semicolons)
  const cleanBase = baseQuery.replace(/;\s*$/, "").trim();

  // Find where to inject the WHERE clause
  const injection = findWhereInjectionPoint(cleanBase);

  // Build the final SQL by injecting conditions at the right position
  const sql =
    cleanBase.substring(0, injection.position) +
    injection.insertText +
    conditionsText +
    ' ' +
    cleanBase.substring(injection.position);

  return {
    sql: sql.replace(/\s+/g, ' ').trim(),
    params,
    whereClause: injection.hasExistingWhere ? `AND ${conditionsText}` : whereClause,
  };
}

/**
 * Create filter metadata for common date range filters
 */
export function createDateRangeFilterMeta(
  column: string,
  table?: string,
): FilterMeta[] {
  return [
    {
      id: "date_from",
      column,
      operator: "gte",
      type: "date",
      table,
    },
    {
      id: "date_to",
      column,
      operator: "lte",
      type: "date",
      table,
    },
  ];
}

/**
 * Create filter metadata for a simple equality filter
 */
export function createEqualityFilterMeta(
  id: string,
  column: string,
  type: FilterType = "text",
  table?: string,
): FilterMeta {
  return {
    id,
    column,
    operator: "eq",
    type,
    table,
  };
}

/**
 * Validate filter metadata for common issues
 */
export function validateFilterMeta(filterMeta: FilterMeta[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const meta of filterMeta) {
    // Check for duplicate IDs
    if (seenIds.has(meta.id)) {
      errors.push(`Duplicate filter ID: ${meta.id}`);
    }
    seenIds.add(meta.id);

    // Check required fields
    if (!meta.id) {
      errors.push("Filter missing required 'id' field");
    }
    if (!meta.column) {
      errors.push(`Filter '${meta.id}' missing required 'column' field`);
    }
    if (!meta.operator) {
      errors.push(`Filter '${meta.id}' missing required 'operator' field`);
    }
    if (!meta.type) {
      errors.push(`Filter '${meta.id}' missing required 'type' field`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Common date column names found in databases
 */
const COMMON_DATE_COLUMNS = [
  "date",
  "created_at",
  "updated_at",
  "order_date",
  "transaction_date",
  "timestamp",
  "datetime",
  "time",
  "day",
  "event_date",
  "sale_date",
  "purchase_date",
];

/**
 * Try to detect a date column name from a SQL query
 * Returns the first matching date column found, or null if none found
 */
function detectDateColumnFromSQL(sql: string): string | null {
  for (const col of COMMON_DATE_COLUMNS) {
    // Look for the column name in various contexts:
    // - In SELECT: date, t.date, date AS alias
    // - In FROM/JOIN: table with date column
    // - In WHERE: date = ...
    // - In GROUP BY / ORDER BY
    const patterns = [
      new RegExp(`\\b${col}\\b`, "i"), // Simple column reference
      new RegExp(`\\.${col}\\b`, "i"), // Table-qualified (t.date)
      new RegExp(`\\b${col}\\s*[,)]`, "i"), // In SELECT list
      new RegExp(`\\b${col}\\s*(?:=|>|<|>=|<=|BETWEEN)`, "i"), // In WHERE
    ];

    for (const pattern of patterns) {
      if (pattern.test(sql)) {
        return col;
      }
    }
  }

  return null;
}

/**
 * Infer filter metadata from filter parameter names
 *
 * This function automatically infers how to apply filters based on common naming conventions:
 * - date_from, start_date → date column detected from SQL, or skip if not found
 * - date_to, end_date → date column detected from SQL, or skip if not found
 * - category, region, status, type → equality filter on that column
 *
 * @param filterParams - Map of filter parameter names to values
 * @param sql - Optional SQL query to help detect column names
 * @returns Array of inferred FilterMeta
 */
export function inferFilterMeta(
  filterParams: Record<string, string | string[]>,
  sql?: string,
): FilterMeta[] {
  const meta: FilterMeta[] = [];

  // Try to detect the date column from SQL if provided
  const detectedDateColumn = sql ? detectDateColumnFromSQL(sql) : "date";

  for (const [key, value] of Object.entries(filterParams)) {
    // Skip empty values
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;

    // Date range filters - only add if we detected a date column
    if (key === "date_from" || key === "start_date" || key === "from_date") {
      if (detectedDateColumn) {
        meta.push({
          id: key,
          column: detectedDateColumn,
          operator: "gte",
          type: "date",
        });
      }
    } else if (key === "date_to" || key === "end_date" || key === "to_date") {
      if (detectedDateColumn) {
        meta.push({
          id: key,
          column: detectedDateColumn,
          operator: "lte",
          type: "date",
        });
      }
    }
    // Common categorical filters - use equality
    else if (
      key === "category" ||
      key === "region" ||
      key === "status" ||
      key === "type" ||
      key === "department" ||
      key === "product" ||
      key === "customer" ||
      key === "country" ||
      key === "state" ||
      key === "city"
    ) {
      // If value is array, use IN operator
      if (Array.isArray(value)) {
        meta.push({
          id: key,
          column: key,
          operator: "in",
          type: "text",
        });
      } else {
        meta.push({
          id: key,
          column: key,
          operator: "eq",
          type: "text",
        });
      }
    }
    // Filters ending with _id are usually foreign keys
    else if (key.endsWith("_id")) {
      const column = key; // e.g., 'customer_id'
      meta.push({
        id: key,
        column,
        operator: "eq",
        type: "number",
      });
    }
    // Filters with _min suffix
    else if (key.endsWith("_min")) {
      const column = key.replace(/_min$/, "");
      meta.push({
        id: key,
        column,
        operator: "gte",
        type: "number",
      });
    }
    // Filters with _max suffix
    else if (key.endsWith("_max")) {
      const column = key.replace(/_max$/, "");
      meta.push({
        id: key,
        column,
        operator: "lte",
        type: "number",
      });
    }
  }

  return meta;
}

/**
 * Build a filtered query with auto-inferred filter metadata
 *
 * This is a convenience function that combines filter inference with query building.
 * Use this when the AI doesn't provide explicit filterMeta and legacy placeholders aren't present.
 *
 * Since buildFilteredQuery now injects WHERE clauses directly into the query (rather than
 * wrapping in a subquery), filters can reference any column in the source table, not just
 * those in the SELECT output.
 *
 * @param baseQuery - The base SQL query
 * @param filterParams - Map of filter parameter names to values
 * @returns The filtered query result, or null if no filters could be inferred
 */
export function buildAutoFilteredQuery(
  baseQuery: string,
  filterParams: Record<string, string | string[]>,
): FilteredQueryResult | null {
  // Pass the SQL to help detect date column names
  const meta = inferFilterMeta(filterParams, baseQuery);

  // If no filters could be inferred, return null
  if (meta.length === 0) {
    return null;
  }

  return buildFilteredQuery(baseQuery, meta, filterParams);
}
