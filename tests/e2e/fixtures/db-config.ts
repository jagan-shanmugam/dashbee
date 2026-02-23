/**
 * Database Configuration Fixtures for Multi-DB E2E Testing
 *
 * This module provides extended Playwright test fixtures that automatically
 * inject the appropriate database configuration based on the active project.
 *
 * Usage:
 *   import { test, expect } from './fixtures/db-config';
 *
 * The fixture reads `testInfo.project.name` to determine which database
 * to configure. Projects: postgres, mysql, sqlite, chromium (default: postgres)
 */

import { test as base, expect } from "@playwright/test";

// Database configuration interface matching the app's expected format
export interface DBConfig {
  type: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  filename?: string; // SQLite only
}

// Database configurations per project
export const dbConfigs: Record<string, DBConfig> = {
  postgres: {
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "demo",
    user: "postgres",
    password: "postgres",
    ssl: false,
  },
  mysql: {
    type: "mysql",
    host: "localhost",
    port: 3306,
    database: "demo",
    user: "mysql",
    password: "mysql",
    ssl: false,
  },
  sqlite: {
    type: "sqlite",
    host: "",
    port: 0,
    database: "",
    user: "",
    password: "",
    ssl: false,
    filename: "./sample-db/demo.sqlite",
  },
  // Default to postgres for non-DB-specific tests (chromium project)
  chromium: {
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "demo",
    user: "postgres",
    password: "postgres",
    ssl: false,
  },
};

// Extended test fixture that injects DB config into localStorage
// Using auto: true ensures this fixture runs for every test automatically
export const test = base.extend<{ dbConfig: DBConfig }>({
  dbConfig: [async ({ page }, use, testInfo) => {
    const projectName = testInfo.project.name;
    const config = dbConfigs[projectName] || dbConfigs.postgres;

    // Inject the database configuration into localStorage before page loads
    await page.addInitScript((configStr) => {
      localStorage.setItem("dashb-db-config", configStr);
    }, JSON.stringify(config));

    await use(config);
  }, { auto: true }],
});

export { expect };

/**
 * Helper to get the current database type for conditional test logic
 */
export function getDbType(testInfo: { project: { name: string } }): string {
  return dbConfigs[testInfo.project.name]?.type || "postgresql";
}
