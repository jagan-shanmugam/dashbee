/**
 * SQLite database adapter using the better-sqlite3 library.
 * Note: better-sqlite3 is synchronous, but we wrap it in async for consistency.
 */

import type { DatabaseAdapter, DBConfig, TableInfo, QueryResult } from "./types";

// Dynamic import to handle optional dependency
let BetterSqlite3: typeof import("better-sqlite3") | null = null;

async function getBetterSqlite3(): Promise<typeof import("better-sqlite3")> {
  if (!BetterSqlite3) {
    try {
      const sqliteModule = await import("better-sqlite3");
      BetterSqlite3 = sqliteModule.default;
    } catch {
      throw new Error(
        "SQLite support requires the better-sqlite3 package. Install it with: pnpm add better-sqlite3"
      );
    }
  }
  return BetterSqlite3;
}

export class SQLiteAdapter implements DatabaseAdapter {
  readonly type = "sqlite" as const;
  private db: import("better-sqlite3").Database | null = null;
  private config: DBConfig;

  constructor(config: DBConfig) {
    this.config = config;
  }

  private async getDb(): Promise<import("better-sqlite3").Database> {
    if (!this.db) {
      const Database = await getBetterSqlite3();
      // Use filename from config, or fall back to database name as filename
      const filename = this.config.filename || this.config.database;
      if (!filename) {
        throw new Error("SQLite requires a database filename");
      }
      this.db = new Database(filename, {
        readonly: false,
        fileMustExist: false,
      });
    }
    return this.db;
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const db = await this.getDb();
    const maxRows = parseInt(process.env.MAX_QUERY_ROWS || "1000");

    // Strip trailing semicolons
    const cleanSql = sql.replace(/;\s*$/, "").trim();

    // Wrap query with LIMIT for safety
    const limitedSql = `SELECT * FROM (${cleanSql}) LIMIT ${maxRows}`;

    // better-sqlite3 uses ? for positional parameters
    const stmt = db.prepare(limitedSql);
    const rows = stmt.all(...params) as T[];

    return {
      rows,
      rowCount: rows.length,
    };
  }

  async introspectSchema(_schemas: string[] = []): Promise<TableInfo[]> {
    const db = await this.getDb();

    // Get all tables
    const tablesStmt = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    const tableRows = tablesStmt.all() as { name: string }[];

    const tables: TableInfo[] = [];

    for (const tableRow of tableRows) {
      // Get columns for each table using PRAGMA
      const columnsStmt = db.prepare(`PRAGMA table_info("${tableRow.name}")`);
      const columnRows = columnsStmt.all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }[];

      tables.push({
        schema: "main", // SQLite uses "main" as the default schema
        name: tableRow.name,
        columns: columnRows.map((col) => ({
          name: col.name,
          type: col.type || "TEXT", // SQLite columns can have empty type
        })),
      });
    }

    return tables;
  }

  async testConnection(): Promise<void> {
    const db = await this.getDb();
    db.prepare("SELECT 1").get();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create a SQLite adapter from config.
 */
export function createSQLiteAdapter(config: DBConfig): SQLiteAdapter {
  return new SQLiteAdapter(config);
}
