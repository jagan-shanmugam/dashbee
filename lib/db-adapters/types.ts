/**
 * Database adapter interface for supporting multiple database types.
 * Each adapter implements connect, query, introspect, and testConnection.
 */

export type DatabaseType = "postgresql" | "mysql" | "sqlite";

export interface DBConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  // SQLite-specific: path to database file
  filename?: string;
}

export interface TableInfo {
  schema: string;
  name: string;
  columns: { name: string; type: string }[];
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Abstract database adapter interface.
 * All database-specific adapters must implement this interface.
 */
export interface DatabaseAdapter {
  /** Database type identifier */
  readonly type: DatabaseType;

  /**
   * Execute a SQL query with optional parameters.
   * @param sql - SQL query string
   * @param params - Query parameters for parameterized queries
   * @returns Query result with rows
   */
  query<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;

  /**
   * Introspect the database schema.
   * @param schemas - List of schemas to introspect (default: ["public"])
   * @returns Array of table information
   */
  introspectSchema(schemas?: string[]): Promise<TableInfo[]>;

  /**
   * Test the database connection.
   * @throws Error if connection fails
   */
  testConnection(): Promise<void>;

  /**
   * Close the database connection/pool.
   */
  close(): Promise<void>;
}

/**
 * Factory function signature for creating database adapters.
 */
export type AdapterFactory = (config: DBConfig) => DatabaseAdapter;

/**
 * Default ports for each database type.
 */
export const DEFAULT_PORTS: Record<DatabaseType, number> = {
  postgresql: 5432,
  mysql: 3306,
  sqlite: 0, // SQLite doesn't use a port
};

/**
 * Get a user-friendly display name for a database type.
 */
export function getDatabaseDisplayName(type: DatabaseType): string {
  switch (type) {
    case "postgresql":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "sqlite":
      return "SQLite";
    default:
      return type;
  }
}
