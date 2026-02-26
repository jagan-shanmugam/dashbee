/**
 * Database adapter factory and exports.
 * Provides a unified interface for connecting to different database types.
 */

export type {
  DatabaseType,
  DBConfig,
  TableInfo,
  QueryResult,
  DatabaseAdapter,
} from "./types";

export { DEFAULT_PORTS, getDatabaseDisplayName } from "./types";

import type { DBConfig, DatabaseAdapter, DatabaseType } from "./types";
import { PostgresAdapter, createPostgresAdapter } from "./postgres";
import { MySQLAdapter, createMySQLAdapter } from "./mysql";
import { SQLiteAdapter, createSQLiteAdapter } from "./sqlite";
import {
  SupabaseAdapter,
  createSupabaseAdapter,
  getSupabaseAdapter,
} from "./supabase";

// Cache for adapter instances
const adapterCache = new Map<string, DatabaseAdapter>();

/**
 * Generate a unique cache key for a database config.
 */
function getConfigKey(config: DBConfig): string {
  if (config.type === "sqlite") {
    return `sqlite:${config.filename || config.database}`;
  }
  return `${config.type}:${config.host}:${config.port}:${config.database}:${config.user}`;
}

/**
 * Create a database adapter for the given configuration.
 * Adapters are cached by connection parameters.
 *
 * @param config - Database configuration
 * @returns Database adapter instance
 */
export function createAdapter(config: DBConfig): DatabaseAdapter {
  // Handle demo type specially - uses server-side environment variable
  if (config.type === "demo") {
    const connectionString = process.env.SUPABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "Demo database not configured. Set SUPABASE_CONNECTION_STRING environment variable.",
      );
    }
    // Demo connections are cached under a special key
    const demoKey = "demo:supabase";
    let adapter = adapterCache.get(demoKey);
    if (!adapter) {
      adapter = createSupabaseAdapter(connectionString);
      adapterCache.set(demoKey, adapter);
    }
    return adapter;
  }

  const key = getConfigKey(config);

  // Return cached adapter if available
  let adapter = adapterCache.get(key);
  if (adapter) {
    return adapter;
  }

  // Create new adapter based on type
  switch (config.type) {
    case "postgresql":
      adapter = createPostgresAdapter(config);
      break;
    case "mysql":
      adapter = createMySQLAdapter(config);
      break;
    case "sqlite":
      adapter = createSQLiteAdapter(config);
      break;
    default:
      throw new Error(`Unsupported database type: ${(config as DBConfig).type}`);
  }

  adapterCache.set(key, adapter);
  return adapter;
}

/**
 * Create a new adapter for testing connections (not cached).
 * This adapter should be closed after testing.
 *
 * @param config - Database configuration
 * @returns Database adapter instance
 */
export function createTestAdapter(config: DBConfig): DatabaseAdapter {
  // Handle demo type specially - uses server-side environment variable
  if (config.type === "demo") {
    const connectionString = process.env.SUPABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "Demo database not configured. Set SUPABASE_CONNECTION_STRING environment variable.",
      );
    }
    return createSupabaseAdapter(connectionString);
  }

  switch (config.type) {
    case "postgresql":
      return createPostgresAdapter(config);
    case "mysql":
      return createMySQLAdapter(config);
    case "sqlite":
      return createSQLiteAdapter(config);
    default:
      throw new Error(`Unsupported database type: ${(config as DBConfig).type}`);
  }
}

/**
 * Close and remove a cached adapter.
 */
export async function closeAdapter(config: DBConfig): Promise<void> {
  const key = getConfigKey(config);
  const adapter = adapterCache.get(key);
  if (adapter) {
    await adapter.close();
    adapterCache.delete(key);
  }
}

/**
 * Close all cached adapters.
 */
export async function closeAllAdapters(): Promise<void> {
  const closePromises = Array.from(adapterCache.values()).map((adapter) =>
    adapter.close()
  );
  await Promise.all(closePromises);
  adapterCache.clear();
}

/**
 * Check if a database type is available (has required dependencies).
 */
export async function isDatabaseTypeAvailable(
  type: DatabaseType
): Promise<boolean> {
  switch (type) {
    case "postgresql":
      // pg is always available (required dependency)
      return true;
    case "mysql":
      try {
        await import("mysql2/promise");
        return true;
      } catch {
        return false;
      }
    case "sqlite":
      try {
        await import("better-sqlite3");
        return true;
      } catch {
        return false;
      }
    case "demo":
      // Demo is available if SUPABASE_CONNECTION_STRING is set
      return !!process.env.SUPABASE_CONNECTION_STRING;
    default:
      return false;
  }
}

// Re-export adapter classes for direct use if needed
export { PostgresAdapter, MySQLAdapter, SQLiteAdapter };
export { SupabaseAdapter, createSupabaseAdapter, getSupabaseAdapter };
