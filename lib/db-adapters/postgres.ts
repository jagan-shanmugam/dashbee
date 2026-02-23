/**
 * PostgreSQL database adapter using the pg library.
 */

import { Pool, PoolConfig } from "pg";
import type { DatabaseAdapter, DBConfig, TableInfo, QueryResult } from "./types";

export class PostgresAdapter implements DatabaseAdapter {
  readonly type = "postgresql" as const;
  private pool: Pool;
  private config: DBConfig;

  constructor(config: DBConfig) {
    this.config = config;

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      // Ensure password is always a string (pg library requires this)
      password: config.password != null ? String(config.password) : "",
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors to prevent uncaught exceptions
    this.pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const timeout = parseInt(process.env.QUERY_TIMEOUT_MS || "5000");
      const maxRows = parseInt(process.env.MAX_QUERY_ROWS || "1000");

      // Strip trailing semicolons
      const cleanSql = sql.replace(/;\s*$/, "").trim();

      // Inject LIMIT directly instead of wrapping in subquery
      // Check if query already has LIMIT (case insensitive, not in subquery)
      const upperSql = cleanSql.toUpperCase();
      let depth = 0;
      let hasLimit = false;
      for (let i = 0; i < cleanSql.length - 5; i++) {
        const char = cleanSql[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (depth === 0 && upperSql.substring(i, i + 5) === 'LIMIT' &&
                 (i === 0 || /\s/.test(cleanSql[i - 1]!))) {
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

/**
 * Create a PostgreSQL adapter from config.
 */
export function createPostgresAdapter(config: DBConfig): PostgresAdapter {
  return new PostgresAdapter(config);
}
