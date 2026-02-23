/**
 * MySQL database adapter using the mysql2 library.
 */

import type { DatabaseAdapter, DBConfig, TableInfo, QueryResult } from "./types";

// Dynamic import to handle optional dependency
let mysql2: typeof import("mysql2/promise") | null = null;

async function getMysql2(): Promise<typeof import("mysql2/promise")> {
  if (!mysql2) {
    try {
      mysql2 = await import("mysql2/promise");
    } catch {
      throw new Error(
        "MySQL support requires the mysql2 package. Install it with: pnpm add mysql2"
      );
    }
  }
  return mysql2;
}

export class MySQLAdapter implements DatabaseAdapter {
  readonly type = "mysql" as const;
  private pool: import("mysql2/promise").Pool | null = null;
  private config: DBConfig;

  constructor(config: DBConfig) {
    this.config = config;
  }

  private async getPool(): Promise<import("mysql2/promise").Pool> {
    if (!this.pool) {
      const mysql = await getMysql2();
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 5000,
      });
    }
    return this.pool;
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const pool = await this.getPool();
    const maxRows = parseInt(process.env.MAX_QUERY_ROWS || "1000");

    // Strip trailing semicolons
    const cleanSql = sql.replace(/;\s*$/, "").trim();

    // Wrap query with LIMIT for safety
    const limitedSql = `SELECT * FROM (${cleanSql}) AS q LIMIT ${maxRows}`;

    const [rows] = await pool.execute<import("mysql2/promise").RowDataPacket[]>(
      limitedSql,
      params
    );

    return {
      rows: rows as unknown as T[],
      rowCount: rows.length,
    };
  }

  async introspectSchema(schemas: string[] = []): Promise<TableInfo[]> {
    const pool = await this.getPool();

    // In MySQL, the schema is the database name
    const schemaList = schemas.length > 0 ? schemas : [this.config.database];
    const placeholders = schemaList.map(() => "?").join(", ");

    const [rows] = await pool.execute<import("mysql2/promise").RowDataPacket[]>(
      `
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA IN (${placeholders})
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `,
      schemaList
    );

    const tables = new Map<string, TableInfo>();
    for (const row of rows) {
      const key = `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`;
      if (!tables.has(key)) {
        tables.set(key, {
          schema: row.TABLE_SCHEMA as string,
          name: row.TABLE_NAME as string,
          columns: [],
        });
      }
      tables.get(key)!.columns.push({
        name: row.COLUMN_NAME as string,
        type: row.DATA_TYPE as string,
      });
    }
    return Array.from(tables.values());
  }

  async testConnection(): Promise<void> {
    const pool = await this.getPool();
    await pool.execute("SELECT 1");
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * Create a MySQL adapter from config.
 */
export function createMySQLAdapter(config: DBConfig): MySQLAdapter {
  return new MySQLAdapter(config);
}
