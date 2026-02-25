/**
 * Supabase database adapter using the pg library.
 * Connects to Supabase PostgreSQL database using a connection string from environment.
 * Used for server-side data fetching (e.g., landing page static generation).
 */

import { Pool } from "pg";
import type { DatabaseAdapter, QueryResult, TableInfo } from "./types";

export class SupabaseAdapter implements DatabaseAdapter {
  readonly type = "postgresql" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected Supabase pool error:", err);
    });
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const timeout = parseInt(process.env.QUERY_TIMEOUT_MS || "10000");
      const maxRows = parseInt(process.env.MAX_QUERY_ROWS || "1000");

      // Strip trailing semicolons
      const cleanSql = sql.replace(/;\s*$/, "").trim();

      // Check if query already has LIMIT
      const upperSql = cleanSql.toUpperCase();
      let depth = 0;
      let hasLimit = false;
      for (let i = 0; i < cleanSql.length - 5; i++) {
        const char = cleanSql[i];
        if (char === "(") depth++;
        else if (char === ")") depth--;
        else if (
          depth === 0 &&
          upperSql.substring(i, i + 5) === "LIMIT" &&
          (i === 0 || /\s/.test(cleanSql[i - 1]!))
        ) {
          hasLimit = true;
          break;
        }
      }

      const finalSql = hasLimit ? cleanSql : `${cleanSql} LIMIT ${maxRows}`;

      await client.query(`SET statement_timeout = ${timeout}`);
      const result = await client.query<T>(finalSql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
      };
    } finally {
      client.release();
    }
  }

  async introspectSchema(schemas: string[] = ["public"]): Promise<TableInfo[]> {
    const result = await this.pool.query(
      `
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = ANY($1)
      ORDER BY table_schema, table_name, ordinal_position
    `,
      [schemas],
    );

    const tables = new Map<string, TableInfo>();
    for (const row of result.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      if (!tables.has(key)) {
        tables.set(key, {
          schema: row.table_schema,
          name: row.table_name,
          columns: [],
        });
      }
      tables.get(key)!.columns.push({
        name: row.column_name,
        type: row.data_type,
      });
    }
    return Array.from(tables.values());
  }

  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance for server-side use
let supabaseInstance: SupabaseAdapter | null = null;

/**
 * Get or create the Supabase adapter singleton.
 * Uses SUPABASE_CONNECTION_STRING from environment.
 */
export function getSupabaseAdapter(): SupabaseAdapter {
  if (!supabaseInstance) {
    const connectionString = process.env.SUPABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "SUPABASE_CONNECTION_STRING environment variable is required",
      );
    }
    supabaseInstance = new SupabaseAdapter(connectionString);
  }
  return supabaseInstance;
}

/**
 * Create a new Supabase adapter instance (non-singleton).
 */
export function createSupabaseAdapter(
  connectionString: string,
): SupabaseAdapter {
  return new SupabaseAdapter(connectionString);
}
