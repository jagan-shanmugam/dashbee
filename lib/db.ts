/**
 * Database connection utilities.
 * This module provides a unified interface for database operations
 * using the adapter pattern to support multiple database types.
 */

import {
  createAdapter,
  createTestAdapter,
  type DBConfig as AdapterDBConfig,
  type DatabaseType,
} from "./db-adapters";

// Re-export types for backward compatibility
export type { DatabaseType } from "./db-adapters";

/**
 * Legacy DBConfig interface for backward compatibility.
 * New code should use the type from db-adapters.
 */
export interface DBConfig {
  type?: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  filename?: string; // For SQLite
}

/**
 * Convert legacy config to adapter config.
 */
function toAdapterConfig(config: DBConfig): AdapterDBConfig {
  return {
    type: config.type || "postgresql",
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl,
    filename: config.filename,
  };
}

/**
 * Execute a SQL query against the database.
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param dbConfig - Database configuration
 * @returns Query result rows
 */
export async function executeQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  dbConfig?: DBConfig,
): Promise<T[]> {
  // Default to PostgreSQL with environment variables if no config provided
  const config = dbConfig
    ? toAdapterConfig(dbConfig)
    : {
        type: "postgresql" as const,
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "postgres",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        ssl: process.env.DATABASE_SSL === "true",
      };

  const adapter = createAdapter(config);
  const result = await adapter.query<T>(sql, params);
  return result.rows;
}

/**
 * Test a database connection.
 * @param dbConfig - Database configuration
 * @throws Error if connection fails
 */
export async function testConnection(dbConfig: DBConfig): Promise<void> {
  const config = toAdapterConfig(dbConfig);
  const adapter = createTestAdapter(config);

  try {
    await adapter.testConnection();
  } finally {
    await adapter.close();
  }
}

/**
 * Get adapter for a database configuration.
 * Used by schema introspector and other modules that need direct adapter access.
 */
export function getAdapter(dbConfig: DBConfig) {
  return createAdapter(toAdapterConfig(dbConfig));
}
