import { z } from "zod";
import { getInMemoryDb, type TableSchema } from "./in-memory-db";
import { SQLToolResult } from "./types/sql-tools";

// Re-export with both names for backward compatibility
export type InMemorySQLToolResult = SQLToolResult;
export type { SQLToolResult };

/**
 * Generate a schema description for the LLM from in-memory tables
 */
export function inMemorySchemaToPrompt(schemas: TableSchema[]): string {
  if (schemas.length === 0) {
    return "No tables loaded. Please upload a file first.";
  }

  const tableDescriptions = schemas.map((table) => {
    const columnDefs = table.columns
      .map((col) => `    ${col.name} (${col.type}${col.nullable ? ", nullable" : ""})`)
      .join("\n");
    return `Table: ${table.name} (${table.rowCount} rows)\n  Columns:\n${columnDefs}`;
  });

  return `In-Memory Data (from uploaded file):\n\n${tableDescriptions.join("\n\n")}`;
}

/**
 * Create SQL tools for querying in-memory data.
 * These tools allow the LLM agent to execute SQL queries against uploaded file data.
 *
 * @param schema - Schema description for LLM context
 */
export function createInMemorySQLTools(schema: string) {
  return {
    execute_sql: {
      description: `Execute a SQL SELECT query against the in-memory data and return the results.
If the query fails, the error message will be returned so you can fix and retry.
Only SELECT queries are allowed.

SUPPORTED SQL syntax (use ONLY these):
- SELECT columns FROM table
- SELECT * FROM table
- WHERE conditions: col = value, col > value, col < value, col >= value, col <= value
- WHERE col LIKE '%pattern%'
- WHERE col IN ('val1', 'val2')
- Multiple WHERE conditions with AND only
- ORDER BY column [ASC|DESC]
- LIMIT n
- GROUP BY column (single column only)
- Aggregations: COUNT(*), SUM(col), AVG(col), MIN(col), MAX(col)

NOT SUPPORTED (will cause errors - DO NOT USE):
- JOINs of any kind (only single-table queries work)
- Subqueries (SELECT inside SELECT)
- OR conditions in WHERE clause (use IN instead)
- HAVING clause
- Window functions (OVER, PARTITION BY)
- CASE/WHEN statements
- BETWEEN keyword (use >= AND <= instead)
- Complex expressions or functions

Examples that WORK:
- SELECT * FROM sales LIMIT 10
- SELECT category, SUM(amount) as total FROM sales GROUP BY category
- SELECT name FROM customers WHERE revenue > 1000 ORDER BY revenue DESC

Examples that FAIL:
- SELECT * FROM sales JOIN customers ON sales.id = customers.id
- SELECT * FROM sales WHERE status = 'A' OR status = 'B'
- SELECT * FROM sales WHERE amount BETWEEN 100 AND 500`,
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "Unique identifier for this query (e.g., 'total-count', 'top-values')",
          ),
        sql: z
          .string()
          .describe("The SQL SELECT query to execute against the in-memory data."),
      }),
      execute: async ({
        key,
        sql,
      }: {
        key: string;
        sql: string;
      }): Promise<InMemorySQLToolResult> => {
        const db = getInMemoryDb();

        // Check if we have any data
        if (db.isEmpty()) {
          return {
            key,
            success: false,
            error: "No data loaded. Please upload a file first.",
          };
        }

        try {
          const result = db.query(sql);
          return {
            key,
            success: true,
            rows: result.rows,
            rowCount: result.rows.length,
          };
        } catch (err) {
          return {
            key,
            success: false,
            error: err instanceof Error ? err.message : "Query execution failed",
          };
        }
      },
    },

    get_schema: {
      description:
        "Get the in-memory data schema to understand available tables and columns from the uploaded file",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          schema: schema || "No data loaded",
        };
      },
    },
  };
}
